/**
 * Tests for buildTestCaseView — the per-test result view used by both the
 * page's execution panel and the AI prompt's redaction guarantees.
 *
 * Key invariants:
 *   1. Concrete view preserves raw fields.
 *   2. Redacted view NEVER has `input` / `expected` / `actual` / runtime
 *      `error` populated. Only shape descriptors and (for compile errors)
 *      the compiler message.
 *   3. The redacted view's inputShape is never `kind: "small_literal"` for
 *      hidden tests (gate at the shapeAnalyzer layer).
 *   4. The redacted view contains no `[`, `{`, or the word "literal" — the
 *      same regression that guards the AI prompt.
 */

import { describe, it, expect } from "@jest/globals";
import {
  buildTestCaseView,
  type RawTestCaseRecord,
  type TestCaseView,
} from "../testView";
import type { InputShape } from "../types";

function makeRecord(overrides: Partial<RawTestCaseRecord> = {}): RawTestCaseRecord {
  return {
    testCaseId: "tc-1",
    index: 0,
    status: "wrong_answer",
    input: "[1, 2, 3]",
    expected: "[1, 2, 4]",
    actual: "[1, 2, 3]",
    executionTime: 50,
    ...overrides,
  };
}

describe("buildTestCaseView", () => {
  describe("concrete view (non-hidden)", () => {
    it("returns kind: 'concrete' with all raw fields preserved", () => {
      const view = buildTestCaseView(makeRecord(), false);
      expect(view.kind).toBe("concrete");
      if (view.kind === "concrete") {
        expect(view.input).toBe("[1, 2, 3]");
        expect(view.expected).toBe("[1, 2, 4]");
        expect(view.actual).toBe("[1, 2, 3]");
        expect(view.isHidden).toBe(false);
        expect(view.testCaseId).toBe("tc-1");
        expect(view.executionTime).toBe(50);
      }
    });

    it("preserves the full error message for non-hidden runtime errors", () => {
      const view = buildTestCaseView(
        makeRecord({ status: "runtime_error", error: "TypeError: x is not a function" }),
        false,
      );
      expect(view.kind).toBe("concrete");
      if (view.kind === "concrete") {
        expect(view.error).toBe("TypeError: x is not a function");
      }
    });
  });

  describe("redacted view (hidden)", () => {
    it("returns kind: 'redacted' with shape descriptors and no raw fields", () => {
      const view = buildTestCaseView(makeRecord(), true);
      expect(view.kind).toBe("redacted");
      if (view.kind === "redacted") {
        // Semantic assertions: the raw fields MUST NOT exist on the
        // redacted view, regardless of how the type happens to be
        // defined in a given build.
        expect(view).not.toHaveProperty("input");
        expect(view).not.toHaveProperty("expected");
        expect(view).not.toHaveProperty("actual");
        expect(view.isHidden).toBe(true);
        expect(view.expectedShape).toBeTruthy();
        expect(view.actualShape).toBeTruthy();
        expect(view.inputShape).toBeDefined();
      }
    });

    it("preserves compile error messages (no input values involved)", () => {
      const view = buildTestCaseView(
        makeRecord({
          status: "compile_error",
          error: "SyntaxError: invalid syntax",
          errorKind: "compile_error",
        }),
        true,
      );
      expect(view.kind).toBe("redacted");
      if (view.kind === "redacted") {
        expect(view.error).toBe("SyntaxError: invalid syntax");
        expect(view.errorKind).toBe("compile_error");
      }
    });

    it("redacts runtime error messages (would leak input values)", () => {
      const view = buildTestCaseView(
        makeRecord({
          status: "runtime_error",
          error: "Traceback: IndexError at index 7 of [secret, hidden, list]",
          errorKind: "runtime_error",
        }),
        true,
      );
      expect(view.kind).toBe("redacted");
      if (view.kind === "redacted") {
        expect(view.error).toBe("");
        // The errorKind is preserved so the user still sees the kind,
        // but the message itself is gone.
        expect(view.errorKind).toBe("runtime_error");
      }
    });

    it("redacts TLE error messages (race condition possible)", () => {
      const view = buildTestCaseView(
        makeRecord({
          status: "time_limit_exceeded",
          error: "Runtime 6000ms exceeded limit 5000ms",
          errorKind: "unknown",
        }),
        true,
      );
      expect(view.kind).toBe("redacted");
      if (view.kind === "redacted") {
        expect(view.error).toBe("");
      }
    });

    it("inputShape is never kind: 'small_literal' for hidden tests (gate enforced)", () => {
      // Even though [1,2,3] is well under SMALL_LITERAL_MAX_BYTES, the
      // shapeAnalyzer gate forces hidden inputs to fall through to the
      // int_array / unknown branch.
      const view = buildTestCaseView(makeRecord({ input: "[1, 2, 3]" }), true);
      expect(view.kind).toBe("redacted");
      if (view.kind === "redacted") {
        expect(view.inputShape.kind).not.toBe("small_literal");
      }
    });
  });

  describe("hidden-payload regression (mirrors execution.test.ts)", () => {
    /**
     * Render the redacted view to a string the way the page would (without
     * the lock icon for the regex check). The renderer must never produce
     * raw hidden literals. This is the same regression that protects the
     * AI prompt — applied here to the page's per-test row.
     *
     * Uses the same shape description the page uses (mirrored locally) so
     * the test asserts about user-facing text, not internal JSON shape.
     */
    function describeShapeForTest(s: InputShape): string {
      switch (s.kind) {
        case "int_array": return `int array of ${s.length} elements`;
        case "string": return `text of ${s.length} chars`;
        case "matrix": return `${s.rows}x${s.cols} matrix`;
        case "tree": return `tree with ${s.nodes} nodes`;
        case "graph": return `graph with ${s.nodes} nodes, ${s.edges} edges`;
        case "list_of_pairs": return `list of ${s.length} pairs`;
        case "small_literal": return `concrete value of ${s.literal.length} chars`;
        case "unknown": return `opaque input of ${s.length} bytes`;
      }
    }
    function renderRedacted(view: TestCaseView): string {
      if (view.kind !== "redacted") return "";
      const parts = [
        view.status,
        "input=" + describeShapeForTest(view.inputShape),
        "expected=" + view.expectedShape,
        "actual=" + view.actualShape,
        "error=" + view.error,
      ];
      return parts.join(" | ");
    }

    it("contains no '[', '{', or the word 'literal' for any hidden view", () => {
      const cases: Array<{ name: string; record: RawTestCaseRecord }> = [
        { name: "passed", record: makeRecord({ status: "passed" }) },
        { name: "wrong_answer", record: makeRecord({ status: "wrong_answer" }) },
        {
          name: "runtime_error",
          record: makeRecord({ status: "runtime_error", error: "ERR", errorKind: "runtime_error" }),
        },
        {
          name: "compile_error",
          record: makeRecord({ status: "compile_error", error: "SYNTAX", errorKind: "compile_error" }),
        },
        {
          name: "time_limit_exceeded",
          record: makeRecord({ status: "time_limit_exceeded", error: "TLE", errorKind: "unknown" }),
        },
        {
          name: "small input",
          record: makeRecord({ input: "[1, 2]", expected: "1", actual: "0" }),
        },
        {
          name: "matrix input",
          record: makeRecord({ input: "[[1,2],[3,4]]", expected: "[[1,2],[3,5]]", actual: "[[1,2],[3,4]]" }),
        },
        {
          name: "object input",
          record: makeRecord({ input: '{"a":1}', expected: '{"a":2}', actual: '{"a":1}' }),
        },
        {
          name: "long input",
          record: makeRecord({ input: "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]", expected: "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21]", actual: "[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]" }),
        },
      ];
      for (const c of cases) {
        const view = buildTestCaseView(c.record, true);
        const rendered = renderRedacted(view);
        expect(rendered).not.toContain("[");
        expect(rendered).not.toContain("{");
        expect(rendered.toLowerCase()).not.toContain("literal");
      }
    });
  });

  describe("purity", () => {
    it("is a pure function: same input produces structurally equal output", () => {
      const a = buildTestCaseView(makeRecord(), true);
      const b = buildTestCaseView(makeRecord(), true);
      expect(a).toEqual(b);
    });

    it("does not mutate the input record", () => {
      const record = makeRecord({ input: "[1, 2, 3]" });
      const snapshot = JSON.stringify(record);
      buildTestCaseView(record, true);
      buildTestCaseView(record, false);
      expect(JSON.stringify(record)).toBe(snapshot);
    });
  });
});
