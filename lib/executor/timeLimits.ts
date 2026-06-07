/**
 * Per-problem time limit resolution.
 *
 * Why a helper: per-problem `timeLimitMs` is nullable on the Problem model.
 * The executor needs a single source of truth for "what is the limit for
 * this run" so future logic (difficulty-based defaults, topic-based limits,
 * multi-backend routing) can evolve without scattering `?? DEFAULT_...`
 * across the codebase.
 */

export const DEFAULT_TIME_LIMIT_MS = 15_000;

export const PISTON_HARD_TIMEOUT_MS = 25_000;

export function getProblemTimeLimit(p: { timeLimitMs: number | null }): number {
  return p.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
}
