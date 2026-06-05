/**
 * Tests for the executor harness wrapper.
 *
 * The harness solves the "I don't see any output" problem: the user is
 * asked to write a `${methodName}(...)` function (from the problem's
 * ProblemSignature), but the DB test cases are stored in mixed-format
 * stdin strings and Java/C++ require a compile-time main. Without the
 * wrap, the function is never called and Piston returns empty stdout
 * (or fails to find main) → 0/N passed.
 *
 * These tests pin:
 *   - JS code is wrapped with a stdin-reading driver
 *   - Python code is wrapped with a stdin-reading driver
 *   - Code that already has its own driver (sys.stdin / readFileSync(0))
 *     is NOT double-wrapped
 *   - The user's code is emitted BEFORE the Python invocation so the
 *     function is in scope at call time (Python doesn't hoist `def`)
 *   - JS keeps the helper-then-user-then-call order (hoisting makes
 *     this forgiving, but file order is part of the contract)
 *   - The result is JSON-stringified for non-string returns
 *   - All 4 supported languages (javascript, python, java, cpp) return
 *     `supportsHarness() = true`; unknown languages return false
 *   - Java/C++ delegate to `buildHarness` from `lib/judge/harness.ts`
 *     and return `{code, stdin}` where `code` contains the entry
 *     point and `stdin` is the JSON-encoded args
 *   - A thrown user error surfaces via stderr (process.exit(1))
 */

import { describe, it, expect } from "@jest/globals";
import {
  wrapForExecution,
  supportsHarness,
  parseInputToArgs,
  stripResultPrefix,
  stripErrorPrefix,
} from "../harness";
import type { ProblemSignature } from "@/lib/judge/types";

const SIG_SOLUTION: ProblemSignature = {
  className: null,
  methodName: "solution",
  paramTypes: [{ name: "nums", type: "number[]" }],
  returnType: "number",
};

const SIG_IS_PALINDROME: ProblemSignature = {
  className: null,
  methodName: "isPalindrome",
  paramTypes: [{ name: "s", type: "string" }],
  returnType: "boolean",
};

const SIG_TWO_SUM: ProblemSignature = {
  className: "Solution",
  methodName: "twoSum",
  paramTypes: [
    { name: "nums", type: "number[]" },
    { name: "target", type: "number" },
  ],
  returnType: "number[]",
};

describe("supportsHarness", () => {
  it("returns true for all 4 supported languages (javascript, python, java, cpp)", () => {
    for (const lang of ["javascript", "python", "java", "cpp"] as const) {
      expect(supportsHarness(lang)).toBe(true);
    }
  });
  it("returns false for unknown languages (including typescript, which is no longer supported)", () => {
    expect(supportsHarness("typescript")).toBe(false);
    expect(supportsHarness("ruby")).toBe(false);
    expect(supportsHarness("")).toBe(false);
  });
});

