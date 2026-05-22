/**
 * Dynamic Visual Scaffolding
 *
 * Generates deterministic ASCII/SVG visualizations for algorithm explanations.
 * Unlike ChatGPT's hallucinated ASCII art, these are precise and data-driven.
 */

export type VisualizationType =
  | "two-pointers"
  | "binary-search"
  | "linked-list"
  | "array"
  | "tree"
  | "graph"
  | "sliding-window";

export interface VisualizationData {
  type: VisualizationType;
  data: unknown[];
  target?: unknown;
  pointers?: { name: string; index: number; color?: string }[];
  highlight?: number[];
  step?: number;
}

/**
 * Generate ASCII visualization for Two Pointers pattern.
 */
export function visualizeTwoPointers(
  arr: number[],
  left: number,
  right: number,
  target?: number,
  sum?: number
): string {
  const maxWidth = 60;
  const elementWidth = Math.max(3, Math.floor(maxWidth / arr.length));

  let result = "\n";

  // Index row
  let indexRow = "     ";
  for (let i = 0; i < arr.length; i++) {
    indexRow += i.toString().padStart(elementWidth);
  }
  result += indexRow + "\n";

  // Pointer row
  let pointerRow = "     ";
  for (let i = 0; i < arr.length; i++) {
    let char = " ";
    if (i === left) char = "L";
    if (i === right) char = i === left ? "X" : "R";
    pointerRow += char.padStart(elementWidth);
  }
  result += pointerRow + "\n";

  // Array row
  let arrayRow = "[   ";
  for (let i = 0; i < arr.length; i++) {
    const isPointer = i === left || i === right;
    const val = arr[i]!.toString();
    arrayRow += (isPointer ? `[${val}]` : ` ${val} `).padStart(elementWidth);
  }
  result += arrayRow + " ]\n";

  // Context info
  if (target !== undefined && sum !== undefined) {
    result += `\n     Target: ${target} | Current Sum: ${sum} (${arr[left]} + ${arr[right]})\n`;
    result += `     ${sum < target ? "Sum < Target → Move L right" : sum > target ? "Sum > Target → Move R left" : "Sum == Target ✓"}\n`;
  }

  return result;
}

/**
 * Generate ASCII visualization for Binary Search.
 */
export function visualizeBinarySearch(
  arr: number[],
  left: number,
  right: number,
  mid: number,
  target: number
): string {
  let result = "\n";

  // Show search range
  result += "     ";
  for (let i = 0; i < arr.length; i++) {
    if (i >= left && i <= right) {
      result += "─".repeat(4);
    } else {
      result += "    ";
    }
  }
  result += "\n";

  // Array values
  result += "[   ";
  for (let i = 0; i < arr.length; i++) {
    const isMid = i === mid;
    const val = arr[i]!.toString().padStart(2);
    result += (isMid ? `|${val}|` : ` ${val} `);
  }
  result += " ]\n";

  // Pointer labels
  result += "     ";
  for (let i = 0; i < arr.length; i++) {
    if (i === mid) {
      result += " ^  ";
    } else if (i === left) {
      result += " L  ";
    } else if (i === right) {
      result += " R  ";
    } else {
      result += "    ";
    }
  }
  result += "\n";

  // Decision
  const midVal = arr[mid];
  result += `\n     mid=${mid}, arr[mid]=${midVal}, target=${target}\n`;
  result += `     ${midVal! < target ? `${midVal} < ${target} → Search right half` : midVal! > target ? `${midVal} > ${target} → Search left half` : `${midVal} == ${target} ✓ Found!`}\n`;

  return result;
}

/**
 * Generate ASCII visualization for Sliding Window.
 */
