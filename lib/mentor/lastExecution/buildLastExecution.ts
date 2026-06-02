/**
 * Composes the LastExecution union from raw per-test results.
 *
 * Evaluation order (top to bottom, evaluated in this exact sequence):
 *   1. no_execution_yet   — empty test result set.
 *   2. all_passed         — must be checked before any error branch.
 *   3. tle                — wins over wrong_answer (algorithmic signal).
 *   4. compile_error      — wins over runtime_error (user must fix code shape first).
 *   5. runtime_error      — wins over wrong_answer (crashing program, nothing to compare).
 *   6. failed_tests       — top 3 failures + omittedFailures count.
 *
 * Caps `failures` at MAX_FAILURES (3). Surplus is counted, not dropped silently.
 */

import { analyzeShape } from "./shapeAnalyzer";
import { classifyFailure } from "./failureClassifier";
import { getProblemTimeLimit } from "@/lib/executor/timeLimits";
import { MAX_FAILURES } from "./constants";
import type { FailureSummary, LastExecution } from "./types";

export type RawTestStatus =
  | "passed"
  | "wrong_answer"
  | "runtime_error"
  | "compile_error"
  | "time_limit_exceeded"
  | "tle";

export type RawTestResult = {
  index: number;
  status: RawTestStatus;
  rawInput: string;
  actual: string;
  expected: string;
  stderr?: string;
  isHidden: boolean;
  runtimeMs: number;
};

export type BuildInput = {
  testResults: RawTestResult[];
  problem: { timeLimitMs: number | null };
  language: string;
  codeHash: string;
};

function isErrorStatus(status: RawTestStatus): boolean {
  return status !== "passed";
}

function buildFailureSummary(
  result: RawTestResult,
  limitMs: number
): FailureSummary {
  const classification = classifyFailure({
    rawInput: result.rawInput,
    actual: result.actual,
    expected: result.expected,
    runtimeMs: result.runtimeMs,
    limitMs,
    isHidden: result.isHidden,
  });
  // The shape is computed separately for hidden tests so the small_literal
  // gate is enforced at the analyzer layer (defense in depth).
  const inputShape = analyzeShape(result.rawInput, { isHidden: result.isHidden });
  return {
    index: result.index,
    failureType: classification.failureType,
    rootCauseHint: classification.rootCauseHint,
    evidence: classification.evidence,
    inputShape,
    expectedShape: classification.expectedShape,
    actualShape: classification.actualShape,
  };
}

export function buildLastExecution(input: BuildInput): LastExecution {
  const { testResults, problem, language, codeHash } = input;

  // 1. No execution yet — empty result set.
  if (testResults.length === 0) {
    return { kind: "no_execution_yet" };
  }

  const passed = testResults.filter((r) => r.status === "passed").length;
  const total = testResults.length;

  // 2. All passed — must be checked before any error branch.
  if (passed === total) {
    const maxRuntimeMs = testResults.reduce(
      (max, r) => Math.max(max, r.runtimeMs),
      0
    );
    return {
      kind: "all_passed",
      passed,
      total,
      runtimeMs: maxRuntimeMs,
      codeHash,
    };
  }

  const limitMs = getProblemTimeLimit(problem);

  // 3. TLE — wins over wrong_answer.
  const tleResult = testResults.find(
    (r) => r.status === "tle" || r.status === "time_limit_exceeded"
  );
  if (tleResult) {
    return {
      kind: "tle",
      runtimeMs: tleResult.runtimeMs,
      limitMs,
      language,
      codeHash,
    };
  }

  // 4. Compile error — wins over runtime error.
  const compileResult = testResults.find((r) => r.status === "compile_error");
  if (compileResult) {
    return {
      kind: "compile_error",
      message: compileResult.stderr ?? "Compile error",
      language,
      codeHash,
    };
  }

  // 5. Runtime error — wins over wrong_answer.
  const runtimeResult = testResults.find((r) => r.status === "runtime_error");
  if (runtimeResult) {
    return {
      kind: "runtime_error",
      message: runtimeResult.stderr ?? "Runtime error",
      language,
      codeHash,
    };
  }

  // 6. Failed tests — wrong_answer failures. Top 3 with the rest as omittedFailures.
  const failed = testResults.filter((r) => r.status === "wrong_answer");
  const failures: FailureSummary[] = failed
    .slice(0, MAX_FAILURES)
    .map((r) => buildFailureSummary(r, limitMs));

  return {
    kind: "failed_tests",
    passed,
    total,
    failures,
    omittedFailures: Math.max(0, failed.length - MAX_FAILURES),
    codeHash,
  };
}

// Re-export isErrorStatus for tests that need to verify status semantics.
export { isErrorStatus };
