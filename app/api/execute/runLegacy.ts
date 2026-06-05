import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { runOnPiston, LANGUAGE_CONFIG, PistonUnreachableError, getPistonUrls } from "@/lib/piston";
import { classifyError, type ExecutionErrorKind } from "@/lib/executor/errorClassifier";
import { getProblemTimeLimit, PISTON_HARD_TIMEOUT_MS } from "@/lib/executor/timeLimits";
import {
  checkUndefinedMethodGuard as checkUndefinedMethodGuardInternal,
  prepareHarnessForTestCase,
  type HarnessGuardFailure,
} from "@/lib/executor/harness";
import { buildExpectedCallSummary } from "@/lib/judge/harness";
import {
  buildLastExecution,
  buildTestCaseView,
  type RawTestResult,
  type RawTestStatus,
  type TestCaseView,
} from "@/lib/mentor/lastExecution";
import type { ProblemSignature } from "@/lib/judge/types";
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

function computeCodeHash(code: string | undefined): string | null {
  if (!code || code.trim().length < 10) return null;
  return crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);
}

function toRawTestStatus(status: TestStatus): RawTestStatus {
  if (status === "time_limit_exceeded") return "tle";
  return status;
}

const FALLBACK_SIGNATURE: ProblemSignature = {
  className: null,
  methodName: "solution",
  paramTypes: [],
  returnType: "unknown",
};

export async function runLegacyJudge(
  body: LegacyRequest,
  debug: boolean,
): Promise<NextResponse> {
  const { code, problemId, runAll, language } = body;

  const problem = problemId
    ? await prisma.problem.findFirst({
        where: { OR: [{ id: problemId }, { slug: problemId }] },
        select: {
          timeLimitMs: true,
          signature: {
            select: { className: true, methodName: true, paramTypes: true, returnType: true },
          },
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
  const signature: ProblemSignature = problem?.signature
    ? {
        className: problem.signature.className,
        methodName: problem.signature.methodName,
        paramTypes:
          (problem.signature.paramTypes as unknown as ProblemSignature["paramTypes"]) ?? [],
        returnType: problem.signature.returnType,
      }
    : FALLBACK_SIGNATURE;

  if (testCases.length === 0) {
    return NextResponse.json({ ok: false, error: "No test cases available" }, { status: 400 });
  }

  const guardFailure = checkUndefinedMethodGuardInternal(
    code,
    language as unknown as Parameters<typeof checkUndefinedMethodGuardInternal>[1],
    signature,
  );
  if (guardFailure) {
    return NextResponse.json(
      { ok: false, code: "undefined_method", ...guardFailure },
      { status: 400 },
    );
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
    rawStdout?: string;
    rawStderr?: string;
    _servedBy?: string;
  }> = [];

  for (const tc of testCases) {
    const start = Date.now();
    const prepared = prepareHarnessForTestCase(
      code,
      language as unknown as Parameters<typeof prepareHarnessForTestCase>[1],
      signature,
      tc.input,
    );
    try {
      const { output, runtimeMs, stderr, exitCode, signal, servedBy } = await runOnPiston({
        code: prepared.effectiveCode,
        language,
        stdin: prepared.stdin,
      });

      const actual = extractActualOutput(output);
      const expectedTrimmed = tc.expected.trim();
      const cleanedStderr = stripHarnessErrorPrefix(stderr);

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
        const kind = classifyError(cleanedStderr, language);
        const status: TestStatus = kind === "compile_error" ? "compile_error" : "runtime_error";
        results.push({
          testCaseId: tc.id,
          status,
          input: tc.input,
          expected: tc.expected,
          actual,
          executionTime: runtimeMs,
          error: cleanedStderr || output || `Exit code ${exitCode}`,
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
        signature,
        expectedCall: buildExpectedCallSummary(
          signature,
          "single-exec",
          language as unknown as Parameters<typeof buildExpectedCallSummary>[2],
        ),
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

  const aggregate: TestStatus =
    results.length === 0
      ? "runtime_error"
      : results.every((r) => r.status === "passed")
        ? "passed"
        : (results.find((r) => r.status !== "passed")?.status ?? "runtime_error");

  if (aggregate !== "passed") {
    const firstFailingTc = testCases[results.findIndex((r) => r.status !== "passed")];
    const preparedForFailing = firstFailingTc
      ? prepareHarnessForTestCase(
          code,
          language as unknown as Parameters<typeof prepareHarnessForTestCase>[1],
          signature,
          firstFailingTc.input,
        )
      : null;
    console.warn("[execute:legacy] failure", {
      problemId,
      language,
      methodName: signature.methodName,
      className: signature.className,
      aggregate,
      firstFailing: results.find((r) => r.status !== "passed"),
      wrappedCode: preparedForFailing?.effectiveCode,
    });
  }

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

/**
 * Extract the harness result from Piston stdout. The shared judge
 * harness (lib/judge/harness.ts) prefixes per-test results with
 * `__RESULT__:`. Returns a trimmed JSON string ready for legacy
 * string-compare against `expected.trim()`.
 *
 * If no prefix is present (e.g. raw stdout, error path), returns the
 * raw trimmed output so the legacy path still has a best-effort value.
 */
function extractActualOutput(output: string): string {
  const stripped = stripResultPrefixLocal(output);
  if (stripped === null) return output.trim();
  return stripped;
}

function stripResultPrefixLocal(output: string): string | null {
  if (!output) return null;
  const lines = output.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("__RESULT__:")) {
      return trimmed.slice("__RESULT__:".length).trim();
    }
    if (trimmed.startsWith("__RESULTS__:")) {
      return trimmed.slice("__RESULTS__:".length).trim();
    }
  }
  return null;
}

function stripHarnessErrorPrefix(stderr: string | undefined): string {
  if (!stderr) return "";
  const lines = stderr.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("__ERROR__:")) {
      return trimmed.slice("__ERROR__:".length).trim();
    }
  }
  return stderr;
}

export type { HarnessGuardFailure };
