/**
 * Tests for the stderr-based error classifier.
 *
 * The classifier is pure: (stderr, language) -> "compile_error" | "runtime_error" | "unknown".
 * These cases cover the common failure modes for each language the executor supports.
 *
 * PR 2b: JavaScript was removed. The Language union is now {python, java, cpp}.
 */

import { describe, it, expect } from "@jest/globals";
import { classifyError } from "../errorClassifier";

describe("classifyError", () => {
  describe("Python", () => {
    it("flags NameError as runtime_error", () => {
      const stderr = `Traceback (most recent call last):\n  File "main.py", line 3, in <module>\n    print(undefined_var)\nNameError: name 'undefined_var' is not defined`;
      expect(classifyError(stderr, "python")).toBe("runtime_error");
    });

    it("flags SyntaxError as compile_error", () => {
      const stderr = `File "main.py", line 2\n    def foo(\n             ^\nSyntaxError: invalid syntax`;
      expect(classifyError(stderr, "python")).toBe("compile_error");
    });

    it("flags IndentationError as compile_error", () => {
      const stderr = `IndentationError: unexpected indent`;
      expect(classifyError(stderr, "python")).toBe("compile_error");
    });

    it("flags IndexError as runtime_error", () => {
      const stderr = `IndexError: list index out of range`;
      expect(classifyError(stderr, "python")).toBe("runtime_error");
    });
  });

  describe("Java", () => {
    it("flags 'cannot find symbol' as compile_error", () => {
      const stderr = `Main.java:5: error: cannot find symbol\n  symbol:   variable foo\n  location: class Main`;
      expect(classifyError(stderr, "java")).toBe("compile_error");
    });

    it("flags NullPointerException as runtime_error", () => {
      const stderr = `Exception in thread "main" java.lang.NullPointerException\n  at Main.main(Main.java:10)`;
      expect(classifyError(stderr, "java")).toBe("runtime_error");
    });
  });

  describe("C++", () => {
    it("flags 'expected ;' as compile_error", () => {
      const stderr = `main.cpp:7:1: error: expected ';' before '}' token`;
      expect(classifyError(stderr, "cpp")).toBe("compile_error");
    });

    it("flags 'Segmentation fault' as runtime_error", () => {
      const stderr = `Segmentation fault (core dumped)`;
      expect(classifyError(stderr, "cpp")).toBe("runtime_error");
    });
  });

  describe("Edge cases", () => {
    it("returns unknown for empty stderr", () => {
      expect(classifyError("", "python")).toBe("unknown");
      expect(classifyError("   ", "java")).toBe("unknown");
    });

    it("returns unknown for unsupported language (including javascript/typescript, removed in PR 2)", () => {
      expect(classifyError("TypeError: foo", "ruby")).toBe("unknown");
      expect(classifyError("TypeError: foo", "javascript")).toBe("unknown");
      expect(classifyError("error TS1: x", "typescript")).toBe("unknown");
    });

    it("returns unknown when stderr matches no patterns", () => {
      expect(classifyError("something completely unrelated happened", "python")).toBe("unknown");
    });

    it("prioritizes compile_error over runtime_error when both could match", () => {
      // A bogus message that hits both — compile check runs first
      const stderr = `SyntaxError: name 'x' is not defined`;
      // SyntaxError pattern should match (compile) before NameError pattern (runtime) would.
      expect(classifyError(stderr, "python")).toBe("compile_error");
    });

    it("accepts common language aliases", () => {
      expect(classifyError("NameError: x", "py")).toBe("runtime_error");
      expect(classifyError("NameError: x", "PYTHON")).toBe("runtime_error");
      expect(classifyError("error: cannot find symbol", "JAVA")).toBe("compile_error");
    });
  });
});
