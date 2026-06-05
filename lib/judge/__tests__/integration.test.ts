import { describe, it, expect, beforeAll } from "@jest/globals";
import { runJudge } from "../runner";
import { JudgeInput, JudgeTestCase, ProblemSignature, Language } from "../types";
import { LANGUAGE_CONFIG, getPistonUrls } from "@/lib/piston";
import "../checkers/two-sum";

const INTEGRATION_ENABLED = process.env.RUN_INTEGRATION === "1";
const describeIf = INTEGRATION_ENABLED ? describe : describe.skip;

const SIG_FN: ProblemSignature = {
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

const probePistonRuntimes = async (): Promise<Set<string>> => {
  const urls = getPistonUrls();
  const langs = new Set<string>();
  for (const url of urls) {
    try {
      const res = await fetch(`${url}/runtimes`);
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{ language: string; aliases?: string[] }>;
      for (const r of data) {
        langs.add(r.language);
        for (const a of r.aliases ?? []) langs.add(a);
      }
      return langs;
    } catch {
      continue;
    }
  }
  return langs;
};

const skipIfRuntimeMissing = (lang: Language, available: Set<string>): boolean => {
  const pistonLang = LANGUAGE_CONFIG[lang]?.language ?? lang;
  return !available.has(pistonLang);
};

describeIf("runJudge — integration (RUN_INTEGRATION=1)", () => {
  let available = new Set<string>();

  beforeAll(async () => {
    available = await probePistonRuntimes();
  });

  it("JavaScript: twoSum passes all 3 cases (per-test mode)", async () => {
    if (skipIfRuntimeMissing("javascript", available)) {
      console.warn("[integration] skipping javascript — runtime not in /runtimes");
      return;
    }
    const input: JudgeInput = {
      code: `function twoSum(nums, target) {
  const m = new Map();
  for (let i = 0; i < nums.length; i++) {
    const c = target - nums[i];
    if (m.has(c)) return [m.get(c), i];
    m.set(nums[i], i);
  }
  return [];
}`,
      language: "javascript",
      signature: SIG_FN,
      testCases: [TC1, TC2, TC3],
      timeLimitMs: 5000,
      mode: "per-test",
    };
    const out = await runJudge(input);
    if (out.aggregate !== "accepted") {
      console.log("DEBUG aggregate:", out.aggregate);
      console.log("DEBUG compileError:", out.compileError);
      console.log("DEBUG results[0]:", out.results[0]);
    }
    expect(out.aggregate).toBe("accepted");
  }, 30000);

  it("JavaScript: twoSum accepts [1,0] for [0,1] (custom checker, per-test)", async () => {
    if (skipIfRuntimeMissing("javascript", available)) return;
    const input: JudgeInput = {
      code: `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [j, i];
    }
  }
  return [];
}`,
      language: "javascript",
      signature: SIG_FN,
      testCases: [TC1],
      timeLimitMs: 5000,
      mode: "per-test",
    };
    const out = await runJudge(input);
    expect(out.aggregate).toBe("accepted");
  }, 30000);

  it("JavaScript: wrong answer is caught (per-test)", async () => {
    if (skipIfRuntimeMissing("javascript", available)) return;
    const input: JudgeInput = {
      code: `function twoSum(nums, target) { return [0, 0]; }`,
      language: "javascript",
      signature: SIG_FN,
      testCases: [TC1],
      timeLimitMs: 5000,
      mode: "per-test",
    };
    const out = await runJudge(input);
    expect(out.aggregate).toBe("wrong_answer");
  }, 30000);

  it("JavaScript: runtime error is caught (per-test)", async () => {
    if (skipIfRuntimeMissing("javascript", available)) return;
    const input: JudgeInput = {
      code: `function twoSum(nums, target) { throw new Error("boom"); }`,
      language: "javascript",
      signature: SIG_FN,
      testCases: [TC1],
      timeLimitMs: 5000,
      mode: "per-test",
    };
    const out = await runJudge(input);
    expect(out.aggregate).toBe("runtime_error");
    expect(out.results[0]!.errorMessage).toMatch(/boom/);
  }, 30000);

  it("Python: twoSum passes (per-test)", async () => {
    if (skipIfRuntimeMissing("python", available)) return;
    const input: JudgeInput = {
      code: `def solution(nums, target):
    m = {}
    for i, n in enumerate(nums):
        c = target - n
        if c in m:
            return [m[c], i]
        m[n] = i
    return []`,
      language: "python",
      signature: SIG_FN,
      testCases: [TC1, TC2],
      timeLimitMs: 5000,
      mode: "per-test",
    };
    const out = await runJudge(input);
    expect(out.aggregate).toBe("accepted");
  }, 30000);

  it("JavaScript: single-exec mode passes all 3 cases in one Piston call", async () => {
    if (skipIfRuntimeMissing("javascript", available)) return;
    const input: JudgeInput = {
      code: `function twoSum(nums, target) {
  const m = new Map();
  for (let i = 0; i < nums.length; i++) {
    const c = target - nums[i];
    if (m.has(c)) return [m.get(c), i];
    m.set(nums[i], i);
  }
  return [];
}`,
      language: "javascript",
      signature: SIG_FN,
      testCases: [TC1, TC2, TC3],
      timeLimitMs: 5000,
      mode: "single-exec",
    };
    const out = await runJudge(input);
    expect(out.aggregate).toBe("accepted");
    expect(out.results).toHaveLength(3);
  }, 30000);

  it("TypeScript is treated like JavaScript at the harness level (per-test)", async () => {
    if (skipIfRuntimeMissing("typescript", available) && skipIfRuntimeMissing("javascript", available)) return;
    const input: JudgeInput = {
      code: `function solution(nums: number[], target: number): number[] {
  const m = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const c = target - nums[i]!;
    if (m.has(c)) return [m.get(c)!, i];
    m.set(nums[i]!, i);
  }
  return [];
}`,
      language: "typescript",
      signature: SIG_FN,
      testCases: [TC1],
      timeLimitMs: 5000,
      mode: "per-test",
    };
    const out = await runJudge(input);
    expect(out.aggregate).toBe("accepted");
  }, 30000);
});
