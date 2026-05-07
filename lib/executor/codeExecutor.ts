/**
 * Simple Code Executor
 * - JavaScript: Runs in browser (instant, free)
 * - Python/C++/Java: Piston API (free tier)
 * - Returns execution results for AI context
 */

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

// ─────────────────────────────────────────────────────────────────────────────
// BROWSER EXECUTOR (JavaScript Only)
// ─────────────────────────────────────────────────────────────────────────────

async function executeInBrowser(
  code: string,
  testCases: Array<{ input: string; expected: string }>
): Promise<ExecutionResult> {
  return new Promise((resolve) => {
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

      iframe.contentWindow!.eval(wrapped);
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

// ─────────────────────────────────────────────────────────────────────────────
// PISTON API (Python/C++/Java/All Others)
// ─────────────────────────────────────────────────────────────────────────────

async function executeOnPiston(
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

  for (const tc of testCases.slice(0, 3)) {
    const start = Date.now();
    try {
      // Use public Piston API
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonLang,
          version: '*',
          files: [{ content: code }],
          stdin: tc.input,
        }),
        timeout: 10000,
      });

      const data = await response.json();
      const runtime = Date.now() - start;
      results.runtime += runtime;

      if (data.run && data.run.code) {
        results.output = data.run.stdout || data.run.stderr || '';
        const actual = results.output.trim();

        results.tests.push({
          input: tc.input,
          expected: tc.expected,
          actual,
          passed: actual === tc.expected.trim(),
        });

        if (!data.run.stdout || data.run.stderr) {
          results.error = data.run.stderr || 'Runtime error';
          results.passed = false;
        }
      } else {
        results.error = 'Execution failed';
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTOR
// ─────────────────────────────────────────────────────────────────────────────

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
