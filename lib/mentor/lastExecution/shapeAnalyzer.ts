/**
 * Pure fact producer: input string -> InputShape.
 *
 * Module boundary: this function emits structured facts only. No evidence
 * strings, no instructional language, no opinions. The failureClassifier
 * (one layer up) consumes these facts to derive evidence.
 *
 * Order of operations (strict):
 *   1. Length cap          — never parse oversized inputs.
 *   2. JSON.parse          — try once; on failure, return `string` shape.
 *   3. Structural shapes   — tree / graph / matrix / list_of_pairs. These
 *                            are useful even for small inputs.
 *   4. Int-array fork      — small arrays become `small_literal` (the
 *                            renderer can see the whole thing). Large
 *                            arrays become `int_array` (renderer needs
 *                            sampling facts).
 *   5. small_literal gate  — non-hidden, small, structurally uninteresting
 *                            JSON. Hidden inputs are structurally incapable
 *                            of producing small_literal at this layer.
 *   6. unknown fallback    — hidden small data, or any large unclassified
 *                            JSON.
 */

import {
  MAX_SHAPE_ANALYSIS_BYTES,
  SMALL_LITERAL_MAX_BYTES,
  SAMPLE_SIZE,
} from "./constants";
import { getTreeNode, getGraph, isMatrix, isListOfPairs, countTreeNodes } from "./objectSchemas";
import type { InputShape } from "./types";

function detectCharset(s: string): "ascii" | "alphanumeric" | "unicode" | "binary" {
  let nonAscii = false;
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) {
      nonAscii = true;
      break;
    }
  }
  if (!nonAscii) {
    let allAlnum = true;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      const isAlnum = (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
      if (!isAlnum) {
        allAlnum = false;
        break;
      }
    }
    return allAlnum ? "alphanumeric" : "ascii";
  }
  return "unicode";
}

type IntArrayShape = {
  sampledSorted: "asc" | "desc" | "none";
  sampledDuplicates: boolean;
  sampledValueRange: [number, number] | undefined;
};

function detectIntArrayShape(arr: number[]): IntArrayShape {
  if (arr.length === 0) {
    return { sampledSorted: "none", sampledDuplicates: false, sampledValueRange: undefined };
  }

  // Sample: first SAMPLE_SIZE, middle SAMPLE_SIZE (only if there's room
  // between first and last), last SAMPLE_SIZE. Distinct, non-overlapping
  // windows so sort/dup checks aren't polluted by re-sampled elements.
  // For arrays shorter than SAMPLE_SIZE, the whole array is one sample.
  const samples: number[] = [];
  const N = arr.length;
  if (N <= SAMPLE_SIZE) {
    samples.push(...arr);
  } else {
    samples.push(...arr.slice(0, SAMPLE_SIZE));
    if (N > 2 * SAMPLE_SIZE) {
      const mid = Math.floor(N / 2);
      const midStart = mid - Math.floor(SAMPLE_SIZE / 2);
      samples.push(...arr.slice(midStart, midStart + SAMPLE_SIZE));
    }
    samples.push(...arr.slice(N - SAMPLE_SIZE));
  }

  let isAsc = true;
  let isDesc = true;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i] < samples[i - 1]) isAsc = false;
    if (samples[i] > samples[i - 1]) isDesc = false;
    if (!isAsc && !isDesc) break;
  }
  const sampledSorted: "asc" | "desc" | "none" = isAsc ? "asc" : isDesc ? "desc" : "none";

  const seen = new Set<number>();
  let sampledDuplicates = false;
  for (const v of samples) {
    if (seen.has(v)) {
      sampledDuplicates = true;
      break;
    }
    seen.add(v);
  }

  let min = samples[0];
  let max = samples[0];
  for (let i = 1; i < samples.length; i++) {
    const v = samples[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  return { sampledSorted, sampledDuplicates, sampledValueRange: [min, max] };
}

function isAllFiniteNumbers(arr: unknown[]): arr is number[] {
  if (arr.length === 0) return false;
  for (const x of arr) {
    if (typeof x !== "number" || !Number.isFinite(x)) return false;
  }
  return true;
}

/**
 * Analyzes the shape of a test case input string.
 *
 * @param rawInput - The test case input as a string (raw stdin or JSON).
 * @param opts.isHidden - If true, the input is from a hidden test case.
 *                        Hidden inputs cannot produce `small_literal`.
 */
export function analyzeShape(rawInput: string, opts?: { isHidden?: boolean }): InputShape {
  const isHidden = opts?.isHidden ?? false;

  // 1. Length cap: never parse oversized inputs.
  if (rawInput.length > MAX_SHAPE_ANALYSIS_BYTES) {
    return { kind: "unknown", length: rawInput.length };
  }

  // 2. Try to parse as JSON. Plain text gets the `string` shape.
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawInput);
  } catch {
    return { kind: "string", length: rawInput.length, charset: detectCharset(rawInput) };
  }

  // 3. Structural shapes (tree / graph / matrix / list_of_pairs).
  //    These are useful even for small inputs.
  if (Array.isArray(parsed)) {
    if (isMatrix(parsed)) {
      const rows = parsed.length;
      const cols = parsed[0].length;
      return { kind: "matrix", rows, cols };
    }
    if (isListOfPairs(parsed)) {
      return { kind: "list_of_pairs", length: parsed.length };
    }
    if (isAllFiniteNumbers(parsed)) {
      // 4. Int-array fork: small literals carry more signal than sampling.
      if (!isHidden && rawInput.length < SMALL_LITERAL_MAX_BYTES) {
        return { kind: "small_literal", literal: rawInput };
      }
      // Large (or hidden) int arrays: emit sampling facts.
      const shape = detectIntArrayShape(parsed);
      return {
        kind: "int_array",
        length: parsed.length,
        sampledSorted: shape.sampledSorted,
        sampledDuplicates: shape.sampledDuplicates,
        sampledValueRange: shape.sampledValueRange,
      };
    }
    return { kind: "unknown", length: rawInput.length };
  }

  if (typeof parsed === "object" && parsed !== null) {
    const graph = getGraph(parsed);
    if (graph) {
      return { kind: "graph", nodes: graph.nodes, edges: graph.edges };
    }
    const tree = getTreeNode(parsed);
    if (tree) {
      const nodes = countTreeNodes(tree);
      return { kind: "tree", nodes };
    }
    // Other object shapes: try small_literal if non-hidden and small.
    if (!isHidden && rawInput.length < SMALL_LITERAL_MAX_BYTES) {
      return { kind: "small_literal", literal: rawInput };
    }
    return { kind: "unknown", length: rawInput.length };
  }

  if (typeof parsed === "string") {
    return { kind: "string", length: parsed.length, charset: detectCharset(parsed) };
  }

  // 5. small_literal gate for non-hidden, small, structurally uninteresting JSON.
  if (!isHidden && rawInput.length < SMALL_LITERAL_MAX_BYTES) {
    return { kind: "small_literal", literal: rawInput };
  }

  // 6. Unknown fallback.
  return { kind: "unknown", length: rawInput.length };
}
