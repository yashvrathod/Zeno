import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { LANGUAGE_CONFIG, getPistonUrls, PistonUnreachableError } from "@/lib/piston";
import { getProblemTimeLimit, PISTON_HARD_TIMEOUT_MS } from "@/lib/executor/timeLimits";
import {
  buildLastExecution,
  buildTestCaseView,
  type RawTestResult,
  type TestStatus,
  type TestCaseView,
} from "@/lib/mentor/lastExecution";
import { runJudge } from "@/lib/judge/runner";
import { UnsupportedLanguageError } from "@/lib/judge/harness";
import { isSupportedLanguage, type Language, type Verdict } from "@/lib/judge/verdict";
import type { JudgeTestCase, ProblemSignature as JudgeSignature, PerTestResult, JudgeInput } from "@/lib/judge/types";
import crypto from "crypto";

export type NewJudgeRequest = {
  code: string;
  language: Language;
  problemId?: string;
  runAll?: boolean;
  debug?: boolean;
};

const VERDICT_TO_TEST_STATUS: Record<Verdict, TestStatus> = {
  accepted: "passed",
  wrong_answer: "wrong_answer",
  time_limit_exceeded: "time_limit_exceeded",
  runtime_error: "runtime_error",
  compile_error: "compile_error",
  output_limit_exceeded: "output_limit_exceeded",
};

const VERDICT_TO_RAW_STATUS: Record<Verdict, RawTestResult["status"]> = {
  accepted: "passed",
  wrong_answer: "wrong_answer",
  time_limit_exceeded: "time_limit_exceeded",
  runtime_error: "runtime_error",
  compile_error: "compile_error",
  output_limit_exceeded: "output_limit_exceeded",
};

function jsonToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function computeCodeHash(code: string | undefined): string | null {
  if (!code || code.trim().length < 10) return null;
  return crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);
}

function fallbackSignature(methodName: string): JudgeSignature {
  return {
    className: null,
    methodName,
    paramTypes: [],
    returnType: "unknown",
  };
}

export async function runNewJudge(
  body: NewJudgeRequest,
  debug: boolean,
): Promise<NextResponse> {
  const { code, problemId, runAll, language } = body;

  const problem = problemId
    ? await prisma.problem.findFirst({
        where: { OR: [{ id: problemId }, { slug: problemId }] },
        select: {
          timeLimitMs: true,
          signature: { select: { className: true, methodName: true, paramTypes: true, returnType: true } },
          testCases: {
            where: runAll ? undefined : { isHidden: false },
            orderBy: { order: "asc" },
            select: { id: true, order: true, args: true, expectedJson: true, isHidden: true },
          },
        },
      })
    : null;

  const timeLimitMs = getProblemTimeLimit({ timeLimitMs: problem?.timeLimitMs ?? null });
  const testCases = problem?.testCases ?? [];
  if (testCases.length === 0) {
    return NextResponse.json({ ok: false, error: "No test cases available" }, { status: 400 });
  }

  const sig = problem?.signature
    ? {
        className: problem.signature.className,
        methodName: problem.signature.methodName,
        paramTypes: (problem.signature.paramTypes as unknown as JudgeSignature["paramTypes"]) ?? [],
        returnType: problem.signature.returnType,
      }
    : fallbackSignature("solution");

  const judgeCases: JudgeTestCase[] = testCases.map((tc) => ({
    id: tc.id,
    order: tc.order,
    args: (tc.args as unknown[]) ?? [],
    expectedJson: tc.expectedJson,
    isHidden: tc.isHidden,
  }));

  const judgeInput: JudgeInput = {
    code,
    language,
    signature: sig,
    testCases: judgeCases,
    timeLimitMs,
    mode: "per-test",
  };

  let output;
  try {
    output = await runJudge(judgeInput);
  } catch (e) {
    if (e instanceof UnsupportedLanguageError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: "unsupported_language" },
        { status: 400 },
      );
    }
    if (e instanceof PistonUnreachableError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: "piston_unreachable" },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Execution failed" },
      { status: 500 },
    );
  }

  const perResults: PerTestResult[] = output.results;

  const views: TestCaseView[] = perResults.map((r, i) =>
    buildTestCaseView(
      {
        testCaseId: r.testCaseId,
        index: i,
        status: VERDICT_TO_TEST_STATUS[r.verdict],
        input: jsonToString(r.actualJson),
        expected: jsonToString(r.expectedJson),
        actual: jsonToString(r.actualJson),
        error: r.errorMessage ?? "",
        executionTime: r.execMs ?? 0,
      },
      r.isHidden,
    ),
  );

  const rawResults: RawTestResult[] = perResults.map((r, i) => ({
    index: i,
    status: VERDICT_TO_RAW_STATUS[r.verdict],
    rawInput: jsonToString(r.actualJson),
    actual: jsonToString(r.actualJson),
    expected: jsonToString(r.expectedJson),
    stderr: r.errorMessage ?? undefined,
    isHidden: r.isHidden,
    runtimeMs: r.execMs ?? 0,
  }));

  const compileErrorMessage = output.compileError?.message;

  const lastExecution = buildLastExecution({
    testResults: rawResults,
    problem: { timeLimitMs: problem?.timeLimitMs ?? null },
    language,
    codeHash: computeCodeHash(code) ?? "",
  });

  const debugInfo = debug
    ? {
        judge: {
          mode: output.mode,
          aggregate: output.aggregate,
          wallClockMs: output.wallClockMs,
          servedBy: output.servedBy ?? "(unknown)",
        },
        signature: sig,
        piston: {
          triedUrls: [...getPistonUrls()],
          servedBy: output.servedBy ?? "(none — chain failed)",
        },
      }
    : undefined;

  return NextResponse.json({
    ok: true,
    results: views,
    timeLimitMs,
    pistonHardTimeoutMs: PISTON_HARD_TIMEOUT_MS,
    lastExecution,
    codeHash: computeCodeHash(code),
    ...(compileErrorMessage ? { compileError: compileErrorMessage } : {}),
    ...(debugInfo ? { debug: debugInfo } : {}),
  });
}
