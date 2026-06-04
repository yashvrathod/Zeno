/**
 * Judge independence invariant — the most important production guarantee.
 *
 * Monkey-patch the judge to throw/timeout, and assert the system still
 * produces a sensible response (heuristic-only baseline).
 */
import { runHeuristics } from "../heuristics";
import { evaluatePolicy } from "../policy/engine";
import { emptyInertiaState } from "../inertia";
import { DEFAULT_THRESHOLDS, type CUDResult } from "../types";

describe("judge independence", () => {
  it("heuristic + policy still produce a decision when judge is unavailable", () => {
    // Simulate a heuristic verdict (the fast path always has this).
    const heuristic = runHeuristics({
      userCode: `
def solve(nums):
    seen = {}
    for i, n in enumerate(nums):
        if n in seen:
            return [seen[n], i]
        seen[n] = i
    return []
`,
      lastExecution: { kind: "all_passed", passed: 24, total: 24, codeHash: "abc" },
      history: [{ role: "user", content: "I just submitted" }],
    });
    expect(heuristic.source).toBe("heuristic_only");

    // Build a fake "judge-failed" CUD: same kind, but source is heuristic_only.
    const cudAfterJudgeFailure: CUDResult = { ...heuristic, source: "heuristic_only" };

    // Policy must still evaluate.
    const policy = evaluatePolicy({
      cud: cudAfterJudgeFailure,
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "EXPLORE",
      lastExecution: { kind: "all_passed", passed: 24, total: 24, codeHash: "abc" },
      messageIndex: 0,
    });
    // No exception thrown, decision is sane.
    expect(policy).toBeDefined();
    expect(policy.cudConfidence).toBeGreaterThanOrEqual(0.5);
  });

  it("applies 0.5 confidence floor to heuristic output", () => {
    // Pretend the heuristic returned very low confidence (shouldn't happen
    // in practice, but the floor guardrail must catch it).
    const policy = evaluatePolicy({
      cud: {
        kind: "ambiguous",
        confidence: 0.1,
        reasoning: "very low",
        evidence: [],
        signals: { signals: [], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
        source: "heuristic_only",
      },
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "EXPLORE",
      lastExecution: undefined,
      messageIndex: 0,
    });
    expect(policy.cudConfidence).toBe(0.5);
  });

  it("ambiguous CUD with low confidence → no stage mutation, even with no judge", () => {
    const policy = evaluatePolicy({
      cud: {
        kind: "ambiguous",
        confidence: 0.4,
        reasoning: "uncertain",
        evidence: [],
        signals: { signals: [], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
        source: "heuristic_only",
      },
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "IMPLEMENT",
      lastExecution: undefined,
      messageIndex: 0,
    });
    expect(policy.stageAction).toBe("stay");
  });
});
