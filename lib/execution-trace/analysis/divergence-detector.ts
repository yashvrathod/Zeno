import { ExecutionTrace, DivergencePoint, TraceStep } from "../types";

export interface DetectionResult {
  divergences: DivergencePoint[];
  classification: DivergenceClass;
  confidence: number;
  contextSummary: string;
}

export type DivergenceClass =
  | "off_by_one"
  | "wrong_condition"
  | "missing_update"
  | "wrong_initialization"
  | "infinite_loop_risk"
  | "wrong_data_structure"
  | "algorithm_mismatch"
  | "edge_case_handling"
  | "correct";

export function detectDivergencePatterns(
  studentTrace: ExecutionTrace,
  expectedTrace?: ExecutionTrace,
): DetectionResult {
  const divergences: DivergencePoint[] = [];

  if (!expectedTrace) {
    const autoDetected = autoDetectIssues(studentTrace);
    divergences.push(...autoDetected);
  }

  const classification = classifyDivergence(divergences);
  const confidence = divergences.length > 0 ? Math.min(0.5 + divergences.length * 0.1, 0.95) : 0.95;

  return {
    divergences,
    classification,
    confidence,
    contextSummary: buildContextSummary(divergences, classification),
  };
}

function autoDetectIssues(trace: ExecutionTrace): DivergencePoint[] {
  const issues: DivergencePoint[] = [];
  const steps = trace.steps;

  if (steps.length === 0) return issues;

  checkOffByOne(steps, issues);
  checkInfiniteLoopRisk(steps, issues);
  checkWrongInitialization(steps, issues);
  checkMissingUpdate(steps, issues);

  return issues;
}

function checkOffByOne(steps: TraceStep[], issues: DivergencePoint[]): void {
  let lastArrayAccess = -1;
  let arrayLength = -1;

  for (const step of steps) {
    for (const [name, snap] of Object.entries(step.variables)) {
      if (Array.isArray(snap.value)) {
        arrayLength = snap.value.length;
      }
      const val = Number(snap.value);
      if (!isNaN(val) && (snap.name?.toLowerCase().includes("index") || snap.name?.toLowerCase().includes("i") || snap.name?.toLowerCase().includes("j"))) {
        if (val > lastArrayAccess && val >= 0) {
          lastArrayAccess = val;
        }
          if (arrayLength > 0 && val >= arrayLength && step.type === "loop_iteration") {
            issues.push({
              stepIndex: step.stepIndex,
              line: step.line,
              message: `Index ${snap.name} reached ${val} which is >= array length ${arrayLength} — potential off-by-one`,
              expectedState: `${snap.name} < ${arrayLength}`,
              actualState: `${snap.name} = ${val}`,
            severity: "error",
            suggestedFix: `At line ${step.line}, your ${snap.name} goes up to ${snap.value} but the array only has ${arrayLength} elements (indices 0-${arrayLength - 1}). Try changing your loop condition from <=\\u00a0to\\u00a0<, or check if you need ${arrayLength - 1} instead of ${arrayLength}.`,
          });
        }
      }
    }
  }
}

function checkInfiniteLoopRisk(steps: TraceStep[], issues: DivergencePoint[]): void {
  let loopCount = 0;
  let lastLoopLine = -1;

  for (const step of steps) {
    if (step.type === "loop_iteration") {
      if (step.line === lastLoopLine) {
        loopCount++;
        if (loopCount > 100) {
          issues.push({
            stepIndex: step.stepIndex,
            line: step.line,
            message: "Loop has executed more than 100 times — possible infinite loop",
            expectedState: "loop terminates",
            actualState: "loop continues",
            severity: "error",
            suggestedFix: `Your loop at line ${step.line} doesn't seem to be making progress toward its exit condition. Check if your counter/index variable is being updated correctly inside the loop body.`,
          });
          break;
        }
      } else {
        loopCount = 0;
        lastLoopLine = step.line;
      }
    }
  }
}

