import type { Visualization, Node, Edge, Annotation } from '../types';
import type { ExecutionTrace } from '../../enhancedDebuggingAssistant';

export function generateDPTableVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const rows = 5;
  const cols = 5;
  const cellSize = 40;
  const nodes: Node[] = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const value = i === 0 || j === 0 ? 0 : i * j;
      nodes.push({
        id: `cell_${i}_${j}`,
        label: String(value),
        value,
        x: 100 + j * cellSize,
        y: 100 + i * cellSize,
        color: value > 0 ? '#4F46E5' : '#E5E7EB',
        size: 35,
        highlighted: i === rows - 1 && j === cols - 1,
        metadata: { row: i, col: j },
      });
    }
  }

  const annotations: Annotation[] = [
    {
      id: 'dp_hint',
      text: 'DP[i][j] = DP[i-1][j] + DP[i][j-1]',
      position: { x: 100, y: 50 },
      type: 'info',
      pinned: true,
    },
  ];

  return {
    ...baseViz,
    data: { nodes, annotations },
    config: {
      ...baseViz.config,
      width: 400,
      height: 400,
      layout: 'grid',
    },
  };
}

export function generateRecursionTreeVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const nodes: Node[] = [
    { id: 'f5', label: 'f(5)', x: 400, y: 50, color: '#4F46E5', size: 45 },
    { id: 'f4', label: 'f(4)', x: 250, y: 150, color: '#4F46E5', size: 40 },
    { id: 'f3', label: 'f(3)', x: 550, y: 150, color: '#4F46E5', size: 40 },
    { id: 'f2_1', label: 'f(2)', x: 150, y: 250, color: '#4F46E5', size: 35 },
    { id: 'f2_2', label: 'f(2)', x: 350, y: 250, color: '#4F46E5', size: 35 },
    { id: 'base1', label: 'base', x: 100, y: 350, color: '#10B981', size: 30 },
    { id: 'base2', label: 'base', x: 200, y: 350, color: '#10B981', size: 30 },
  ];

  const edges: Edge[] = [
    { id: 'e1', from: 'f5', to: 'f4', color: '#6B7280' },
    { id: 'e2', from: 'f5', to: 'f3', color: '#6B7280' },
    { id: 'e3', from: 'f4', to: 'f2_1', color: '#6B7280' },
    { id: 'e4', from: 'f4', to: 'f2_2', color: '#6B7280' },
    { id: 'e5', from: 'f2_1', to: 'base1', color: '#6B7280' },
    { id: 'e6', from: 'f2_1', to: 'base2', color: '#6B7280' },
  ];

  return {
    ...baseViz,
    data: { nodes, edges },
    config: {
      ...baseViz.config,
      layout: 'hierarchical',
    },
  };
}
