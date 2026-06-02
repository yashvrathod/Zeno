/**
 * Stderr-based classifier: compile error vs runtime error vs unknown.
 *
 * Pure, deterministic, no LLM. The Piston public API does not distinguish
 * compile failure from runtime failure — both come back as `run.code !== 0`
 * with stderr containing the diagnostic. We pattern-match per language.
 *
 * Returns "unknown" (not a guess) when stderr is empty or non-conforming.
 * Downstream consumers should treat unknown as runtime_error for telemetry
 * but never as a fact to assert to the user/AI.
 */

export type ExecutionErrorKind = "compile_error" | "runtime_error" | "unknown";

type Language = "python" | "javascript" | "typescript" | "java" | "cpp";

interface CompiledPattern {
  // If any of these regexes match stderr, it's a compile error.
  compile: RegExp[];
  // If any of these match, it's a runtime error.
  runtime: RegExp[];
}

const PATTERNS: Record<Language, CompiledPattern> = {
  python: {
    compile: [
      /^SyntaxError:/im,
      /^IndentationError:/im,
      /^TabError:/im,
      /File "[^"]+", line \d+\s*\n\s*\^/m, // caret marker
    ],
    runtime: [
      /^NameError:/im,
      /^TypeError:/im,
      /^IndexError:/im,
      /^KeyError:/im,
      /^ValueError:/im,
      /^AttributeError:/im,
      /^ZeroDivisionError:/im,
      /^RecursionError:/im,
      /^StopIteration:/im,
      /^ImportError:/im,
      /^ModuleNotFoundError:/im,
      /^RuntimeError:/im,
      /^OverflowError:/im,
      /^MemoryError:/im,
      /^FileNotFoundError:/im,
      /^PermissionError:/im,
      /^IOError:/im,
      /^OSError:/im,
    ],
  },
  javascript: {
    compile: [
      /^SyntaxError:/im,
      /^Unexpected token/im,
      /^Invalid or unexpected token/im,
      /JSON\.parse:|eval|JSHint|ESLint/, // not strictly compile but parser-stage
    ],
    runtime: [
      /^ReferenceError:/im,
      /^TypeError:/im,
      /^RangeError:/im,
      /^URIError:/im,
      /^EvalError:/im,
      /^InternalError:/im,
      /Cannot read propert(y|ies) of (null|undefined)/im,
      /is not a function/im,
      /is not defined/im,
    ],
  },
  typescript: {
    compile: [
      /^error TS\d+:/im, // TypeScript compiler error codes
      /SyntaxError:/im,
    ],
    runtime: [
      /^ReferenceError:/im,
      /^TypeError:/im,
      /^RangeError:/im,
    ],
  },
  java: {
    compile: [
      /error: cannot find symbol/im,
      /error: incompatible types/im,
      /error: method .* in class .* cannot be applied/im,
      /error: reached end of file while parsing/im,
      /error: ';' expected/im,
      /error: class, interface, or enum expected/im,
      /error: package .* does not exist/im,
      /error: cannot find symbol/im,
    ],
    runtime: [
      /Exception in thread "/im,
      /^java\.lang\.\w+Error/im,
      /^java\.lang\.\w+Exception/im,
      /NullPointerException/im,
      /ArrayIndexOutOfBoundsException/im,
      /ArithmeticException/im,
      /NumberFormatException/im,
      /ClassCastException/im,
      /StackOverflowError/im,
      /OutOfMemoryError/im,
    ],
  },
  cpp: {
    compile: [
      /^.+:\d+:\d+: error:/im, // gcc/clang: file:line:col: error:
      /^.+:\d+: error:/im,
      /expected ';' before/im,
      /'.*' was not declared in this scope/im,
      /undefined reference to/im,
      /fatal error: .*\.h: No such file or directory/im,
    ],
    runtime: [
      /Segmentation fault/im,
      /Segfault/im,
      /Aborted \(core dumped\)/im,
      /terminate called after throwing/im,
      /std::(out_of_range|runtime_error|invalid_argument|bad_alloc) /im,
      /Aborted \(.*\)/im,
    ],
  },
};

function normalizeLanguage(lang: string): Language | null {
  const l = lang.toLowerCase();
  if (l === "py") return "python";
  if (l === "js" || l === "node") return "javascript";
  if (l === "ts") return "typescript";
  if (l === "python" || l === "javascript" || l === "typescript" || l === "java" || l === "cpp" || l === "c++" || l === "c") return l as Language;
  return null;
}

export function classifyError(stderr: string, language: string): ExecutionErrorKind {
  if (!stderr || stderr.trim().length === 0) {
    return "unknown";
  }

  const lang = normalizeLanguage(language);
  if (!lang) {
    return "unknown";
  }

  const patterns = PATTERNS[lang];

  for (const re of patterns.compile) {
    if (re.test(stderr)) return "compile_error";
  }
  for (const re of patterns.runtime) {
    if (re.test(stderr)) return "runtime_error";
  }

  return "unknown";
}
