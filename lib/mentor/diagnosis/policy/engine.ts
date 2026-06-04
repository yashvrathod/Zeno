/**
 * =============================================================================
 * CUD Policy Engine — renamed from "arbiter"
 * =============================================================================
 *
 * Honest name. The engine applies deterministic rules over stochastic CUD
 * input. It is NOT a pure function of the CUD result — it also reads the
 * inertia state, the current stage, the execution kind, and the policy
 * thresholds. What it provides is:
 *
 *   - Bounded authority (no decision can exceed configured thresholds)
 *   - Stable transitions (no single-shot jumps; inertia gates retreats)
 *   - Audit reproducibility (thresholds are snapshotted into the decision)
 *   - Safe default on ambiguity (kind → "ambiguous", action → "stay")
 *
 * Boundaries: this module does NOT mutate state. It produces a
 * PolicyDecision. The orchestrator applies it. This makes the engine
 * trivially unit-testable.
 */

import type {
  CUDResult,
  PolicyDecision,
  PolicyThresholds,
  InertiaState,
  CUDKind,
  StageAction,
  ToneAction,
} from "../types";
import { DEFAULT_THRESHOLDS } from "../types";
import { dominantKind } from "../inertia";
import type { TeachingStage } from "@/lib/mentorContext";
import type { ConversationTone } from "@/lib/mentorContext";
import type { LastExecution } from "@/lib/mentor/lastExecution";

/**
 * Returns true if at least N (inertia threshold) recent decisions match the
 * given kind. Uses unweighted counting (not decayed sum) so the threshold
 * has intuitive semantics: "2 of 3 recent decisions say misunderstood".
 */
function inertiaCount(state: InertiaState, kind: CUDKind): number {
  let count = 0;
  for (const d of state.window) {
    if (d.kind === kind) count++;
  }
  return count;
}

export type PolicyInput = {
  cud: CUDResult;
  inertia: InertiaState;
  currentStage: TeachingStage;
  lastExecution: LastExecution | undefined;
  messageIndex: number;
  thresholds?: PolicyThresholds;
};

function pickStageAction(args: {
  cud: CUDResult;
  inertia: InertiaState;
  currentStage: TeachingStage;
  lastExecution: LastExecution | undefined;
  thresholds: PolicyThresholds;
  messageIndex: number;
}): StageAction {
  const { cud, inertia, currentStage, lastExecution, thresholds } = args;

  // DEBUG is terminal for retreat.
  if (currentStage === "DEBUG" && cud.kind === "misunderstood") {
    return "stay";
  }

  // Below ambiguity floor → no mutation.
  if (cud.confidence < thresholds.ambiguity) {
    return "stay";
  }

  // Ambiguous kind → no mutation.
  if (cud.kind === "ambiguous") {
    return "stay";
  }

  // all_passed + understood_strong → forward (or fast-jump if from early stage).
  if (cud.kind === "understood_strong_logic" && lastExecution?.kind === "all_passed") {
    if (cud.confidence >= thresholds.forward) {
      // Apply inertia: require N-of-window matching recent strong decisions.
      const matching = inertiaCount(inertia, "understood_strong_logic");
      if (matching >= thresholds.inertia) {
        if (currentStage === "EXPLORE" || currentStage === "STRATEGIZE") {
          return "advance"; // fast-jump to REFLECT happens in stage machine
        }
        return "advance";
      }
    }
  }

  // Misunderstood: requires inertia to retreat.
  if (cud.kind === "misunderstood") {
    if (cud.confidence >= thresholds.retreat) {
      const matching = inertiaCount(inertia, "misunderstood");
      if (matching >= thresholds.inertia) {
        if (currentStage === "IMPLEMENT" || currentStage === "STRATEGIZE") {
          return "retreat";
        }
      }
    }
  }

  // Weak logic: gentle nudge forward toward STRATEGIZE/IMPLEMENT.
  if (cud.kind === "understood_weak_logic") {
    if (cud.confidence >= 0.6) {
      if (currentStage === "EXPLORE") return "advance";
      if (currentStage === "STRATEGIZE") return "advance";
    }
  }

  return "stay";
}

