/**
 * Tests for parseArchitectResponse — the strict LLM-response parser.
 *
 * History: the function used to fill missing fields with 75/100 hardcoded
 * "feedback" strings, returning a fake ArchitectReview that looked real.
 * The user got a confident-sounding "B" grade for an LLM that returned
 * unparseable text. These tests pin the new strict behavior: missing or
 * invalid fields must throw ArchitectParseError, never silently default.
 */

import { describe, it, expect } from "@jest/globals";
import {
  parseArchitectResponse,
  ArchitectParseError,
  type ArchitectReview,
} from "../seniorArchitect";

/**
 * Build a valid response string by JSON-encoding the given review. The
 * tests can omit fields to verify that the parser rejects them.
 */
function responseFrom(review: Partial<ArchitectReview>): string {
  const full: ArchitectReview = {
    overallScore: 85,
    categories: {
      naming: { score: 20, feedback: "Good names" },
      complexity: { score: 22, feedback: "Acceptable", current: "O(n)", suggested: "O(log n)" },
      edgeCases: { score: 18, feedback: "Some missing", missing: ["empty"] },
      cleanCode: { score: 25, feedback: "Clean", issues: [] },
    },
    actionable: ["Add validation", "Use early return"],
    refactoredExample: "function f(){}",
    ...review,
  } as ArchitectReview;
  // Wrap in chatty text to verify the regex extractor handles it.
  return `Here is my review:\n${JSON.stringify(full)}\nHope that helps!`;
}

describe("parseArchitectResponse", () => {
  it("returns a fully-populated ArchitectReview for a valid response", () => {
    const parsed = parseArchitectResponse(responseFrom({}));
    expect(parsed.overallScore).toBe(85);
    expect(parsed.categories.naming.score).toBe(20);
    expect(parsed.categories.complexity.suggested).toBe("O(log n)");
    expect(parsed.categories.edgeCases.missing).toEqual(["empty"]);
    expect(parsed.categories.cleanCode.issues).toEqual([]);
    expect(parsed.actionable).toEqual(["Add validation", "Use early return"]);
    expect(parsed.refactoredExample).toBe("function f(){}");
  });

  it("throws ArchitectParseError when there is no JSON object in the response", () => {
    expect(() => parseArchitectResponse("I'm not sure how to review this code.")).toThrow(
      ArchitectParseError,
    );
  });

  it("throws ArchitectParseError when overallScore is missing", () => {
    const raw = `{"categories": {"naming": {"score": 20, "feedback": "ok"}, "complexity": {"score": 22, "feedback": "ok", "current": "O(n)", "suggested": "O(log n)"}, "edgeCases": {"score": 18, "feedback": "ok", "missing": []}, "cleanCode": {"score": 25, "feedback": "ok", "issues": []}}, "actionable": ["x"]}`;
    expect(() => parseArchitectResponse(raw)).toThrow(ArchitectParseError);
  });

  it("throws ArchitectParseError when a category feedback is missing", () => {
    const raw = `{
      "overallScore": 80,
      "categories": {
        "naming": {"score": 20, "feedback": "ok"},
        "complexity": {"score": 22, "feedback": "ok", "current": "O(n)", "suggested": "O(log n)"},
        "edgeCases": {"score": 18, "feedback": "ok", "missing": []},
        "cleanCode": {"score": 25, "issues": []}
      },
      "actionable": ["x"]
    }`;
    expect(() => parseArchitectResponse(raw)).toThrow(ArchitectParseError);
  });

  it("throws ArchitectParseError when a score is out of range", () => {
    const raw = `{
      "overallScore": 200,
      "categories": {
        "naming": {"score": 20, "feedback": "ok"},
        "complexity": {"score": 22, "feedback": "ok", "current": "O(n)", "suggested": "O(log n)"},
        "edgeCases": {"score": 18, "feedback": "ok", "missing": []},
        "cleanCode": {"score": 25, "feedback": "ok", "issues": []}
      },
      "actionable": ["x"]
    }`;
    expect(() => parseArchitectResponse(raw)).toThrow(ArchitectParseError);
  });

  it("throws ArchitectParseError when actionable is empty", () => {
    const raw = `{
      "overallScore": 80,
      "categories": {
        "naming": {"score": 20, "feedback": "ok"},
        "complexity": {"score": 22, "feedback": "ok", "current": "O(n)", "suggested": "O(log n)"},
        "edgeCases": {"score": 18, "feedback": "ok", "missing": []},
        "cleanCode": {"score": 25, "feedback": "ok", "issues": []}
      },
      "actionable": []
    }`;
    expect(() => parseArchitectResponse(raw)).toThrow(ArchitectParseError);
  });
});
