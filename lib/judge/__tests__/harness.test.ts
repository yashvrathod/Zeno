import { describe, it, expect } from "@jest/globals";
import {
  buildHarness,
  HARNESS_VERSION,
  RESULT_PREFIX,
  RESULTS_PREFIX,
  EXEC_MS_PREFIX,
  ERROR_PREFIX,
} from "../harness";
import { JudgeTestCase, ProblemSignature } from "../types";

const FN_SIG: ProblemSignature = {
  className: null,
  methodName: "solution",
  paramTypes: [{ name: "nums", type: "number[]" }],
  returnType: "number",
};

const CLASS_SIG: ProblemSignature = {
  className: "Solution",
  methodName: "twoSum",
  paramTypes: [
    { name: "nums", type: "number[]" },
    { name: "target", type: "number" },
  ],
  returnType: "number[]",
};

const TC: JudgeTestCase = {
  id: "t1",
  order: 1,
  args: [[2, 7, 11, 15], 9],
  expectedJson: [0, 1],
  isHidden: false,
};

const T2: JudgeTestCase = { ...TC, id: "t2", order: 2, args: [[3, 2, 4], 6] };

describe("buildHarness — language support", () => {
  it("supports javascript", () => {
    const r = buildHarness({
      userCode: "function solution(nums) { return nums.length; }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    expect(r.language).toBe("javascript");
  });

  it("supports typescript (treated as JS at the harness level)", () => {
    const r = buildHarness({
      userCode: "function solution(nums: number[]): number { return nums.length; }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "typescript",
    });
    expect(r.language).toBe("typescript");
  });

  it("supports python", () => {
    const r = buildHarness({
      userCode: "def solution(nums):\n    return len(nums)",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "python",
    });
    expect(r.language).toBe("python");
  });

  it("supports java (PR 2)", () => {
    const r = buildHarness({
      userCode: "class Solution { int[] twoSum(int[] a, int b) { return new int[]{0,1}; } }",
      signature: CLASS_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "java",
    });
    expect(r.language).toBe("java");
    expect(r.code).toContain("__HarnessParser");
    expect(r.code).toContain("__Harness");
    expect(r.code).toContain(RESULT_PREFIX);
    expect(r.code).toContain(EXEC_MS_PREFIX);
  });

  it("supports cpp (PR 2)", () => {
    const r = buildHarness({
      userCode: "vector<int> twoSum(vector<int> a, int b) { return {0,1}; }",
      signature: CLASS_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "cpp",
    });
    expect(r.language).toBe("cpp");
    expect(r.code).toContain("__JsonParser");
    expect(r.code).toContain("__JsonValue");
    expect(r.code).toContain(RESULT_PREFIX);
    expect(r.code).toContain(EXEC_MS_PREFIX);
  });
});

describe("buildHarness — per-test mode", () => {
  it("requires exactly 1 test case", () => {
    expect(() =>
      buildHarness({
        userCode: "function solution() {}",
        signature: FN_SIG,
        testCases: [],
        mode: "per-test",
        language: "javascript",
      }),
    ).toThrow();
    expect(() =>
      buildHarness({
        userCode: "function solution() {}",
        signature: FN_SIG,
        testCases: [TC, { ...TC, id: "t2" }],
        mode: "per-test",
        language: "javascript",
      }),
    ).toThrow();
  });

  it("emits the user code BEFORE the harness body (so the harness can call the user's function)", () => {
    const r = buildHarness({
      userCode: "function solution(nums) { return nums.length; }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    const harnessIdx = r.code.indexOf("__stdin");
    const userIdx = r.code.indexOf("function solution");
    expect(harnessIdx).toBeGreaterThanOrEqual(0);
    expect(userIdx).toBeLessThan(harnessIdx);
  });

  it("serializes the test args as JSON for stdin", () => {
    const r = buildHarness({
      userCode: "function solution() {}",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    expect(r.stdinJson).toBe(JSON.stringify(TC.args));
    expect(JSON.parse(r.stdinJson)).toEqual([[2, 7, 11, 15], 9]);
  });

  it("emits __RESULT__: prefix and __EXEC_MS__: prefix references", () => {
    const r = buildHarness({
      userCode: "function solution() {}",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    expect(r.code).toContain(RESULT_PREFIX);
    expect(r.code).toContain(EXEC_MS_PREFIX);
    expect(r.code).toContain(HARNESS_VERSION.toString());
  });

  it("uses `new Solution().methodName(...)` when className is set", () => {
    const r = buildHarness({
      userCode: "class Solution { twoSum() { return []; } }",
      signature: CLASS_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    expect(r.code).toContain("new Solution().twoSum(...__args)");
  });

  it("calls sig.methodName as a free function when className is null and methodName === 'solution'", () => {
    const r = buildHarness({
      userCode: "function solution() {}",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    expect(r.code).toMatch(/solution\(\.\.\.__args\)/);
    expect(r.code).not.toContain("new Solution");
  });

  it("wraps the user call in try/catch and surfaces errors via __ERROR__:", () => {
    const r = buildHarness({
      userCode: "function solution() { throw new Error('x'); }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    expect(r.code).toContain("try");
    expect(r.code).toContain("catch");
    expect(r.code).toContain(ERROR_PREFIX);
    expect(r.code).toContain("process.exit(1)");
  });

  it("Python per-test: uses time.perf_counter() and json.dumps", () => {
    const r = buildHarness({
      userCode: "def solution(nums):\n    return len(nums)",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "python",
    });
    expect(r.code).toContain("time.perf_counter");
    expect(r.code).toContain("json.dumps");
    expect(r.code).toContain("sys.stdin.read");
    expect(r.code).toContain("__result = solution(*__args)");
  });

  it("Python per-test with className uses `ClassName().methodName(*args)`", () => {
    const r = buildHarness({
      userCode: "class Solution:\n    def twoSum(self, nums, target):\n        return []",
      signature: CLASS_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "python",
    });
    expect(r.code).toContain("Solution().twoSum(*__args)");
  });
});

describe("buildHarness — single-exec mode", () => {
  it("accepts N test cases and JSON-serializes all of them with expected", () => {
    const r = buildHarness({
      userCode: "function solution() {}",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "javascript",
    });
    const parsed = JSON.parse(r.stdinJson);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ args: TC.args, expected: TC.expectedJson, order: 1 });
    expect(parsed[1]).toMatchObject({ args: T2.args, expected: T2.expectedJson, order: 2 });
  });

  it("emits __RESULTS__ prefix (plural) — the harness iterates and emits an array", () => {
    const r = buildHarness({
      userCode: "function solution() {}",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "javascript",
    });
    expect(r.code).toContain(RESULTS_PREFIX);
    expect(r.code).not.toContain(RESULT_PREFIX);
  });

  it("iterates test cases and breaks on first error", () => {
    const r = buildHarness({
      userCode: "function solution() {}",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "javascript",
    });
    expect(r.code).toMatch(/for\s*\(/);
    expect(r.code).toMatch(/if\s*\(__err\)\s*break/);
  });

  it("Python single-exec uses enumerate and breaks on first error", () => {
    const r = buildHarness({
      userCode: "def solution(nums):\n    return len(nums)",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "python",
    });
    expect(r.code).toContain("enumerate(__cases)");
    expect(r.code).toContain("break");
  });
});

describe("buildHarness — Java (PR 2)", () => {
  it("per-test: calls Main.methodName(args) and emits __RESULT__ prefix", () => {
    const r = buildHarness({
      userCode: "class Main { int solution(int[] a) { return 0; } }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "java",
    });
    expect(r.code).toContain("Main.solution(");
    expect(r.code).toContain(RESULT_PREFIX);
    expect(r.code).toContain("__toJson(__result)");
  });

  it("per-test: with className uses new ClassName().methodName(args)", () => {
    const r = buildHarness({
      userCode: "class Solution { int[] twoSum(int[] a, int b) { return null; } }",
      signature: CLASS_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "java",
    });
    expect(r.code).toContain("new Solution().twoSum(");
  });

  it("per-test: emits number[] -> int[] arg converter", () => {
    const r = buildHarness({
      userCode: "class Main { int solution(int[] a) { return 0; } }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "java",
    });
    expect(r.code).toContain("__toIntArray");
    expect(r.code).toContain("__toJson");
  });

  it("per-test: number return type uses __toJson on result", () => {
    const r = buildHarness({
      userCode: "class Main { int solution(int[] a) { return 0; } }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "java",
    });
    expect(r.code).toContain("Object __result");
  });

  it("single-exec: emits __RESULTS__ prefix and per-case execMs tracking", () => {
    const r = buildHarness({
      userCode: "class Main { int solution(int[] a) { return 0; } }",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "java",
    });
    expect(r.code).toContain(RESULTS_PREFIX);
    expect(r.code).toContain("__tCase0");
    expect(r.code).toContain("__row");
    expect(r.code).toContain('"result"');
  });

  it("single-exec: surfaces per-case errors and breaks the loop", () => {
    const r = buildHarness({
      userCode: "class Main { int solution(int[] a) { return 0; } }",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "java",
    });
    expect(r.code).toContain("catch (Throwable __e)");
    expect(r.code).toContain("if (__err != null) break;");
  });
});

describe("buildHarness — C++ (PR 2)", () => {
  it("per-test: calls methodName(args) and emits __RESULT__ prefix", () => {
    const r = buildHarness({
      userCode: "int solution(vector<int> a) { return 0; }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "cpp",
    });
    expect(r.code).toContain("solution(");
    expect(r.code).toContain(RESULT_PREFIX);
    expect(r.code).toContain("__JsonValue");
  });

  it("per-test: includes #include <bits/stdc++.h>", () => {
    const r = buildHarness({
      userCode: "int solution(vector<int> a) { return 0; }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "cpp",
    });
    expect(r.code).toContain("#include <bits/stdc++.h>");
  });

  it("per-test: number return type uses __intToJson on result", () => {
    const r = buildHarness({
      userCode: "int solution(vector<int> a) { return 0; }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "cpp",
    });
    expect(r.code).toContain("__intToJson(__result)");
  });

  it("per-test: number[] return type uses __intVecToJson on result", () => {
    const arraySig: ProblemSignature = {
      className: null,
      methodName: "solution",
      paramTypes: [{ name: "nums", type: "number[]" }],
      returnType: "number[]",
    };
    const r = buildHarness({
      userCode: "vector<int> solution(vector<int> a) { return {}; }",
      signature: arraySig,
      testCases: [TC],
      mode: "per-test",
      language: "cpp",
    });
    expect(r.code).toContain("__intVecToJson(__result)");
  });

  it("per-test: surfaces errors via __ERROR__ and try/catch", () => {
    const r = buildHarness({
      userCode: "int solution(vector<int> a) { return 0; }",
      signature: FN_SIG,
      testCases: [TC],
      mode: "per-test",
      language: "cpp",
    });
    expect(r.code).toContain("try");
    expect(r.code).toContain("catch (const std::exception& __e)");
    expect(r.code).toContain(ERROR_PREFIX);
  });

  it("single-exec: emits __RESULTS__ prefix and iterates cases", () => {
    const r = buildHarness({
      userCode: "int solution(vector<int> a) { return 0; }",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "cpp",
    });
    expect(r.code).toContain(RESULTS_PREFIX);
    expect(r.code).toContain("__tCase0");
    expect(r.code).toContain('__rowsJson');
    expect(r.code).toContain("if (__hasErr) break;");
  });

  it("single-exec: extracts args from each test case array", () => {
    const r = buildHarness({
      userCode: "int solution(vector<int> a) { return 0; }",
      signature: FN_SIG,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "cpp",
    });
    expect(r.code).toContain("__cases[__i].arr");
  });
});

describe("buildHarness — method name resolution (regression)", () => {
  const isPalindromeSig: ProblemSignature = {
    className: null,
    methodName: "isPalindrome",
    paramTypes: [{ name: "s", type: "string" }],
    returnType: "boolean",
  };

  it("JavaScript per-test calls sig.methodName when methodName !== 'solution'", () => {
    const r = buildHarness({
      userCode: "function isPalindrome(s) { return false; }",
      signature: isPalindromeSig,
      testCases: [TC],
      mode: "per-test",
      language: "javascript",
    });
    expect(r.code).toMatch(/isPalindrome\(\.\.\.__args\)/);
    expect(r.code).not.toMatch(/\bsolution\(/);
  });

  it("Python per-test calls sig.methodName when methodName !== 'solution'", () => {
    const r = buildHarness({
      userCode: "def isPalindrome(s):\n    return False",
      signature: isPalindromeSig,
      testCases: [TC],
      mode: "per-test",
      language: "python",
    });
    expect(r.code).toMatch(/__result = isPalindrome\(\*__args\)/);
    expect(r.code).not.toMatch(/\bsolution\(/);
  });

  it("TypeScript per-test calls sig.methodName when methodName !== 'solution'", () => {
    const r = buildHarness({
      userCode: "function isPalindrome(s: string): boolean { return false; }",
      signature: isPalindromeSig,
      testCases: [TC],
      mode: "per-test",
      language: "typescript",
    });
    expect(r.code).toMatch(/isPalindrome\(\.\.\.__args\)/);
    expect(r.code).not.toMatch(/\bsolution\(/);
  });

  it("JavaScript single-exec calls sig.methodName when methodName !== 'solution'", () => {
    const r = buildHarness({
      userCode: "function isPalindrome(s) { return false; }",
      signature: isPalindromeSig,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "javascript",
    });
    expect(r.code).toMatch(/__result = isPalindrome\(\.\.\.__args\)/);
    expect(r.code).not.toMatch(/\bsolution\(/);
  });

  it("Python single-exec calls sig.methodName when methodName !== 'solution'", () => {
    const r = buildHarness({
      userCode: "def isPalindrome(s):\n    return False",
      signature: isPalindromeSig,
      testCases: [TC, T2],
      mode: "single-exec",
      language: "python",
    });
    expect(r.code).toMatch(/__result = isPalindrome\(\*__args\)/);
    expect(r.code).not.toMatch(/\bsolution\(/);
  });
});
