/**
 * Types for the LastExecution module.
 *
 * Three layers, in increasing specificity:
 *   1. InputShape       — facts about the input structure (no language, no opinions)
 *   2. FailureSummary   — facts + interpretation (failureType, evidence, etc.)
 *   3. LastExecution    — the union passed to the prompt renderer
 *
 * Module boundary:
 *   shapeAnalyzer       produces InputShape
 *   failureClassifier   produces evidence + failureType + shape descriptors
 *   buildLastExecution  composes FailureSummary[] / LastExecution
 *   prompt renderer     (PR 3) produces natural language from the above
 */

export type InputShape =
  | { kind: "int_array"; length: number; sampledSorted?: "asc" | "desc" | "none" | "unknown"; sampledDuplicates?: boolean; sampledValueRange?: [number, number] }
  | { kind: "string"; length: number; charset?: "ascii" | "alphanumeric" | "unicode" | "binary" }
  | { kind: "matrix"; rows: number; cols: number }
  | { kind: "tree"; nodes: number; variant?: "binary" | "n_ary" }
  | { kind: "graph"; nodes: number; edges: number }
  | { kind: "list_of_pairs"; length: number }
  | { kind: "small_literal"; literal: string }   // < SMALL_LITERAL_MAX_BYTES, never for hidden inputs
  | { kind: "unknown"; length: number };

export type FailureType =
  | "wrong_answer"
  | "runtime_error"
  | "compile_error"
  | "tle"
  | "edge_case"
  | "unknown";

/**
 * Additive: new hints land here without a migration; downstream consumers
 * fall back to "unknown" on values they don't recognize.
 */
export type RootCauseHint =
  | "off_by_one"
  | "missing_return"
  | "null_pointer"
  | "incorrect_base_case"
  | "overflow"
  | "state_leak";

export type FailureSummary = {
  index: number;                          // 1-based; "test #4 of 24"
  failureType: FailureType;
  rootCauseHint?: RootCauseHint;
  evidence: string[];                     // raw facts the renderer interprets
  inputShape: InputShape;
  expectedShape: string;                  // "single integer", "true/false", "list of pairs"
  actualShape: string;                    // "empty string", "single null", "[1, 2]"
  notes?: string;
};

export type LastExecution =
  | { kind: "all_passed"; passed: number; total: number; runtimeMs?: number; codeHash: string }
  | { kind: "failed_tests"; passed: number; total: number; failures: FailureSummary[]; omittedFailures: number; codeHash: string }
  | { kind: "compile_error"; message: string; language: string; codeHash: string }
  | { kind: "runtime_error"; message: string; language: string; codeHash: string }
  | { kind: "tle"; runtimeMs: number; limitMs: number; language: string; codeHash: string }
  | { kind: "no_execution_yet" };
