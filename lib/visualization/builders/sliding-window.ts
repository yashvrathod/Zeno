import { ExecutionTrace, VisualizationData, VisualizationStep, ArrayElement } from "../../execution-trace/types";

export function buildSlidingWindowVisualization(trace: ExecutionTrace): VisualizationData | null {
  const arr = extractArray(trace);
  if (!arr) return null;

  let lastLeft = 0;
  let lastRight = 0;
  const steps: VisualizationStep[] = [];

  for (const traceStep of trace.steps) {
    const vars = traceStep.variables;
    const left = vars["left"]?.value as number ?? vars["start"]?.value as number ?? lastLeft;
    const right = vars["right"]?.value as number ?? vars["end"]?.value as number ?? lastRight;

    if (typeof left === "number") lastLeft = left;
    if (typeof right === "number") lastRight = right;

    const elements: ArrayElement[] = arr.map((val, idx) => ({
      value: val,
      index: idx,
      highlight: idx >= left && idx <= right ? "active" : "none",
    }));

    steps.push({
      stepIndex: traceStep.stepIndex,
      label: `Step ${traceStep.stepIndex}`,
      description: `Window [${left}, ${right}]`,
      data: { type: "array", elements },
      variables: { left, right, windowSize: right - left + 1 },
    });
  }

  return {
    type: "sliding_window",
    algorithm: "sliding_window",
    steps,
    metadata: {
      title: "Sliding Window Visualization",
      description: `Window slides through array of ${arr.length} elements`,
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

  const testInputs = trace.metadata.testCase.parsedInput;
  if (Array.isArray(testInputs)) {
    for (const item of testInputs) {
      if (Array.isArray(item)) return item.map(v => Number(v));
    }
  }

  return null;
}
