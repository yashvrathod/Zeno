/**
 * Inertia tests — decay + windowing + countMatching
 */
import {
  emptyInertiaState,
  appendDecision,
  countMatching,
  decayedConfidence,
  dominantKind,
} from "../inertia";
import { DEFAULT_THRESHOLDS } from "../types";

describe("inertia", () => {
  it("decayedConfidence decays with age", () => {
    expect(decayedConfidence(1.0, 0, 5)).toBeCloseTo(1.0);
    expect(decayedConfidence(1.0, 5, 5)).toBeCloseTo(Math.exp(-1), 3);
    expect(decayedConfidence(1.0, 10, 5)).toBeCloseTo(Math.exp(-2), 3);
  });

  it("empty state has empty window", () => {
    const s = emptyInertiaState(DEFAULT_THRESHOLDS);
    expect(s.window).toEqual([]);
    expect(countMatching(s, "misunderstood", 0)).toBe(0);
  });

  it("appends and trims to windowSize", () => {
    let s = emptyInertiaState(DEFAULT_THRESHOLDS);
    for (let i = 0; i < 10; i++) {
      s = appendDecision(s, { kind: "misunderstood", confidence: 0.8, messageIndex: i });
    }
    expect(s.window.length).toBeLessThanOrEqual(s.windowSize);
  });

  it("countMatching returns sum of decayed confidences for matching kind", () => {
    let s = emptyInertiaState(DEFAULT_THRESHOLDS);
    s = appendDecision(s, { kind: "misunderstood", confidence: 1.0, messageIndex: 0 });
    s = appendDecision(s, { kind: "misunderstood", confidence: 0.5, messageIndex: 1 });
    s = appendDecision(s, { kind: "understood_strong_logic", confidence: 0.9, messageIndex: 2 });
    // At currentMessageIndex=2, ages are 2, 1, 0. Decay rate 5.
    const total = countMatching(s, "misunderstood", 2);
    // Expected: 1.0 * exp(-2/5) + 0.5 * exp(-1/5) ≈ 0.670 + 0.410 = 1.080
    expect(total).toBeGreaterThan(1.0);
    expect(total).toBeLessThan(1.2);
  });

  it("dominantKind returns the kind with highest decayed weight", () => {
    let s = emptyInertiaState(DEFAULT_THRESHOLDS);
    s = appendDecision(s, { kind: "misunderstood", confidence: 0.5, messageIndex: 0 });
    s = appendDecision(s, { kind: "understood_strong_logic", confidence: 0.9, messageIndex: 1 });
    const dom = dominantKind(s, 1);
    expect(dom).not.toBeNull();
    expect(dom?.kind).toBe("understood_strong_logic");
  });

  it("dominantKind returns null on empty state", () => {
    const s = emptyInertiaState(DEFAULT_THRESHOLDS);
    expect(dominantKind(s, 0)).toBeNull();
  });
});
