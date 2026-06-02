/**
 * Tests for the problem metadata renderer.
 *
 * Today: title + difficulty + tags + patterns.
 * PR 5 will add expectedComplexity and topicTags. The renderer should
 * already handle them; these tests verify graceful degradation now and
 * that future fields flow through automatically when the schema lands.
 */

import { describe, it, expect } from "@jest/globals";
import { buildProblemMetadata } from "../problemMetadata";

describe("buildProblemMetadata", () => {
  it("renders the full block when all PR 5 fields are present", () => {
    const rendered = buildProblemMetadata({
      title: "Two Sum",
      difficulty: "EASY",
      tags: ["array", "hash-table"],
      patterns: ["two-pointer"],
      expectedComplexity: "O(n)",
      topicTags: ["hash-map"],
    });
    expect(rendered).toContain("Problem: Two Sum");
    expect(rendered).toContain("Difficulty: EASY");
    expect(rendered).toContain("Tags: array, hash-table");
    expect(rendered).toContain("Patterns: two-pointer");
    expect(rendered).toContain("Expected complexity: O(n)");
    expect(rendered).toContain("Topic tags: hash-map");
  });

  it("omits expectedComplexity and topicTags gracefully when undefined (PR 5 not yet shipped)", () => {
    const rendered = buildProblemMetadata({
      title: "Two Sum",
      difficulty: "EASY",
      tags: ["array", "hash-table"],
      patterns: ["two-pointer"],
    });
    expect(rendered).toContain("Problem: Two Sum");
    expect(rendered).toContain("Tags: array, hash-table");
    expect(rendered).not.toContain("Expected complexity");
    expect(rendered).not.toContain("Topic tags");
  });

  it("returns an empty string when all inputs are empty/undefined", () => {
    const rendered = buildProblemMetadata({});
    expect(rendered).toBe("");
  });

  it("truncates long tag lists to 8 items with a +N more suffix", () => {
    const rendered = buildProblemMetadata({
      title: "T",
      tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
    });
    expect(rendered).toContain("a, b, c, d, e, f, g, h");
    expect(rendered).toContain("(+3 more)");
    expect(rendered).not.toContain("i, j, k");
  });
});
