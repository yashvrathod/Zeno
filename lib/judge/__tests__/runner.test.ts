import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { JudgeInput, JudgeTestCase, ProblemSignature } from "../types";
import { RESULT_PREFIX, RESULTS_PREFIX, EXEC_MS_PREFIX, ERROR_PREFIX } from "../harness";

jest.mock("@/lib/piston", () => {
  const actual = jest.requireActual("@/lib/piston") as Record<string, unknown>;
  return {
    ...actual,
    runOnPiston: jest.fn(),
  };
});

import { runOnPiston } from "@/lib/piston";
import { runJudge } from "../runner";
import { clearCheckers, registerChecker } from "../checkers";

const mockRunOnPiston = runOnPiston as jest.MockedFunction<typeof runOnPiston>;

const SIG: ProblemSignature = {
  className: null,
  methodName: "twoSum",
  paramTypes: [
    { name: "nums", type: "number[]" },
    { name: "target", type: "number" },
  ],
  returnType: "number[]",
};

const TC1: JudgeTestCase = { id: "t1", order: 1, args: [[2, 7, 11, 15], 9], expectedJson: [0, 1], isHidden: false };
const TC2: JudgeTestCase = { id: "t2", order: 2, args: [[3, 2, 4], 6], expectedJson: [1, 2], isHidden: false };
const TC3: JudgeTestCase = { id: "t3", order: 3, args: [[3, 3], 6], expectedJson: [0, 1], isHidden: true };

const baseInput = (mode: "per-test" | "single-exec"): JudgeInput => ({
  code: "function twoSum(nums, target) { return [0, 1]; }",
  language: "javascript",
  signature: SIG,
  testCases: [TC1, TC2, TC3],
  timeLimitMs: 2000,
  mode,
});

function pistonOk(stdout: string, stderr: string = "", execMs = 50) {
  return {
    output: stdout,
    stdout,
    stderr,
    exitCode: 0,
    signal: null,
    runtimeMs: execMs,
    servedBy: "http://localhost:2000/api/v2",
  };
}

function pistonErr(exitCode: number, stderr: string) {
  return {
    output: stderr,
    stdout: "",
    stderr,
    exitCode,
    signal: null,
    runtimeMs: 100,
    servedBy: "http://localhost:2000/api/v2",
  };
}

beforeEach(() => {
  mockRunOnPiston.mockReset();
  clearCheckers();
});

