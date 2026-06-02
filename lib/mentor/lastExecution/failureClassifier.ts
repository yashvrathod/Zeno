/**
 * Evidence producer: structured InputShape + raw actual/expected -> ClassifierResult.
 *
 * Module boundary: consumes facts from shapeAnalyzer, emits evidence strings.
 * The prompt renderer (PR 3) takes the resulting evidence and turns it into
 * natural language. We do not produce language here.
 *
 * Important: evidence is appended ONLY when the underlying fact is present.
 * The classifier never invents evidence.
 */

import { analyzeShape } from "./shapeAnalyzer";
import type { FailureType, RootCauseHint } from "./types";

export type ClassifierInput = {
  rawInput: string;
  actual: string;
  expected: string;
  runtimeMs?: number;
  limitMs?: number;
  isHidden?: boolean;
};

export type ClassifierResult = {
  failureType: FailureType;
  rootCauseHint?: RootCauseHint;
  evidence: string[];
  expectedShape: string;
  actualShape: string;
};

/**
 * Produces a short shape descriptor from a value string.
 * Always safe to send to the model — never includes the literal value.
 */
function describeShape(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "empty";
  if (trimmed === "null") return "null";
  if (trimmed === "undefined") return "undefined";
  if (trimmed === "None") return "None";
  if (trimmed === "true" || trimmed === "false") return "boolean";
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return "single number";

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return "empty array";
      if (parsed.every((x) => typeof x === "number")) {
        return parsed.length === 1 ? "single-element array" : `array of ${parsed.length} numbers`;
      }
      if (parsed.every((x) => Array.isArray(x))) {
        return `array of ${parsed.length} arrays`;
      }
      if (parsed.every((x) => typeof x === "string")) {
        return `array of ${parsed.length} strings`;
      }
      return `array of ${parsed.length} items`;
    }
    if (parsed !== null && typeof parsed === "object") return "object";
    if (typeof parsed === "string") {
      return parsed.length === 0 ? "empty string" : `string of ${parsed.length} chars`;
    }
  } catch {
    // Plain text
  }
  if (trimmed.length > 100) return `text (${trimmed.length} chars)`;
  return "text";
}

/**
 * Detects off-by-one at array boundary.
 * Returns "first" / "last" / null.
 * - "first": same-length arrays, only the first element differs.
 * - "last":  same-length arrays, only the last element differs.
 */
function diffAtBoundary(actual: string, expected: string): "first" | "last" | null {
  let a: unknown;
  let b: unknown;
  try {
    a = JSON.parse(actual);
    b = JSON.parse(expected);
  } catch {
    return null;
  }
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  if (a.length !== b.length || a.length === 0) return null;

  const aStr = JSON.stringify(a);
  const bStr = JSON.stringify(b);
  if (aStr === bStr) return null;

  // Check first element
  if (JSON.stringify(a[0]) !== JSON.stringify(b[0])) {
    for (let i = 1; i < a.length; i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return null;
    }
    return "first";
  }
  // Check last element
  if (JSON.stringify(a[a.length - 1]) !== JSON.stringify(b[a.length - 1])) {
    for (let i = 0; i < a.length - 1; i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return null;
    }
    return "last";
  }
  return null;
}

export function classifyFailure(input: ClassifierInput): ClassifierResult {
  const { rawInput, actual, expected, runtimeMs, limitMs, isHidden } = input;
  const evidence: string[] = [];

  // Re-invoke analyzer with isHidden so the small_literal gate is enforced
  // at the structural layer (not here).
  const inputShape = analyzeShape(rawInput, { isHidden: isHidden ?? false });

  let failureType: FailureType = "wrong_answer";
  let rootCauseHint: RootCauseHint | undefined;

  // Heuristic 1: empty actual + non-empty expected.
  if (actual.trim() === "" && expected.trim() !== "") {
    failureType = "edge_case";
    evidence.push("actual output is empty");
  }

  // Heuristic 2: null/undefined/None in actual.
  const actualTrimmed = actual.trim();
  if (actualTrimmed === "null" || actualTrimmed === "undefined" || actualTrimmed === "None" ||
      actualTrimmed.includes("null") || actualTrimmed.includes("None")) {
    rootCauseHint = "null_pointer";
    evidence.push("actual contains null/undefined/None");
  }

  // Heuristic 3: off-by-one at boundary (only if no null_pointer already).
  if (!rootCauseHint) {
    const boundary = diffAtBoundary(actual, expected);
    if (boundary) {
      rootCauseHint = "off_by_one";
      evidence.push(`differs only at ${boundary} element`);
    }
  }

  // Heuristic 4: TLE evidence.
  if (typeof runtimeMs === "number" && typeof limitMs === "number" && runtimeMs > limitMs) {
    evidence.push(`runtime: ${runtimeMs}ms; limit: ${limitMs}ms`);
  }

  // Heuristic 5: shape-derived evidence.
  //    Only emit when the underlying fact is present on the InputShape.
  if (inputShape.kind === "int_array" && inputShape.sampledSorted === "asc") {
    evidence.push("sampled segments appear sorted");
  }

  return {
    failureType,
    rootCauseHint,
    evidence,
    expectedShape: describeShape(expected),
    actualShape: describeShape(actual),
  };
}
