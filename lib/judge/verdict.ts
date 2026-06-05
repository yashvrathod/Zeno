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

export type Language = "javascript" | "typescript" | "python" | "java" | "cpp";

export const DYNAMIC_LANGUAGES: readonly Language[] = ["javascript", "typescript", "python"] as const;
export const COMPILED_LANGUAGES: readonly Language[] = ["java", "cpp"] as const;

export function isDynamicLanguage(lang: string): lang is "javascript" | "typescript" | "python" {
  return lang === "javascript" || lang === "typescript" || lang === "python";
}

export function isSupportedLanguage(lang: string): lang is Language {
  return lang === "javascript" || lang === "typescript" || lang === "python" || lang === "java" || lang === "cpp";
}
