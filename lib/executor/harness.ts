/**
 * Execution harness for the legacy executor.
 *
 * The user is expected to write a `${methodName}(input)`-style function
 * (from the problem's ProblemSignature; the UI's starter literal says
 * so). But the database's test cases are stored as `stdin` / `expected`
 * strings in the classic competitive-programming style, while Java/C++
 * require a compile-time `main` and a known function signature. Without
 * a driver, Piston runs the user's function file as-is and:
 *   - JS/Python: `${methodName}` is never called, nothing reads stdin,
 *     stdout is empty, every test fails 0/N
 *   - Java: `class Main` is found but `main(String[])` is missing, the
 *     runtime errors with "can't find main(String[]) method"
 *   - C++: a free `${methodName}` or a class with the method is found
 *     but no `int main()`, the linker errors with "undefined reference
 *     to main"
 *
 * This module wraps the user's code with a tiny language-specific driver
 * that:
 *   - Python/JS: reads stdin, parses it, calls `${methodName}(parsed)`,
 *     prints the result
 *   - Java/C++: emits a class with a `main` entry point that reads stdin,
 *     parses it, calls the user's method via the stored signature, prints
 *     the result. Java/C++ generation is delegated to `buildHarness` from
 *     `lib/judge/harness.ts` so the legacy executor reuses the
 *     battle-tested judge harness (no parser duplication).
 *
 * Detection: if the code already contains a top-level `read(0, ...)` /
 * `readFileSync(0, ...)` / `sys.stdin` reference, we assume the user
 * wrote their own driver and return the code unchanged. This prevents
 * double-wrapping for power users.
 */

import {
  buildHarness,
  buildExpectedCallSummary,
  detectUndefinedMethod,
  RESULT_PREFIX,
  RESULTS_PREFIX,
  ERROR_PREFIX,
} from "@/lib/judge/harness";
import type { ProblemSignature } from "@/lib/judge/types";

export type HarnessLanguage = "javascript" | "python" | "java" | "cpp";

export type WrappedSource = {
  code: string;
  /**
   * Pre-encoded stdin to pass to Piston. When undefined the caller
   * should pass the raw test-case `input` string (Python/JS path
   * parses stdin at runtime).
   */
  stdin?: string;
};

/**
 * Returns true if the harness supports wrapping this language.
 * All 4 supported languages are wrapped; compile-time languages reuse
 * the judge harness from `lib/judge/harness.ts`.
 */
export function supportsHarness(language: string): language is HarnessLanguage {
  return (
    language === "javascript" ||
    language === "python" ||
    language === "java" ||
    language === "cpp"
  );
}

/**
 * Wraps `code` (which is expected to define `${signature.methodName}(...)`)
 * with a driver that reads stdin, calls the method, and prints the result.
 *
 * Python/JS: returns the wrapped source. The harness reads stdin at
 * runtime; the caller passes the raw `tc.input` as Piston stdin.
 *
 * Java/C++: returns the wrapped source plus a JSON-encoded `stdin`
 * derived from `args`. The caller MUST pass `args` for compiled
 * languages. Throws if `args` is omitted.
 */
export function wrapForExecution(
  code: string,
  language: HarnessLanguage,
  signature: ProblemSignature,
  args?: unknown[],
): WrappedSource {
  if (language === "javascript") {
    if (hasOwnDriver(code, "javascript")) return { code };
    return { code: wrapJavaScript(code, signature.methodName) };
  }
  if (language === "python") {
    if (hasOwnDriver(code, "python")) return { code };
    return { code: wrapPython(code, signature.methodName) };
  }
  if (!args) {
    throw new Error(
      `wrapForExecution: ${language} harness requires \`args\` (per-test invocation). ` +
        `Pass the parsed test-case args as the 4th argument.`,
    );
  }
  const result = buildHarness({
    userCode: code,
    signature,
    testCases: [
      { id: "t", order: 1, args, expectedJson: null, isHidden: false },
    ],
    mode: "per-test",
    language,
  });
  return { code: result.code, stdin: result.stdinJson };
}

