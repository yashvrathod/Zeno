/**
 * Tests for shapeAnalyzer.
 *
 * Most important case: a string of MAX_SHAPE_ANALYSIS_BYTES + 1 chars must
 * short-circuit to `{ kind: "unknown" }` without ever invoking JSON.parse.
 * This is a regression test against future refactors that might move the
 * size check below the parse step.
 */

import { describe, it, expect, afterEach, jest } from "@jest/globals";
import { analyzeShape } from "../shapeAnalyzer";
import { MAX_SHAPE_ANALYSIS_BYTES, SMALL_LITERAL_MAX_BYTES } from "../constants";

describe("analyzeShape", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("int_array", () => {
    it("detects a 100-element int array and reports its shape", () => {
      const arr = Array.from({ length: 100 }, (_, i) => i);
      const result = analyzeShape(JSON.stringify(arr));
      expect(result.kind).toBe("int_array");
      if (result.kind === "int_array") {
        expect(result.length).toBe(100);
        expect(result.sampledSorted).toBe("asc");
        expect(result.sampledDuplicates).toBe(false);
        expect(result.sampledValueRange).toEqual([0, 99]);
      }
    });

    it("detects a 10,000-element int array via sampling", () => {
      // 10,000 ints at ~6 chars each = ~60KB JSON, well under the 256KB cap.
      const arr = Array.from({ length: 10_000 }, (_, i) => i);
      const result = analyzeShape(JSON.stringify(arr));
      expect(result.kind).toBe("int_array");
      if (result.kind === "int_array") {
        expect(result.length).toBe(10_000);
        expect(result.sampledSorted).toBe("asc");
        expect(result.sampledValueRange).toEqual([0, 9999]);
      }
    });
  });

  describe("length cap (regression test)", () => {
    it("returns unknown for inputs exceeding MAX_SHAPE_ANALYSIS_BYTES, without calling JSON.parse", () => {
      const oversized = "[" + "0,".repeat(MAX_SHAPE_ANALYSIS_BYTES) + "0]";
      expect(oversized.length).toBeGreaterThan(MAX_SHAPE_ANALYSIS_BYTES);

      const parseSpy = jest.spyOn(JSON, "parse");
      const result = analyzeShape(oversized);

      expect(result.kind).toBe("unknown");
      if (result.kind === "unknown") {
        expect(result.length).toBeGreaterThan(MAX_SHAPE_ANALYSIS_BYTES);
      }
      expect(parseSpy).not.toHaveBeenCalled();
    });

    it("returns unknown (not small_literal) for oversized JSON", () => {
      const oversized = "[" + "1,".repeat(MAX_SHAPE_ANALYSIS_BYTES) + "1]";
      const result = analyzeShape(oversized);
      expect(result.kind).toBe("unknown");
      expect(result.kind).not.toBe("small_literal");
    });
  });

  describe("small_literal", () => {
    it("returns small_literal for non-hidden, sub-200-char JSON", () => {
      const json = JSON.stringify([1, 2, 3, 4, 5]);
      expect(json.length).toBeLessThan(SMALL_LITERAL_MAX_BYTES);
      const result = analyzeShape(json);
      expect(result.kind).toBe("small_literal");
      if (result.kind === "small_literal") {
        expect(result.literal).toBe(json);
      }
    });

    it("does NOT return small_literal for a 199-char JSON when isHidden is true", () => {
      // Build a 199-char valid JSON (we want length just under SMALL_LITERAL_MAX_BYTES)
      const inner = "1,".repeat(98) + "1"; // 99-element array
      const json = `[${inner}]`;
      if (json.length >= SMALL_LITERAL_MAX_BYTES) {
        // Adjust to ensure it stays under 200 chars
        const smaller = "[" + "1,".repeat(96) + "1]"; // 97 elements
        expect(smaller.length).toBeLessThan(SMALL_LITERAL_MAX_BYTES);
        const result = analyzeShape(smaller, { isHidden: true });
        expect(result.kind).not.toBe("small_literal");
      } else {
        const result = analyzeShape(json, { isHidden: true });
        expect(result.kind).not.toBe("small_literal");
      }
    });

    it("does not return small_literal for non-JSON small input", () => {
      const result = analyzeShape("hello world");
      expect(result.kind).not.toBe("small_literal");
      expect(result.kind).toBe("string");
    });
  });

  describe("tree (multi-field-name support)", () => {
    it("detects tree with {val, left, right}", () => {
      const tree = { val: 1, left: { val: 2, left: null, right: null }, right: { val: 3, left: null, right: null } };
      const result = analyzeShape(JSON.stringify(tree));
      expect(result.kind).toBe("tree");
      if (result.kind === "tree") {
        expect(result.nodes).toBe(3);
      }
    });

    it("detects tree with {value, left, right}", () => {
      const tree = { value: 1, left: { value: 2, left: null, right: null }, right: null };
      const result = analyzeShape(JSON.stringify(tree));
      expect(result.kind).toBe("tree");
      if (result.kind === "tree") {
        expect(result.nodes).toBe(2);
      }
    });

    it("detects tree with {data, left, right}", () => {
      const tree = { data: 1, left: null, right: { data: 2, left: null, right: null } };
      const result = analyzeShape(JSON.stringify(tree));
      expect(result.kind).toBe("tree");
      if (result.kind === "tree") {
        expect(result.nodes).toBe(2);
      }
    });
  });

  describe("graph (multi-field-name support)", () => {
    it("detects graph with {nodes, edges}", () => {
      const graph = { nodes: 10, edges: 15 };
      const result = analyzeShape(JSON.stringify(graph));
      expect(result.kind).toBe("graph");
      if (result.kind === "graph") {
        expect(result.nodes).toBe(10);
        expect(result.edges).toBe(15);
      }
    });

    it("detects graph with {vertices, edges}", () => {
      const graph = { vertices: 5, edges: 7 };
      const result = analyzeShape(JSON.stringify(graph));
      expect(result.kind).toBe("graph");
      if (result.kind === "graph") {
        expect(result.nodes).toBe(5);
        expect(result.edges).toBe(7);
      }
    });
  });

  describe("matrix", () => {
    it("detects a 2D array as a matrix", () => {
      const matrix = [[1, 2, 3], [4, 5, 6]];
      const result = analyzeShape(JSON.stringify(matrix));
      expect(result.kind).toBe("matrix");
      if (result.kind === "matrix") {
        expect(result.rows).toBe(2);
        expect(result.cols).toBe(3);
      }
    });
  });

  describe("output invariants", () => {
    it("does not leak evidence or analysis metadata into the result", () => {
      const result = analyzeShape("[1,2,3,4,5]");
      expect(result).not.toHaveProperty("evidence");
      expect(result).not.toHaveProperty("analysisVersion");
      expect(result).not.toHaveProperty("confidence");
      expect(result).toHaveProperty("kind");
    });

    it("structural shapes carry a length-equivalent field (rows/cols/nodes/edges)", () => {
      // Each structural kind has its own length-equivalent field.
      const matrix = analyzeShape("[[1,2],[3,4]]");
      if (matrix.kind === "matrix") {
        expect(matrix).toHaveProperty("rows");
        expect(matrix).toHaveProperty("cols");
      }

      const tree = analyzeShape('{"val":1,"left":null,"right":null}');
      if (tree.kind === "tree") {
        expect(tree).toHaveProperty("nodes");
      }

      const graph = analyzeShape('{"nodes":5,"edges":7}');
      if (graph.kind === "graph") {
        expect(graph).toHaveProperty("nodes");
        expect(graph).toHaveProperty("edges");
      }

      // small_literal carries the literal payload instead.
      const small = analyzeShape("[1,2,3]");
      if (small.kind === "small_literal") {
        expect(small).toHaveProperty("literal");
      }
    });

    it("int_array shape includes sampling facts", () => {
      // 600 ints => ~2000-char JSON, just over the 200B small_literal
      // threshold, so the analyzer emits int_array with sampling facts.
      const arr = Array.from({ length: 600 }, (_, i) => i);
      const result = analyzeShape(JSON.stringify(arr));
      expect(result.kind).toBe("int_array");
      if (result.kind === "int_array") {
        expect(result).toHaveProperty("sampledSorted");
        expect(result).toHaveProperty("sampledDuplicates");
        expect(result).toHaveProperty("sampledValueRange");
        expect(result.sampledSorted).toBe("asc");
        expect(result.sampledValueRange).toEqual([0, 599]);
      }
    });
  });
});
