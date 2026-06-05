/**
 * Tests for the EXECUTION CONTEXT renderer.
 *
 * Two cross-cutting invariants covered here:
 *   1. Stale flag prefixes the section; the orchestrator is the only
 *      authority on whether the execution is stale.
 *   2. Hidden test inputs are never leaked as raw brackets/braces/the
 *      word "literal". The shapeAnalyzer already enforces this at the
 *      structural layer; this test is defense in depth for the renderer.
 */

import { describe, it, expect } from "@jest/globals";
import { buildExecutionContext } from "../execution";
import type { LastExecution } from "../../lastExecution";

const LIMIT_MS = 5000;

describe("buildExecutionContext", () => {
  describe("no_execution_yet", () => {
    it("returns an empty string for no_execution_yet, even with stale=true", () => {
      const rendered = buildExecutionContext(
        { kind: "no_execution_yet" },
        { isStale: true, limitMs: LIMIT_MS },
      );
      expect(rendered).toBe("");
    });

    it("returns an empty string for undefined lastExecution", () => {
      const rendered = buildExecutionContext(undefined, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).toBe("");
    });
  });

  describe("all_passed", () => {
    it("renders the all_passed branch with passed/total counts and runtime", () => {
      const le: LastExecution = {
        kind: "all_passed", passed: 24, total: 24, runtimeMs: 120, codeHash: "abc",
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).toContain("All 24 of 24 tests passed");
      expect(rendered).toContain("120ms");
      expect(rendered).toContain("5000ms");
      expect(rendered).toContain("EXECUTION CONTEXT");
    });
  });

  describe("tle", () => {
    it("renders the TLE branch with runtime/limit/language", () => {
      const le: LastExecution = {
        kind: "tle", runtimeMs: 8200, limitMs: 5000, language: "python", codeHash: "abc",
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).toContain("Time limit exceeded");
      expect(rendered).toContain("8200ms");
      expect(rendered).toContain("5000ms");
      expect(rendered).toContain("python");
    });
  });

  describe("compile_error", () => {
    it("renders the compile_error branch with the message body", () => {
      const le: LastExecution = {
        kind: "compile_error",
        message: "SyntaxError: invalid syntax (line 12)",
        language: "python",
        codeHash: "abc",
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).toContain("Compile error");
      expect(rendered).toContain("python");
      expect(rendered).toContain("SyntaxError");
    });
  });

  describe("runtime_error", () => {
    it("renders the runtime_error branch with the message body", () => {
      const le: LastExecution = {
        kind: "runtime_error",
        message: "TypeError: x is not a function",
        language: "python",
        codeHash: "abc",
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).toContain("Runtime error");
      expect(rendered).toContain("python");
      expect(rendered).toContain("TypeError");
    });
  });

  describe("failed_tests", () => {
    it("renders each failure with type, hint, evidence, and shapes", () => {
      const le: LastExecution = {
        kind: "failed_tests", passed: 17, total: 24, codeHash: "abc",
        failures: [
          {
            index: 17, failureType: "wrong_answer", rootCauseHint: "off_by_one",
            evidence: ["differs only at first element"],
            inputShape: { kind: "int_array", length: 100, sampledSorted: "asc", sampledDuplicates: false, sampledValueRange: [0, 99] },
            expectedShape: "array of 5 numbers", actualShape: "array of 5 numbers",
          },
        ],
        omittedFailures: 6,
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).toContain("17 of 24 tests passed");
      expect(rendered).toContain("Failure #18");
      expect(rendered).toContain("wrong_answer");
      expect(rendered).toContain("off-by-one");
      expect(rendered).toContain("differs only at first element");
      expect(rendered).toContain("int array of 100 elements");
      expect(rendered).toContain("(+6 more failure(s) omitted for brevity)");
    });

    it("renders the omitted-failures note when omittedFailures > 0", () => {
      const le: LastExecution = {
        kind: "failed_tests", passed: 0, total: 7, codeHash: "abc",
        failures: [
          { index: 0, failureType: "wrong_answer", evidence: [], inputShape: { kind: "unknown", length: 10 }, expectedShape: "text", actualShape: "empty" },
        ],
        omittedFailures: 6,
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).toContain("(+6 more");
    });

    it("does NOT render the omitted note when omittedFailures is 0", () => {
      const le: LastExecution = {
        kind: "failed_tests", passed: 0, total: 3, codeHash: "abc",
        failures: [
          { index: 0, failureType: "wrong_answer", evidence: [], inputShape: { kind: "unknown", length: 10 }, expectedShape: "text", actualShape: "empty" },
        ],
        omittedFailures: 0,
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).not.toContain("more failure(s) omitted");
    });
  });

  describe("stale", () => {
    it("prefixes the section with a stale note when isStale=true", () => {
      const le: LastExecution = {
        kind: "all_passed", passed: 1, total: 1, codeHash: "abc",
      };
      const rendered = buildExecutionContext(le, { isStale: true, limitMs: LIMIT_MS });
      expect(rendered).toContain("previous code version");
      expect(rendered).toContain("student has since edited the code");
    });

    it("does NOT prefix the section when isStale=false", () => {
      const le: LastExecution = {
        kind: "all_passed", passed: 1, total: 1, codeHash: "abc",
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).not.toContain("previous code version");
    });
  });

  describe("hidden-payload regression (the test you asked for)", () => {
    it("does not leak raw brackets, braces, or the word 'literal' from a hidden test", () => {
      // Hidden test: inputShape.kind === "unknown" with a large length.
      // The shapeAnalyzer gates small_literal structurally for hidden inputs,
      // so inputShape is a length-only descriptor. The renderer must produce
      // text containing none of `[`, `{`, or the word "literal".
      const le: LastExecution = {
        kind: "failed_tests", passed: 0, total: 1, codeHash: "x",
        failures: [{
          index: 0, failureType: "wrong_answer",
          evidence: ["actual contains null/undefined/None"],
          inputShape: { kind: "unknown", length: 100_000 },
          expectedShape: "text", actualShape: "empty",
        }],
        omittedFailures: 0,
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).not.toContain("[");
      expect(rendered).not.toContain("{");
      expect(rendered).not.toContain("literal");
    });

    it("does not leak the small_literal payload even if one somehow appears", () => {
      // Defense in depth: even if a future bug makes a small_literal slip
      // through, the renderer's small_literal branch renders a length proxy,
      // not the literal value itself. Assert that the literal value
      // "SECRET_PAYLOAD" does not appear in the output.
      const le: LastExecution = {
        kind: "failed_tests", passed: 0, total: 1, codeHash: "x",
        failures: [{
          index: 0, failureType: "wrong_answer",
          evidence: [],
          inputShape: { kind: "small_literal", literal: "SECRET_PAYLOAD" },
          expectedShape: "text", actualShape: "text",
        }],
        omittedFailures: 0,
      };
      const rendered = buildExecutionContext(le, { isStale: false, limitMs: LIMIT_MS });
      expect(rendered).not.toContain("SECRET_PAYLOAD");
      expect(rendered).not.toContain("literal");
    });
  });
});
