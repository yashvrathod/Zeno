/**
 * Test-case view: a single source of truth for how a per-test result is
 * presented to any consumer (the page's execution panel, the AI mentor's
 * prompt, future admin panels, etc.).
 *
 * Design contract:
 *   - The view is computed ONCE per test result, server-side, before the
 *     response leaves `/api/execute`.
 *   - For hidden tests, the redacted view NEVER carries the raw input,
 *     expected, actual, or runtime error message — only shape descriptors
 *     and (for compile errors) the compiler message.
 *   - For non-hidden tests, the concrete view carries the full data.
 *   - Hidden tests are structurally incapable of producing a `small_literal`
 *     inputShape (gated at the shapeAnalyzer layer); defense-in-depth here
 *     asserts this invariant via the regression test.
 *
 * Why "compile error" keeps its message on hidden tests:
 *   The compiler's diagnostic contains only the student's code and standard
 *   language constructs. It does not contain values derived from the test
 *   input. Runtime errors, by contrast, frequently include the values that
 *   caused the crash — leaking the hidden input.
 */

import { analyzeShape } from "./shapeAnalyzer";
import type { InputShape } from "./types";
import type { ExecutionErrorKind } from "@/lib/executor/errorClassifier";

export type TestStatus =
  | "passed"
  | "wrong_answer"
  | "runtime_error"
  | "compile_error"
  | "time_limit_exceeded"
  | "output_limit_exceeded";

/**
 * DEPRECATED columns note (PR 2): The `concrete` view below still carries
 * stringified `input` / `expected` / `actual` for the existing UI renderer.
 * The new judge path (`app/api/execute/runNewJudge.ts`) stringifies `args` /
 * `expectedJson` from the DB at the API boundary and feeds them into this
 * view. The legacy path (`runLegacy.ts`) still reads the deprecated
 * `TestCase.input` / `TestCase.expected` columns directly. The DB columns
 * are kept populated for now; dropping them is deferred to a follow-up
 * migration. UI should prefer the `redacted` view's shape descriptors for
 * hidden tests (already enforced).
 */
export type TestCaseView =
  | {
      kind: "concrete";
      testCaseId: string;
      index: number;
      status: TestStatus;
      input: string;
      expected: string;
      actual: string;
      /** Full error message. Safe — no input values involved (non-hidden). */
      error: string;
      errorKind?: ExecutionErrorKind;
      executionTime: number;
      isHidden: false;
    }
  | {
      kind: "redacted";
      testCaseId: string;
      index: number;
      status: TestStatus;
      /** Replaces raw `input`. Never `kind: "small_literal"` for hidden tests. */
      inputShape: InputShape;
      /** Replaces raw `expected`. Short shape descriptor (e.g. "array of 5 numbers"). */
      expectedShape: string;
      /** Replaces raw `actual`. Short shape descriptor. */
      actualShape: string;
      /**
       * Compiler message only — populated iff `errorKind === "compile_error"`.
       * Empty for runtime errors and TLE to avoid leaking input-derived values.
       */
      error: string;
      errorKind?: ExecutionErrorKind;
      executionTime: number;
      isHidden: true;
    };

export type RawTestCaseRecord = {
  testCaseId: string;
  index: number;
  status: TestStatus;
  input: string;
  expected: string;
  actual: string;
  error?: string;
  errorKind?: ExecutionErrorKind;
  executionTime: number;
};

/**
 * Short shape descriptor for a value. Always safe to send to the model or
 * show to the user — never includes the literal value.
 *
 * Mirrors `describeShape` in failureClassifier.ts. Kept as a local copy so
 * testView has no dependency on the classifier (different module boundary;
 * one renders per-test results, the other renders failure summaries).
 */
function describeValueShape(value: string): string {
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
        return parsed.length === 1
          ? "single-element array"
          : `array of ${parsed.length} numbers`;
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
 * Pure: produces a TestCaseView from a raw per-test result.
 *
 * - `isHidden: false` → `kind: "concrete"`, full data preserved.
 * - `isHidden: true`  → `kind: "redacted"`, no raw input/expected/actual,
 *                        no runtime error message. Compile error messages
 *                        are preserved (no input values involved).
 */
export function buildTestCaseView(
  raw: RawTestCaseRecord,
  isHidden: boolean,
): TestCaseView {
  if (!isHidden) {
    return {
      kind: "concrete",
      testCaseId: raw.testCaseId,
      index: raw.index,
      status: raw.status,
      input: raw.input,
      expected: raw.expected,
      actual: raw.actual,
      error: raw.error ?? "",
      errorKind: raw.errorKind,
      executionTime: raw.executionTime,
      isHidden: false,
    };
  }

  // Redacted: compute the shape descriptors server-side. Never return the
  // raw input — only the inferred shape (which for hidden inputs cannot be
  // `small_literal`; the shapeAnalyzer gate enforces this).
  const inputShape = analyzeShape(raw.input, { isHidden: true });
  const expectedShape = describeValueShape(raw.expected);
  const actualShape = describeValueShape(raw.actual);

  // Preserve compile error messages (no input values involved).
  // Redact runtime errors and TLE messages — they can include input-derived
  // values that would leak the hidden test data.
  const errorMessage =
    raw.errorKind === "compile_error" ? raw.error ?? "" : "";

  return {
    kind: "redacted",
    testCaseId: raw.testCaseId,
    index: raw.index,
    status: raw.status,
    inputShape,
    expectedShape,
    actualShape,
    error: errorMessage,
    errorKind: raw.errorKind,
    executionTime: raw.executionTime,
    isHidden: true,
  };
}
