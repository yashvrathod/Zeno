/**
 * Visualization Parser
 * 
 * Extracts visualization markers from AI responses and converts them to renderable data.
 * Format: {{VISUALIZATION:type:data}}
 */

export interface ParsedVisualization {
  type: string;
  data: any;
  marker: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse visualization markers from AI response text.
 */
export function parseVisualizations(text: string): ParsedVisualization[] {
  const visualizations: ParsedVisualization[] = [];
  const regex = /\{\{VISUALIZATION:([^:}]+):([^}]+)\}\}/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, type, dataStr] = match;
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    try {
      const data = JSON.parse(dataStr);
      visualizations.push({
        type,
        data,
        marker: fullMatch,
        startIndex,
        endIndex,
      });
    } catch (error) {
      console.warn("Failed to parse visualization data:", dataStr, error);
    }
  }

  return visualizations;
}

/**
 * Remove visualization markers from text for clean display.
 */
export function removeVisualizationMarkers(text: string): string {
  return text.replace(/\{\{VISUALIZATION:[^}]+\}\}/g, '').trim();
}

/**
 * Extract common algorithm patterns from code and generate appropriate visualization.
 */
export function generateVisualizationFromCode(
  code: string,
  context?: {
    array?: number[];
    target?: number;
    left?: number;
    right?: number;
    mid?: number;
  }
): ParsedVisualization | null {
  const lowerCode = code.toLowerCase();

  // Two Pointers pattern
  if (lowerCode.includes('left') && lowerCode.includes('right') && context?.array) {
    const array = context.array;
    const left = context.left ?? 0;
    const right = context.right ?? array.length - 1;
    const target = context.target;
    const sum = (array[left] || 0) + (array[right] || 0);
    
    const viz = {
      type: 'two-pointers',
      data: [array, left, right, target, sum],
      marker: `{{VISUALIZATION:two-pointers:${JSON.stringify([array, left, right, target, sum])}}}`,
      startIndex: -1,
      endIndex: -1
    };
    return viz;
  }

  // Binary Search pattern
  if (lowerCode.includes('mid') && lowerCode.includes('left') && lowerCode.includes('right') && context?.array) {
    const array = context.array;
    const left = context.left ?? 0;
    const right = context.right ?? array.length - 1;
    const mid = context.mid ?? Math.floor((left + right) / 2);
    const target = context.target;
    
    const viz = {
      type: 'binary-search',
      data: [array, left, right, mid, target],
      marker: `{{VISUALIZATION:binary-search:${JSON.stringify([array, left, right, mid, target])}}}`,
      startIndex: -1,
      endIndex: -1
    };
    return viz;
  }

  // Sliding Window pattern
  if (lowerCode.includes('window') || lowerCode.includes('substring') && context?.array) {
    const array = context.array;
    const left = context.left ?? 0;
    const right = context.right ?? Math.min(2, array.length - 1);
    const target = context.target;
    
    const viz = {
      type: 'sliding-window',
      data: [array, left, right, target],
      marker: `{{VISUALIZATION:sliding-window:${JSON.stringify([array, left, right, target])}}}`,
      startIndex: -1,
      endIndex: -1
    };
    return viz;
  }

  return null;
}

/**
 * Auto-generate visualization for common algorithm explanations.
 */
export function autoGenerateVisualization(
  explanation: string,
  problemType?: string,
  exampleData?: any
): ParsedVisualization | null {
  const lowerExplanation = explanation.toLowerCase();

  // Detect algorithm type from explanation
  if (lowerExplanation.includes('two pointer') || lowerExplanation.includes('two sum') || problemType === 'two-pointers') {
    const arr = exampleData?.array || [2, 7, 11, 15];
    const left = exampleData?.left || 0;
    const right = exampleData?.right || arr.length - 1;
    const target = exampleData?.target || 9;
    
    return {
      type: 'two-pointers',
      data: [arr, left, right, target, arr[left] + arr[right]],
      marker: `{{VISUALIZATION:two-pointers:${JSON.stringify([arr, left, right, target, arr[left] + arr[right]])}}}`,
      startIndex: -1,
      endIndex: -1
    };
  }

  if (lowerExplanation.includes('binary search') || problemType === 'binary-search') {
    const arr = exampleData?.array || [1, 3, 5, 7, 9, 11, 13];
    const target = exampleData?.target || 7;
    const left = 0;
    const right = arr.length - 1;
    const mid = Math.floor((left + right) / 2);
    
    return {
      type: 'binary-search',
      data: [arr, left, right, mid, target],
      marker: `{{VISUALIZATION:binary-search:${JSON.stringify([arr, left, right, mid, target])}}}`,
      startIndex: -1,
      endIndex: -1
    };
  }

  if (lowerExplanation.includes('sliding window') || problemType === 'sliding-window') {
    const str = exampleData?.string || "abcde";
    const start = exampleData?.start || 0;
    const end = exampleData?.end || 2;
    
    return {
      type: 'sliding-window',
      data: [str, start, end],
      marker: `{{VISUALIZATION:sliding-window:${JSON.stringify([str, start, end])}}}`,
      startIndex: -1,
      endIndex: -1
    };
  }

  return null;
}
