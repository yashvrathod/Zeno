import type { Visualization, Node, Edge, Annotation } from '../types';
import type { ExecutionTrace } from '../../enhancedDebuggingAssistant';

export function generateTreeVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const nodes: Node[] = [
    { id: 'root', label: 'Root', value: 10, x: 400, y: 50, color: '#4F46E5', size: 50, highlighted: true },
    { id: 'left', label: 'Left', value: 5, x: 200, y: 150, color: '#4F46E5', size: 40 },
    { id: 'right', label: 'Right', value: 15, x: 600, y: 150, color: '#4F46E5', size: 40 },
  ];

  const edges: Edge[] = [
    { id: 'e1', from: 'root', to: 'left', label: 'L', color: '#6B7280' },
    { id: 'e2', from: 'root', to: 'right', label: 'R', color: '#6B7280' },
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

export function generateGraphVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const nodes: Node[] = [
    { id: 'A', label: 'A', x: 400, y: 100, color: '#4F46E5', size: 45 },
    { id: 'B', label: 'B', x: 200, y: 200, color: '#4F46E5', size: 45 },
    { id: 'C', label: 'C', x: 600, y: 200, color: '#4F46E5', size: 45 },
    { id: 'D', label: 'D', x: 400, y: 300, color: '#4F46E5', size: 45 },
  ];

  const edges: Edge[] = [
    { id: 'e1', from: 'A', to: 'B', weight: 4 },
    { id: 'e2', from: 'A', to: 'C', weight: 2 },
    { id: 'e3', from: 'B', to: 'D', weight: 5 },
    { id: 'e4', from: 'C', to: 'D', weight: 1 },
  ];

  return {
    ...baseViz,
    data: { nodes, edges },
    config: {
      ...baseViz.config,
      layout: 'force',
    },
  };
}
