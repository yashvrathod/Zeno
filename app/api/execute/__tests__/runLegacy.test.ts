/**
 * Integration-style tests for `runLegacyJudge`.
 *
 * These tests prove that the legacy executor actually applies a harness
 * for Java and C++ (the regression we set out to fix). We mock
 * `@/lib/prisma` and `@/lib/piston` so the assertions can inspect the
 * `code` and `stdin` arguments that would be sent to Piston.
 *
 * Root cause of the original failure: `supportsHarness("java")` returned
 * `false`, so `runLegacy` sent the raw user code to Piston, which
 * produced `can't find main(String[]) method in class: Main` for Java
 * and `undefined reference to main` for C++. After the fix, the harness
 * (delegated to `buildHarness` from `lib/judge/harness.ts`) is applied
 * for all 5 supported languages.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const pistonCalls: Array<{ code: string; language: string; stdin: string }> = [];

jest.mock("@/lib/piston", () => {
  return {
    __esModule: true,
    LANGUAGE_CONFIG: {
      javascript: { language: "javascript" },
      python: { language: "python" },
      java: { language: "java" },
      cpp: { language: "c++" },
    },
    PistonUnreachableError: class PistonUnreachableError extends Error {},
    getPistonUrls: () => ["http://localhost:2000"],
    runOnPiston: jest.fn(async ({ code, language, stdin }: { code: string; language: string; stdin: string }) => {
      pistonCalls.push({ code, language, stdin });
      return {
        output: "__RESULT__:true\n",
        runtimeMs: 5,
        stderr: "",
        exitCode: 0,
        signal: null,
        servedBy: "http://localhost:2000",
      };
    }),
  };
});

const prismaFindFirstMock = jest.fn() as jest.Mock<any>;
jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    problem: { findFirst: (...args: unknown[]) => prismaFindFirstMock(...args) },
  },
}));

import { runLegacyJudge } from "../runLegacy";

const SIG_TWO_SUM = {
  className: null,
  methodName: "twoSum",
  paramTypes: [
    { name: "nums", type: "number[]" },
    { name: "target", type: "number" },
  ],
  returnType: "number[]",
};

const SIG_IS_PALINDROME = {
  className: null,
  methodName: "isPalindrome",
  paramTypes: [{ name: "s", type: "string" }],
  returnType: "boolean",
};

const SIG_SOLUTION = {
  className: null,
  methodName: "solution",
  paramTypes: [{ name: "nums", type: "number[]" }],
  returnType: "number",
};

const JAVA_USER_CODE = `class Main {
    public static int[] twoSum(int[] nums, int target) {
        return new int[]{0, 1};
    }
}`;

const CPP_USER_CODE = `#include <vector>
using namespace std;
vector<int> twoSum(vector<int> nums, int target) { return {0, 1}; }`;

const PY_USER_CODE = `def twoSum(nums, target):
    return [0, 1]`;

const JS_USER_CODE = `function twoSum(nums, target) { return [0, 1]; }`;

const PROBLEM_BASE = {
  id: "tp-12-oracle-mirror-validation",
  timeLimitMs: 2000,
  testCases: [
    { id: "t1", order: 1, input: "[[2,7,11,15], 9]\n", expected: "[0, 1]\n", isHidden: false },
  ],
};

beforeEach(() => {
  pistonCalls.length = 0;
  prismaFindFirstMock.mockReset();
});

describe("runLegacyJudge — harness application (integration-style regression)", () => {
  it("Java: passes a wrapped harness (with main) to Piston, not the raw user code", async () => {
    prismaFindFirstMock.mockResolvedValue({
      ...PROBLEM_BASE,
      signature: SIG_TWO_SUM,
    });
    await runLegacyJudge(
      { code: JAVA_USER_CODE, language: "java", problemId: "tp-12" },
      false,
    );
    expect(pistonCalls.length).toBe(1);
    const call = pistonCalls[0]!;
    expect(call.language).toBe("java");
    expect(call.code).toContain("public static void main(String[] args)");
    expect(call.code).toContain("class __Harness");
    expect(call.code).toContain("Main.twoSum(");
    expect(call.code).not.toBe(JAVA_USER_CODE);
    expect(call.stdin).toBe(JSON.stringify([[2, 7, 11, 15], 9]));
  });

  it("C++: passes a wrapped harness (with int main) to Piston, not the raw user code", async () => {
    prismaFindFirstMock.mockResolvedValue({
      ...PROBLEM_BASE,
      signature: SIG_TWO_SUM,
    });
    await runLegacyJudge(
      { code: CPP_USER_CODE, language: "cpp", problemId: "tp-12" },
      false,
    );
    expect(pistonCalls.length).toBe(1);
    const call = pistonCalls[0]!;
    expect(call.language).toBe("cpp");
    expect(call.code).toMatch(/int main\(\)/);
    expect(call.code).toContain("twoSum(");
    expect(call.code).not.toBe(CPP_USER_CODE);
    expect(call.stdin).toBe(JSON.stringify([[2, 7, 11, 15], 9]));
  });

  it("Python: passes wrapped code (user code before invocation) and the raw test case as stdin", async () => {
    prismaFindFirstMock.mockResolvedValue({
      ...PROBLEM_BASE,
      signature: SIG_TWO_SUM,
    });
    await runLegacyJudge(
      { code: PY_USER_CODE, language: "python", problemId: "tp-12" },
      false,
    );
    expect(pistonCalls.length).toBe(1);
    const call = pistonCalls[0]!;
    expect(call.language).toBe("python");
    expect(call.code.indexOf("def twoSum")).toBeGreaterThan(-1);
    expect(call.code.indexOf("__result = twoSum(")).toBeGreaterThan(
      call.code.indexOf("def twoSum"),
    );
    expect(call.stdin).toBe(PROBLEM_BASE.testCases[0]!.input);
  });

  it("JavaScript: passes wrapped code and the raw test case as stdin", async () => {
    prismaFindFirstMock.mockResolvedValue({
      ...PROBLEM_BASE,
      signature: SIG_TWO_SUM,
    });
    await runLegacyJudge(
      { code: JS_USER_CODE, language: "javascript", problemId: "tp-12" },
      false,
    );
    expect(pistonCalls.length).toBe(1);
    const call = pistonCalls[0]!;
    expect(call.language).toBe("javascript");
    expect(call.code).toMatch(/function twoSum/);
    expect(call.stdin).toBe(PROBLEM_BASE.testCases[0]!.input);
  });

  it("returns the guard failure when the user's code does not define the signature's methodName (Python)", async () => {
    prismaFindFirstMock.mockResolvedValue({
      ...PROBLEM_BASE,
      signature: SIG_IS_PALINDROME,
    });
    const res = await runLegacyJudge(
      {
        code: "def differentName(s):\n    return True",
        language: "python",
        problemId: "tp-12",
      },
      false,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; code: string; expectedMethodName: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("undefined_method");
    expect(body.expectedMethodName).toBe("isPalindrome");
  });
});