describe("wrapForExecution — JavaScript", () => {
  it("wraps a plain solution function with a stdin-reading driver", () => {
    const userCode = `function solution(nums) { return nums.length; }`;
    const wrapped = wrapForExecution(userCode, "javascript", SIG_SOLUTION);

    expect(wrapped.stdin).toBeUndefined();
    const harnessIdx = wrapped.code.indexOf("__stdin");
    const userIdx = wrapped.code.indexOf("function solution");
    expect(harnessIdx).toBeGreaterThanOrEqual(0);
    expect(userIdx).toBeGreaterThan(harnessIdx);
    expect(wrapped.code.trim().endsWith("function solution(nums) { return nums.length; }")).toBe(true);
  });

  it("does NOT double-wrap code that already reads stdin via readFileSync(0)", () => {
    const userCode = `
const input = require('fs').readFileSync(0, 'utf-8');
const nums = input.split(' ').map(Number);
console.log(nums.reduce((a, b) => a + b, 0));
`;
    const wrapped = wrapForExecution(userCode, "javascript", SIG_SOLUTION);
    expect(wrapped.code).toBe(userCode);
  });

  it("does NOT double-wrap code that uses process.stdin", () => {
    const userCode = `
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => console.log(chunks.join('').length));
`;
    const wrapped = wrapForExecution(userCode, "javascript", SIG_SOLUTION);
    expect(wrapped.code).toBe(userCode);
  });

  it("does NOT double-wrap code that requires readline", () => {
    const userCode = `
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', l => console.log(l.length));
`;
    const wrapped = wrapForExecution(userCode, "javascript", SIG_SOLUTION);
    expect(wrapped.code).toBe(userCode);
  });

  it("emits a JSON.stringify wrapper for non-string returns", () => {
    const userCode = `function solution() { return [1, 2, 3]; }`;
    const wrapped = wrapForExecution(userCode, "javascript", SIG_SOLUTION);
    expect(wrapped.code).toMatch(/JSON\.stringify/);
  });

  it("wraps the call in try/catch so a thrown user error surfaces via process.exit(1)", () => {
    const userCode = `function solution() { throw new Error("nope"); }`;
    const wrapped = wrapForExecution(userCode, "javascript", SIG_SOLUTION);
    expect(wrapped.code).toMatch(/try\s*\{/);
    expect(wrapped.code).toMatch(/catch/);
    expect(wrapped.code).toMatch(/process\.exit\(1\)/);
  });
});

describe("wrapForExecution — Python", () => {
  it("wraps a plain solution function with a stdin-reading driver", () => {
    const userCode = `def solution(nums):\n    return len(nums)`;
    const wrapped = wrapForExecution(userCode, "python", SIG_SOLUTION);

    expect(wrapped.stdin).toBeUndefined();
    expect(wrapped.code).toMatch(/sys\.stdin\.read/);
  });

  it("does NOT double-wrap code that already reads sys.stdin", () => {
    const userCode = `import sys
nums = list(map(int, sys.stdin.read().split()))
print(sum(nums))
`;
    const wrapped = wrapForExecution(userCode, "python", SIG_SOLUTION);
    expect(wrapped.code).toBe(userCode);
  });

  it("does NOT double-wrap code that uses input()", () => {
    const userCode = `x = input()
print(x)
`;
    const wrapped = wrapForExecution(userCode, "python", SIG_SOLUTION);
    expect(wrapped.code).toBe(userCode);
  });

  it("emits a json.dumps wrapper for non-string returns", () => {
    const userCode = `def solution():\n    return [1, 2, 3]`;
    const wrapped = wrapForExecution(userCode, "python", SIG_SOLUTION);
    expect(wrapped.code).toMatch(/json\.dumps/);
  });

  it("uses traceback + sys.exit(1) on a thrown user error", () => {
    const userCode = `def solution():\n    raise ValueError("nope")`;
    const wrapped = wrapForExecution(userCode, "python", SIG_SOLUTION);
    expect(wrapped.code).toMatch(/except Exception/);
    expect(wrapped.code).toMatch(/traceback/);
    expect(wrapped.code).toMatch(/sys\.exit\(1\)/);
  });

  it("parses stdin as JSON first, then falls back to whitespace tokens", () => {
    const userCode = `def solution(x):\n    return x`;
    const wrapped = wrapForExecution(userCode, "python", SIG_SOLUTION);
    const parseBlock = wrapped.code.match(/def __parse_stdin[\s\S]+?return s\.split\(\)/);
    expect(parseBlock).toBeTruthy();
    expect(wrapped.code.indexOf("json.loads")).toBeLessThan(wrapped.code.indexOf("s.split()"));
  });
});

describe("wrapForExecution — method name resolution (regression)", () => {
  it("Python wraps with custom method name (regression: was hardcoded 'solution')", () => {
    const wrapped = wrapForExecution(
      "def isPalindrome(s):\n    return s == s[::-1]",
      "python",
      SIG_IS_PALINDROME,
    );
    expect(wrapped.code).toContain("__result = isPalindrome(__parse_stdin");
    expect(wrapped.code).not.toMatch(/__result = solution\(/);
  });

  it("JavaScript wraps with custom method name", () => {
    const wrapped = wrapForExecution(
      "function isPalindrome(s) { return false; }",
      "javascript",
      SIG_IS_PALINDROME,
    );
    expect(wrapped.code).toContain("const __result = isPalindrome(__parseStdin");
    expect(wrapped.code).not.toMatch(/const __result = solution\(/);
  });
});

describe("wrapForExecution — Python invocation ordering (regression)", () => {
  it("emits user code BEFORE the invocation so the function is in scope", () => {
    const wrapped = wrapForExecution(
      "def isPalindrome(s):\n    return s == s[::-1]",
      "python",
      SIG_IS_PALINDROME,
    );
    const userIdx = wrapped.code.indexOf("def isPalindrome");
    const invokeIdx = wrapped.code.indexOf("__result = isPalindrome");
    expect(userIdx).toBeGreaterThan(0);
    expect(invokeIdx).toBeGreaterThan(userIdx);
  });

  it("does NOT have a function definition after the invocation (Python would NameError)", () => {
    const wrapped = wrapForExecution(
      "def isPalindrome(s):\n    return s == s[::-1]",
      "python",
      SIG_IS_PALINDROME,
    );
    const invokeIdx = wrapped.code.indexOf("__result = isPalindrome");
    const afterInvoke = wrapped.code.slice(invokeIdx);
    expect(afterInvoke).not.toMatch(/^def isPalindrome/m);
  });
});

describe("wrapForExecution — Java harness application (regression)", () => {
  it("returns {code, stdin} where code contains a public static void main entry point", () => {
    const userCode = "class Main { public static boolean isPalindrome(String s) { return true; } }";
    const wrapped = wrapForExecution(userCode, "java", SIG_IS_PALINDROME, ["racecar"]);
    expect(wrapped.code).toContain("public static void main(String[] args)");
    expect(wrapped.code).toMatch(/Main\.isPalindrome\(/);
    expect(wrapped.stdin).toBe(JSON.stringify(["racecar"]));
  });

  it("uses signature.className when set (class-based problems)", () => {
    const userCode = "class Solution { int[] twoSum(int[] nums, int target) { return new int[]{0,1}; } }";
    const wrapped = wrapForExecution(userCode, "java", SIG_TWO_SUM, [
      [2, 7, 11, 15],
      9,
    ]);
    expect(wrapped.code).toContain("public static void main(String[] args)");
    expect(wrapped.code).toMatch(/new Solution\(\)\.twoSum\(/);
    expect(wrapped.stdin).toBe(JSON.stringify([[2, 7, 11, 15], 9]));
  });

  it("throws a clear error when args is omitted (per-test invocation required)", () => {
    expect(() =>
      wrapForExecution(
        "class Main { public static boolean isPalindrome(String s) { return true; } }",
        "java",
        SIG_IS_PALINDROME,
      ),
    ).toThrow(/requires.*args/);
  });
});

describe("wrapForExecution — C++ harness application (regression)", () => {
  it("returns {code, stdin} where code contains an int main entry point", () => {
    const userCode = "vector<int> twoSum(vector<int> nums, int target) { return {0,1}; }";
    const wrapped = wrapForExecution(userCode, "cpp", SIG_TWO_SUM, [
      [2, 7, 11, 15],
      9,
    ]);
    expect(wrapped.code).toMatch(/int main\(\)/);
    expect(wrapped.code).toMatch(/twoSum\(/);
    expect(wrapped.stdin).toBe(JSON.stringify([[2, 7, 11, 15], 9]));
  });

  it("throws a clear error when args is omitted (per-test invocation required)", () => {
    expect(() =>
      wrapForExecution("int solution(vector<int> nums) { return 0; }", "cpp", SIG_SOLUTION),
    ).toThrow(/requires.*args/);
  });
});

describe("parseInputToArgs", () => {
  it("parses a JSON array of args", () => {
    expect(parseInputToArgs('[[2, 7, 11, 15], 9]\n')).toEqual([[2, 7, 11, 15], 9]);
  });

  it("wraps a single JSON value in a 1-element array", () => {
    expect(parseInputToArgs('"racecar"\n')).toEqual(["racecar"]);
    expect(parseInputToArgs("42\n")).toEqual([42]);
  });

  it("falls back to whitespace tokens for non-JSON input", () => {
    const result = parseInputToArgs("4 2\n-1 2 1 -4\n");
    expect(result).toEqual([["4", "2", "-1", "2", "1", "-4"]]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseInputToArgs("")).toEqual([]);
    expect(parseInputToArgs("   \n")).toEqual([]);
  });
});

describe("stripResultPrefix", () => {
  it("extracts the JSON payload after __RESULT__:", () => {
    expect(stripResultPrefix('__RESULT__:true\n')).toBe("true");
    expect(stripResultPrefix('__RESULT__:[0,1]\n')).toBe("[0,1]");
  });

  it("extracts the JSON payload after __RESULTS__:", () => {
    expect(stripResultPrefix('__RESULTS__:[{"index":0,"result":[0,1]}]\n')).toBe(
      '[{"index":0,"result":[0,1]}]',
    );
  });

  it("returns null when no prefix is present", () => {
    expect(stripResultPrefix("hello world\n")).toBeNull();
    expect(stripResultPrefix("")).toBeNull();
  });
});

describe("stripErrorPrefix", () => {
  it("extracts the message after __ERROR__:", () => {
    expect(stripErrorPrefix('__ERROR__:NameError: name \'x\' is not defined\n')).toBe(
      "NameError: name 'x' is not defined",
    );
  });

  it("returns null when no prefix is present", () => {
    expect(stripErrorPrefix("Traceback...\n")).toBeNull();
    expect(stripErrorPrefix(undefined)).toBeNull();
  });
});
