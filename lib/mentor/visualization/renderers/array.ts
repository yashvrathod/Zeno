import type { Visualization, Node, Pointer, Highlight, Annotation, ArrayState } from '../types';
import type { ExecutionTrace, DataStructureState } from '../../enhancedDebuggingAssistant';
import { parseArrayRepresentation, extractRangeFromDescription, getColorForVariable } from '../utils';

export function generateArrayVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const arrayState = trace.dataStructures?.find(
    (ds: DataStructureState) => ds.type === 'array'
  );

  if (!arrayState) {
    return baseViz;
  }

  const values = parseArrayRepresentation(arrayState.representation);
  const cellWidth = 50;
  const cellHeight = 50;
  const startX = 50;
  const startY = 250;

  const nodes: Node[] = values.map((value, index) => ({
    id: `cell_${index}`,
    label: String(value),
    value,
    x: startX + index * cellWidth,
    y: startY,
    color: '#4F46E5',
    size: 40,
    highlighted: false,
    metadata: { index, value },
  }));

  const indexAnnotations: Annotation[] = values.map((_, index) => ({
    id: `index_${index}`,
    text: String(index),
    position: { x: startX + index * cellWidth + cellWidth / 2, y: startY + cellHeight + 20 },
    type: 'info',
    pinned: true,
  }));

  const pointers: Pointer[] = [];
  const highlights: Highlight[] = [];

  trace.variables.forEach(variable => {
    if (variable.name.includes('index') || variable.name.includes('pointer')) {
      const index = parseInt(variable.value);
      if (!isNaN(index) && index >= 0 && index < values.length) {
        pointers.push({
          id: `ptr_${variable.name}`,
          name: variable.name,
          index,
          color: getColorForVariable(variable.name),
          label: variable.name,
          animated: variable.changed,
        });

        highlights.push({
          type: 'index',
          indices: [index],
          color: getColorForVariable(variable.name),
          label: variable.name,
          pulsating: variable.changed,
        });
      }
    }
  });

  arrayState.changes?.forEach(change => {
    if (change.description.includes('range') || change.description.includes('window')) {
      const range = extractRangeFromDescription(change.description);
      if (range) {
        highlights.push({
          type: 'range',
          range,
          color: '#10B981',
          label: change.description,
          pulsating: true,
        });
      }
    }
  });

  return {
    ...baseViz,
    data: {
      nodes,
      arrays: [{ id: 'main_array', ...arrayState, values, pointers, highlights }],
      pointers,
      highlights,
      annotations: indexAnnotations,
    },
    config: {
      ...baseViz.config,
      width: Math.max(800, values.length * cellWidth + 100),
      height: 400,
    },
  };
}

export function generateBinarySearchVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const viz = generateArrayVisualization(baseViz, trace);

  const annotations: Annotation[] = [
    {
      id: 'bs_hint',
      text: 'Binary Search: Compare middle element with target',
      position: { x: 400, y: 100 },
      type: 'info',
      pinned: true,
    },
  ];

  const midPointer = trace.variables.find(v => v.name === 'mid');
  if (midPointer) {
    const index = parseInt(midPointer.value);
    if (!isNaN(index)) {
      viz.data.highlights?.push({
        type: 'index',
        indices: [index],
        color: '#F59E0B',
        label: 'mid',
        pulsating: true,
      });
    }
  }

  return {
    ...viz,
    data: {
      ...viz.data,
      annotations: [...(viz.data.annotations || []), ...annotations],
    },
  };
}
