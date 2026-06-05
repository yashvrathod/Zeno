import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { runOnPiston } from '@/lib/piston';
import { auth } from '@/lib/auth';
import { updateAfterExecution } from '@/lib/executor/personalizationUpdater';
import { wrapForExecution, supportsHarness } from '@/lib/executor/harness';

function clampDbText(input: unknown, max = 800) {
  const s = typeof input === 'string' ? input : '';
  return s.length > max ? s.slice(0, max) + `…[truncated ${s.length - max}]` : s;
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

    let body: { code: string; language: 'javascript' | 'python' | 'java' | 'cpp' };
    try {
      body = (await req.json()) as { code: string; language: 'javascript' | 'python' | 'java' | 'cpp' };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

  const problem = await prisma.problem.findUnique({
    where: { slug },
    select: {
      id: true,
      isPublished: true,
      signature: { select: { methodName: true } },
      testCases: {
        orderBy: [{ isHidden: 'asc' }, { order: 'asc' }],
        select: { order: true, input: true, expected: true, isHidden: true },
      },
    },
  });

  if (!problem || !problem.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let passedCount = 0;
  const details: Array<{ order: number; isHidden: boolean; passed: boolean; output?: string }> = [];

  let sawRuntimeError = false;
  let lastRuntimeError: string | null = null;

  // Apply the same stdin/function-harness wrap that /api/execute uses, so
  // submitting matches running. The user code is expected to define a
  // `${methodName}(input)` function (from the problem's ProblemSignature;
  // defaults to "solution" for back-compat with non-ProblemSignature problems);
  // without this wrap, the function is never called and the submit silently
  // returns 0/N passed.
  const submitHarnessUsed = supportsHarness(body.language);
  const submitMethodName = problem.signature?.methodName ?? "solution";
  const submitEffectiveCode =
    submitHarnessUsed
      ? wrapForExecution(body.code, body.language as 'javascript' | 'typescript' | 'python', submitMethodName)
      : body.code;

  for (const tc of problem.testCases) {
    let output = '';
    let thisTestRuntimeError = false;

    try {
      ({ output } = await runOnPiston({
        code: submitEffectiveCode,
        language: body.language,
        stdin: tc.input,
      }));
    } catch (e) {
      // Don’t leak hidden test IO. We only store a short error string.
      sawRuntimeError = true;
      thisTestRuntimeError = true;
      lastRuntimeError = clampDbText(e instanceof Error ? e.message : 'Runtime Error');
      output = lastRuntimeError;
    }

    const passed = !thisTestRuntimeError && output.trim() === tc.expected.trim();
    if (passed) passedCount++;
    details.push({ order: tc.order, isHidden: tc.isHidden, passed, output });
  }

  const total = problem.testCases.length;
  const allPassed = passedCount === total;

  // Update bounded per-user-per-problem stats.
  // NOTE: This does not store full transcripts or code; just aggregate counters + lastStatus.
  const lastStatus = sawRuntimeError ? 'Runtime Error' : allPassed ? 'Accepted' : 'Wrong Answer';
  await prisma.userProblemStats.upsert({
    where: { userId_problemId: { userId: session.user.id, problemId: problem.id } },
    create: {
      userId: session.user.id,
      problemId: problem.id,
      submitCount: 1,
      acceptedCount: allPassed ? 1 : 0,
      wrongAnswerCount: allPassed ? 0 : 1,
      runtimeErrorCount: sawRuntimeError ? 1 : 0,
      lastStatus,
      lastError: sawRuntimeError ? lastRuntimeError : null,
      lastAt: new Date(),
    },
    update: {
      submitCount: { increment: 1 },
      acceptedCount: allPassed ? { increment: 1 } : undefined,
      wrongAnswerCount: allPassed ? undefined : { increment: 1 },
      runtimeErrorCount: sawRuntimeError ? { increment: 1 } : undefined,
      lastStatus,
      lastError: sawRuntimeError ? lastRuntimeError : null,
      lastAt: new Date(),
    },
  });

  // Update personalization system with execution results
  if (session?.user?.id) {
    try {
      // Extract problem concepts (this would typically come from the problem data)
      const concepts = ['binary_search', 'two_pointer', 'sliding_window']; // This should be dynamic
      const problemContext = {
        problemId: problem.id,
        concepts: concepts,
        patterns: [] as string[], // This should also be dynamic
        difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD'
      };

      const executionStats = {
        passed: allPassed,
        testResults: details.map(r => ({
          passed: r.passed,
          input: r.output || '',
          expected: r.output || '',
          actual: r.output || ''
        })),
        runtime: 100
      };

      // Update the knowledge graph
      await updateAfterExecution(
        session.user.id,
        problemContext,
        executionStats
      );
    } catch (error) {
      console.error('Personalization update failed:', error);
    }
  }

  // IMPORTANT: do NOT return hidden test inputs/expected.
  return NextResponse.json({ allPassed, passedCount, total, details });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
