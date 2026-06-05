/**
 * Execution harness for the executor.
 *
 * The user is expected to write a `solution(input)`-style function (the
 * UI's DEFAULT_STARTER literally says so). But the database's test cases
 * are stored as `stdin` / `expected` strings in the classic competitive-
 * programming style. Without a driver, Piston runs the user's function
 * file as-is and:
 *   - `solution` is never called
 *   - nothing reads stdin
 *   - stdout is empty
 *   - every test fails with `0/0` or `0/N` and the user sees no output
 *
 * This module wraps the user's code with a tiny language-specific driver
 * that:
 *   1. Reads the full stdin Piston sent in
 *   2. Parses it (try JSON first, then whitespace tokens, then raw string)
 *   3. Calls the user's `solution(parsedInput)`
 *   4. Prints the return value (stringified if non-string)
 *
 * Java and C++ are NOT wrapped here — they require a compile-time main
 * and known function signature, which the harness can't infer. The user
 * must write a complete program for those languages. We surface a clear
 * error to the caller when wrapping is requested for an unsupported lang.
 */

export type HarnessLanguage = "javascript" | "typescript" | "python";

/**
 * Returns true if the harness supports wrapping this language.
 * Java and C++ are intentionally excluded.
 */
export function supportsHarness(language: string): language is HarnessLanguage {
  return language === "javascript" || language === "typescript" || language === "python";
}

/**
 * Wraps `code` (which is expected to define `${methodName}(input)`) with a
 * stdin-reading driver. The resulting string is what we send to Piston.
 *
 * `methodName` defaults to `"solution"` for backward compatibility with
 * call sites that haven't been updated to fetch the problem's
 * ProblemSignature. Callers that have the signature should pass the
 * actual methodName so problems like `tp-12-oracle-mirror-validation`
 * (methodName: "isPalindrome") work correctly.
 *
 * Detection: if the code already contains a top-level `read(0, ...)` /
 * `readFileSync(0, ...)` / `sys.stdin` reference, we assume the user
 * wrote their own driver and return the code unchanged. This prevents
 * double-wrapping for power users.
 */
export function wrapForExecution(code: string, language: HarnessLanguage, methodName: string = "solution"): string {
  if (hasOwnDriver(code, language)) return code;
  switch (language) {
    case "javascript":
    case "typescript":
      return wrapJavaScript(code, methodName);
    case "python":
      return wrapPython(code, methodName);
  }
}

function hasOwnDriver(code: string, language: HarnessLanguage): boolean {
  if (language === "python") {
    return /\bsys\.stdin\b/.test(code) || /\binput\s*\(/.test(code);
  }
  // JS/TS: detect readFileSync(0, ...) or process.stdin
  return /\breadFileSync\s*\(\s*0\b/.test(code) || /\bprocess\.stdin\b/.test(code) || /\brequire\s*\(\s*['"]readline['"]\s*\)/.test(code);
}

function wrapJavaScript(code: string, methodName: string): string {
  // Wrap the user's `${methodName}(input)` function with a stdin reader.
  // Strategy:
  //   - require('fs') and read all of stdin
  //   - try JSON.parse; fall back to whitespace tokens
  //   - call ${methodName}(parsed)
  //   - print result (stringify if not a string)
  // We use `try/catch` around the call so a thrown user error doesn't
  // crash the harness — it surfaces as a stderr line that the executor
  // route already maps to `runtime_error`.
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
try:
    __result = ${methodName}(__parse_stdin(sys.stdin.read()))
    if isinstance(__result, str):
        print(__result)
    else:
        print(json.dumps(__result))
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
${code}`;
}
