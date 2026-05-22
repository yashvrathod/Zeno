import type { Visualization, Node, Annotation } from '../types';
import type { ExecutionTrace, DataStructureState } from '../../enhancedDebuggingAssistant';
import { parseArrayRepresentation } from '../utils';

export function generateStackQueueVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const ds = trace.dataStructures?.find(
    (d: DataStructureState) => d.type === 'stack' || d.type === 'queue'
  );

  if (!ds) {
    return baseViz;
  }

  const values = parseArrayRepresentation(ds.representation);
  const nodes: Node[] = [];
  const cellWidth = 60;
  const cellHeight = 50;
  const startX = 400;
  const startY = 100;

  values.forEach((value, index) => {
    const isTop = index === values.length - 1;
    nodes.push({
      id: `item_${index}`,
      label: String(value),
      value,
      x: startX,
      y: startY + (values.length - 1 - index) * cellHeight,
      color: isTop ? '#10B981' : '#4F46E5',
      size: isTop ? 45 : 40,
      highlighted: isTop,
      pulsating: isTop,
      metadata: { index, value, isTop },
    });
  });

  const annotations: Annotation[] = [
    {
      id: 'operation',
      text: ds.type === 'stack' ? 'LIFO - Last In, First Out' : 'FIFO - First In, First Out',
      position: { x: 400, y: 50 },
      type: 'info',
      pinned: true,
    },
  ];

  if (values.length > 0) {
    annotations.push({
      id: 'top_label',
      text: ds.type === 'stack' ? 'Top' : 'Front',
      position: { x: 470, y: startY + (values.length - 1) * cellHeight + 25 },
      type: 'tip',
      pinned: true,
    });
  }

  return {
    ...baseViz,
    data: {
      nodes,
      annotations,
    },
    config: {
      ...baseViz.config,
      layout: 'hierarchical',
    },
  };
}
