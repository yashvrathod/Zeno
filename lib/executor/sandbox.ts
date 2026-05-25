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
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      error = 'Execution timed out';
      iframe.remove();
      resolve({
        passed: false,
        output: output.trim(),
        error,
        runtime: Date.now() - start,
        tests: [],
      });
    }, 10000);

    // Listen for iframe response
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      clearTimeout(timeout);
      if (event.data.type === 'success') {
        output = event.data.output || '';
      } else if (event.data.type === 'error') {
        error = event.data.error || 'Unknown error';
      }
      iframe.remove();
      window.removeEventListener('message', messageHandler);

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
        runtime: Date.now() - start,
        tests,
      });
    };
    window.addEventListener('message', messageHandler);

    try {
      const wrapped = `
        var output = '';
        var console = { log: function() { output += Array.prototype.join.call(arguments, ' ') + '\\n'; } };
        try {
          ${code}
          window.parent.postMessage({ type: 'success', output: output }, window.location.origin);
        } catch (e: any) {
          window.parent.postMessage({ type: 'error', error: e.message }, window.location.origin);
        }
      `;

      (iframe.contentWindow as unknown as { eval: (code: string) => void }).eval(wrapped);
    } catch (e) {
      clearTimeout(timeout);
      window.removeEventListener('message', messageHandler);
      iframe.remove();
      resolve({
        passed: false,
        output: output.trim(),
        error: (e as Error).message,
        runtime: Date.now() - start,
        tests: [],
      });
    }
  });
}
