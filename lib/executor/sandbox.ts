/**
 * Executor Sandbox - Browser-based JavaScript execution
 */

import { ExecutionResult } from "./core";

export async function executeInBrowser(
  code: string,
  testCases: Array<{ input: string; expected: string }>
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({
        passed: false,
        output: "",
        error: "Browser execution only available on client-side",
        runtime: 0,
        tests: [],
      });
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox = 'allow-scripts';
    document.body.appendChild(iframe);

    const start = Date.now();
    let output = '';
    let error: string | null = null;

    // Capture console.log
    const originalLog = console.log;
    console.log = (...args) => {
      output += args.map((a) => String(a)).join(' ') + '\n';
    };

    try {
      // Wrap code to capture output
      const wrapped = `
        try {
          ${code}
          window.parent.postMessage({ type: 'success', output: output }, '*');
        } catch (e) {
          window.parent.postMessage({ type: 'error', error: e.message }, '*');
        }
      `;

      (iframe.contentWindow as unknown as { eval: (code: string) => void }).eval(wrapped);
    } catch (e) {
      error = (e as Error).message;
    }

    console.log = originalLog;
    iframe.remove();

    const runtime = Date.now() - start;

    // Run test cases
    const tests = testCases.map((tc) => ({
      input: tc.input,
      expected: tc.expected,
      actual: output.trim(),
      passed: output.trim() === tc.expected.trim(),
    }));

    resolve({
      passed: tests.every((t) => t.passed),
      output: output.trim(),
      error,
      runtime,
      tests,
    });
  });
}
