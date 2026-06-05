import { Verdict } from "./verdict";

export type VerdictStyle = {
  borderClass: string;
  bgClass: string;
  textClass: string;
  pillClass: string;
  iconName: "CheckCircle2" | "XCircle" | "AlertCircle" | "Clock" | "FileWarning" | "FileX";
};

const STYLES: Record<Verdict, VerdictStyle> = {
  accepted: {
    borderClass: "border-emerald-500/10 hover:border-emerald-500/20",
    bgClass: "bg-emerald-500/[0.01]",
    textClass: "text-emerald-400",
    pillClass: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    iconName: "CheckCircle2",
  },
  wrong_answer: {
    borderClass: "border-rose-500/10 hover:border-rose-500/20",
    bgClass: "bg-rose-500/[0.01]",
    textClass: "text-rose-400",
    pillClass: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    iconName: "XCircle",
  },
  time_limit_exceeded: {
    borderClass: "border-amber-500/10 hover:border-amber-500/20",
    bgClass: "bg-amber-500/[0.01]",
    textClass: "text-amber-400",
    pillClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    iconName: "Clock",
  },
  runtime_error: {
    borderClass: "border-amber-500/10 hover:border-amber-500/20",
    bgClass: "bg-amber-500/[0.01]",
    textClass: "text-amber-400",
    pillClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    iconName: "AlertCircle",
  },
  compile_error: {
    borderClass: "border-amber-500/10 hover:border-amber-500/20",
    bgClass: "bg-amber-500/[0.01]",
    textClass: "text-amber-400",
    pillClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    iconName: "FileWarning",
  },
  output_limit_exceeded: {
    borderClass: "border-amber-500/10 hover:border-amber-500/20",
    bgClass: "bg-amber-500/[0.01]",
    textClass: "text-amber-400",
    pillClass: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    iconName: "FileX",
  },
};

export function verdictStyle(v: Verdict): VerdictStyle {
  return STYLES[v];
}

export const ALL_VERDICT_STYLES: Readonly<Record<Verdict, VerdictStyle>> = STYLES;
