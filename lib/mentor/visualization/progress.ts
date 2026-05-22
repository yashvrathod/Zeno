import type { Visualization, Node, Edge, Annotation } from './types';
import type { ConceptId } from '../personalization/types';

export interface ProgressVisualization {
  overallMastery: number;
  conceptProgress: ConceptProgress[];
  learningVelocity: number;
  streakDays: number;
  visualization: Visualization;
}

export interface ConceptProgress {
  concept: ConceptId;
  mastery: number;
  trend: 'improving' | 'stable' | 'declining';
  practiceCount: number;
  lastPracticed: Date | null;
}

export function generateProgressVisualization(
  graph: any,
  sessionHistory: any[]
): ProgressVisualization {
  const progressNodes: Node[] = [
    { id: 'mastery', label: 'Overall Mastery', value: 75, x: 400, y: 300, color: '#4F46E5', size: 60, highlighted: true },
    { id: 'concepts', label: 'Concepts', value: 12, x: 200, y: 200, color: '#10B981', size: 50 },
    { id: 'practice', label: 'Sessions', value: 45, x: 600, y: 200, color: '#F59E0B', size: 50 },
  ];

  const progressEdges: Edge[] = [
    { id: 'e1', from: 'mastery', to: 'concepts', label: 'built on' },
    { id: 'e2', from: 'mastery', to: 'practice', label: 'earned by' },
  ];

  const progressViz: Visualization = {
    id: `progress_${Date.now()}`,
    type: 'graph',
    title: 'Learning Progress',
    data: {
      nodes: progressNodes,
      edges: progressEdges,
      annotations: [
        {
          id: 'streak',
          text: '7-day streak!',
          position: { x: 400, y: 100 },
          type: 'tip',
          pinned: true,
        },
      ],
    },
    config: {
      width: 800,
      height: 500,
      theme: 'light',
      animationSpeed: 'normal',
      showLabels: true,
      interactive: true,
      layout: 'force',
    },
    state: {
      currentStep: 0,
      totalSteps: 1,
      playing: false,
      speed: 1,
      paused: true,
      completed: false,
    },
    interactions: [],
  };

  return {
    overallMastery: 75,
    conceptProgress: [],
    learningVelocity: 0.8,
    streakDays: 7,
    visualization: progressViz,
  };
}
