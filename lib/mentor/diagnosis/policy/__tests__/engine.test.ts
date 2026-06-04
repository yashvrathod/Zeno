/**
 * Policy engine tests — the heart of the CUD pipeline
 */
import { evaluatePolicy } from "../engine";
import { emptyInertiaState, appendDecision } from "../../inertia";
import { DEFAULT_THRESHOLDS, type CUDResult } from "../../types";
import type { LastExecution } from "@/lib/mentor/lastExecution";

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

const allPassed: LastExecution = { kind: "all_passed", passed: 24, total: 24, codeHash: "abc" };
const failedOne: LastExecution = {
  kind: "failed_tests",
  passed: 23,
  total: 24,
  failures: [{ index: 0, failureType: "wrong_answer", rootCauseHint: "off_by_one", evidence: [], inputShape: { kind: "int_array", length: 3 }, expectedShape: "int", actualShape: "int" }],
  omittedFailures: 0,
  codeHash: "abc",
};

describe("evaluatePolicy", () => {
  it("returns stay when confidence is below ambiguity floor", () => {
    const p = evaluatePolicy({
      cud: makeCud({ confidence: 0.3 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "EXPLORE",
      lastExecution: undefined,
      messageIndex: 0,
    });
    expect(p.stageAction).toBe("stay");
  });

  it("returns stay for DEBUG + misunderstood (terminal for retreat)", () => {
    const p = evaluatePolicy({
      cud: makeCud({ kind: "misunderstood", confidence: 0.95 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "DEBUG",
      lastExecution: undefined,
      messageIndex: 0,
    });
    expect(p.stageAction).toBe("stay");
  });

  it("does NOT retreat from IMPLEMENT on single misunderstood (inertia gate)", () => {
    const p = evaluatePolicy({
      cud: makeCud({ kind: "misunderstood", confidence: 0.95 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "IMPLEMENT",
      lastExecution: undefined,
      messageIndex: 0,
    });
    expect(p.stageAction).toBe("stay");
  });

  it("DOES retreat from IMPLEMENT after 2-of-3 misunderstood (inertia confirmed)", () => {
    let inertia = emptyInertiaState(DEFAULT_THRESHOLDS);
    inertia = appendDecision(inertia, { kind: "misunderstood", confidence: 0.95, messageIndex: 0 });
    inertia = appendDecision(inertia, { kind: "misunderstood", confidence: 0.95, messageIndex: 1 });
    const p = evaluatePolicy({
      cud: makeCud({ kind: "misunderstood", confidence: 0.95 }),
      inertia,
      currentStage: "IMPLEMENT",
      lastExecution: undefined,
      messageIndex: 2,
    });
    expect(p.stageAction).toBe("retreat");
  });

  it("advances EXPLORE → STRATEGIZE on understood_weak_logic with moderate confidence", () => {
    const p = evaluatePolicy({
      cud: makeCud({ kind: "understood_weak_logic", confidence: 0.7 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "EXPLORE",
      lastExecution: failedOne,
      messageIndex: 0,
    });
    expect(p.stageAction).toBe("advance");
    expect(p.suggestedStage).toBe("STRATEGIZE");
  });

  it("fast-jumps STRATEGIZE → REFLECT on strong + all_passed + 2-of-3 confirmed", () => {
    let inertia = emptyInertiaState(DEFAULT_THRESHOLDS);
    inertia = appendDecision(inertia, { kind: "understood_strong_logic", confidence: 0.95, messageIndex: 0 });
    inertia = appendDecision(inertia, { kind: "understood_strong_logic", confidence: 0.95, messageIndex: 1 });
    const p = evaluatePolicy({
      cud: makeCud({ kind: "understood_strong_logic", confidence: 0.95 }),
      inertia,
      currentStage: "STRATEGIZE",
      lastExecution: allPassed,
      messageIndex: 2,
    });
    expect(p.stageAction).toBe("advance");
  });

  it("suggests empathetic tone for high-confidence misunderstood", () => {
    const p = evaluatePolicy({
      cud: makeCud({ kind: "misunderstood", confidence: 0.95 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "IMPLEMENT",
      lastExecution: undefined,
      messageIndex: 0,
    });
    expect(p.toneAction).toBe("override");
    expect(p.suggestedTone).toBe("empathetic");
  });

  it("suggests challenging tone for high-confidence strong logic", () => {
    let inertia = emptyInertiaState(DEFAULT_THRESHOLDS);
    inertia = appendDecision(inertia, { kind: "understood_strong_logic", confidence: 0.95, messageIndex: 0 });
    inertia = appendDecision(inertia, { kind: "understood_strong_logic", confidence: 0.95, messageIndex: 1 });
    const p = evaluatePolicy({
      cud: makeCud({ kind: "understood_strong_logic", confidence: 0.95 }),
      inertia,
      currentStage: "STRATEGIZE",
      lastExecution: allPassed,
      messageIndex: 2,
    });
    expect(p.suggestedTone).toBe("challenging");
  });

  it("applies confidence floor of 0.5 (judge-independence)", () => {
    const p = evaluatePolicy({
      cud: makeCud({ confidence: 0.2 }),
      inertia: emptyInertiaState(DEFAULT_THRESHOLDS),
      currentStage: "EXPLORE",
      lastExecution: undefined,
      messageIndex: 0,
    });
    expect(p.cudConfidence).toBe(0.5);
  });
});
