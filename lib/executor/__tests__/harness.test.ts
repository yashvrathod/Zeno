/**
 * Tests for the executor harness wrapper.
 *
 * The harness solves the "I don't see any output" problem: the user is
 * asked to write a `function solution(input)`, but the DB test cases
 * are stdin/stdout. Without the wrap, the function never gets called
 * and Piston returns empty stdout → 0/N passed.
 *
 * These tests pin:
 *   - JS code is wrapped with a stdin-reading driver
 *   - Python code is wrapped with a stdin-reading driver
 *   - Code that already has its own driver (sys.stdin / readFileSync(0))
 *     is NOT double-wrapped
 *   - The user's code is appended AFTER the harness (harness can call it)
 *   - The result is JSON-stringified for non-string returns
 *   - Unsupported languages (java, cpp) report `supportsHarness() = false`
 *   - A thrown user error surfaces via stderr (process.exit(1))
 */

import { describe, it, expect } from "@jest/globals";
import { wrapForExecution, supportsHarness } from "../harness";

describe("supportsHarness", () => {
  it("returns true for JS-flavored languages", () => {
    expect(supportsHarness("javascript")).toBe(true);
    expect(supportsHarness("typescript")).toBe(true);
  });
  it("returns true for python", () => {
    expect(supportsHarness("python")).toBe(true);
  });
  it("returns false for java and cpp (the user must write their own main)", () => {
    expect(supportsHarness("java")).toBe(false);
    expect(supportsHarness("cpp")).toBe(false);
  });
  it("returns false for unknown languages", () => {
    expect(supportsHarness("ruby")).toBe(false);
    expect(supportsHarness("")).toBe(false);
  });
});

