import { HarnessMode, Language, Verdict } from "./verdict";

export type ParamType = {
  name: string;
  type: string;
};

export type ProblemSignature = {
  className: string | null;
  methodName: string;
  paramTypes: ParamType[];
  returnType: string;
};

export type JudgeTestCase = {
  id: string;
  order: number;
  args: unknown[];
  expectedJson: unknown;
  isHidden: boolean;
};

export type PerTestResult = {
  testCaseId: string;
  index: number;
  verdict: Verdict;
  execMs: number | null;
  memKb: number | null;
  actualJson: unknown;
  expectedJson: unknown;
  errorMessage: string | null;
  isHidden: boolean;
};

export type CompileError = {
  kind: "compile_error";
  message: string;
  language: Language;
};

export type JudgeInput = {
  code: string;
  language: Language;
  signature: ProblemSignature;
  testCases: JudgeTestCase[];
  timeLimitMs: number;
  mode: HarnessMode;
  memoryLimitMb?: number;
  compileTimeoutMs?: number;
  outputLimitKb?: number;
};

export type JudgeOutput = {
  results: PerTestResult[];
  aggregate: Verdict;
  compileError?: CompileError;
  mode: HarnessMode;
  servedBy?: string;
  wallClockMs: number;
};
