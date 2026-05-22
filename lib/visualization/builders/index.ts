import { ExecutionTrace, TraceStep, VisualizationData, VisualizationStep } from "../../execution-trace/types";
import { buildArrayVisualization } from "./array-traversal";
import { buildTwoPointerVisualization } from "./two-pointer";
import { buildSlidingWindowVisualization } from "./sliding-window";
import { buildBinarySearchVisualization } from "./binary-search";

export function buildVisualizationFromTrace(
  trace: ExecutionTrace,
  algorithm?: string,
): VisualizationData | null {
  if (!trace.steps || trace.steps.length === 0) return null;

  const detected = algorithm || detectAlgorithm(trace);

  switch (detected) {
    case "two_pointer":
      return buildTwoPointerVisualization(trace);
    case "sliding_window":
      return buildSlidingWindowVisualization(trace);
    case "binary_search":
      return buildBinarySearchVisualization(trace);
    case "array_traversal":
    default:
      return buildArrayVisualization(trace);
  }
}

function detectAlgorithm(trace: ExecutionTrace): string {
  const code = trace.metadata.studentCode.toLowerCase();
  const steps = trace.steps.map(s => s.operation.toLowerCase()).join(" ");

  if (code.includes("left") && code.includes("right") && code.includes("while") && code.includes("mid")) {
    return "binary_search";
  }
  if (code.includes("left") && code.includes("right") && (code.includes("while") || code.includes("while"))) {
    return "two_pointer";
  }
  if (code.includes("window") || (code.includes("left") && code.includes("right") && code.includes("map"))) {
    return "sliding_window";
  }

  if (steps.includes("pointer_move") || steps.includes("two pointer")) {
    return "two_pointer";
  }

  return "array_traversal";
}

function extractArrayFromTrace(trace: ExecutionTrace): number[] | null {
  for (const step of trace.steps) {
    for (const [, snap] of Object.entries(step.variables)) {
      if (Array.isArray(snap.value) && snap.value.length > 0) {
        return snap.value as number[];
      }
    }
  }
  return null;
}
