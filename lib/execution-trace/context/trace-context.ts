import { ExecutionTrace, DivergencePoint, TraceStep, VisualizationData } from "../types";
import { DetectionResult } from "../analysis/divergence-detector";

export interface TracePromptContext {
  traceSummary: string;
  divergenceSection: string;
  visualizationSection: string;
  variableHistory: string;
  socraticQuestion: string;
  fullContext: string;
}

export function buildTraceContext(
  trace: ExecutionTrace | null,
  detectionResult: DetectionResult | null,
  visualizationData?: VisualizationData | null,
): TracePromptContext {
  const traceSummary = buildTraceSummary(trace);
  const divergenceSection = buildDivergenceSection(trace, detectionResult);
  const visualizationSection = buildVisualizationSection(visualizationData);
  const variableHistory = buildVariableHistory(trace);
  const socraticQuestion = buildSocraticQuestion(detectionResult);

  const sections = [
    traceSummary,
    divergenceSection,
    visualizationSection,
    variableHistory,
    socraticQuestion,
  ].filter(Boolean);

  const fullContext = sections.join("\n\n");

  return {
    traceSummary,
    divergenceSection,
    visualizationSection,
    variableHistory,
    socraticQuestion,
    fullContext,
  };
}

function buildTraceSummary(trace: ExecutionTrace | null): string {
  if (!trace || trace.steps.length === 0) return "";

  const s = trace.summary;
  return `<execution_trace>
  Total steps executed: ${s.totalSteps}
  Variables tracked: ${s.variableCount}
  Operations: ${Object.entries(s.operations).map(([k, v]) => `${k}: ${v}`).join(", ")}
  Final state: ${JSON.stringify(s.finalVariables)}
  ${s.error ? `Error: ${s.error}` : ""}
</execution_trace>`;
}

function buildDivergenceSection(
  trace: ExecutionTrace | null,
  detection: DetectionResult | null,
): string {
  if (!detection || detection.divergences.length === 0) return "";

  const errors = detection.divergences.filter(d => d.severity === "error");
  const warnings = detection.divergences.filter(d => d.severity === "warning");

  let section = `<divergence_analysis classification="${detection.classification}" confidence="${Math.round(detection.confidence * 100)}%">
  ${detection.contextSummary}`;

  if (errors.length > 0) {
    section += "\n  ERRORS:";
    for (const e of errors.slice(0, 3)) {
      section += `\n  - [Line ${e.line}] ${e.message}`;
      if (e.suggestedFix) section += `\n    Fix: ${e.suggestedFix}`;
    }
  }

  if (warnings.length > 0) {
    section += "\n  WARNINGS:";
    for (const w of warnings.slice(0, 2)) {
      section += `\n  - [Line ${w.line}] ${w.message}`;
    }
  }

  section += "\n</divergence_analysis>";
  return section;
}

function buildVisualizationSection(vizData?: VisualizationData | null): string {
  if (!vizData || vizData.steps.length === 0) return "";

  const first = vizData.steps[0];
  const last = vizData.steps[vizData.steps.length - 1];

  return `<visualization type="${vizData.type}" algorithm="${vizData.algorithm}">
  Description: ${vizData.metadata.description}
  Steps: ${vizData.steps.length}
  
  Initial state:
  ${formatVizStep(first)}
  
  Final state:
  ${formatVizStep(last)}
  
  Use the visualization data to help the student understand their algorithm visually.
  Reference specific array indices, pointer positions, or tree nodes when explaining.
</visualization>`;
}

function formatVizStep(step: any): string {
  if (!step) return "";
  const data = step.data;
  if (data?.type === "two_pointer") {
    return `  Array: [${data.array.map((e: any) => e.value).join(", ")}]
  Left pointer: index ${data.left.index} (value: ${data.left.value})
  Right pointer: index ${data.right.index} (value: ${data.right.value})`;
  }
  if (data?.type === "array") {
    return `  Array: [${data.elements.map((e: any) => `${e.value}${e.highlight !== "none" ? ` [${e.highlight}]` : ""}`).join(", ")}]`;
  }
  return `  ${step.description}: ${JSON.stringify(data)}`;
}

function buildVariableHistory(trace: ExecutionTrace | null): string {
  if (!trace || trace.steps.length === 0) return "";

  const significantChanges: string[] = [];
  const seen = new Set<string>();

  for (const step of trace.steps) {
    for (const [name, snap] of Object.entries(step.variables)) {
      const key = `${name}:${JSON.stringify(snap.value)}`;
      if (snap.changed && !seen.has(key)) {
        seen.add(key);
        significantChanges.push(`  Step ${step.stepIndex} (line ${step.line}): ${name} = ${JSON.stringify(snap.value)}`);
      }
    }
  }

  if (significantChanges.length === 0) return "";

  return `<variable_changes>
${significantChanges.slice(-10).join("\n")}
</variable_changes>`;
}

function buildSocraticQuestion(detection: DetectionResult | null): string {
  if (!detection || detection.classification === "correct") return "";

  const questions: Record<string, string> = {
    off_by_one: "Your array index went out of bounds or reached the wrong position. Trace through what happens when the index equals the array length vs length - 1. What changes at that boundary?",
    wrong_condition: "The loop or if-condition seems to be checking the wrong thing. What happens if you flip the comparison operator? When should this condition be true vs false?",
    missing_update: "A variable inside your loop isn't changing between iterations. What needs to update each time through the loop for it to make progress?",
    wrong_initialization: "Your starting values don't look right for this problem. What should the initial state be? Try solving a tiny example by hand and note what values you start with.",
    infinite_loop_risk: "Your loop keeps running without end. What condition would make it stop? Is something preventing that condition from ever becoming true?",
    edge_case_handling: "What happens with the smallest possible input? Try an empty array or a single element. Does your approach handle that?",
    algorithm_mismatch: "The way your code executes doesn't match the expected pattern for this problem. What algorithm or data structure is this problem asking you to use?",
    correct: "",
  };

  const question = questions[detection.classification];
  if (!question) return "";

  return `<socratic_hint>
Based on the execution trace analysis, here's what to focus on:
${question}

Don't give the answer. Help the student discover it by examining their trace.
</socratic_hint>`;
}
