import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { runOnPiston, LANGUAGE_CONFIG } from '@/lib/piston';
import { classifyError, type ExecutionErrorKind } from '@/lib/executor/errorClassifier';
import { getProblemTimeLimit, PISTON_HARD_TIMEOUT_MS } from '@/lib/executor/timeLimits';
import {
  buildLastExecution,
  buildTestCaseView,
  type RawTestResult,
  type RawTestStatus,
  type TestCaseView,
} from '@/lib/mentor/lastExecution';

type ExecutableLanguage = keyof typeof LANGUAGE_CONFIG;

function normalizeLanguage(language: string): ExecutableLanguage | null {
  if (language === 'typescript') return 'javascript';
  if (language in LANGUAGE_CONFIG) return language as ExecutableLanguage;
  return null;
}

/**
 * Server-side code hash. Same algorithm as `lib/mentor/orchestrator.ts`
 * (sha256, 12-char prefix). The page also computes this for diagnostics,
 * but the server is the authority on stale detection.
 *
 * Returns null for empty / very short code — same convention as the
 * orchestrator's `computeCodeHash`. Null means "no meaningful code to hash";
 * in that case we omit the hash from the response so downstream code can
 * treat it as "no execution possible."
 */
function computeCodeHash(code: string | undefined): string | null {
  if (!code || code.trim().length < 10) return null;
  return crypto.createHash('sha256').update(code).digest('hex').slice(0, 12);
}

/**
 * Maps a TestStatus from the executor to the union consumed by
 * buildLastExecution. Currently a 1:1 mapping; isolated so future
 * renames don't leak.
 */
function toRawTestStatus(status: TestStatus): RawTestStatus {
  if (status === 'time_limit_exceeded') return 'tle';
  return status;
}

type TestStatus =
  | 'passed'
  | 'wrong_answer'
  | 'runtime_error'
  | 'compile_error'
  | 'time_limit_exceeded';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      code: string;
      language: string;
      problemId?: string;
      runAll?: boolean;
    };
    const { code, problemId, runAll } = body;
    const language = normalizeLanguage(body.language);

    if (!code || !language) {
      return NextResponse.json(
        { ok: false, error: language ? 'Missing code' : `Language "${body.language}" is not supported for execution` },
        { status: 400 }
      );
    }

    const problem = problemId ? await prisma.problem.findFirst({
      where: { OR: [{ id: problemId }, { slug: problemId }] },
      select: {
        timeLimitMs: true,
        testCases: {
          where: runAll ? undefined : { isHidden: false },
          orderBy: { order: 'asc' },
          select: { id: true, input: true, expected: true, isHidden: true },
        },
      },
    }) : null;

    const timeLimitMs = getProblemTimeLimit({ timeLimitMs: problem?.timeLimitMs ?? null });

    const testCases = problem?.testCases ?? [];
    if (testCases.length === 0) {
      return NextResponse.json({ ok: false, error: 'No test cases available' }, { status: 400 });
    }

    const results: Array<{
      testCaseId: string;
      status: TestStatus;
      input: string;
      expected: string;
      actual: string;
      executionTime: number;
      error?: string;
      errorKind?: ExecutionErrorKind;
      isHidden: boolean;
    }> = [];

    for (const tc of testCases) {
      const start = Date.now();
      try {
        const { output, runtimeMs, stderr, exitCode, signal } = await runOnPiston({
          code,
          language,
          stdin: tc.input,
        });

        const actual = output.trim();
        const expectedTrimmed = tc.expected.trim();

        // First check for hard failures: non-zero exit, signal, or TLE.
        if (signal) {
          results.push({
            testCaseId: tc.id,
            status: 'time_limit_exceeded',
            input: tc.input,
            expected: tc.expected,
            actual,
            executionTime: runtimeMs,
            error: `Execution terminated by signal: ${signal}`,
            isHidden: tc.isHidden,
          });
          break;
        }

        if (runtimeMs > timeLimitMs) {
          results.push({
            testCaseId: tc.id,
            status: 'time_limit_exceeded',
            input: tc.input,
            expected: tc.expected,
            actual,
            executionTime: runtimeMs,
            error: `Runtime ${runtimeMs}ms exceeded limit ${timeLimitMs}ms`,
            isHidden: tc.isHidden,
          });
          break;
        }

        if (exitCode !== null && exitCode !== 0) {
          const kind = classifyError(stderr, language);
          const status: TestStatus = kind === 'compile_error' ? 'compile_error' : 'runtime_error';
          results.push({
            testCaseId: tc.id,
            status,
            input: tc.input,
            expected: tc.expected,
            actual,
            executionTime: runtimeMs,
            error: stderr || output || `Exit code ${exitCode}`,
            errorKind: kind,
            isHidden: tc.isHidden,
          });
          break;
        }

        const passed = actual === expectedTrimmed;
        results.push({
          testCaseId: tc.id,
          status: passed ? 'passed' : 'wrong_answer',
          input: tc.input,
          expected: tc.expected,
          actual,
          executionTime: runtimeMs,
          isHidden: tc.isHidden,
        });

        if (!passed) break;
      } catch (e) {
        results.push({
          testCaseId: tc.id,
          status: 'runtime_error',
          input: tc.input,
          expected: tc.expected,
          actual: '',
          executionTime: Date.now() - start,
          error: e instanceof Error ? e.message : 'Runtime error',
          errorKind: 'unknown',
          isHidden: tc.isHidden,
        });
        break;
      }
    }

    // ── Build LastExecution for the mentor (PR 3) ──
    const codeHash = computeCodeHash(code);
    const rawResults: RawTestResult[] = results.map((r, i) => ({
      index: i,
      status: toRawTestStatus(r.status),
      rawInput: r.input,
      actual: r.actual,
      expected: r.expected,
      stderr: r.error,
      isHidden: r.isHidden,
      runtimeMs: r.executionTime,
    }));
    const lastExecution = buildLastExecution({
      testResults: rawResults,
      problem: { timeLimitMs: problem?.timeLimitMs ?? null },
      language,
      codeHash: codeHash ?? "",
    });

    // ── Build per-test views for the response (PR 4) ──
    // The view is the single source of truth for how a per-test result is
    // presented to any consumer. For hidden tests, the redacted view NEVER
    // carries raw input/expected/actual/runtime-error — only shape
    // descriptors and (for compile errors) the compiler message. This is
    // why the response omits the raw fields for hidden tests.
    const views: TestCaseView[] = results.map((r, i) =>
      buildTestCaseView(
        {
          testCaseId: r.testCaseId,
          index: i,
          status: r.status,
          input: r.input,
          expected: r.expected,
          actual: r.actual,
          error: r.error,
          errorKind: r.errorKind,
          executionTime: r.executionTime,
        },
        r.isHidden,
      ),
    );

    return NextResponse.json({
      ok: true,
      results: views,
      timeLimitMs,
      pistonHardTimeoutMs: PISTON_HARD_TIMEOUT_MS,
      lastExecution,
      codeHash,
    });
  } catch (error: unknown) {
    console.error('Execution error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute code';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
