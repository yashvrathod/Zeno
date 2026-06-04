/**
 * Cache + fingerprint tests
 */
import { CUDCache } from "../cache";
import {
  buildCUDFingerprint,
  fingerprintExecution,
  fingerprintHistory,
  fingerprintUserMessage,
} from "../cacheKey";
import type { CUDResult } from "../types";

function makeCud(over: Partial<CUDResult> = {}): CUDResult {
  return {
    kind: "understood_strong_logic",
    confidence: 0.8,
    reasoning: "test",
    evidence: [],
    signals: { signals: [], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
    source: "heuristic_only",
    ...over,
  };
}

describe("cache", () => {
  it("stores and retrieves values", () => {
    const c = new CUDCache(10, 60_000);
    const v = makeCud();
    c.set("k1", v);
    expect(c.get("k1")).toEqual(v);
  });

  it("returns null for missing keys", () => {
    const c = new CUDCache(10, 60_000);
    expect(c.get("missing")).toBeNull();
  });

  it("evicts LRU when capacity exceeded", () => {
    const c = new CUDCache(3, 60_000);
    c.set("a", makeCud({ reasoning: "a" }));
    c.set("b", makeCud({ reasoning: "b" }));
    c.set("c", makeCud({ reasoning: "c" }));
    c.set("d", makeCud({ reasoning: "d" }));
    expect(c.get("a")).toBeNull();
    expect(c.get("b")).not.toBeNull();
  });

  it("expires entries after TTL", async () => {
    const c = new CUDCache(10, 10);
    c.set("k", makeCud());
    await new Promise((r) => setTimeout(r, 20));
    expect(c.get("k")).toBeNull();
  });
});

describe("fingerprint", () => {
  it("same code + same execution + same history → same fingerprint", () => {
    const exec = { kind: "all_passed" as const, passed: 24, total: 24, codeHash: "abc" };
    const hist = [{ role: "user", content: "hi" }];
    const a = buildCUDFingerprint({
      codeHash: "abc",
      executionFingerprint: fingerprintExecution(exec),
      historyFingerprint: fingerprintHistory(hist),
      userMessageFingerprint: fingerprintUserMessage("hi"),
    });
    const b = buildCUDFingerprint({
      codeHash: "abc",
      executionFingerprint: fingerprintExecution(exec),
      historyFingerprint: fingerprintHistory(hist),
      userMessageFingerprint: fingerprintUserMessage("hi"),
    });
    expect(a).toBe(b);
  });

  it("different execution → different fingerprint (no context aliasing)", () => {
    const execA = { kind: "all_passed" as const, passed: 24, total: 24, codeHash: "abc" };
    const execB = { kind: "failed_tests" as const, passed: 10, total: 24, codeHash: "abc", failures: [], omittedFailures: 0 };
    const a = buildCUDFingerprint({
      codeHash: "abc",
      executionFingerprint: fingerprintExecution(execA),
      historyFingerprint: null,
      userMessageFingerprint: null,
    });
    const b = buildCUDFingerprint({
      codeHash: "abc",
      executionFingerprint: fingerprintExecution(execB),
      historyFingerprint: null,
      userMessageFingerprint: null,
    });
    expect(a).not.toBe(b);
  });

  it("different user message → different fingerprint", () => {
    const a = buildCUDFingerprint({
      codeHash: "abc",
      executionFingerprint: null,
      historyFingerprint: null,
      userMessageFingerprint: fingerprintUserMessage("hello"),
    });
    const b = buildCUDFingerprint({
      codeHash: "abc",
      executionFingerprint: null,
      historyFingerprint: null,
      userMessageFingerprint: fingerprintUserMessage("world"),
    });
    expect(a).not.toBe(b);
  });
});
