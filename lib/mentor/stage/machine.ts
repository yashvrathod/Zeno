/**
 * =============================================================================
 * Stage machine — the formal state machine table + precedence resolver
 * =============================================================================
 *
 * Single source of truth for stage transitions. The validator in
 * lib/mentor/stage/validation.ts is generated from this table.
 *
 * PRECEDENCE ORDER (top wins):
 *   1. terminal_override      — DEBUG/STUCK block retreat
 *   2. inertia_gate           — inertia blocks retreating without confirmation
 *   3. policy_fast_jump       — EXPLORE/STRATEGIZE → REFLECT (high-conf + all_passed)
 *   4. policy_advance         — EXPLORE → STRATEGIZE, STRATEGIZE → IMPLEMENT, etc.
 *   5. policy_retreat         — → EXPLORE if misunderstood (gated by inertia)
 *   6. execution_based        — compile/runtime_error → DEBUG, all_passed → IMPLEMENT
 *   7. default_hold           — no condition matched → stay
 *
 * When multiple conditions match, selectTransition() walks the precedence
 * list top to bottom and returns the first match. This is the v3 fix for
 * "multiple overlapping conditions" — explicit ordering eliminates
 * implicit priority conflicts.
 */

import type { TeachingStage } from "@/lib/mentorContext";
import type { LastExecution } from "@/lib/mentor/lastExecution";
import type { PolicyDecision } from "../diagnosis/types";

export type TransitionPrecedence =
  | "terminal_override"
  | "inertia_gate"
  | "policy_fast_jump"
  | "policy_advance"
  | "policy_retreat"
  | "execution_based"
  | "default_hold";

export type TransitionCandidate = {
  from: TeachingStage;
  to: TeachingStage;
  precedence: TransitionPrecedence;
  rule: string;
  gatedBy?: string;
};

export type SelectTransitionInput = {
  from: TeachingStage;
  policy: PolicyDecision | null;
  lastExecution: LastExecution | undefined;
  /** True when inertia has confirmed the policy's direction. */
  inertiaConfirmed: boolean;
};

/**
 * Build all candidates that match the current state. selectTransition()
 * then orders them by precedence.
 */
export function buildTransitionCandidates(input: SelectTransitionInput): TransitionCandidate[] {
  const candidates: TransitionCandidate[] = [];
  const { from, policy, lastExecution, inertiaConfirmed } = input;

  // ── 1. terminal_override ──
  if (from === "DEBUG" && policy?.stageAction === "retreat") {
    candidates.push({
      from,
      to: from, // blocked
      precedence: "terminal_override",
      rule: "DEBUG is terminal for retreat",
      gatedBy: "policy.stageAction=retreat",
    });
  }
  if (from === "STUCK" && policy?.stageAction === "advance") {
    // Stuck only exits via frustration=false (existing rule); not via policy.advance.
    candidates.push({
      from,
      to: from,
      precedence: "terminal_override",
      rule: "STUCK only exits via frustration gate",
      gatedBy: "policy.stageAction=advance",
    });
  }

  // ── 3. policy_fast_jump ──
  if (policy && lastExecution?.kind === "all_passed" && policy.cudKind === "understood_strong_logic") {
    if (from === "EXPLORE" || from === "STRATEGIZE") {
      candidates.push({
        from,
        to: "REFLECT",
        precedence: "policy_fast_jump",
        rule: "all_passed + understood_strong + forward threshold",
        gatedBy: `inertiaConfirmed=${inertiaConfirmed}`,
      });
    }
  }

  // ── 4. policy_advance ──
  if (policy?.stageAction === "advance") {
    const order: TeachingStage[] = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "REFLECT"];
    const i = order.indexOf(from);
    if (i >= 0 && i < order.length - 1) {
      candidates.push({
        from,
        to: order[i + 1],
        precedence: "policy_advance",
        rule: "policy.advance",
      });
    }
    if (from === "IMPLEMENT" && lastExecution?.kind === "all_passed" && policy.cudKind === "understood_strong_logic") {
      candidates.push({
        from,
        to: "REFLECT",
        precedence: "policy_advance",
        rule: "IMPLEMENT + all_passed + strong",
      });
    }
  }

  // ── 5. policy_retreat ──
  if (policy?.stageAction === "retreat" && inertiaConfirmed) {
    const order: TeachingStage[] = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "REFLECT"];
    const i = order.indexOf(from);
    if (i > 0) {
      candidates.push({
        from,
        to: order[i - 1],
        precedence: "policy_retreat",
        rule: "policy.retreat + inertia confirmed",
      });
    }
  }

  // ── 2. inertia_gate (also fires when CUD is "misunderstood" but inertia
  //    is not yet confirmed — even if the policy engine already gated it) ──
  if (policy?.cudKind === "misunderstood" && !inertiaConfirmed) {
    candidates.push({
      from,
      to: from, // blocked
      precedence: "inertia_gate",
      rule: "retreat blocked: inertia not confirmed",
    });
  }

  // ── 6. execution_based (existing rules from validation.ts) ──
  if (lastExecution) {
    if (lastExecution.kind === "compile_error" || lastExecution.kind === "runtime_error") {
      if (from !== "DEBUG" && from !== "REFLECT") {
        candidates.push({
          from,
          to: "DEBUG",
          precedence: "execution_based",
          rule: "compile/runtime error → DEBUG",
        });
      }
    }
  }

  return candidates;
}

/**
 * Walks the candidates in precedence order and returns the first non-blocked
 * transition. Returns null when the system should hold (no mutation).
 */
export function selectTransition(input: SelectTransitionInput): TransitionCandidate | null {
  const candidates = buildTransitionCandidates(input);
  const order: TransitionPrecedence[] = [
    "terminal_override",
    "inertia_gate",
    "policy_fast_jump",
    "policy_advance",
    "policy_retreat",
    "execution_based",
  ];
  for (const prec of order) {
    const match = candidates.find((c) => c.precedence === prec);
    if (match) {
      if (match.from === match.to) {
        // Blocked by terminal_override or inertia_gate — return null
        // unless there's a higher-precedence unblocked match.
        continue;
      }
      return match;
    }
  }
  return null;
}
