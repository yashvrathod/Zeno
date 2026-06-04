/**
 * =============================================================================
 * Multi-part fingerprint — cache key for the CUD pipeline
 * =============================================================================
 *
 * The fingerprint prevents "context aliasing" — the same code under different
 * execution contexts must not reuse a stale diagnosis. v3 review §4 caught
 * this; v4 locks it in.
 *
 * Parts:
 *   - codeHash            (server-authoritative, 12-char sha256)
 *   - executionFingerprint (kind + pass/total + failure fingerprint)
 *   - historyFingerprint   (last N user messages, hex)
 *   - userMessageFingerprint (this single message)
 *
 * All four are required. Same code + different execution → different key.
 * Same code + different question → different key.
 */

import crypto from "crypto";
import type { LastExecution } from "@/lib/mentor/lastExecution";

const HEX = 12;

function sha12(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, HEX);
}

export function fingerprintExecution(le: LastExecution | undefined | null): string | null {
  if (!le || le.kind === "no_execution_yet") return null;
  const base = (() => {
    switch (le.kind) {
      case "all_passed":
        return `all_passed:${le.passed}:${le.total}:${le.runtimeMs ?? 0}`;
      case "failed_tests":
        return `failed:${le.passed}:${le.total}:${le.failures
          .map((f) => `${f.failureType}:${f.rootCauseHint ?? ""}`)
          .join("|")}`;
      case "compile_error":
        return `compile:${(le.message || "").slice(0, 200)}`;
      case "runtime_error":
        return `runtime:${(le.message || "").slice(0, 200)}`;
      case "tle":
        return `tle:${le.runtimeMs}:${le.limitMs}`;
    }
  })();
  return sha12(base);
}

export function fingerprintHistory(
  history: Array<{ role: string; content: string }>,
  depth: number = 3,
): string {
  const tail = history.slice(-depth).map((m) => `${m.role}:${m.content.slice(0, 200)}`).join("|");
  return sha12(tail);
}

export function fingerprintUserMessage(message: string): string {
  return sha12(message);
}

export type CUDFingerprintParts = {
  codeHash: string | null;
  executionFingerprint: string | null;
  historyFingerprint: string | null;
  userMessageFingerprint: string | null;
};

export function buildCUDFingerprint(parts: CUDFingerprintParts): string {
  const composite = [
    parts.codeHash ?? "_",
    parts.executionFingerprint ?? "_",
    parts.historyFingerprint ?? "_",
    parts.userMessageFingerprint ?? "_",
  ].join(":");
  return sha12(composite);
}
