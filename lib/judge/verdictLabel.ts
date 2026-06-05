import { Verdict } from "./verdict";

const LABELS: Record<Verdict, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  time_limit_exceeded: "Time Limit Exceeded",
  runtime_error: "Runtime Error",
  compile_error: "Compile Error",
  output_limit_exceeded: "Output Limit Exceeded",
};

export function verdictLabel(v: Verdict): string {
  return LABELS[v];
}

export const ALL_VERDICT_LABELS: Readonly<Record<Verdict, string>> = LABELS;
