import { runOnPiston, PistonResult } from "@/lib/piston";
import { buildHarness, EXEC_MS_PREFIX, RESULT_PREFIX, RESULTS_PREFIX, ERROR_PREFIX } from "./harness";
import { getChecker } from "./checkers";
import { Language, Verdict } from "./verdict";
import {
  CompileError,
  JudgeInput,
  JudgeOutput,
  JudgeTestCase,
  PerTestResult,
} from "./types";

const DEFAULT_OUTPUT_LIMIT_KB = 64;

export async function runJudge(input: JudgeInput): Promise<JudgeOutput> {
  const startedAt = Date.now();
  const outputLimitKb = input.outputLimitKb ?? DEFAULT_OUTPUT_LIMIT_KB;

  if (input.mode === "per-test") {
    return await runPerTest({
      input,
      startedAt,
      outputLimitKb,
    });
  }

  let harnessResult;
  try {
    harnessResult = buildHarness({
      userCode: input.code,
      signature: input.signature,
      testCases: input.testCases,
      mode: input.mode,
      language: input.language,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build harness";
    return {
      results: [],
      aggregate: "compile_error",
      compileError: { kind: "compile_error", message, language: input.language },
      mode: input.mode,
      wallClockMs: Date.now() - startedAt,
    };
  }

  return await runSingleExec({
    input,
    harnessCode: harnessResult.code,
    startedAt,
    outputLimitKb,
  });
}

type RunContext = {
  input: JudgeInput;
  harnessCode?: string;
  startedAt: number;
  outputLimitKb: number;
};

async function runPerTest(ctx: RunContext): Promise<JudgeOutput> {
  const { input, startedAt, outputLimitKb } = ctx;
  const results: PerTestResult[] = [];
  let compileError: CompileError | undefined;
  let servedBy: string | undefined;
  let aggregate: Verdict = "accepted";

  for (let i = 0; i < input.testCases.length; i++) {
    const tc = input.testCases[i]!;
    const singleCase: JudgeTestCase[] = [tc];
    let wrapped;
    try {
      wrapped = buildHarness({
        userCode: input.code,
        signature: input.signature,
        testCases: singleCase,
        mode: "per-test",
        language: input.language,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to build harness";
      compileError = { kind: "compile_error", message, language: input.language };
      aggregate = "compile_error";
      break;
    }

    let pistonResult: PistonResult;
    try {
      pistonResult = await runOnPiston({
        code: wrapped.code,
        language: input.language,
        stdin: wrapped.stdinJson,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Execution failed";
      results.push({
        testCaseId: tc.id,
        index: i,
        verdict: "runtime_error",
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: message,
        isHidden: tc.isHidden,
      });
      aggregate = "runtime_error";
      break;
    }
    servedBy = pistonResult.servedBy;

    const parsed = parsePerTestOutput(pistonResult, tc, input.timeLimitMs, outputLimitKb);
    if (parsed.compileError) {
      compileError = parsed.compileError;
      aggregate = "compile_error";
      break;
    }
    const finalResult: PerTestResult = { ...parsed.result };
    if (finalResult.verdict === "accepted") {
      const verdict = compareOutput(finalResult.actualJson, tc, input.signature.methodName);
      if (verdict !== "accepted") {
        finalResult.verdict = verdict;
        finalResult.errorMessage = verdict === "wrong_answer" ? "Output does not match expected" : finalResult.errorMessage;
      }
    }
    results.push(finalResult);
    if (finalResult.verdict !== "accepted") {
      aggregate = finalResult.verdict;
      break;
    }
  }

  if (aggregate === "accepted" && results.length < input.testCases.length) {
    aggregate = "runtime_error";
  }

  return {
    results,
    aggregate,
    compileError,
    mode: "per-test",
    servedBy,
    wallClockMs: Date.now() - startedAt,
  };
}

async function runSingleExec(ctx: RunContext): Promise<JudgeOutput> {
  const { input, harnessCode, startedAt, outputLimitKb } = ctx;
  let pistonResult: PistonResult;
  try {
    pistonResult = await runOnPiston({
      code: harnessCode,
      language: input.language,
      stdin: JSON.stringify(
        input.testCases.map((tc) => ({
          args: tc.args,
          expected: tc.expectedJson,
          order: tc.order,
        })),
      ),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Execution failed";
    return {
      results: input.testCases.map((tc, i) => ({
        testCaseId: tc.id,
        index: i,
        verdict: "runtime_error" as Verdict,
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: message,
        isHidden: tc.isHidden,
      })),
      aggregate: "runtime_error",
      mode: "single-exec",
      wallClockMs: Date.now() - startedAt,
    };
  }

  const execMs = parseExecMs(pistonResult.stderr);
  const combinedOutput = pistonResult.stdout + (pistonResult.stderr ?? "");

  if (pistonResult.exitCode !== 0 && pistonResult.exitCode !== null) {
    const errMsg = extractError(combinedOutput) ?? `Exit code ${pistonResult.exitCode}`;
    if (looksLikeCompileError(combinedOutput)) {
      return {
        results: [],
        aggregate: "compile_error",
        compileError: { kind: "compile_error", message: errMsg, language: input.language },
        mode: "single-exec",
        servedBy: pistonResult.servedBy,
        wallClockMs: Date.now() - startedAt,
      };
    }
    return {
      results: input.testCases.map((tc, i) => ({
        testCaseId: tc.id,
        index: i,
        verdict: "runtime_error" as Verdict,
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: errMsg,
        isHidden: tc.isHidden,
      })),
      aggregate: "runtime_error",
      mode: "single-exec",
      servedBy: pistonResult.servedBy,
      wallClockMs: Date.now() - startedAt,
    };
  }

  const stdoutBytes = Buffer.byteLength(pistonResult.stdout, "utf8");
  if (stdoutBytes > outputLimitKb * 1024) {
    return {
      results: input.testCases.map((tc, i) => ({
        testCaseId: tc.id,
        index: i,
        verdict: "output_limit_exceeded" as Verdict,
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: `Output exceeded ${outputLimitKb}KB limit`,
        isHidden: tc.isHidden,
      })),
      aggregate: "output_limit_exceeded",
      mode: "single-exec",
      servedBy: pistonResult.servedBy,
      wallClockMs: Date.now() - startedAt,
    };
  }

  const tleResult = checkTle(execMs, input.timeLimitMs, pistonResult, outputLimitKb);
  if (tleResult) {
    return {
      results: input.testCases.map((tc, i) => ({
        testCaseId: tc.id,
        index: i,
        verdict: tleResult.verdict,
        execMs,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: tleResult.message,
        isHidden: tc.isHidden,
      })),
      aggregate: tleResult.verdict,
      mode: "single-exec",
      servedBy: pistonResult.servedBy,
      wallClockMs: Date.now() - startedAt,
    };
  }

  const resultsLine = extractLine(pistonResult.stdout, RESULTS_PREFIX);
  if (!resultsLine) {
    return {
      results: input.testCases.map((tc, i) => ({
        testCaseId: tc.id,
        index: i,
        verdict: "runtime_error" as Verdict,
        execMs,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: "Harness did not emit __RESULTS__ line",
        isHidden: tc.isHidden,
      })),
      aggregate: "runtime_error",
      mode: "single-exec",
      servedBy: pistonResult.servedBy,
      wallClockMs: Date.now() - startedAt,
    };
  }

  let parsedResults: Array<{ index: number; result: unknown; execMs: number | null; error: string | null }>;
  try {
    parsedResults = JSON.parse(resultsLine);
  } catch {
    return {
      results: input.testCases.map((tc, i) => ({
        testCaseId: tc.id,
        index: i,
        verdict: "runtime_error" as Verdict,
        execMs,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: "Harness emitted malformed __RESULTS__ JSON",
        isHidden: tc.isHidden,
      })),
      aggregate: "runtime_error",
      mode: "single-exec",
      servedBy: pistonResult.servedBy,
      wallClockMs: Date.now() - startedAt,
    };
  }

  const results: PerTestResult[] = [];
  let aggregate: Verdict = "accepted";
  for (let i = 0; i < input.testCases.length; i++) {
    const tc = input.testCases[i]!;
    const harnessResult = parsedResults[i];
    if (!harnessResult) {
      results.push({
        testCaseId: tc.id,
        index: i,
        verdict: "runtime_error",
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: "Harness did not produce a result for this test case",
        isHidden: tc.isHidden,
      });
      aggregate = "runtime_error";
      break;
    }
    if (harnessResult.error) {
      results.push({
        testCaseId: tc.id,
        index: i,
        verdict: "runtime_error",
        execMs: harnessResult.execMs,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: harnessResult.error,
        isHidden: tc.isHidden,
      });
      aggregate = "runtime_error";
      break;
    }
    const verdict = compareOutput(harnessResult.result, tc, input.signature.methodName);
    results.push({
      testCaseId: tc.id,
      index: i,
      verdict,
      execMs: harnessResult.execMs,
      memKb: null,
      actualJson: harnessResult.result,
      expectedJson: tc.expectedJson,
      errorMessage: verdict === "wrong_answer" ? "Output does not match expected" : null,
      isHidden: tc.isHidden,
    });
    if (verdict !== "accepted") {
      aggregate = verdict;
      break;
    }
  }

  return {
    results,
    aggregate,
    mode: "single-exec",
    servedBy: pistonResult.servedBy,
    wallClockMs: Date.now() - startedAt,
  };
}

type ParsedPerTest =
  | { result: PerTestResult; compileError?: undefined }
  | { result: PerTestResult; compileError: CompileError };

function parsePerTestOutput(
  piston: PistonResult,
  tc: JudgeTestCase,
  timeLimitMs: number,
  outputLimitKb: number,
): ParsedPerTest {
  const combined = piston.stdout + "\n" + (piston.stderr ?? "");

  if (piston.signal) {
    return {
      result: {
        testCaseId: tc.id,
        index: 0,
        verdict: "runtime_error",
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: `Execution terminated by signal: ${piston.signal}`,
        isHidden: tc.isHidden,
      },
    };
  }

  if (piston.exitCode !== 0 && piston.exitCode !== null) {
    if (looksLikeCompileError(combined)) {
      const rawMessage = extractError(combined) ?? truncateForMessage(combined);
      return {
        result: {
          testCaseId: tc.id,
          index: 0,
          verdict: "compile_error",
          execMs: null,
          memKb: null,
          actualJson: null,
          expectedJson: tc.expectedJson,
          errorMessage: rawMessage,
          isHidden: tc.isHidden,
        },
        compileError: {
          kind: "compile_error",
          message: rawMessage,
          language: tc ? "javascript" : "javascript",
        },
      };
    }
    return {
      result: {
        testCaseId: tc.id,
        index: 0,
        verdict: "runtime_error",
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: extractError(combined) ?? truncateForMessage(combined) ?? `Exit code ${piston.exitCode}`,
        isHidden: tc.isHidden,
      },
    };
  }

  const stdoutBytes = Buffer.byteLength(piston.stdout, "utf8");
  if (stdoutBytes > outputLimitKb * 1024) {
    return {
      result: {
        testCaseId: tc.id,
        index: 0,
        verdict: "output_limit_exceeded",
        execMs: null,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: `Output exceeded ${outputLimitKb}KB limit`,
        isHidden: tc.isHidden,
      },
    };
  }

  const execMs = parseExecMs(piston.stderr);
  if (execMs !== null && execMs > timeLimitMs) {
    return {
      result: {
        testCaseId: tc.id,
        index: 0,
        verdict: "time_limit_exceeded",
        execMs,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: `Runtime ${execMs.toFixed(1)}ms exceeded limit ${timeLimitMs}ms`,
        isHidden: tc.isHidden,
      },
    };
  }

  const resultLine = extractLine(piston.stdout, RESULT_PREFIX);
  if (!resultLine) {
    const errLine = extractLine(piston.stderr, ERROR_PREFIX);
    return {
      result: {
        testCaseId: tc.id,
        index: 0,
        verdict: "runtime_error",
        execMs,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: errLine ?? "Harness did not emit __RESULT__ line",
        isHidden: tc.isHidden,
      },
    };
  }

  let actualJson: unknown;
  try {
    actualJson = JSON.parse(resultLine);
  } catch {
    return {
      result: {
        testCaseId: tc.id,
        index: 0,
        verdict: "runtime_error",
        execMs,
        memKb: null,
        actualJson: null,
        expectedJson: tc.expectedJson,
        errorMessage: "Harness emitted malformed __RESULT__ JSON",
        isHidden: tc.isHidden,
      },
    };
  }

  return {
    result: {
      testCaseId: tc.id,
      index: 0,
      verdict: "accepted",
      execMs,
      memKb: null,
      actualJson,
      expectedJson: tc.expectedJson,
      errorMessage: null,
      isHidden: tc.isHidden,
    },
  };
}

function compareOutput(actual: unknown, tc: JudgeTestCase, methodName: string): Verdict {
  const checker = getChecker(methodName);
  if (checker) {
    return checker(actual, tc.expectedJson) ? "accepted" : "wrong_answer";
  }
  return deepEqual(actual, tc.expectedJson) ? "accepted" : "wrong_answer";
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (!deepEqual(aObj[aKeys[i]!], bObj[bKeys[i]!])) return false;
  }
  return true;
}

function parseExecMs(stderr: string | undefined): number | null {
  if (!stderr) return null;
  const lines = stderr.split("\n");
  let total = 0;
  let found = false;
  for (const line of lines) {
    if (line.startsWith(EXEC_MS_PREFIX)) {
      const v = parseFloat(line.slice(EXEC_MS_PREFIX.length));
      if (!Number.isNaN(v)) {
        total += v;
        found = true;
      }
    }
  }
  return found ? total : null;
}

function extractLine(output: string, prefix: string): string | null {
  if (!output) return null;
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim();
    }
  }
  return null;
}

function extractError(output: string): string | null {
  const line = extractLine(output, ERROR_PREFIX);
  if (line) return line;
  return null;
}

function truncateForMessage(output: string, maxLen = 800): string {
  const trimmed = output.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + "…";
}

function looksLikeCompileError(output: string): boolean {
  if (!output) return false;
  return /syntax\s*error|parse\s*error|compilation terminated|cannot find symbol|undefined reference|unexpected token|invalid syntax|unresolved reference|name\s*'?error.*is\s*not\s*defined|java:.*error:|java:\s*cannot find symbol/i.test(
    output,
  );
}

function checkTle(
  execMs: number | null,
  timeLimitMs: number,
  piston: PistonResult,
  outputLimitKb: number,
): { verdict: Verdict; message: string } | null {
  if (piston.signal === "SIGKILL" || piston.signal === "SIGXCPU") {
    return {
      verdict: "time_limit_exceeded",
      message: `Execution terminated by signal: ${piston.signal}`,
    };
  }
  if (execMs !== null && execMs > timeLimitMs) {
    return {
      verdict: "time_limit_exceeded",
      message: `Runtime ${execMs.toFixed(1)}ms exceeded limit ${timeLimitMs}ms`,
    };
  }
  return null;
}
