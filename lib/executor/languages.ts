/**
 * Language Executors - Piston API for various languages
 */

import { ExecutionResult } from "./core";
import { runOnPiston } from "@/lib/piston";
import { classifyError } from "./errorClassifier";
import { wrapForExecution, supportsHarness } from "./harness";

export async function executeOnPiston(
  code: string,
  language: string,
  testCases: Array<{ input: string; expected: string }>
): Promise<ExecutionResult> {
  const pistonLang = language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : language === 'java' ? 'java' : 'javascript';

  const results = {
    passed: true,
    output: '',
    error: null as string | null,
    runtime: 0,
    tests: [] as Array<{ input: string; expected: string; actual: string; passed: boolean }>,
  };

  // Apply the stdin/function harness so a `function solution(input)` from
  // the editor actually gets invoked. Without this wrap the program runs
  // but produces no output, so every test fails silently.
  const harnessUsed = supportsHarness(pistonLang);
  const effectiveCode =
    harnessUsed
      ? wrapForExecution(code, pistonLang as 'javascript' | 'typescript' | 'python')
      : code;

  // Loop ALL test cases. The previous `slice(0, 3)` silently truncated runs on
  // problems with more than 3 tests, so the user saw "all 3 of 3 passed" on a
  // 10-test problem and the hidden 7 never ran. Fixed in PR 1.
  for (const tc of testCases) {
    try {
      const { output, runtimeMs, stderr, exitCode, signal } = await runOnPiston({
        code: effectiveCode,
        language: pistonLang as keyof typeof import("@/lib/piston").LANGUAGE_CONFIG,
        stdin: tc.input,
      });
      results.runtime += runtimeMs;

      const actual = output.trim();
      const passed = actual === tc.expected.trim();

      results.tests.push({
        input: tc.input,
        expected: tc.expected,
        actual,
        passed,
      });

      if (exitCode !== null && exitCode !== 0) {
        const kind = classifyError(stderr, pistonLang);
        const detail = stderr || output || `Exit code ${exitCode}`;
        results.error = kind === "compile_error"
          ? `Compile error: ${detail}`
          : detail;
        results.passed = false;
      }
      if (signal) {
        results.error = `Execution terminated by signal: ${signal}`;
        results.passed = false;
      }
    } catch (e) {
      results.error = (e as Error).message;
      results.passed = false;
      results.tests.push({
        input: tc.input,
        expected: tc.expected,
        actual: '',
        passed: false,
      });
    }

    if (!results.passed) break;
  }

  return results;
}