describe("wrapForExecution — JavaScript", () => {
  it("wraps a plain solution function with a stdin-reading driver", () => {
    const userCode = `function solution(nums) { return nums.length; }`;
    const wrapped = wrapForExecution(userCode, "javascript");

    // The harness header must come BEFORE the user's code so the user's
    // function is in scope when the harness calls it.
    const harnessIdx = wrapped.indexOf("__stdin");
    const userIdx = wrapped.indexOf("function solution");
    expect(harnessIdx).toBeGreaterThanOrEqual(0);
    expect(userIdx).toBeGreaterThan(harnessIdx);

    // The user's code must be appended at the end (function is hoisted
    // in JS, but the file order still matters for `console.log` ordering).
    expect(wrapped.trim().endsWith("function solution(nums) { return nums.length; }")).toBe(true);
  });

  it("does NOT double-wrap code that already reads stdin via readFileSync(0)", () => {
    const userCode = `
const input = require('fs').readFileSync(0, 'utf-8');
const nums = input.split(' ').map(Number);
console.log(nums.reduce((a, b) => a + b, 0));
`;
    const wrapped = wrapForExecution(userCode, "javascript");
    // The detect-own-driver check should leave the code untouched.
    expect(wrapped).toBe(userCode);
  });

  it("does NOT double-wrap code that uses process.stdin", () => {
    const userCode = `
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => console.log(chunks.join('').length));
`;
    const wrapped = wrapForExecution(userCode, "javascript");
    expect(wrapped).toBe(userCode);
  });

  it("does NOT double-wrap code that requires readline", () => {
    const userCode = `
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', l => console.log(l.length));
`;
    const wrapped = wrapForExecution(userCode, "javascript");
    expect(wrapped).toBe(userCode);
  });

  it("emits a JSON.stringify wrapper for non-string returns (the harness prints whatever the function returns)", () => {
    const userCode = `function solution() { return [1, 2, 3]; }`;
    const wrapped = wrapForExecution(userCode, "javascript");
    // The harness must stringify arrays/objects so the per-test output
    // matches the DB's expected string.
    expect(wrapped).toMatch(/JSON\.stringify/);
  });

  it("wraps the call in try/catch so a thrown user error surfaces via process.exit(1)", () => {
    const userCode = `function solution() { throw new Error("nope"); }`;
    const wrapped = wrapForExecution(userCode, "javascript");
    expect(wrapped).toMatch(/try\s*\{/);
    expect(wrapped).toMatch(/catch/);
    expect(wrapped).toMatch(/process\.exit\(1\)/);
  });
});

describe("wrapForExecution — Python", () => {
  it("wraps a plain solution function with a stdin-reading driver", () => {
    const userCode = `def solution(nums):\n    return len(nums)`;
    const wrapped = wrapForExecution(userCode, "python");

    // Harness header (parse_stdin, stdin.read, sys) must precede user code.
    expect(wrapped.indexOf("import sys")).toBeLessThan(wrapped.indexOf("def solution"));
    expect(wrapped).toMatch(/sys\.stdin\.read/);
  });

  it("does NOT double-wrap code that already reads sys.stdin", () => {
    const userCode = `import sys
nums = list(map(int, sys.stdin.read().split()))
print(sum(nums))
`;
    const wrapped = wrapForExecution(userCode, "python");
    expect(wrapped).toBe(userCode);
  });

  it("does NOT double-wrap code that uses input()", () => {
    const userCode = `x = input()
print(x)
`;
    const wrapped = wrapForExecution(userCode, "python");
    expect(wrapped).toBe(userCode);
  });

  it("emits a json.dumps wrapper for non-string returns", () => {
    const userCode = `def solution():\n    return [1, 2, 3]`;
    const wrapped = wrapForExecution(userCode, "python");
    expect(wrapped).toMatch(/json\.dumps/);
  });

  it("uses traceback + sys.exit(1) on a thrown user error", () => {
    const userCode = `def solution():\n    raise ValueError("nope")`;
    const wrapped = wrapForExecution(userCode, "python");
    expect(wrapped).toMatch(/except Exception/);
    expect(wrapped).toMatch(/traceback/);
    expect(wrapped).toMatch(/sys\.exit\(1\)/);
  });

  it("parses stdin as JSON first, then falls back to whitespace tokens", () => {
    const userCode = `def solution(x):\n    return x`;
    const wrapped = wrapForExecution(userCode, "python");
    // The parse helper must try json.loads FIRST, then fall back to split.
    const parseBlock = wrapped.match(/def __parse_stdin[\s\S]+?return s\.split\(\)/);
    expect(parseBlock).toBeTruthy();
    expect(wrapped.indexOf("json.loads")).toBeLessThan(wrapped.indexOf("s.split()"));
  });
});

describe("wrapForExecution — typescript", () => {
  it("is treated as javascript for harness purposes (Piston runs it as JS anyway)", () => {
    const userCode = `function solution(): number { return 42; }`;
    const wrapped = wrapForExecution(userCode, "typescript");
    expect(wrapped).toMatch(/require\('fs'\)/);
  });
});

describe("wrapForExecution — method name resolution (regression)", () => {
  it("Python wraps with custom method name (regression: was hardcoded 'solution')", () => {
    const wrapped = wrapForExecution(
      "def isPalindrome(s):\n    return s == s[::-1]",
      "python",
      "isPalindrome",
    );
    expect(wrapped).toContain("__result = isPalindrome(__parse_stdin");
    expect(wrapped).not.toMatch(/__result = solution\(/);
  });

  it("JavaScript wraps with custom method name", () => {
    const wrapped = wrapForExecution(
      "function isPalindrome(s) { return false; }",
      "javascript",
      "isPalindrome",
    );
    expect(wrapped).toContain("const __result = isPalindrome(__parseStdin");
    expect(wrapped).not.toMatch(/const __result = solution\(/);
  });

  it("default methodName is 'solution' when not provided (back-compat)", () => {
    const wrapped = wrapForExecution("def solution(x): return x", "python");
    expect(wrapped).toContain("__result = solution(__parse_stdin");
  });
});
