/**
 * Tests for buildLastExecution — the orchestrator that picks a union branch.
 *
 * The most important thing to verify is the evaluation order:
 *   no_execution_yet > all_passed > tle > compile_error > runtime_error > failed_tests.
 * We assert this with mixed-input cases (e.g. one TLE + many wrong_answers).
 */

import { describe, it, expect } from "@jest/globals";
import { buildLastExecution, type RawTestResult } from "../buildLastExecution";
import { MAX_FAILURES } from "../constants";

const PROBLEM = { timeLimitMs: 1000 };
const CODE_HASH = "abc123";

function makeResult(
  i: number,
  status: RawTestResult["status"],
  overrides: Partial<RawTestResult> = {}
): RawTestResult {
  return {
    index: i,
    status,
    rawInput: `[${i}]`,
    actual: `[${i}]`,
    expected: `[${i}]`,
    isHidden: false,
    runtimeMs: 100,
    ...overrides,
  };
}

describe("buildLastExecution", () => {
  describe("no_execution_yet", () => {
    it("returns no_execution_yet for an empty test result set", () => {
      const result = buildLastExecution({
        testResults: [],
        problem: PROBLEM,
        language: "python",
        codeHash: CODE_HASH,
      });
      expect(result.kind).toBe("no_execution_yet");
    });
  });

  describe("all_passed", () => {
    it("returns all_passed when every test passed", () => {
      const result = buildLastExecution({
        testResults: [
          makeResult(0, "passed"),
          makeResult(1, "passed"),
          makeResult(2, "passed"),
        ],
        problem: PROBLEM,
        language: "python",
        codeHash: CODE_HASH,
      });
      expect(result.kind).toBe("all_passed");
      if (result.kind === "all_passed") {
        expect(result.passed).toBe(3);
        expect(result.total).toBe(3);
        expect(result.codeHash).toBe(CODE_HASH);
      }
    });
  });

  describe("TLE wins over wrong_answer", () => {
    it("returns tle when any test exceeded the time limit, even with many wrong_answers", () => {
      const result = buildLastExecution({
        testResults: [
          makeResult(0, "wrong_answer"),
          makeResult(1, "tle", { runtimeMs: 5000 }),
          makeResult(2, "wrong_answer"),
          makeResult(3, "wrong_answer"),
        ],
        problem: PROBLEM,
        language: "python",
        codeHash: CODE_HASH,
      });
      expect(result.kind).toBe("tle");
      if (result.kind === "tle") {
        expect(result.runtimeMs).toBe(5000);
        expect(result.limitMs).toBe(1000);
        expect(result.codeHash).toBe(CODE_HASH);
      }
    });
  });

  describe("compile_error wins over runtime_error and wrong_answer", () => {
    it("returns compile_error when any test failed to compile, even with runtime errors", () => {
      const result = buildLastExecution({
        testResults: [
          makeResult(0, "runtime_error", { stderr: "Traceback" }),
          makeResult(1, "wrong_answer"),
          makeResult(2, "compile_error", { stderr: "SyntaxError: invalid syntax" }),
        ],
        problem: PROBLEM,
        language: "python",
        codeHash: CODE_HASH,
      });
      expect(result.kind).toBe("compile_error");
      if (result.kind === "compile_error") {
        expect(result.message).toContain("SyntaxError");
        expect(result.codeHash).toBe(CODE_HASH);
      }
    });
  });

  describe("runtime_error wins over wrong_answer", () => {
    it("returns runtime_error when any test crashed, even with wrong_answers", () => {
      const result = buildLastExecution({
        testResults: [
          makeResult(0, "wrong_answer"),
          makeResult(1, "wrong_answer"),
          makeResult(2, "runtime_error", { stderr: "TypeError: x is not a function" }),
        ],
        problem: PROBLEM,
        language: "python",
        codeHash: CODE_HASH,
      });
      expect(result.kind).toBe("runtime_error");
      if (result.kind === "runtime_error") {
        expect(result.message).toContain("TypeError");
        expect(result.codeHash).toBe(CODE_HASH);
      }
    });
  });

  describe("failed_tests with cap", () => {
    it("returns failed_tests with top 3 failures and omittedFailures count", () => {
      // 24 total tests, 7 failed -> 3 in failures + 4 omitted
      const results: RawTestResult[] = [];
      for (let i = 0; i < 17; i++) {
        results.push(makeResult(i, "passed"));
      }
      for (let i = 0; i < 7; i++) {
        results.push(makeResult(17 + i, "wrong_answer"));
      }

      const result = buildLastExecution({
        testResults: results,
        problem: PROBLEM,
        language: "python",
        codeHash: CODE_HASH,
      });
      expect(result.kind).toBe("failed_tests");
      if (result.kind === "failed_tests") {
        expect(result.passed).toBe(17);
        expect(result.total).toBe(24);
        expect(result.failures).toHaveLength(MAX_FAILURES);
        expect(result.omittedFailures).toBe(4);
        expect(result.codeHash).toBe(CODE_HASH);
      }
    });

    it("returns 0 omittedFailures when exactly 3 fail", () => {
      const results: RawTestResult[] = [
        makeResult(0, "passed"),
        makeResult(1, "wrong_answer"),
        makeResult(2, "wrong_answer"),
        makeResult(3, "wrong_answer"),
      ];
      const result = buildLastExecution({
        testResults: results,
        problem: PROBLEM,
        language: "python",
        codeHash: CODE_HASH,
      });
      if (result.kind === "failed_tests") {
        expect(result.failures).toHaveLength(3);
        expect(result.omittedFailures).toBe(0);
      } else {
        throw new Error(`Expected failed_tests, got ${result.kind}`);
      }
    });
  });
});
