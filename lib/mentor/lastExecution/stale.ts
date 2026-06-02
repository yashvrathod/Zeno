/**
 * Stale resolution: a single function used by the orchestrator to decide
 * whether the supplied LastExecution is still relevant to the code the
 * mentor is currently analyzing.
 *
 * Definition (consistent across orchestrator, renderer, and tests):
 *   "stale = the code currently being analyzed by the mentor differs from
 *    the code that produced the stored execution result."
 *
 * Invariants:
 *   - no_execution_yet can never be stale (there was no execution).
 *   - A missing serverHash (e.g., empty / very short code) means we cannot
 *     compute a comparison, so we return false to avoid false positives.
 *   - The page's locally-computed codeHash is NOT consulted here. That
 *     signal is a diagnostic only; trusting it would let a page-side bug
 *     mark every execution as stale.
 */

import type { LastExecution } from "./types";

export function resolveStale(
  lastExecution: LastExecution | undefined,
  serverHash: string | null,
): boolean {
  if (!lastExecution) return false;
  if (lastExecution.kind === "no_execution_yet") return false;
  if (!serverHash) return false;
  return lastExecution.codeHash !== serverHash;
}
