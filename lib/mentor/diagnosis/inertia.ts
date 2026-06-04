/**
 * =============================================================================
 * Inertia layer — decayed 2-of-N confirmation
 * =============================================================================
 *
 * Stage transitions require accumulation. A single CUD verdict of
 * "misunderstood" does NOT retreat the stage from IMPLEMENT to EXPLORE;
 * it requires 2-of-N (default 2-of-3) recent decisions to align.
 *
 * Decay: each InertiaDecision carries a decayedConfidence = confidence *
 * exp(-age_in_messages / decayRate). Old evidence fades. Default decay rate
 * is 5.0 (a decision 5 messages old is at e^-1 ≈ 0.37 of its original weight).
 *
 * Persistence: InertiaState is a derived view of the snapshot log. It is
 * NOT stored separately. See projections.ts for the rebuild function.
 */

import type { InertiaState, InertiaDecision, CUDKind, PolicyThresholds } from "./types";

export function emptyInertiaState(thresholds: PolicyThresholds): InertiaState {
  return {
    window: [],
    windowSize: Math.max(2, thresholds.inertia + 1), // inertia=N → window N+1 (so 2-of-3 means at most 3 recent)
    decayRate: thresholds.decayRate,
  };
}

export function decayedConfidence(rawConfidence: number, ageInMessages: number, decayRate: number): number {
  return rawConfidence * Math.exp(-ageInMessages / decayRate);
}

export function appendDecision(
  state: InertiaState,
  decision: { kind: CUDKind; confidence: number; messageIndex: number },
): InertiaState {
  const now = Date.now();
  const next: InertiaDecision[] = [
    ...state.window,
    {
      kind: decision.kind,
      confidence: decision.confidence,
      decayedConfidence: decision.confidence, // will be re-decayed on read
      messageIndex: decision.messageIndex,
      createdAt: now,
    },
  ];
  // Trim to windowSize, oldest first.
  while (next.length > state.windowSize) next.shift();
  return { ...state, window: next };
}

/**
 * Counts how many recent decisions match `kind` after decay weighting.
 * Returns the sum of decayed confidences of matching decisions.
 */
export function countMatching(state: InertiaState, kind: CUDKind, currentMessageIndex: number): number {
  let total = 0;
  for (const d of state.window) {
    const age = Math.max(0, currentMessageIndex - d.messageIndex);
    const decayed = decayedConfidence(d.confidence, age, state.decayRate);
    if (d.kind === kind) total += decayed;
  }
  return total;
}

/**
 * Returns the most recent kind in the window after applying decay.
 * If no window, returns null.
 */
export function dominantKind(state: InertiaState, currentMessageIndex: number): { kind: CUDKind; decayedConfidence: number } | null {
  if (state.window.length === 0) return null;
  const totals: Record<string, number> = {};
  for (const d of state.window) {
    const age = Math.max(0, currentMessageIndex - d.messageIndex);
    const decayed = decayedConfidence(d.confidence, age, state.decayRate);
    totals[d.kind] = (totals[d.kind] ?? 0) + decayed;
  }
  let bestKind: CUDKind | null = null;
  let bestVal = -Infinity;
  for (const [k, v] of Object.entries(totals)) {
    if (v > bestVal) {
      bestVal = v;
      bestKind = k as CUDKind;
    }
  }
  if (bestKind === null) return null;
  return { kind: bestKind, decayedConfidence: bestVal };
}
