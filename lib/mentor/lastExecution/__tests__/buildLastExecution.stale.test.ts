/**
 * Tests for `resolveStale` — the authoritative stale check.
 *
 * The orchestrator is the only consumer; the page never decides stale.
 * These tests pin the contract that:
 *   - no_execution_yet can never be stale
 *   - missing serverHash (empty code) is never stale
 *   - missing lastExecution is never stale
 *   - codeHash mismatch → stale
 *   - codeHash match → not stale
 *
 * The same definition is referenced verbatim by the orchestrator, the
 * renderer, and these tests.
 */

import { describe, it, expect } from "@jest/globals";
import { resolveStale } from "../stale";
import type { LastExecution } from "../types";

const HASH_A = "abc123def456";
const HASH_B = "987654fedcba";

describe("resolveStale", () => {
  describe("returns false (never stale)", () => {
    it("when lastExecution is undefined", () => {
      expect(resolveStale(undefined, HASH_A)).toBe(false);
    });

    it("when lastExecution.kind === 'no_execution_yet' regardless of serverHash", () => {
      const le: LastExecution = { kind: "no_execution_yet" };
      expect(resolveStale(le, null)).toBe(false);
      expect(resolveStale(le, HASH_A)).toBe(false);
    });

    it("when serverHash is null (empty/short code)", () => {
      const le: LastExecution = {
        kind: "all_passed", passed: 1, total: 1, codeHash: HASH_A,
      };
      expect(resolveStale(le, null)).toBe(false);
    });

    it("when lastExecution.codeHash matches serverHash", () => {
      const le: LastExecution = {
        kind: "failed_tests", passed: 0, total: 1, codeHash: HASH_A,
        failures: [], omittedFailures: 0,
      };
      expect(resolveStale(le, HASH_A)).toBe(false);
    });
  });

  describe("returns true (stale)", () => {
    it("when lastExecution.codeHash differs from serverHash (user edited since last run)", () => {
      const le: LastExecution = {
        kind: "all_passed", passed: 1, total: 1, codeHash: HASH_A,
      };
      expect(resolveStale(le, HASH_B)).toBe(true);
    });

    it("stale works for every non-no_execution_yet kind", () => {
      const cases: LastExecution[] = [
        { kind: "all_passed", passed: 1, total: 1, codeHash: HASH_A },
        { kind: "failed_tests", passed: 0, total: 1, codeHash: HASH_A, failures: [], omittedFailures: 0 },
        { kind: "compile_error", message: "x", language: "python", codeHash: HASH_A },
        { kind: "runtime_error", message: "x", language: "python", codeHash: HASH_A },
        { kind: "tle", runtimeMs: 100, limitMs: 50, language: "python", codeHash: HASH_A },
      ];
      for (const le of cases) {
        expect(resolveStale(le, HASH_B)).toBe(true);
      }
    });
  });
});