function checkWrongInitialization(steps: TraceStep[], issues: DivergencePoint[]): void {
  const firstSteps = steps.slice(0, 5);

  for (const step of firstSteps) {
    for (const [name, snap] of Object.entries(step.variables)) {
      if (typeof snap.value === "number" && snap.changed) {
        const lower = name.toLowerCase();
        if ((lower === "i" || lower.includes("index")) && snap.value !== 0) {
          issues.push({
            stepIndex: step.stepIndex,
            line: step.line,
            message: `${name} initialized to ${snap.value} — most array iterations start at 0`,
            expectedState: `${name} = 0`,
            actualState: `${name} = ${snap.value}`,
            severity: "warning",
            suggestedFix: `Variable ${name} starts at ${snap.value}. For 0-indexed arrays, loops typically start at 0. If this is intentional (e.g., starting from the end), you can ignore this warning.`,
          });
        }
      }
    }
  }
}

function checkMissingUpdate(steps: TraceStep[], issues: DivergencePoint[]): void {
  const varsUpdated: Set<string> = new Set();
  const loopVariables: Set<string> = new Set();

  for (const step of steps) {
    for (const [name, snap] of Object.entries(step.variables)) {
      if (snap.changed) varsUpdated.add(name);
    }
    if (step.type === "loop_iteration") {
      for (const [name] of Object.entries(step.variables)) {
        loopVariables.add(name);
      }
    }
  }

  const potentialLoopVars = [...loopVariables].filter(v =>
    ["i", "j", "k", "left", "right", "mid", "index", "count", "pos", "start", "end"].includes(v.toLowerCase())
  );

  for (const v of potentialLoopVars) {
    if (!varsUpdated.has(v)) {
      const relatedSteps = steps.filter(s =>
        Object.keys(s.variables).some(k => k === v)
      );
      if (relatedSteps.length > 3) {
        issues.push({
          stepIndex: relatedSteps[0].stepIndex,
          line: relatedSteps[0].line,
          message: `${v} is used in loop context but never updated — loop may not progress`,
          expectedState: `${v} changes during iteration`,
          actualState: `${v} stays constant`,
          severity: "error",
          suggestedFix: `Variable ${v} is referenced inside a loop but never modified. In DSA problems, loop variables should be updated to avoid infinite loops. Add an increment/decrement or reassignment inside the loop body.`,
        });
      }
    }
  }
}

function classifyDivergence(divergences: DivergencePoint[]): DivergenceClass {
  if (divergences.length === 0) return "correct";

  const messages = divergences.map(d => d.message.toLowerCase());
  const allMessages = messages.join(" ");

  if (allMessages.includes("off-by") || allMessages.includes("index") && allMessages.includes("length")) return "off_by_one";
  if (allMessages.includes("infinite") || allMessages.includes("100 times")) return "infinite_loop_risk";
  if (allMessages.includes("initialized") || allMessages.includes("starts at")) return "wrong_initialization";
  if (allMessages.includes("never updated") || allMessages.includes("stays constant")) return "missing_update";
  if (allMessages.includes("condition")) return "wrong_condition";
  if (allMessages.includes("edge case") || allMessages.includes("empty") || allMessages.includes("single")) return "edge_case_handling";

  return "algorithm_mismatch";
}

function buildContextSummary(divergences: DivergencePoint[], classification: DivergenceClass): string {
  if (classification === "correct") return "No issues detected in execution trace.";

  const errors = divergences.filter(d => d.severity === "error");
  const warnings = divergences.filter(d => d.severity === "warning");

  let summary = `Detected ${errors.length} error(s) and ${warnings.length} warning(s). `;

  const classLabels: Record<DivergenceClass, string> = {
    off_by_one: "The most likely issue is an off-by-one error in loop boundaries or array access.",
    wrong_condition: "The loop or conditional check appears to use the wrong comparison operator.",
    missing_update: "A variable that should change during iteration is staying constant.",
    wrong_initialization: "One or more variables are initialized with unexpected starting values.",
    infinite_loop_risk: "The code may have an infinite loop — no progress toward termination.",
    wrong_data_structure: "Consider using a different data structure for this problem.",
    algorithm_mismatch: "The algorithm approach differs from the expected solution.",
    edge_case_handling: "Edge cases (empty input, single element, etc.) may not be handled.",
    correct: "",
  };

  summary += classLabels[classification] || "";
  return summary;
}
