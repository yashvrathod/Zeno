import { ExecutionTrace, VisualizationData, VisualizationStep, ArrayElement } from "../../execution-trace/types";

export function buildTwoPointerVisualization(trace: ExecutionTrace): VisualizationData | null {
  const arr = extractArray(trace);
  if (!arr) return null;

  let lastLeft = 0;
  let lastRight = arr.length - 1;
  let lastMid = -1;

  const steps: VisualizationStep[] = [];

  for (const traceStep of trace.steps) {
    const vars = traceStep.variables;
    let left = vars["left"]?.value as number ?? lastLeft;
    let right = vars["right"]?.value as number ?? lastRight;
    let mid = vars["mid"]?.value as number ?? lastMid;

    if (typeof left === "number") lastLeft = left;
    if (typeof right === "number") lastRight = right;
    if (typeof mid === "number") lastMid = mid;

    const elements: ArrayElement[] = arr.map((val, idx) => ({
      value: val,
      index: idx,
      highlight: idx === left ? "pointer_a" : idx === right ? "pointer_b" : idx === mid ? "active" : "none",
    }));

    const description = buildDescription(traceStep, left, right, mid);

    steps.push({
      stepIndex: traceStep.stepIndex,
      label: `Step ${traceStep.stepIndex}`,
      description,
      data: {
        type: "two_pointer",
        array: elements,
        left: { index: left, value: arr[left] ?? "?" },
        right: { index: right, value: arr[right] ?? "?" },
        ...(mid >= 0 ? { mid: { index: mid, value: arr[mid] ?? "?" } } : {}),
        description,
      },
      variables: {
        left, right, mid: mid >= 0 ? mid : undefined,
      },
    });
  }

  return {
    type: "two_pointer",
    algorithm: "two_pointer",
    steps,
    metadata: {
      title: "Two Pointer Visualization",
      description: `Left and right pointers moving through array of ${arr.length} elements`,
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

function buildDescription(step: any, left: number, right: number, mid: number): string {
  const op = step.operation?.toLowerCase() || "";
  if (op.includes("while") || op.includes("loop")) {
    return `Loop iteration: left=${left}, right=${right}`;
  }
  if (op.includes("comparison")) {
    const comp = op.includes("<= ") ? "<=" : op.includes(">= ") ? ">=" : op.includes("< ") ? "<" : op.includes("> ") ? ">" : "==";
    return `Comparing elements at left[${left}]=${op} and right[${right}]`;
  }
  if (op.includes("swap")) {
    return `Swapping elements at left=${left} and right=${right}`;
  }
  if (mid >= 0) {
    return `Mid=${mid}: comparing target with arr[${mid}]`;
  }
  return `Left=${left}, Right=${right}`;
}
