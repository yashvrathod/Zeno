/**
 * Tests for mergeErrorPattern (pure helper) inside personalizationUpdater.
 *
 * The helper is the persistence-shaping logic behind recordErrorPattern.
 * recordErrorPattern itself is prisma-touching and is exercised end-to-end
 * by the live stack; these tests pin the merge contract independently.
 */

import { describe, it, expect } from "@jest/globals";
import { mergeErrorPattern } from "../personalizationUpdater";
import type { ErrorPattern } from "@/lib/mentor/personalization/types";

const baseEntry: ErrorPattern = {
  type: "off_by_one",
  message: "loop should run while i < n, not i <= n",
  occurrences: 1,
  lastSeen: new Date("2026-01-01T00:00:00Z"),
  relatedConcept: null,
};

describe("mergeErrorPattern", () => {
  it("inserts a new entry when no entry of the same type exists", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    const result = mergeErrorPattern(
      [],
      { type: "null_pointer", message: "got undefined" },
      now
    );
    expect(result).toEqual([
      {
        type: "null_pointer",
        message: "got undefined",
        occurrences: 1,
        lastSeen: now,
        relatedConcept: null,
      },
    ]);
  });

  it("increments occurrences and refreshes lastSeen when type matches, preserving the original message", () => {
    const firstSeen = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-03-01T00:00:00Z");
    const result = mergeErrorPattern(
      [{ ...baseEntry, lastSeen: firstSeen, occurrences: 3 }],
      { type: "off_by_one", message: "DIFFERENT MESSAGE THAT SHOULD NOT OVERWRITE" },
      now
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("off_by_one");
    expect(result[0].message).toBe(baseEntry.message);
    expect(result[0].occurrences).toBe(4);
    expect(result[0].lastSeen).toBe(now);
    expect(result[0].relatedConcept).toBeNull();
  });

  it("truncates messages longer than 200 characters on insert", () => {
    const longMessage = "x".repeat(500);
    const result = mergeErrorPattern(
      [],
      { type: "logic_error", message: longMessage }
    );
    expect(result[0].message).toHaveLength(200);
    expect(result[0].message).toBe("x".repeat(200));
  });

  it("does not truncate a matched entry's preserved message even if a longer one is detected", () => {
    const originalLong = "y".repeat(500);
    const original = { ...baseEntry, message: originalLong };
    const result = mergeErrorPattern(
      [original],
      { type: "off_by_one", message: "short" }
    );
    expect(result[0].message).toBe(originalLong);
    expect(result[0].occurrences).toBe(2);
  });

  it("caps the array at 50 entries by dropping the oldest lastSeen", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const existing: ErrorPattern[] = Array.from({ length: 50 }, (_, i) => ({
      type: "logic_error",
      message: `m${i}`,
      occurrences: 1,
      lastSeen: new Date(base.getTime() + i * 1000),
      relatedConcept: null,
    }));
    const now = new Date("2026-04-01T00:00:00Z");
    const result = mergeErrorPattern(
      existing,
      { type: "null_pointer", message: "new error" },
      now
    );
    expect(result).toHaveLength(50);
    const messages = result.map((e) => e.message);
    expect(messages).not.toContain("m0");
    expect(messages).toContain("m1");
    expect(messages).toContain("m49");
    const nullPointer = result.find((e) => e.type === "null_pointer");
    expect(nullPointer).toBeDefined();
    expect(nullPointer?.occurrences).toBe(1);
    expect(nullPointer?.lastSeen).toBe(now);
  });

  it("returns a new array; never mutates the input", () => {
    const existing: ErrorPattern[] = [
      { ...baseEntry, type: "null_pointer" as const, occurrences: 2 },
    ];
    const snapshot = JSON.parse(JSON.stringify(existing));
    const result = mergeErrorPattern(
      existing,
      { type: "null_pointer", message: "x" }
    );
    expect(result).not.toBe(existing);
    expect(JSON.parse(JSON.stringify(existing))).toEqual(snapshot);
    expect(result[0].occurrences).toBe(3);
  });
});
