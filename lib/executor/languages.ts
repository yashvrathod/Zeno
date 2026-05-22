/**
 * Language Executors - Piston API for various languages
 */

import { ExecutionResult } from "./core";

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

  for (const tc of testCases.slice(0, 3)) {
    const start = Date.now();
    try {
      const urls = [
        process.env.PISTON_LOCAL_URL || 'http://localhost:2000/api/v2',
        process.env.PISTON_API_URL || process.env.NEXT_PUBLIC_PISTON_API_URL || 'https://emkc.org/api/v2/piston',
        process.env.PISTON_API_URL_FALLBACK || 'https://piston.rs/api/v2/piston',
      ].filter(Boolean);

      let response: Response | null = null;
      let lastErr: Error | null = null;
      for (const baseUrl of [...new Set(urls)]) {
        try {
          response = await fetch(`${baseUrl}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              language: pistonLang,
              version: '*',
              files: [{ content: code }],
              stdin: tc.input,
            }),
          });
          if (response.ok) break;
          lastErr = new Error(`Piston error: ${response.status}`);
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error('Piston request failed');
        }
      }
      if (!response || !response.ok) throw lastErr ?? new Error('All piston URLs failed');

      const data = await response.json();
      const runtime = Date.now() - start;
      results.runtime += runtime;

      if (data.run && data.run.code !== undefined) {
        results.output = data.run.stdout || data.run.stderr || '';
        const actual = results.output.trim();

        results.tests.push({
          input: tc.input,
          expected: tc.expected,
          actual,
          passed: actual === tc.expected.trim(),
        });

        if (data.run.stderr) {
          results.error = data.run.stderr;
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
