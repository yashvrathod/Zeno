import { ExecutionTrace, VisualizationData, VisualizationStep, ArrayElement } from "../../execution-trace/types";

export function buildBinarySearchVisualization(trace: ExecutionTrace): VisualizationData | null {
  const arr = extractArray(trace);
  if (!arr) return null;

  let lastLeft = 0;
  let lastRight = arr.length - 1;
  let lastMid = -1;

  const steps: VisualizationStep[] = [];

  for (const traceStep of trace.steps) {
    const vars = traceStep.variables;
    const left = vars["left"]?.value as number ?? lastLeft;
    const right = vars["right"]?.value as number ?? lastRight;
    const mid = vars["mid"]?.value as number ?? lastMid;

    if (typeof left === "number") lastLeft = left;
    if (typeof right === "number") lastRight = right;
    if (typeof mid === "number") lastMid = mid;

    const elements: ArrayElement[] = arr.map((val, idx) => {
      let highlight: ArrayElement["highlight"] = "none";
      if (idx === mid) highlight = "active";
      else if (idx >= left && idx <= right) highlight = "compared";
      else if (idx < left || idx > right) highlight = "sorted";
      return { value: val, index: idx, highlight };
    });

    steps.push({
      stepIndex: traceStep.stepIndex,
      label: `Step ${traceStep.stepIndex}`,
      description: `Searching [${left}..${right}], mid=${mid} (value: ${mid >= 0 && mid < arr.length ? arr[mid] : "?"})`,
      data: {
        type: "two_pointer",
        array: elements,
        left: { index: left, value: arr[left] ?? "?" },
        right: { index: right, value: arr[right] ?? "?" },
        mid: mid >= 0 ? { index: mid, value: arr[mid] ?? "?" } : { index: -1, value: "?" },
        description: `Binary search in range [${left}, ${right}]`,
      },
      variables: { left, right, mid, searchSpace: right - left + 1 },
    });
  }

  return {
    type: "binary_search",
    algorithm: "binary_search",
    steps,
    metadata: {
      title: "Binary Search Visualization",
      description: `Binary search narrowing range in array of ${arr.length} elements`,
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