describe("runJudge — per-test mode", () => {
  it("returns 'accepted' for all-passing", async () => {
    mockRunOnPiston
      .mockResolvedValueOnce(pistonOk(`${RESULT_PREFIX}[0,1]`, `${EXEC_MS_PREFIX}12.345`))
      .mockResolvedValueOnce(pistonOk(`${RESULT_PREFIX}[1,2]`, `${EXEC_MS_PREFIX}10.0`))
      .mockResolvedValueOnce(pistonOk(`${RESULT_PREFIX}[0,1]`, `${EXEC_MS_PREFIX}10.0`));
    const out = await runJudge(baseInput("per-test"));
    expect(out.aggregate).toBe("accepted");
    expect(out.results).toHaveLength(3);
    expect(out.results.every((r) => r.verdict === "accepted")).toBe(true);
    expect(mockRunOnPiston).toHaveBeenCalledTimes(3);
  });

  it("stops on first wrong_answer and marks aggregate wrong_answer", async () => {
    mockRunOnPiston
      .mockResolvedValueOnce(pistonOk(`${RESULT_PREFIX}[0,1]`, `${EXEC_MS_PREFIX}10.0`))
      .mockResolvedValueOnce(pistonOk(`${RESULT_PREFIX}[0,2]`, `${EXEC_MS_PREFIX}10.0`))
      .mockResolvedValue(pistonOk(`${RESULT_PREFIX}[0,1]`, `${EXEC_MS_PREFIX}10.0`));
    const out = await runJudge(baseInput("per-test"));
    expect(out.aggregate).toBe("wrong_answer");
    expect(out.results).toHaveLength(2);
    expect(out.results[1]!.verdict).toBe("wrong_answer");
    expect(out.results[1]!.actualJson).toEqual([0, 2]);
  });

  it("marks runtime_error when exit code is non-zero and output is not a compile error", async () => {
    mockRunOnPiston.mockResolvedValue(pistonErr(1, "ReferenceError: x is not defined"));
    const out = await runJudge(baseInput("per-test"));
    expect(out.aggregate).toBe("runtime_error");
    expect(out.results).toHaveLength(1);
    expect(out.results[0]!.verdict).toBe("runtime_error");
    expect(out.results[0]!.errorMessage).toMatch(/ReferenceError/);
  });

  it("marks compile_error when output looks like a compile failure", async () => {
    mockRunOnPiston.mockResolvedValue(pistonErr(1, "SyntaxError: Unexpected token"));
    const out = await runJudge(baseInput("per-test"));
    expect(out.aggregate).toBe("compile_error");
    expect(out.compileError).toBeDefined();
    expect(out.compileError!.message).toMatch(/SyntaxError/);
  });

  it("marks time_limit_exceeded when execMs > timeLimitMs", async () => {
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULT_PREFIX}[0,1]`, `${EXEC_MS_PREFIX}3000.0`));
    const out = await runJudge(baseInput("per-test"));
    expect(out.aggregate).toBe("time_limit_exceeded");
    expect(out.results[0]!.verdict).toBe("time_limit_exceeded");
    expect(out.results[0]!.errorMessage).toMatch(/exceeded limit/);
  });

  it("marks output_limit_exceeded when stdout > output limit", async () => {
    const big = "x".repeat(100 * 1024);
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULT_PREFIX}"${big}"`, `${EXEC_MS_PREFIX}10.0`));
    const out = await runJudge(baseInput("per-test"));
    expect(out.aggregate).toBe("output_limit_exceeded");
    expect(out.results[0]!.verdict).toBe("output_limit_exceeded");
  });

  it("uses a custom checker when methodName matches a registered checker", async () => {
    registerChecker("twoSum", (actual, expected) => {
      if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
      return actual[0] === expected[1] && actual[1] === expected[0];
    });
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULT_PREFIX}[1,0]`, `${EXEC_MS_PREFIX}10.0`));
    const out = await runJudge({ ...baseInput("per-test"), testCases: [TC1] });
    expect(out.aggregate).toBe("accepted");
  });

  it("returns runtime_error with PistonUnreachableError message when Piston throws", async () => {
    mockRunOnPiston.mockRejectedValue(new Error("ECONNREFUSED"));
    const out = await runJudge(baseInput("per-test"));
    expect(out.aggregate).toBe("runtime_error");
    expect(out.results[0]!.errorMessage).toMatch(/ECONNREFUSED/);
  });
});

describe("runJudge — single-exec mode", () => {
  it("returns 'accepted' when all tests pass in one Piston call", async () => {
    const resultsJson = JSON.stringify([
      { index: 0, result: [0, 1], execMs: 10, error: null },
      { index: 1, result: [1, 2], execMs: 10, error: null },
      { index: 2, result: [0, 1], execMs: 10, error: null },
    ]);
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULTS_PREFIX}${resultsJson}`, `${EXEC_MS_PREFIX}30.0`));
    const out = await runJudge(baseInput("single-exec"));
    expect(out.aggregate).toBe("accepted");
    expect(out.results).toHaveLength(3);
    expect(mockRunOnPiston).toHaveBeenCalledTimes(1);
  });

  it("stops on first wrong_answer and marks aggregate wrong_answer", async () => {
    const resultsJson = JSON.stringify([
      { index: 0, result: [0, 1], execMs: 10, error: null },
      { index: 1, result: [0, 2], execMs: 10, error: null },
    ]);
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULTS_PREFIX}${resultsJson}`, `${EXEC_MS_PREFIX}30.0`));
    const out = await runJudge(baseInput("single-exec"));
    expect(out.aggregate).toBe("wrong_answer");
    expect(out.results).toHaveLength(2);
  });

  it("marks compile_error when output is a compile failure", async () => {
    mockRunOnPiston.mockResolvedValue(pistonErr(1, "SyntaxError: Unexpected token (1:5)"));
    const out = await runJudge(baseInput("single-exec"));
    expect(out.aggregate).toBe("compile_error");
    expect(out.compileError).toBeDefined();
  });

  it("marks runtime_error when one test throws and the rest are not produced", async () => {
    const resultsJson = JSON.stringify([
      { index: 0, result: [0, 1], execMs: 10, error: null },
      { index: 1, result: null, execMs: 5, error: "ValueError: bad input" },
    ]);
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULTS_PREFIX}${resultsJson}`, `${EXEC_MS_PREFIX}30.0`));
    const out = await runJudge(baseInput("single-exec"));
    expect(out.aggregate).toBe("runtime_error");
    expect(out.results).toHaveLength(2);
    expect(out.results[1]!.verdict).toBe("runtime_error");
  });

  it("marks time_limit_exceeded when total execMs > timeLimitMs", async () => {
    const resultsJson = JSON.stringify([
      { index: 0, result: [0, 1], execMs: 3000, error: null },
      { index: 1, result: [1, 2], execMs: 10, error: null },
      { index: 2, result: [0, 1], execMs: 10, error: null },
    ]);
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULTS_PREFIX}${resultsJson}`, `${EXEC_MS_PREFIX}3020.0`));
    const out = await runJudge(baseInput("single-exec"));
    expect(out.aggregate).toBe("time_limit_exceeded");
  });

  it("marks output_limit_exceeded when stdout is too large", async () => {
    const big = "x".repeat(100 * 1024);
    const stdout = `${RESULTS_PREFIX}[]` + big;
    mockRunOnPiston.mockResolvedValue(pistonOk(stdout, `${EXEC_MS_PREFIX}10.0`));
    const out = await runJudge(baseInput("single-exec"));
    expect(out.aggregate).toBe("output_limit_exceeded");
  });
});

describe("runJudge — input validation", () => {
  it("supports java in PR 2 (calls Piston and parses result)", async () => {
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULT_PREFIX}[0,1]`, `${EXEC_MS_PREFIX}12.0`));
    const out = await runJudge({ ...baseInput("per-test"), language: "java", testCases: [TC1] });
    expect(out.aggregate).toBe("accepted");
    expect(out.results).toHaveLength(1);
    expect(out.results[0]!.verdict).toBe("accepted");
    expect(out.results[0]!.actualJson).toEqual([0, 1]);
    expect(mockRunOnPiston).toHaveBeenCalledTimes(1);
  });

  it("supports cpp in PR 2 (calls Piston and parses result)", async () => {
    mockRunOnPiston.mockResolvedValue(pistonOk(`${RESULT_PREFIX}[0,1]`, `${EXEC_MS_PREFIX}15.0`));
    const out = await runJudge({ ...baseInput("per-test"), language: "cpp", testCases: [TC1] });
    expect(out.aggregate).toBe("accepted");
    expect(out.results).toHaveLength(1);
    expect(out.results[0]!.verdict).toBe("accepted");
    expect(out.results[0]!.actualJson).toEqual([0, 1]);
    expect(mockRunOnPiston).toHaveBeenCalledTimes(1);
  });
});
