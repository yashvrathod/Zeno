import crypto from 'crypto';

/**
 * Computes a short, stable hash of user-submitted code for dedup
 * (e.g. architect-review cache lookup, stale-run detection).
 *
 * Returns null for empty/whitespace-only code or code shorter than 10
 * chars — those are treated as "no meaningful code to hash" by callers.
 *
 * Format: SHA-256, hex, first 12 chars (48 bits). This is the canonical
 * format used across the codebase. Do NOT use MD5 — it has been removed
 * for consistency and because the namespace must not collide with
 * other systems that hash user code.
 */
export function computeCodeHash(code: string | undefined | null): string | null {
  if (!code || code.trim().length < 10) return null;
  return crypto.createHash('sha256').update(code).digest('hex').slice(0, 12);
}
