/**
 * Submit endpoint — uses the new judge pipeline (`lib/judge/runner.ts:runJudge`)
 * with structured `args`/`expectedJson` test-case columns.
 *
 * Designed for LeetCode-style submission: compile once, run all test cases in
 * a single Piston execution (`single-exec` mode), collect per-case verdicts.
 * Continues past wrong answers; only bails on uncaught runtime errors (the
 * harness breaks on first exception).
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { updateAfterExecution } from '@/lib/executor/personalizationUpdater';
import { runJudge } from '@/lib/judge/runner';
import { detectUndefinedMethod } from '@/lib/judge/harness';
import { getProblemTimeLimit } from '@/lib/executor/timeLimits';
import { PistonUnreachableError } from '@/lib/piston';
import type { ProblemSignature, JudgeInput, JudgeTestCase } from '@/lib/judge/types';
import type { Language } from '@/lib/judge/verdict';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

    let body: { code: string; language: 'python' | 'java' | 'cpp' };
    try {
      body = (await req.json()) as { code: string; language: 'python' | 'java' | 'cpp' };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const problem = await prisma.problem.findUnique({
      where: { slug },
      select: {
        id: true,
        isPublished: true,
        timeLimitMs: true,
        difficulty: true,
        tags: true,
        signature: {
          select: { className: true, methodName: true, paramTypes: true, returnType: true },
        },
        patterns: {
          include: { pattern: { select: { name: true } } },
        },
        testCases: {
          orderBy: [{ isHidden: 'asc' }, { order: 'asc' }],
          select: { id: true, order: true, args: true, expectedJson: true, isHidden: true },
        },
      },
    });

    if (!problem || !problem.isPublished) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const submitSignature: ProblemSignature = problem.signature
      ? {
          className: problem.signature.className,
          methodName: problem.signature.methodName,
          paramTypes:
            (problem.signature.paramTypes as unknown as ProblemSignature["paramTypes"]) ?? [],
          returnType: problem.signature.returnType,
        }
      : { className: null, methodName: "solution", paramTypes: [], returnType: "unknown" };

    const guardMessage = detectUndefinedMethod(
      body.code,
      submitSignature.methodName,
      body.language as Language,
    );
    if (guardMessage) {
      return NextResponse.json(
        { error: guardMessage, code: "undefined_method" },
        { status: 400 },
      );
    }

    const judgeInput: JudgeInput = {
      code: body.code,
      language: body.language as Language,
      signature: submitSignature,
      testCases: problem.testCases.map(tc => ({
        id: tc.id,
        order: tc.order,
        args: (tc.args as unknown[]) ?? [],
        expectedJson: tc.expectedJson,
        isHidden: tc.isHidden,
      })),
      timeLimitMs: getProblemTimeLimit({ timeLimitMs: problem.timeLimitMs ?? null }),
      mode: "single-exec",
    };

    let output;
    try {
      output = await runJudge(judgeInput);
    } catch (e) {
      if (e instanceof PistonUnreachableError) {
        return NextResponse.json(
          { error: e.message, code: "piston_unreachable" },
          { status: 502 },
        );
      }
      throw e;
    }

    if (output.compileError) {
      return NextResponse.json(
        { error: output.compileError.message, code: "compile_error" },
        { status: 400 },
      );
    }

    const total = problem.testCases.length;
    const allPassed = output.aggregate === "accepted";

    const details = problem.testCases.map((tc, i) => {
      const r = output.results[i];
      let out: string | null;
      if (tc.isHidden) {
        out = null;
      } else if (r && r.errorMessage && r.verdict !== "accepted") {
        out = r.errorMessage;
      } else {
        out = r ? JSON.stringify(r.actualJson) : null;
      }
      return {
        order: tc.order,
        isHidden: tc.isHidden,
        passed: r ? r.verdict === "accepted" : false,
        output: out,
      };
    });

    const passedCount = details.filter(d => d.passed).length;

    // Update bounded per-user-per-problem stats
    const statusLabels: Record<string, string> = {
      accepted: 'Accepted',
      wrong_answer: 'Wrong Answer',
      time_limit_exceeded: 'Time Limit Exceeded',
      runtime_error: 'Runtime Error',
      compile_error: 'Compile Error',
      output_limit_exceeded: 'Output Limit Exceeded',
    };
    const lastStatus = statusLabels[output.aggregate] || 'Runtime Error';
    const firstError = output.results.find(r => r.errorMessage);

    await prisma.userProblemStats.upsert({
      where: { userId_problemId: { userId: session.user.id, problemId: problem.id } },
      create: {
        userId: session.user.id,
        problemId: problem.id,
        submitCount: 1,
        acceptedCount: allPassed ? 1 : 0,
        wrongAnswerCount: output.aggregate === 'wrong_answer' ? 1 : 0,
        runtimeErrorCount: output.aggregate === 'runtime_error' ? 1 : 0,
        lastStatus,
        lastError: firstError?.errorMessage ?? null,
        lastAt: new Date(),
      },
      update: {
        submitCount: { increment: 1 },
        acceptedCount: allPassed ? { increment: 1 } : undefined,
        wrongAnswerCount: output.aggregate === 'wrong_answer' ? { increment: 1 } : undefined,
        runtimeErrorCount: output.aggregate === 'runtime_error' ? { increment: 1 } : undefined,
        lastStatus,
        lastError: firstError?.errorMessage ?? null,
        lastAt: new Date(),
      },
    });

    // Update personalization system with execution results
    if (session?.user?.id) {
      try {
        const tags = problem.tags;
        const concepts = Array.isArray(tags) ? (tags as string[]) : [];
        const patterns = problem.patterns.map(pp => pp.pattern.name);
        const problemContext = {
          problemId: problem.id,
          concepts,
          patterns,
          difficulty: problem.difficulty,
        };

        const testResults = problem.testCases.map((tc, i) => {
          const r = output.results[i];
          return {
            passed: r ? r.verdict === "accepted" : false,
            input: JSON.stringify(tc.args),
            expected: JSON.stringify(tc.expectedJson),
            actual: r ? (r.errorMessage ?? JSON.stringify(r.actualJson)) : '',
          };
        });

        const executionStats = {
          passed: allPassed,
          testResults,
          runtime: output.results.reduce((s, r) => s + (r.execMs ?? 0), 0) || 100,
        };

        await updateAfterExecution(
          session.user.id,
          problemContext,
          executionStats,
        );
      } catch (error) {
        console.error('Personalization update failed:', error);
      }
    }

    // IMPORTANT: do NOT return hidden test inputs/expected.
    const responseDetails = details.map(d => d.isHidden ? { ...d, output: null } : d);
    return NextResponse.json({ allPassed, passedCount, total, details: responseDetails });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
