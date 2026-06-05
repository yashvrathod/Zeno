import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runOnPiston, LANGUAGE_CONFIG, PistonUnreachableError, getPistonUrls } from "@/lib/piston";
import { classifyError, type ExecutionErrorKind } from "@/lib/executor/errorClassifier";
import { getProblemTimeLimit, PISTON_HARD_TIMEOUT_MS } from "@/lib/executor/timeLimits";
import { wrapForExecution, supportsHarness } from "@/lib/executor/harness";
import {
  buildLastExecution,
  buildTestCaseView,
  type RawTestResult,
  type RawTestStatus,
  type TestCaseView,
} from "@/lib/mentor/lastExecution";
import crypto from "crypto";

type ExecutableLanguage = keyof typeof LANGUAGE_CONFIG;

type TestStatus =
  | "passed"
  | "wrong_answer"
  | "runtime_error"
  | "compile_error"
  | "time_limit_exceeded";

type LegacyProblem = {
  id: string;
  timeLimitMs: number | null;
  testCases: Array<{ id: string; order: number; input: string; expected: string; isHidden: boolean }>;
};

export type LegacyRequest = {
  code: string;
  language: ExecutableLanguage;
  problemId?: string;
  runAll?: boolean;
  debug?: boolean;
};

function normalizeLanguage(language: string): ExecutableLanguage | null {
  if (language === "typescript") return "javascript";
  if (language in LANGUAGE_CONFIG) return language as ExecutableLanguage;
  return null;
}

function asLegacyLanguage(language: string): ExecutableLanguage | null {
  return normalizeLanguage(language);
}

function computeCodeHash(code: string | undefined): string | null {
  if (!code || code.trim().length < 10) return null;
  return crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);
}

function toRawTestStatus(status: TestStatus): RawTestStatus {
  if (status === "time_limit_exceeded") return "tle";
  return status;
}

export async function runLegacyJudge(
  body: LegacyRequest,
  debug: boolean,
): Promise<NextResponse> {
  const { code, problemId, runAll, language } = body;
  const harnessUsed = supportsHarness(language);

  const problem = problemId
    ? await prisma.problem.findFirst({
        where: { OR: [{ id: problemId }, { slug: problemId }] },
        select: {
          timeLimitMs: true,
          signature: { select: { methodName: true } },
          testCases: {
            where: runAll ? undefined : { isHidden: false },
            orderBy: { order: "asc" },
            select: { id: true, input: true, expected: true, isHidden: true },
          },
        },
      })
    : null;

  const timeLimitMs = getProblemTimeLimit({ timeLimitMs: problem?.timeLimitMs ?? null });
  const testCases = (problem?.testCases ?? []) as unknown as LegacyProblem["testCases"];
  const methodName = problem?.signature?.methodName ?? "solution";

  if (testCases.length === 0) {
    return NextResponse.json({ ok: false, error: "No test cases available" }, { status: 400 });
  }

  const effectiveCode = harnessUsed ? wrapForExecution(code, language, methodName) : code;

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
    rawStdout?: string;
    rawStderr?: string;
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

      const actual = output.trim();
      const expectedTrimmed = tc.expected.trim();

      if (signal) {
        results.push({
          testCaseId: tc.id,
          status: "time_limit_exceeded",
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
          status: "time_limit_exceeded",
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
        const status: TestStatus = kind === "compile_error" ? "compile_error" : "runtime_error";
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
        status: passed ? "passed" : "wrong_answer",
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
      const isUnreachable = e instanceof PistonUnreachableError;
      const message = e instanceof Error ? e.message : "Runtime error";
      results.push({
        testCaseId: tc.id,
        status: "runtime_error",
        input: tc.input,
        expected: tc.expected,
        actual: "",
        executionTime: Date.now() - start,
        error: message,
        errorKind: isUnreachable ? "runtime_error" : "unknown",
        isHidden: tc.isHidden,
        rawStderr: debug ? message : undefined,
      });
      break;
    }
  }

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

  const lastServedBy = (results.find((r) => r._servedBy) as { _servedBy?: string } | undefined)?._servedBy;
  const debugInfo = debug
    ? {
        harness: {
          applied: harnessUsed,
          language,
          header: harnessUsed ? effectiveCode.split("\n").slice(0, 3).join("\n") : null,
        },
        piston: {
          triedUrls: [...getPistonUrls()],
          servedBy: lastServedBy ?? "(none — chain failed)",
        },
        results: results.map((r, i) => ({
          index: i,
          status: r.status,
          rawStdout: r.rawStdout ?? null,
          rawStderr: r.rawStderr ?? null,
          actual: r.actual,
          expected: r.expected,
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
}
