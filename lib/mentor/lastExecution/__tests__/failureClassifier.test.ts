/**
 * Tests for classifyFailure (the evidence producer).
 *
 * Semantics: we assert with `toHaveProperty` / `not.toHaveProperty` rather
 * than exhaustive `Object.keys` checks. This lets us add fields like
 * `analysisVersion` later without breaking the suite.
 */

import { describe, it, expect } from "@jest/globals";
import { classifyFailure } from "../failureClassifier";

describe("classifyFailure", () => {
  describe("shape descriptors", () => {
    it("labels the actual shape as a single number for a numeric output", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3]",
        actual: "42",
        expected: "84",
      });
      expect(result.actualShape).toBe("single number");
      expect(result.expectedShape).toBe("single number");
    });

    it("labels an empty output as 'empty'", () => {
      const result = classifyFailure({
        rawInput: "[1]",
        actual: "",
        expected: "[1,2,3]",
      });
      expect(result.actualShape).toBe("empty");
    });

    it("labels a long text as 'text (N chars)' without leaking content", () => {
      const longText = "x".repeat(200);
      const result = classifyFailure({
        rawInput: "[]",
        actual: longText,
        expected: "[]",
      });
      expect(result.actualShape).toBe("text (200 chars)");
      expect(result.actualShape).not.toContain("xxxx");
    });
  });

  describe("edge_case (empty actual)", () => {
    it("emits edge_case when actual is empty and expected is not", () => {
      const result = classifyFailure({
        rawInput: "[1]",
        actual: "",
        expected: "[1]",
      });
      expect(result.failureType).toBe("edge_case");
      expect(result.evidence).toContain("actual output is empty");
    });
  });

  describe("null_pointer heuristic", () => {
    it("emits null_pointer when actual contains 'null'", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3]",
        actual: "null",
        expected: "[1,2,3]",
      });
      expect(result.rootCauseHint).toBe("null_pointer");
    });

    it("emits null_pointer when actual contains 'None'", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3]",
        actual: "None",
        expected: "[1,2,3]",
      });
      expect(result.rootCauseHint).toBe("null_pointer");
    });
  });

  describe("off_by_one heuristic", () => {
    it("emits off_by_one when arrays differ only at the first element", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3,4,5]",
        actual: "[9,2,3,4,5]",
        expected: "[1,2,3,4,5]",
      });
      expect(result.rootCauseHint).toBe("off_by_one");
      expect(result.evidence).toContain("differs only at first element");
    });

    it("emits off_by_one when arrays differ only at the last element", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3,4,5]",
        actual: "[1,2,3,4,9]",
        expected: "[1,2,3,4,5]",
      });
      expect(result.rootCauseHint).toBe("off_by_one");
      expect(result.evidence).toContain("differs only at last element");
    });

    it("does not emit off_by_one when arrays differ in multiple positions", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3,4,5]",
        actual: "[9,2,9,4,9]",
        expected: "[1,2,3,4,5]",
      });
      expect(result.rootCauseHint).not.toBe("off_by_one");
    });
  });

  describe("output invariants", () => {
    it("result has failureType, evidence, expectedShape, actualShape", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3]",
        actual: "[1,2]",
        expected: "[1,2,3]",
      });
      expect(result).toHaveProperty("failureType");
      expect(result).toHaveProperty("evidence");
      expect(result).toHaveProperty("expectedShape");
      expect(result).toHaveProperty("actualShape");
    });

    it("result does NOT include inputShape (that's the orchestrator's job)", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3]",
        actual: "[1,2]",
        expected: "[1,2,3]",
      });
      expect(result).not.toHaveProperty("inputShape");
    });

    it("evidence is always an array (possibly empty)", () => {
      const result = classifyFailure({
        rawInput: "[1,2,3]",
        actual: "[1,2,4]",
        expected: "[1,2,3]",
      });
      expect(Array.isArray(result.evidence)).toBe(true);
    });
  });
});