function hasOwnDriver(code: string, language: "javascript" | "python"): boolean {
  if (language === "python") {
    return /\bsys\.stdin\b/.test(code) || /\binput\s*\(/.test(code);
  }
  return (
    /\breadFileSync\s*\(\s*0\b/.test(code) ||
    /\bprocess\.stdin\b/.test(code) ||
    /\brequire\s*\(\s*['"]readline['"]\s*\)/.test(code)
  );
}

function wrapJavaScript(code: string, methodName: string): string {
  return `// ── auto-generated harness (lib/executor/harness.ts) ──
const __stdin = require('fs').readFileSync(0, 'utf-8');
function __parseStdin(s) {
  const trimmed = s.trim();
  if (!trimmed) return '';
  try { return JSON.parse(trimmed); } catch {}
  return trimmed.split(/\\s+/);
}
try {
  const __result = ${methodName}(__parseStdin(__stdin));
  if (typeof __result === 'string') {
    console.log(__result);
  } else {
    console.log(JSON.stringify(__result));
  }
} catch (e) {
  console.error(e && e.stack ? e.stack : String(e));
  process.exit(1);
}
${code}`;
}

function wrapPython(code: string, methodName: string): string {
  return `# ── auto-generated harness (lib/executor/harness.ts) ──
import sys, json
def __parse_stdin(s):
    s = s.strip()
    if not s:
        return ''
    try:
        return json.loads(s)
    except Exception:
        return s.split()

# ── user submission ──
${code}

# ── invoke (function is now in scope) ──
try:
    __result = ${methodName}(__parse_stdin(sys.stdin.read()))
    if isinstance(__result, str):
        print(__result)
    else:
        print(json.dumps(__result))
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)`;
}

export type HarnessGuardFailure = {
  error: string;
  expectedMethodName: string;
  expectedCall: string;
};

/**
 * Testable guard: surfaces a clear diagnostic when the user's submission
 * doesn't define the function named in the stored signature. Returns
 * `null` if the code is well-formed (or for languages that don't have
 * a usable regex check, like Java).
 */
export function checkUndefinedMethodGuard(
  code: string,
  language: HarnessLanguage,
  signature: ProblemSignature,
): HarnessGuardFailure | null {
  if (!supportsHarness(language)) return null;
  const guard = detectUndefinedMethod(
    code,
    signature.methodName,
    language as unknown as Parameters<typeof detectUndefinedMethod>[2],
  );
  if (!guard) return null;
  return {
    error: guard,
    expectedMethodName: signature.methodName,
    expectedCall: buildExpectedCallSummary(
      signature,
      "single-exec",
      language as unknown as Parameters<typeof buildExpectedCallSummary>[2],
    ),
  };
}

/**
 * Testable per-test harness preparer. Given the user's code, the
 * language, the stored signature, and a single test case's `input`,
 * returns the wrapped source and the stdin to pass to Piston.
 *
 * For Python/JS, the harness reads stdin at runtime, so `stdin` is the
 * raw test-case `input`. For Java/C++, the harness embeds the parsed
 * args, so `stdin` is the JSON-encoded `args`.
 */
export function prepareHarnessForTestCase(
  code: string,
  language: HarnessLanguage,
  signature: ProblemSignature,
  testCaseInput: string,
): { effectiveCode: string; stdin: string } {
  if (!supportsHarness(language)) {
    return { effectiveCode: code, stdin: testCaseInput };
  }
  if (language === "java" || language === "cpp") {
    const args = parseInputToArgs(testCaseInput);
    const wrapped = wrapForExecution(code, language, signature, args);
    return { effectiveCode: wrapped.code, stdin: wrapped.stdin ?? testCaseInput };
  }
  const wrapped = wrapForExecution(code, language, signature);
  return { effectiveCode: wrapped.code, stdin: testCaseInput };
}

/**
 * Bridge: convert a legacy test-case `input` string (mixed format) to
 * the structured `args: unknown[]` that the compiled-language harness
 * expects.
 *
 * Strategy: try JSON first (most problems store args as a JSON array);
 * fall back to whitespace-tokenised array for competitive-programming
 * inputs. Best-effort — competitive-programming inputs may produce
 * wrong-arity calls; data migration is a separate task.
 */
export function parseInputToArgs(input: string): unknown[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return [trimmed.split(/\s+/)];
  }
}

/**
 * Extract the harness result line from Piston stdout. The judge harness
 * (lib/judge/harness.ts) prefixes per-test results with `__RESULT__:`
 * and aggregate single-exec results with `__RESULTS__:`. Returns the
 * JSON payload (or null) — strips the prefix and returns the raw JSON
 * string for legacy string-compare against `expected`.
 */
export function stripResultPrefix(output: string): string | null {
  if (!output) return null;
  const lines = output.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(RESULT_PREFIX)) {
      return trimmed.slice(RESULT_PREFIX.length).trim();
    }
    if (trimmed.startsWith(RESULTS_PREFIX)) {
      return trimmed.slice(RESULTS_PREFIX.length).trim();
    }
  }
  return null;
}

/**
 * Extract the first harness error line from Piston stderr. Returns the
 * message after `__ERROR__:` (or null). Used to surface NameError-class
 * failures in legacy diagnostic logging.
 */
export function stripErrorPrefix(stderr: string | undefined): string | null {
  if (!stderr) return null;
  const lines = stderr.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(ERROR_PREFIX)) {
      return trimmed.slice(ERROR_PREFIX.length).trim();
    }
  }
  return null;
}