export function visualizeSlidingWindow(
  arr: string | number[],
  windowStart: number,
  windowEnd: number,
  currentSum?: number,
  targetSum?: number
): string {
  const chars = typeof arr === "string" ? arr.split("") : arr.map(String);

  let result = "\n     ";

  // Window brackets
  for (let i = 0; i < chars.length; i++) {
    if (i === windowStart) result += "[";
    else if (i === windowEnd) result += "]";
    else result += " ";
    result += chars[i] + " ";
  }
  result += "\n";

  // Window size indicator
  const windowSize = windowEnd - windowStart;
  result += `     Window size: ${windowSize} (${windowStart} → ${windowEnd})\n`;

  if (currentSum !== undefined && targetSum !== undefined) {
    result += `     Current sum: ${currentSum}, Target: ${targetSum}\n`;
    result += `     ${currentSum < targetSum ? "Need to expand window →" : currentSum > targetSum ? "Need to shrink window ←" : "Window sum matches ✓"}\n`;
  }

  return result;
}

/**
 * Generate ASCII visualization for Linked List.
 */
export function visualizeLinkedList(
  values: (number | string)[],
  current?: number,
  prev?: number,
  next?: number
): string {
  let result = "\n     ";

  for (let i = 0; i < values.length; i++) {
    // Pointer labels above
    const pointers: string[] = [];
    if (i === prev) pointers.push("prev");
    if (i === current) pointers.push("curr");
    if (i === next) pointers.push("next");

    if (pointers.length > 0) {
      result = result.slice(0, -1) + pointers.join(",") + "\n     ";
    }

    // Node
    const val = values[i]!.toString();
    const isCurrent = i === current;
    result += isCurrent ? `(${val})` : `[${val}]`;

    // Arrow
    if (i < values.length - 1) {
      result += "→";
    }
  }
  result += "→NULL\n";

  return result;
}

/**
 * Generate visualization based on problem type and current state.
 */
export function generateVisualization(data: VisualizationData): string {
  switch (data.type) {
    case "two-pointers": {
      const [arr, left, right, target, sum] = data.data as [
        number[],
        number,
        number,
        number,
        number
      ];
      return visualizeTwoPointers(arr, left, right, target, sum);
    }

    case "binary-search": {
      const [arr, left, right, mid, target] = data.data as [
        number[],
        number,
        number,
        number,
        number
      ];
      return visualizeBinarySearch(arr, left, right, mid, target);
    }

    case "sliding-window": {
      const [arr, start, end, sum, target] = data.data as [
        string | number[],
        number,
        number,
        number,
        number
      ];
      return visualizeSlidingWindow(arr, start, end, sum, target);
    }

    case "linked-list": {
      const [values, current, prev, next] = data.data as [
        (number | string)[],
        number,
        number,
        number
      ];
      return visualizeLinkedList(values, current, prev, next);
    }

    default:
      return "Visualization not available for this algorithm type.";
  }
}

/**
 * Detect which visualization type to use based on problem patterns.
 */
export function detectVisualizationType(
  problemTitle: string,
  problemStatement: string
): VisualizationType | null {
  const text = (problemTitle + " " + problemStatement).toLowerCase();

  // Two pointers — requires explicit pair/sum/two-pointer keywords, not just "sorted"
  if (/two sum|two pointer|pair.*sum|sum.*pair|target sum|find.*pair/.test(text)) {
    return "two-pointers";
  }
  // Binary search — requires explicit binary search or position-finding
  if (/binary search|search.*sorted.*targe|find.*position|log.*n/.test(text)) {
    return "binary-search";
  }
  // Sliding window — substring/subarray problems
  if (/sliding window|substring|subarray|consecutive|contiguous/.test(text)) {
    return "sliding-window";
  }
  // Linked list
  if (/linked list|reverse.*list|merge.*list|list.*node/.test(text)) {
    return "linked-list";
  }
  // Tree
  if (/tree|binary tree|bst|traverse.*tree/.test(text)) {
    return "tree";
  }
  // Graph
  if (/graph|dfs|bfs|path|node.*edge/.test(text)) {
    return "graph";
  }

  // Don't default to a specific type — return null so no algorithm hint is given
  return null;
}

/**
 * Inject visualization marker into AI response.
 * The frontend will detect this and render the appropriate visualization.
 */
export function injectVisualizationMarker(
  response: string,
  vizType: VisualizationType,
  vizData: unknown
): string {
  const marker = `{{VISUALIZATION:${vizType}:${JSON.stringify(vizData)}}}`;
  return `${response}\n\n${marker}`;
}
