import { ExecutionTrace, VisualizationData, VisualizationStep, ArrayElement } from "../../execution-trace/types";

export function buildArrayVisualization(trace: ExecutionTrace): VisualizationData | null {
  const arr = extractArray(trace);
  if (!arr) return null;

  const steps: VisualizationStep[] = [];
  const activeIndices: number[] = [];

  for (const traceStep of trace.steps) {
    if (traceStep.type === "loop_iteration" || traceStep.type === "assignment") {
      const indices = extractIndicesFromStep(traceStep);
      activeIndices.push(...indices);

      const elements: ArrayElement[] = arr.map((val, idx) => ({
        value: val,
        index: idx,
        highlight: activeIndices.includes(idx) ? "active" : "none",
      }));

      steps.push({
        stepIndex: traceStep.stepIndex,
        label: `Step ${traceStep.stepIndex}`,
        description: traceStep.operation || `Line ${traceStep.line}`,
        data: { type: "array", elements },
        variables: extractVariablesForStep(traceStep, ["i", "j", "left", "right", "mid"]),
      });
    }
  }

  return {
    type: "array_traversal",
    algorithm: "array_traversal",
    steps,
    metadata: {
      title: "Array Traversal",
      description: "Step-by-step walk through array elements",
      totalSteps: steps.length,
    },
  };
}

function extractArray(trace: ExecutionTrace): number[] | null {
  for (const step of trace.steps) {
    for (const [, snap] of Object.entries(step.variables)) {
      if (Array.isArray(snap.value) && snap.value.length > 0) {
        return snap.value.map(v => Number(v));
      }
    }
  }

  const input = trace.metadata.testCase.parsedInput;
  if (Array.isArray(input)) {
    for (const item of input) {
      if (Array.isArray(item)) return item.map(v => Number(v));
    }
  }

  return null;
}

function extractIndicesFromStep(step: any): number[] {
  const indices: number[] = [];
  for (const [name, snap] of Object.entries(step.variables || {})) {
    const s = snap as any;
    if (typeof s.value === "number" && ["i", "j", "k", "left", "right", "mid", "index", "pos"].includes(name.toLowerCase())) {
      const val = s.value as number;
      if (val >= 0 && !indices.includes(val)) indices.push(val);
    }
  }
  return indices;
}

function extractVariablesForStep(
  step: any,
  keys: string[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [name, snap] of Object.entries(step.variables || {})) {
    const s = snap as any;
    if (keys.includes(name.toLowerCase())) {
      result[name] = s.value;
    }
  }
  return result;
}
