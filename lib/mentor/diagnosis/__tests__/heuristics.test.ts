/**
 * Heuristics tests
 * No mocks. Pure unit tests. Fast.
 */
import { runHeuristics } from "../heuristics";

describe("runHeuristics", () => {
  it("returns no_code for empty input", () => {
    const r = runHeuristics({ userCode: "", lastExecution: undefined, history: [] });
    expect(r.kind).toBe("no_code");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    expect(r.source).toBe("heuristic_only");
  });

  it("returns no_code for boilerplate", () => {
    const r = runHeuristics({ userCode: "def solve(nums):\n    pass\n", lastExecution: undefined, history: [] });
    expect(r.kind).toBe("no_code");
  });

  it("returns code_doesnt_run for compile_error execution", () => {
    const r = runHeuristics({
      userCode: "def solve(nums):\n    return nums",
      lastExecution: { kind: "compile_error", message: "SyntaxError", language: "python", codeHash: "abc" },
      history: [],
    });
    expect(r.kind).toBe("code_doesnt_run");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("returns no_execution_yet when no execution data", () => {
    const r = runHeuristics({
      userCode: "def solve(nums):\n    return nums",
      lastExecution: { kind: "no_execution_yet" },
      history: [],
    });
    expect(r.kind).toBe("no_execution_yet");
  });

  it("returns understood_strong_logic when all_passed + optimal DS markers", () => {
    const code = `
def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []
`;
    const r = runHeuristics({
      userCode: code,
      lastExecution: { kind: "all_passed", passed: 24, total: 24, codeHash: "abc" },
      history: [{ role: "user", content: "..." }],
    });
    expect(r.kind).toBe("understood_strong_logic");
    expect(r.confidence).toBeGreaterThanOrEqual(0.7);
    expect(r.signals.signals).toContain("uses_optimal_datastruct");
  });

  it("returns understood_weak_logic when all_passed + nested loops (brute force)", () => {
    const code = `
def solve(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            for k in range(j + 1, len(nums)):
                if nums[i] + nums[j] + nums[k] == target:
                    return [i, j, k]
    return []
`;
    const r = runHeuristics({
      userCode: code,
      lastExecution: { kind: "all_passed", passed: 24, total: 24, codeHash: "abc" },
      history: [{ role: "user", content: "..." }],
    });
    expect(r.kind).toBe("understood_weak_logic");
    expect(r.signals.signals).toContain("nested_loop_brute_force");
  });

  it("returns understood_weak_logic when failures dominated by off_by_one", () => {
    const code = `
def solve(nums):
    for i in range(len(nums) - 1):
        if nums[i] > nums[i + 1]:
            return i
    return -1
`;
    const r = runHeuristics({
      userCode: code,
      lastExecution: {
        kind: "failed_tests",
        passed: 22,
        total: 24,
        omittedFailures: 0,
        codeHash: "abc",
        failures: [
          { index: 0, failureType: "wrong_answer", rootCauseHint: "off_by_one", evidence: [], inputShape: { kind: "int_array", length: 3 }, expectedShape: "int", actualShape: "int" },
          { index: 1, failureType: "wrong_answer", rootCauseHint: "off_by_one", evidence: [], inputShape: { kind: "int_array", length: 3 }, expectedShape: "int", actualShape: "int" },
        ],
      },
      history: [],
    });
    expect(r.kind).toBe("understood_weak_logic");
  });

  it("returns ambiguous when failures are mixed and no clear signal", () => {
    const code = `
def solve(nums, target):
    if len(nums) < 2:
        return []
    for i in range(len(nums)):
        if nums[i] + nums[i+1] == target:
            return [i, i+1]
    return [-1, -1]
`;
    const r = runHeuristics({
      userCode: code,
      lastExecution: {
        kind: "failed_tests",
        passed: 10,
        total: 24,
        omittedFailures: 0,
        codeHash: "abc",
        failures: [
          { index: 0, failureType: "wrong_answer", rootCauseHint: "null_pointer", evidence: [], inputShape: { kind: "int_array", length: 1 }, expectedShape: "[i,j]", actualShape: "[]" },
          { index: 1, failureType: "wrong_answer", rootCauseHint: "off_by_one", evidence: [], inputShape: { kind: "int_array", length: 3 }, expectedShape: "[i,j]", actualShape: "[i+1]" },
        ],
      },
      history: [],
    });
    expect(r.kind).toBe("ambiguous");
    expect(r.confidence).toBeLessThanOrEqual(0.7);
  });

  it("confidence floor is 0.5 (judge-independence invariant)", () => {
    const r = runHeuristics({ userCode: "x = 1", lastExecution: undefined, history: [] });
    expect(r.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it("detects chat_silence when user has not spoken", () => {
    const r = runHeuristics({
      userCode: "def solve(nums):\n    return nums[0] + nums[1]\n",
      lastExecution: { kind: "all_passed", passed: 1, total: 1, codeHash: "abc" },
      history: [{ role: "assistant", content: "hi" }],
    });
    expect(r.signals.signals).toContain("chat_silence");
  });
});
