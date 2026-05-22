import { TraceStep, SupportedLanguage, VariableSnapshot } from "../types";

export function parseTraceOutput(
  rawOutput: string,
  language: SupportedLanguage,
  originalLineMap: Map<number, number>,
): TraceStep[] {
  if (!rawOutput || rawOutput.trim().length === 0) return [];

  const steps: TraceStep[] = [];

  try {
    const lines = rawOutput.split("\n");
    let stepIndex = 0;
    const currentVars: Record<string, VariableSnapshot> = {};
    let currentDepth = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("__TRACE_ERROR:")) {
        steps.push(createErrorStep(stepIndex++, trimmed.replace("__TRACE_ERROR:", "").trim()));
        continue;
      }

      if (trimmed.startsWith("__TRACE_RESULT:")) continue;

      const parsed = tryParseJsonTrace(trimmed);
      if (parsed) {
        stepIndex++;
        const step = convertToStep(parsed, stepIndex, originalLineMap, currentVars, currentDepth);
        if (step) {
          steps.push(step);
      if (step.type === "block_start" || step.operation === "block_start") currentDepth++;
      if (step.type === "block_end" || step.operation === "block_end") currentDepth = Math.max(0, currentDepth - 1);
          updateCurrentVars(currentVars, step);
        }
        continue;
      }

      if (language === "javascript" || language === "typescript") {
        const jsStep = tryParseJavaScriptTrace(trimmed, stepIndex, originalLineMap, currentVars, currentDepth);
        if (jsStep) {
          stepIndex++;
          steps.push(jsStep);
          updateCurrentVars(currentVars, jsStep);
          continue;
        }
      }
    }
  } catch {
    return [];
  }

  return steps;
}

function tryParseJsonTrace(line: string): Record<string, unknown> | null {
  try {
    const obj = JSON.parse(line);
    if (obj && typeof obj === "object" && "step" in obj) {
      return obj as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function tryParseJavaScriptTrace(
  line: string,
  stepIndex: number,
  originalLineMap: Map<number, number>,
  currentVars: Record<string, VariableSnapshot>,
  currentDepth: number,
): TraceStep | null {
  const assignmentMatch = line.match(/^__TRACE_VAR:(\w+)=(.*)$/);
  if (assignmentMatch) {
    const name = assignmentMatch[1];
    const valueStr = assignmentMatch[2];
    const prev = currentVars[name];
    return {
      stepIndex,
      line: 0,
      type: "assignment",
      variables: {
        ...currentVars,
        [name]: {
          name,
          type: inferType(valueStr),
          value: parseValue(valueStr),
          previousValue: prev?.value,
          changed: prev !== undefined,
          scope: "global",
        },
      },
      operation: `${name} = ${valueStr}`,
      code: `${name} = ${valueStr}`,
      depth: currentDepth,
    };
  }

  const returnMatch = line.match(/^__TRACE_RETURN:(\d+)$/);
  if (returnMatch) {
    return {
      stepIndex,
      line: parseInt(returnMatch[1]),
      type: "function_return",
      variables: { ...currentVars },
      operation: "return",
      code: line,
      depth: currentDepth,
    };
  }

  return null;
}

function convertToStep(
  parsed: Record<string, unknown>,
  stepIndex: number,
  originalLineMap: Map<number, number>,
  currentVars: Record<string, VariableSnapshot>,
  currentDepth: number,
): TraceStep | null {
  const step = parsed.step as number;
  const line = parsed.line as number;
  const type = parsed.type as string;
  const data = parsed.data as Record<string, unknown> || {};
  const variables = parsed.variables as Record<string, unknown> || {};

  const mappedLine = findOriginalLine(line, originalLineMap);

  const stepVars: Record<string, VariableSnapshot> = {};
  for (const [name, val] of Object.entries(variables)) {
    if (name.startsWith("__") || name.startsWith("___")) continue;
    stepVars[name] = convertVariable(name, val, currentVars[name]);
  }

  const typeMap: Record<string, any> = {
    assignment: "assignment",
    block_start: "assignment",
    block_end: "assignment",
    loop_iteration: "loop_iteration",
    return: "function_return",
    array_mutation: "array_mutation",
  };

  return {
    stepIndex,
    line: mappedLine,
    type: typeMap[type] || "assignment",
    variables: stepVars,
    operation: (data?.description as string) || type,
    code: (data?.code as string) || "",
    depth: currentDepth,
  };
}

function findOriginalLine(instrumentedLine: number, map: Map<number, number>): number {
  return map.get(instrumentedLine) || instrumentedLine;
}

function convertVariable(
  name: string,
  value: unknown,
  previous?: VariableSnapshot,
): VariableSnapshot {
  const val = typeof value === "object" && value !== null
    ? (value as any).value ?? value
    : value;

  return {
    name,
    type: inferType(String(val)),
    value: val,
    previousValue: previous?.value,
    changed: previous !== undefined && JSON.stringify(previous.value) !== JSON.stringify(val),
    scope: "global",
  };
}

function updateCurrentVars(
  current: Record<string, VariableSnapshot>,
  step: TraceStep,
): void {
  for (const [name, snap] of Object.entries(step.variables)) {
    current[name] = snap;
  }
}

function createErrorStep(stepIndex: number, message: string): TraceStep {
  return {
    stepIndex,
    line: 0,
    type: "function_return",
    variables: {},
    operation: `error: ${message}`,
    code: "",
    depth: 0,
  };
}

function inferType(value: string): VariableSnapshot["type"] {
  if (value === "null") return "null";
  if (value === "undefined") return "undefined";
  if (value === "true" || value === "false") return "boolean";
  if (/^-?\d+\.?\d*$/.test(value)) return "number";
  if (value.startsWith("[") || value.startsWith("{")) {
    return value.startsWith("[") ? "array" : "object";
  }
  return "string";
}

function parseValue(value: string): unknown {
  if (value === "null") return null;
  if (value === "undefined") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+\.?\d*$/.test(value)) return Number(value);
  try {
    if (value.startsWith("[") || value.startsWith("{")) return JSON.parse(value);
  } catch {}
  return value;
}
