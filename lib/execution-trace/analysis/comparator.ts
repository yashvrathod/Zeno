import { ExecutionTrace, DivergencePoint, TraceStep } from "../types";

export interface CompareResult {
  divergences: DivergencePoint[];
  matchScore: number;
  matchedSteps: number;
  totalSteps: number;
  summary: string;
}

export function compareTraces(
  studentTrace: ExecutionTrace,
  expectedTrace: ExecutionTrace,
): CompareResult {
  const divergences: DivergencePoint[] = [];
  const studentSteps = studentTrace.steps;
  const expectedSteps = expectedTrace.steps;

  const maxSteps = Math.max(studentSteps.length, expectedSteps.length);
  let matchedSteps = 0;

  for (let i = 0; i < maxSteps; i++) {
    const studentStep = studentSteps[i];
    const expectedStep = expectedSteps[i];

    if (!studentStep && expectedStep) {
      divergences.push({
        stepIndex: i,
        line: expectedStep.line,
        message: `Missing step: expected "${expectedStep.operation}" at line ${expectedStep.line}`,
        expectedState: JSON.stringify(expectedStep.variables),
        actualState: "(missing)",
        severity: "error",
      });
      continue;
    }

    if (studentStep && !expectedStep) {
      divergences.push({
        stepIndex: i,
        line: studentStep.line,
        message: `Unexpected step: "${studentStep.operation}" at line ${studentStep.line}`,
        expectedState: "(no more steps)",
        actualState: JSON.stringify(studentStep.variables),
        severity: "warning",
      });
      continue;
    }

    if (!studentStep || !expectedStep) continue;

    const stepDivergences = compareSteps(studentStep, expectedStep, i);
    if (stepDivergences.length === 0) {
      matchedSteps++;
    } else {
      divergences.push(...stepDivergences);
    }
  }

  const matchScore = maxSteps > 0 ? matchedSteps / maxSteps : 0;

  return {
    divergences,
    matchScore,
    matchedSteps,
    totalSteps: maxSteps,
    summary: buildSummary(divergences, matchScore, matchedSteps, maxSteps),
  };
}

function compareSteps(
  student: TraceStep,
  expected: TraceStep,
  index: number,
): DivergencePoint[] {
  const divergences: DivergencePoint[] = [];

  if (student.type !== expected.type) {
    divergences.push({
      stepIndex: index,
      line: student.line,
      message: `Step type mismatch: got "${student.type}", expected "${expected.type}"`,
      expectedState: expected.type,
      actualState: student.type,
      severity: "warning",
    });
  }

  if (student.line !== expected.line) {
    divergences.push({
      stepIndex: index,
      line: student.line,
      message: `Line mismatch: student at line ${student.line}, expected at line ${expected.line}`,
      expectedState: `line ${expected.line}`,
      actualState: `line ${student.line}`,
      severity: "info",
    });
  }

  for (const [varName, studentVar] of Object.entries(student.variables)) {
    const expectedVar = expected.variables[varName];
    if (!expectedVar) continue;

    const sv = JSON.stringify(studentVar.value);
    const ev = JSON.stringify(expectedVar.value);

    if (sv !== ev) {
      const prevStudent = JSON.stringify(studentVar.previousValue);
      const prevExpected = JSON.stringify(expectedVar.previousValue);

      let message: string;
      if (prevStudent !== prevExpected && prevStudent !== "null" && prevExpected !== "null") {
        message = `Variable "${varName}" diverged at step ${index}: student changed from ${prevStudent} to ${sv}, expected from ${prevExpected} to ${ev}`;
      } else {
        message = `Variable "${varName}" differs at step ${index}: student has ${sv}, expected ${ev}`;
      }

      divergences.push({
        stepIndex: index,
        line: student.line,
        message,
        expectedState: `${varName} = ${ev}`,
        actualState: `${varName} = ${sv}`,
        severity: "error",
        suggestedFix: suggestFix(varName, studentVar.value, expectedVar.value, student.line),
      });
    }
  }

  return divergences;
}

export function findFirstDivergence(
  result: CompareResult,
): DivergencePoint | null {
  const errors = result.divergences.filter(d => d.severity === "error");
  return errors.length > 0 ? errors[0] : result.divergences[0] || null;
}

function suggestFix(
  varName: string,
  studentValue: unknown,
  expectedValue: unknown,
  line: number,
): string | undefined {
  const sv = String(studentValue);
  const ev = String(expectedValue);

  if (typeof studentValue === "number" && typeof expectedValue === "number") {
    if (studentValue > expectedValue) {
      return `At line ${line}, ${varName} is ${sv} but should be ${ev}. This suggests the loop or condition is running too many times. Check your boundary condition.`;
    }
    if (studentValue < expectedValue) {
      return `At line ${line}, ${varName} is ${sv} but should be ${ev}. The loop or condition might be terminating early. Check if you're using < instead of <=, or vice versa.`;
    }
  }

  if (Array.isArray(studentValue) && Array.isArray(expectedValue)) {
    if (studentValue.length !== expectedValue.length) {
      return `At line ${line}, array length is ${studentValue.length} but expected ${expectedValue.length}. Check your push/append logic.`;
    }
    for (let i = 0; i < Math.min(studentValue.length, expectedValue.length); i++) {
      if (studentValue[i] !== expectedValue[i]) {
        return `At line ${line}, array differs at index ${i}: got ${JSON.stringify(studentValue[i])}, expected ${JSON.stringify(expectedValue[i])}.`;
      }
    }
  }

  return undefined;
}

function buildSummary(
  divergences: DivergencePoint[],
  matchScore: number,
  matchedSteps: number,
  totalSteps: number,
): string {
  const errors = divergences.filter(d => d.severity === "error");
  const warnings = divergences.filter(d => d.severity === "warning");

  const pct = (matchScore * 100).toFixed(1);
  let summary = `Trace match: ${pct}% (${matchedSteps}/${totalSteps} steps matched).`;

  if (errors.length > 0) {
    summary += ` ${errors.length} error(s), ${warnings.length} warning(s).`;
    const firstError = errors[0];
    summary += ` First divergence at step ${firstError.stepIndex}: ${firstError.message}`;
  } else if (matchScore < 1) {
    summary += ` Minor differences in step types or line numbers.`;
  } else {
    summary += ` Perfect match!`;
  }

  return summary;
}
