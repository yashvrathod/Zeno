/**
 * Core Code Executor Logic
 */

import { executeInBrowser } from "./sandbox";
import { executeOnPiston } from "./languages";

export type ExecutionResult = {
  passed: boolean;
  output: string;
  error: string | null;
  runtime: number;
  tests: Array<{
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
  }>;
};

export async function executeCode(
  code: string,
  language: string,
  testCases: Array<{ input: string; expected: string }>
): Promise<ExecutionResult> {
  // Browser for JavaScript (instant, free)
  if (language === 'javascript' || language === 'typescript') {
    return executeInBrowser(code, testCases);
  }

  // Piston API for everything else (free tier)
  return executeOnPiston(code, language, testCases);
}

export function formatExecutionResult(result: ExecutionResult): string {
  if (result.passed) {
    return `✅ All ${result.tests.length} tests passed (${result.runtime}ms)`;
  }

  const failed = result.tests.find((t) => !t.passed);
  return `❌ Test failed:
Input: ${failed?.input}
Expected: ${failed?.expected}
Got: ${failed?.actual}
Error: ${result.error || 'N/A'}`;
}
