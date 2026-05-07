/**
 * Client-side Visualization Parser
 * 
 * Parses {{VISUALIZATION:type:data}} markers in text and renders them as components.
 * Works entirely on the client side without AI processing.
 */

export interface VisualizationData {
  type: 'two-pointers' | 'binary-search' | 'sliding-window' | 'linked-list';
  data: any[];
}

export function parseVisualizationMarkers(text: string): {
  cleanText: string;
  visualizations: Array<{ type: string; data: any; index: number }>;
} {
  const visualizations: Array<{ type: string; data: any; index: number }> = [];
  let cleanText = text;
  
  // Find all visualization markers
  const regex = /\{\{VISUALIZATION:([^:}]+):([^}]+)\}\}/g;
  let match;
  let offset = 0;
  
  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, type, dataStr] = match;
    const startIndex = match.index;
    
    try {
      const data = JSON.parse(dataStr);
      visualizations.push({
        type,
        data,
        index: startIndex - offset
      });
      
      // Remove the marker from clean text
      cleanText = cleanText.replace(fullMatch, '');
      offset += fullMatch.length;
    } catch (error) {
      console.warn('Failed to parse visualization:', dataStr);
    }
  }
  
  return { cleanText: cleanText.trim(), visualizations };
}

/**
 * Generate ASCII visualization for two pointers
 */
export function visualizeTwoPointers(
  nums1: number[],
  i: number,
  nums2: number[],
  j: number,
  result: number[] = []
): string {
  const maxLength = Math.max(nums1.length, nums2.length);
  const width = Math.max(4, Math.floor(60 / (maxLength + 2)));
  
  let output = '\n';
  
  // nums1 array
  output += 'nums1: ';
  for (let idx = 0; idx < nums1.length; idx++) {
    const isPointer = idx === i;
    const val = nums1[idx]?.toString() || '';
    output += (isPointer ? `[${val}]` : ` ${val} `).padEnd(width);
  }
  output += '\n';
  
  // nums1 pointer
  output += '       ';
  for (let idx = 0; idx < nums1.length; idx++) {
    const pointer = idx === i ? 'i' : ' ';
    output += pointer.padEnd(width);
  }
  output += '\n\n';
  
  // nums2 array
  output += 'nums2: ';
  for (let idx = 0; idx < nums2.length; idx++) {
    const isPointer = idx === j;
    const val = nums2[idx]?.toString() || '';
    output += (isPointer ? `[${val}]` : ` ${val} `).padEnd(width);
  }
  output += '\n';
  
  // nums2 pointer
  output += '       ';
  for (let idx = 0; idx < nums2.length; idx++) {
    const pointer = idx === j ? 'j' : ' ';
    output += pointer.padEnd(width);
  }
  output += '\n\n';
  
  // result array
  output += 'result: [' + result.join(', ') + ']\n';
  
  // Current comparison
  if (i < nums1.length && j < nums2.length) {
    output += `\nComparing: nums1[${i}] = ${nums1[i]} vs nums2[${j}] = ${nums2[j]}\n`;
    output += `${nums1[i] < nums2[j] ? `Take ${nums1[i]} (smaller)` : `Take ${nums2[j]} (smaller)`}\n`;
  }
  
  return output;
}

/**
 * Generate ASCII visualization for binary search
 */
export function visualizeBinarySearch(
  arr: number[],
  left: number,
  right: number,
  mid: number,
  target: number
): string {
  let output = '\n';
  
  // Show search range
  output += 'Array:  ';
  for (let i = 0; i < arr.length; i++) {
    const inRange = i >= left && i <= right;
    const isMid = i === mid;
    const val = arr[i]?.toString() || '';
    output += (inRange ? (isMid ? `|${val}|` : ` ${val} `) : '   ').padEnd(4);
  }
  output += '\n';
  
  // Show pointers
  output += '        ';
  for (let i = 0; i < arr.length; i++) {
    if (i === left) output += 'L  ';
    else if (i === right) output += 'R  ';
    else if (i === mid) output += '^  ';
    else output += '   ';
  }
  output += '\n\n';
  
  output += `Left: ${left}, Right: ${right}, Mid: ${mid}\n`;
  output += `arr[${mid}] = ${arr[mid]}, Target = ${target}\n`;
  output += `${arr[mid] < target ? 'Search right' : arr[mid] > target ? 'Search left' : 'Found!'}`;
  
  return output;
}

/**
 * Generate ASCII visualization for sliding window
 */
export function visualizeSlidingWindow(
  str: string,
  start: number,
  end: number,
  result: string = ''
): string {
  let output = '\n';
  
  // Show string with window
  output += 'String: ';
  for (let i = 0; i < str.length; i++) {
    if (i === start) output += '[';
    output += str[i];
    if (i === end) output += ']';
    if (i !== end) output += ' ';
  }
  output += '\n\n';
  
  output += `Window: [${start}...${end}] = "${str.substring(start, end + 1)}"\n`;
  if (result) output += `Result: ${result}\n`;
  
  return output;
}

/**
 * Render visualization based on type and data
 */
export function renderVisualization(type: string, data: any[]): string {
  switch (type) {
    case 'two-pointers':
      // Handle both single array and two arrays format
      if (data.length === 5) {
        // [array, left, right, target, sum] - single array two pointers
        return visualizeTwoPointers(
          data[0] as number[],
          data[1] as number,
          [], // empty second array  
          -1 // no second pointer
        );
      } else if (data.length >= 4) {
        // [nums1, i, nums2, j, ...] - merge two arrays
        return visualizeTwoPointers(
          data[0] as number[],
          data[1] as number,
          data[2] as number[],
          data[3] as number,
          data[4] as number[] || []
        );
      }
      break;
      
    case 'binary-search':
      if (data.length >= 5) {
        return visualizeBinarySearch(
          data[0] as number[],
          data[1] as number,
          data[2] as number,
          data[3] as number,
          data[4] as number
        );
      }
      break;
      
    case 'sliding-window':
      if (data.length >= 3) {
        return visualizeSlidingWindow(
          data[0] as string,
          data[1] as number,
          data[2] as number,
          data[3] as string
        );
      }
      break;
      
    case 'linked-list':
      // Basic linked list visualization
      const values = data[0] as number[];
      const current = data[1] as number;
      let output = '\n';
      for (let i = 0; i < values.length; i++) {
        const isCurrent = i === current;
        output += isCurrent ? `(${values[i]})` : `[${values[i]}]`;
        if (i < values.length - 1) output += ' -> ';
      }
      output += ' -> NULL\n';
      return output;
  }
  
  return '\nVisualization format not recognized\n';
}

/**
 * Process text with visualization markers and return rendered content
 */
export function processVisualizations(text: string): {
  text: string;
  visualizations: Array<{ type: string; rendered: string; index: number }>;
} {
  const { cleanText, visualizations } = parseVisualizationMarkers(text);
  
  const renderedVisualizations = visualizations.map(viz => ({
    type: viz.type,
    rendered: renderVisualization(viz.type, viz.data),
    index: viz.index
  }));
  
  return {
    text: cleanText,
    visualizations: renderedVisualizations
  };
}
