/**
 * =============================================================================
 * Decision trace — debug artifact
 * =============================================================================
 *
 * Captures the full pipeline as a flat list of steps. Stored in the
 * snapshot's `payload.trace` field. The trace is the answer to
 * "which layer decided the outcome?" for support tickets and calibration.
 *
 * Steps are append-only and order-sensitive. Each step carries its own
 * discriminable payload — no shared mutable state.
 */

import type { DecisionTrace, TraceStep } from "./types";

export function newTrace(decisionId: string): DecisionTrace {
  return {
    decisionId,
    createdAt: Date.now(),
    steps: [],
  };
}

export function appendStep(trace: DecisionTrace, step: TraceStep): DecisionTrace {
  return { ...trace, steps: [...trace.steps, step] };
}

export function traceSummary(trace: DecisionTrace): string {
  const counts: Record<string, number> = {};
  for (const s of trace.steps) {
    counts[s.kind] = (counts[s.kind] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([k, v]) => `${k}=${v}`)
    .join(",");
}
