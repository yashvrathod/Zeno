import { SupportedLanguage, ExecutionTrace, TraceStep, TestCase } from "../types";
import { instrumentCode } from "../instrumenter";
import { parseTraceOutput } from "../parser/trace-parser";
import { executeInstrumentedJavaScript } from "./javascript-executor";
import { executeInstrumentedRemote } from "./remote-executor";

export interface ExecuteOptions {
  code: string;
  language: SupportedLanguage;
  testCase: TestCase;
  maxSteps?: number;
  timeout?: number;
}

export async function generateTrace(options: ExecuteOptions): Promise<ExecutionTrace> {
  const { code, language, testCase, maxSteps = 1000, timeout = 10000 } = options;

  const { instrumentedCode, originalLineMap } = instrumentCode(code, language);

  let rawOutput: string;
  let error: string | null = null;

  try {
    switch (language) {
      case "javascript":
      case "typescript": {
        rawOutput = await executeInstrumentedJavaScript(instrumentedCode, testCase, timeout);
        break;
      }
      default: {
        rawOutput = await executeInstrumentedRemote(instrumentedCode, language, testCase, timeout);
        break;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    rawOutput = "";
  }

  const steps = parseTraceOutput(rawOutput, language, originalLineMap);
  const trimmed = steps.slice(0, maxSteps);

  return buildTrace(trimmed, code, language, testCase, error);
}

function buildTrace(
  steps: TraceStep[],
  code: string,
  language: SupportedLanguage,
  testCase: TestCase,
  error: string | null,
): ExecutionTrace {
  const operations: Record<string, number> = {};
  for (const s of steps) {
    operations[s.type] = (operations[s.type] || 0) + 1;
  }

  const finalVars = steps.length > 0 ? steps[steps.length - 1].variables : {};
  const cleanVars: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(finalVars)) {
    if (!k.startsWith("__") && !k.startsWith("___")) {
      cleanVars[k] = v.value;
    }
  }

  return {
    steps,
    summary: {
      totalSteps: steps.length,
      operations: operations as any,
      executionTimeMs: 0,
      variableCount: Object.keys(cleanVars).length,
      finalVariables: cleanVars,
      error,
    },
    metadata: {
      language,
      testCase,
      studentCode: code,
    },
    divergence: null,
  };
}
