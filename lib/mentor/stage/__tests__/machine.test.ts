/**
 * State machine precedence tests — v3 review §5 fix
 */
import { selectTransition, buildTransitionCandidates } from "../machine";
import { evaluatePolicy } from "../../diagnosis/policy/engine";
import { emptyInertiaState, appendDecision } from "../../diagnosis/inertia";
import { DEFAULT_THRESHOLDS, type CUDResult } from "../../diagnosis/types";
import type { LastExecution } from "../../lastExecution";

const allPassed: LastExecution = { kind: "all_passed", passed: 24, total: 24, codeHash: "abc" };

function makeCud(over: Partial<CUDResult> = {}): CUDResult {
  return {
    kind: "ambiguous",
    confidence: 0.5,
    reasoning: "test",
    evidence: [],
    signals: { signals: [], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
    source: "heuristic_only",
    ...over,
  };
}

function makePolicyFromCud(cud: CUDResult, stage: any) {
  return evaluatePolicy({
    cud,
    inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
    currentStage: stage,
    lastExecution: allPassed,
    messageIndex: 0,
  });
}

describe("selectTransition", () => {
  it("returns null when no candidates match", () => {
    const t = selectTransition({
      from: "EXPLORE",
      policy: makePolicyFromCud(makeCud({ kind: "ambiguous", confidence: 0.4 }), "EXPLORE"),
      lastExecution: undefined,
      inertiaConfirmed: false,
    });
    expect(t).toBeNull();
  });

  it("DEBUG + misunderstood → blocked by terminal_override, returns null", () => {
    const t = selectTransition({
      from: "DEBUG",
      policy: makePolicyFromCud(makeCud({ kind: "misunderstood", confidence: 0.95 }), "DEBUG"),
      lastExecution: undefined,
      inertiaConfirmed: true,
    });
    expect(t).toBeNull();
  });

  it("EXPLORE + understood_weak_logic + moderate confidence → advance to STRATEGIZE", () => {
    const policy = evaluatePolicy({
      cud: makeCud({ kind: "understood_weak_logic", confidence: 0.7 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "EXPLORE",
      lastExecution: undefined,
      messageIndex: 0,
    });
    const t = selectTransition({
      from: "EXPLORE",
      policy,
      lastExecution: undefined,
      inertiaConfirmed: false,
    });
    expect(t).not.toBeNull();
    expect(t?.to).toBe("STRATEGIZE");
    expect(t?.precedence).toBe("policy_advance");
  });

  it("compile_error → DEBUG (execution_based precedence wins when no policy)", () => {
    const t = selectTransition({
      from: "EXPLORE",
      policy: null,
      lastExecution: { kind: "compile_error", message: "SyntaxError", language: "python", codeHash: "abc" },
      inertiaConfirmed: false,
    });
    expect(t).not.toBeNull();
    expect(t?.to).toBe("DEBUG");
    expect(t?.precedence).toBe("execution_based");
  });

  it("inertia gate blocks retreat without confirmation", () => {
    const policy = evaluatePolicy({
      cud: makeCud({ kind: "misunderstood", confidence: 0.95 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "IMPLEMENT",
      lastExecution: undefined,
      messageIndex: 0,
    });
    // policy.stageAction is "stay" because inertia gate fires inside the engine,
    // so buildTransitionCandidates will not even produce a "retreat" candidate.
    // This test confirms the gate works at the machine level too.
    const cands = buildTransitionCandidates({
      from: "IMPLEMENT",
      policy,
      lastExecution: undefined,
      inertiaConfirmed: false,
    });
    const inertiaBlock = cands.find((c) => c.precedence === "inertia_gate");
    expect(inertiaBlock).toBeDefined();
    // The selected transition is null (no valid candidate).
    const t = selectTransition({
      from: "IMPLEMENT",
      policy,
      lastExecution: undefined,
      inertiaConfirmed: false,
    });
    expect(t).toBeNull();
  });
});