function pickToneAction(args: {
  cud: CUDResult;
  currentStage: TeachingStage;
  thresholds: PolicyThresholds;
}): { toneAction: ToneAction; suggestedTone?: ConversationTone } {
  const { cud, currentStage, thresholds } = args;
  if (cud.confidence < thresholds.ambiguity) return { toneAction: "keep" };
  if (cud.kind === "misunderstood" && cud.confidence >= thresholds.retreat) {
    return { toneAction: "override", suggestedTone: "empathetic" };
  }
  if (cud.kind === "understood_strong_logic" && cud.confidence >= thresholds.forward && currentStage !== "DEBUG") {
    return { toneAction: "override", suggestedTone: "challenging" };
  }
  if (cud.kind === "code_doesnt_run" || cud.kind === "no_execution_yet") {
    return { toneAction: "override", suggestedTone: "analytical" };
  }
  return { toneAction: "keep" };
}

function explainDecision(cud: CUDResult, action: StageAction, suggestedStage?: TeachingStage): string {
  const parts: string[] = [];
  parts.push(`cud=${cud.kind}@${cud.confidence.toFixed(2)}`);
  parts.push(`action=${action}`);
  if (suggestedStage) parts.push(`to=${suggestedStage}`);
  return parts.join(" ").slice(0, 200);
}

function pickSuggestedStage(action: StageAction, currentStage: TeachingStage): TeachingStage | undefined {
  if (action === "stay" || action === "hold") return undefined;
  const order: TeachingStage[] = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "REFLECT"];
  const i = order.indexOf(currentStage);
  if (i === -1) return undefined;
  if (action === "advance") {
    // Forward-jump rule: if all_passed + strong, jump to REFLECT from early stages.
    // The actual transition is selected by the stage machine's selectTransition.
    return order[Math.min(i + 1, order.length - 1)];
  }
  if (action === "retreat") {
    return order[Math.max(i - 1, 0)];
  }
  return undefined;
}

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const thresholds = input.thresholds ?? DEFAULT_THRESHOLDS;
  const cud = input.cud;

  // Per JUDGE_INDEPENDENCE_INVARIANT, apply floor to confidence.
  const flooredConfidence = Math.max(cud.confidence, 0.5);

  const stageAction = pickStageAction({
    cud: { ...cud, confidence: flooredConfidence },
    inertia: input.inertia,
    currentStage: input.currentStage,
    lastExecution: input.lastExecution,
    thresholds,
    messageIndex: input.messageIndex,
  });
  const suggestedStage = pickSuggestedStage(stageAction, input.currentStage);
  const tone = pickToneAction({
    cud: { ...cud, confidence: flooredConfidence },
    currentStage: input.currentStage,
    thresholds,
  });
  const explanationMd = explainDecision(cud, stageAction, suggestedStage);

  // Compute final policyKind. If action is "stay" because of ambiguity gate
  // or inertia gate, the policy kind may differ from CUD kind.
  let policyKind: CUDKind = cud.kind;
  if (stageAction === "stay" && cud.kind !== "ambiguous") {
    // The CUD saw something; the policy chose not to act on it. Mark as ambiguous.
    if (cud.confidence < thresholds.ambiguity) policyKind = "ambiguous";
  }

  return {
    cudKind: cud.kind,
    cudConfidence: flooredConfidence,
    policyKind,
    policyConfidence: flooredConfidence,
    stageAction,
    toneAction: tone.toneAction,
    suggestedTone: tone.suggestedTone,
    suggestedStage,
    explanationMd,
    thresholds,
    source: cud.source,
  };
}

/**
 * Returns the dominant CUD kind over the inertia window. Used to drive
 * the snapshot's "policyKind" field when stageAction is "stay" so the
 * debug view still shows what the system considered.
 */
export function inertiaDominantKind(inertia: InertiaState, messageIndex: number): { kind: CUDKind; decayedConfidence: number } | null {
  return dominantKind(inertia, messageIndex);
}
