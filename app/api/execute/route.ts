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
import { wrapForExecution, supportsHarness } from '@/lib/executor/harness';
import { getPistonUrls, PistonUnreachableError } from '@/lib/piston';

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

    if (!code || !code.trim() || !language) {
      return NextResponse.json(
        { ok: false, error: language ? 'Missing code' : `Language "${body.language}" is not supported for execution` },
        { status: 400 }
      );
    }

    // Debug mode: append `?debug=1` to see the raw Piston response, the
    // exact code that was sent, the harness that was applied (or skipped),
    // and the per-test raw stdout/stderr. Stripped from the response unless
    // requested — useful when "I don't see any output" comes up.
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';
    const harnessUsed = supportsHarness(language);
    const effectiveCode = harnessUsed ? wrapForExecution(code, language) : code;

    // Diagnose mode: `?diagnose=1` short-circuits the executor and
    // returns JUST the URL chain + which one (if any) actually served
    // a /runtimes probe. Use this to verify "is my Docker Piston
    // reachable from Next.js?" without running code. POST body still
    // required because Next.js route handlers need a method.
    if (url.searchParams.get('diagnose') === '1') {
      const tried = [...getPistonUrls()];
      const probes: Array<{ url: string; reachable: boolean; status?: number; err?: string; ms: number }> = [];
      for (const u of tried) {
        const start = Date.now();
        try {
          const res = await fetch(`${u}/runtimes`, {
            method: 'GET',
            signal: AbortSignal.timeout(3_000),
          });
          probes.push({
            url: u,
            reachable: res.ok,
            status: res.status,
            ms: Date.now() - start,
          });
        } catch (e) {
          probes.push({
            url: u,
            reachable: false,
            err: e instanceof Error ? e.message.slice(0, 200) : String(e),
            ms: Date.now() - start,
          });
        }
      }
      return NextResponse.json({
        ok: true,
        diagnose: true,
        triedUrls: tried,
        probes,
        env: {
          PISTON_LOCAL_URL: process.env.PISTON_LOCAL_URL ?? null,
          PISTON_API_URL: process.env.PISTON_API_URL ?? null,
          PISTON_EXTRA_URLS: process.env.PISTON_EXTRA_URLS ?? null,
        },
      });
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
      /** Raw stdout from Piston (debug only). Hidden from hidden tests. */
      rawStdout?: string;
      /** Raw stderr from Piston (debug only). Hidden from hidden tests. */
      rawStderr?: string;
      /** Which Piston URL served this test (debug only). */
      _servedBy?: string;
    }> = [];

    for (const tc of testCases) {
      const start = Date.now();
      try {
        const { output, runtimeMs, stderr, exitCode, signal, servedBy } = await runOnPiston({
          code: effectiveCode,
          language,
          stdin: tc.input,
        });

        // The harness prints to stdout; raw stderr is preserved separately.
        // For a `wrong_answer` we want stdout; for `runtime_error` we want
        // stderr. Don't merge them into the `actual` field — that breaks
        // the diff against `expected` and pollutes the user-facing output.
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
            rawStdout: debug ? output : undefined,
            rawStderr: debug ? stderr : undefined,
            _servedBy: servedBy,
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
            rawStdout: debug ? output : undefined,
            rawStderr: debug ? stderr : undefined,
            _servedBy: servedBy,
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
            rawStdout: debug ? output : undefined,
            rawStderr: debug ? stderr : undefined,
            _servedBy: servedBy,
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
          rawStdout: debug ? output : undefined,
          rawStderr: debug ? stderr : undefined,
          _servedBy: servedBy,
        });

        if (!passed) break;
      } catch (e) {
        // PistonUnreachableError is a configuration problem, not a user
        // code problem. Surface it as a clearer 502-class message so the
        // UI can render a "set PISTON_LOCAL_URL" hint instead of a
        // generic "Runtime error".
        const isUnreachable = e instanceof PistonUnreachableError;
        const message = e instanceof Error ? e.message : 'Runtime error';
        results.push({
          testCaseId: tc.id,
          status: 'runtime_error',
          input: tc.input,
          expected: tc.expected,
          actual: '',
          executionTime: Date.now() - start,
          error: message,
          errorKind: isUnreachable ? 'runtime_error' : 'unknown',
          isHidden: tc.isHidden,
          rawStderr: debug ? message : undefined,
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

    // When `?debug=1` is set, attach the raw Piston output per test so
    // the user (or a developer) can see exactly what the runtime
    // produced. Always include the harness diagnostics so we can verify
    // the wrap was applied (or skipped for unsupported languages).
    const lastServedBy = (results.find((r) => r._servedBy) as
      | { _servedBy?: string }
      | undefined)?._servedBy;
    const debugInfo = debug
      ? {
          harness: {
            applied: harnessUsed,
            language,
            // Show the first ~200 chars of the harness header to confirm
            // the wrap actually happened. Avoids dumping the user's
            // entire code back at them.
            header: harnessUsed ? effectiveCode.split('\n').slice(0, 3).join('\n') : null,
          },
          // Which URLs were tried in the chain. If you see emkc.org
          // here but you have a local Docker, you have an env override
          // somewhere — check .env / PISTON_API_URL.
          piston: {
            triedUrls: [...getPistonUrls()],
            servedBy: lastServedBy ?? '(none — chain failed)',
          },
          results: results.map((r, i) => ({
            index: i,
            status: r.status,
            rawStdout: r.rawStdout ?? null,
            rawStderr: r.rawStderr ?? null,
            actual: r.actual,
            expected: r.expected,
            // For hidden tests we deliberately still attach the raw
            // fields in debug mode — it's a server-side diagnostic, not
            // a user-visible field. The buildTestCaseView above still
            // redacts them from the regular `results` array.
          })),
        }
      : undefined;

    return NextResponse.json({
      ok: true,
      results: views,
      timeLimitMs,
      pistonHardTimeoutMs: PISTON_HARD_TIMEOUT_MS,
      lastExecution,
      codeHash,
      ...(debugInfo ? { debug: debugInfo } : {}),
    });
  } catch (error: unknown) {
    console.error('Execution error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute code';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
