/**
 * Trace tests — the debug artifact
 */
import { newTrace, appendStep, traceSummary } from "../trace";

describe("trace", () => {
  it("starts empty", () => {
    const t = newTrace("dec_1");
    expect(t.decisionId).toBe("dec_1");
    expect(t.steps).toEqual([]);
    expect(t.createdAt).toBeLessThanOrEqual(Date.now());
  });

  it("appends steps immutably", () => {
    const t1 = newTrace("dec_1");
    const t2 = appendStep(t1, { kind: "input_fingerprint", fingerprint: "abc" });
    expect(t1.steps.length).toBe(0);
    expect(t2.steps.length).toBe(1);
    expect(t2.steps[0]).toEqual({ kind: "input_fingerprint", fingerprint: "abc" });
  });

  it("summary counts step kinds", () => {
    let t = newTrace("dec_1");
    t = appendStep(t, { kind: "input_fingerprint", fingerprint: "abc" });
    t = appendStep(t, { kind: "cache_lookup", hit: false });
    t = appendStep(t, { kind: "cache_lookup", hit: true });
    const summary = traceSummary(t);
    expect(summary).toContain("input_fingerprint=1");
    expect(summary).toContain("cache_lookup=2");
  });
});
