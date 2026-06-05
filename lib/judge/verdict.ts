export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "time_limit_exceeded"
  | "runtime_error"
  | "compile_error"
  | "output_limit_exceeded";

export const ALL_VERDICTS: readonly Verdict[] = [
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "runtime_error",
  "compile_error",
  "output_limit_exceeded",
] as const;

export type HarnessMode = "per-test" | "single-exec";

export type Language = "python" | "java" | "cpp";

export const DYNAMIC_LANGUAGES: readonly Language[] = ["python"] as const;
export const COMPILED_LANGUAGES: readonly Language[] = ["java", "cpp"] as const;

export function isDynamicLanguage(lang: string): lang is "python" {
  return lang === "python";
}

export function isSupportedLanguage(lang: string): lang is Language {
  return lang === "python" || lang === "java" || lang === "cpp";
}
