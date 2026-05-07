/**
 * Interactive Visualization & Engagement System
 *
 * Provides rich, interactive visualizations for DSA concepts with
 * user engagement tracking, progress visualization, and adaptive hints.
 */

import type { LearningRung, TeachingStage } from '../mentorContext';
import type { ConceptId } from './personalizationEngine';
import { ExecutionTrace, DataStructureState, VariableState } from './enhancedDebuggingAssistant';

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type VisualizationType =
  | 'array'
  | 'two_pointer'
  | 'sliding_window'
  | 'binary_search'
  | 'stack'
  | 'queue'
  | 'tree'
  | 'graph'
  | 'dp_table'
  | 'recursion_tree'
  | 'heap'
  | 'hash_map'
  | 'linked_list';

export interface Visualization {
  id: string;
  type: VisualizationType;
  title: string;
  data: VisualizationData;
  config: VisualizationConfig;
  state: VisualizationState;
  interactions: InteractionLog[];
}

export interface VisualizationData {
  nodes: Node[];
  edges?: Edge[];
  arrays?: ArrayState[];
  pointers?: Pointer[];
  highlights?: Highlight[];
  annotations?: Annotation[];
}

export interface Node {
  id: string;
  label: string;
  value?: string | number | null;
  x: number;
  y: number;
  color?: string;
  size?: number;
  highlighted?: boolean;
  pulsating?: boolean;
  metadata?: Record<string, any>;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
  label?: string;
  color?: string;
  animated?: boolean;
  weight?: number;
  directed?: boolean;
}

export interface ArrayState {
  id: string;
  values: Array<string | number | null>;
  pointers: Pointer[];
  highlights: Highlight[];
  label?: string;
}

export interface Pointer {
  id: string;
  name: string;
  index: number;
  color: string;
  label?: string;
  animated?: boolean;
}

export interface Highlight {
  type: 'index' | 'range' | 'value' | 'node' | 'edge';
  indices?: number[];
  range?: [number, number];
  value?: string | number;
  nodeId?: string;
  edgeId?: string;
  color: string;
  label?: string;
  pulsating?: boolean;
}

export interface Annotation {
  id: string;
  text: string;
  position: { x: number; y: number };
  type: 'info' | 'warning' | 'tip' | 'insight';
  pinned?: boolean;
}

export interface VisualizationConfig {
  width: number;
  height: number;
  theme: 'light' | 'dark';
  animationSpeed: 'slow' | 'normal' | 'fast';
  showLabels: boolean;
  interactive: boolean;
  maxNodes?: number;
  layout: 'force' | 'hierarchical' | 'grid' | 'circular' | 'linear';
}

export interface VisualizationState {
  currentStep: number;
  totalSteps: number;
  playing: boolean;
  speed: number;
  paused: boolean;
  completed: boolean;
}

export interface InteractionLog {
  timestamp: Date;
  type: InteractionType;
  details: Record<string, any>;
  duration?: number;
}

export type InteractionType =
  | 'hover_node'
  | 'click_node'
  | 'drag_node'
  | 'step_forward'
  | 'step_backward'
  | 'play_pause'
  | 'reset'
  | 'adjust_speed'
  | 'annotate'
  | 'highlight';

// ─────────────────────────────────────────────────────────────────────────────
// VISUALIZATION GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates visualization from execution trace
 */
export function generateVisualizationFromTrace(
  trace: ExecutionTrace,
  type: VisualizationType,
  problemContext: {
    problemId: string;
    title: string;
    concepts: ConceptId[];
  }
): Visualization {
  const baseVisualization: Visualization = {
    id: `viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title: problemContext.title,
    data: { nodes: [], arrays: [], pointers: [], highlights: [] },
    config: {
      width: 800,
      height: 600,
      theme: 'light',
      animationSpeed: 'normal',
      showLabels: true,
      interactive: true,
      layout: 'force'
    },
    state: {
      currentStep: 0,
      totalSteps: trace.step,
      playing: false,
      speed: 1,
      paused: true,
      completed: false
    },
    interactions: []
  };

  switch (type) {
    case 'array':
    case 'two_pointer':
    case 'sliding_window':
      return generateArrayVisualization(baseVisualization, trace);
    case 'binary_search':
      return generateBinarySearchVisualization(baseVisualization, trace);
    case 'stack':
    case 'queue':
      return generateStackQueueVisualization(baseVisualization, trace);
    case 'tree':
      return generateTreeVisualization(baseVisualization, trace);
    case 'graph':
      return generateGraphVisualization(baseVisualization, trace);
    case 'dp_table':
      return generateDPTableVisualization(baseVisualization, trace);
    case 'recursion_tree':
      return generateRecursionTreeVisualization(baseVisualization, trace);
    default:
      return baseVisualization;
  }
}

function generateArrayVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const arrayState = trace.dataStructures?.find(
    (ds: DataStructureState) => ds.type === 'array'
  );

  if (!arrayState) {
    return baseViz;
  }

  // Extract array values from representation
  const values = parseArrayRepresentation(arrayState.representation);

  // Create array visualization
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
    metadata: { index, value }
  }));

  // Add index labels
  const indexAnnotations: Annotation[] = values.map((_, index) => ({
    id: `index_${index}`,
    text: String(index),
    position: { x: startX + index * cellWidth + cellWidth / 2, y: startY + cellHeight + 20 },
    type: 'info',
    pinned: true
  }));

  // Add pointers from trace
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
          animated: variable.changed
        });

        highlights.push({
          type: 'index',
          indices: [index],
          color: getColorForVariable(variable.name),
          label: variable.name,
          pulsating: variable.changed
        });
      }
    }
  });

  // Add range highlights from data structure state
  arrayState.changes?.forEach(change => {
    if (change.description.includes('range') || change.description.includes('window')) {
      const range = extractRangeFromDescription(change.description);
      if (range) {
        highlights.push({
          type: 'range',
          range,
          color: '#10B981',
          label: change.description,
          pulsating: true
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
      annotations: indexAnnotations
    },
    config: {
      ...baseViz.config,
      width: Math.max(800, values.length * cellWidth + 100),
      height: 400
    }
  };
}

function generateBinarySearchVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  const viz = generateArrayVisualization(baseViz, trace);

  // Add binary search specific annotations
  const annotations: Annotation[] = [
    {
      id: 'bs_hint',
      text: 'Binary Search: Compare middle element with target',
      position: { x: 400, y: 100 },
      type: 'info',
      pinned: true
    }
  ];

  // Highlight mid pointer
  const midPointer = trace.variables.find(v => v.name === 'mid');
  if (midPointer) {
    const index = parseInt(midPointer.value);
    if (!isNaN(index)) {
      viz.data.highlights?.push({
        type: 'index',
        indices: [index],
        color: '#F59E0B',
        label: 'mid',
        pulsating: true
      });
    }
  }

  return {
    ...viz,
    data: {
      ...viz.data,
      annotations: [...(viz.data.annotations || []), ...annotations]
    }
  };
}

function generateStackQueueVisualization(
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
      metadata: { index, value, isTop }
    });
  });

  const annotations: Annotation[] = [
    {
      id: 'operation',
      text: ds.type === 'stack' ? 'LIFO - Last In, First Out' : 'FIFO - First In, First Out',
      position: { x: 400, y: 50 },
      type: 'info',
      pinned: true
    }
  ];

  if (values.length > 0) {
    annotations.push({
      id: 'top_label',
      text: ds.type === 'stack' ? 'Top' : 'Front',
      position: { x: 470, y: startY + (values.length - 1) * cellHeight + 25 },
      type: 'tip',
      pinned: true
    });
  }

  return {
    ...baseViz,
    data: {
      nodes,
      annotations
    },
    config: {
      ...baseViz.config,
      layout: 'hierarchical'
    }
  };
}

function generateTreeVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  // Sample tree structure - would be built from actual tree traversal
  const nodes: Node[] = [
    { id: 'root', label: 'Root', value: 10, x: 400, y: 50, color: '#4F46E5', size: 50, highlighted: true },
    { id: 'left', label: 'Left', value: 5, x: 200, y: 150, color: '#4F46E5', size: 40 },
    { id: 'right', label: 'Right', value: 15, x: 600, y: 150, color: '#4F46E5', size: 40 }
  ];

  const edges: Edge[] = [
    { id: 'e1', from: 'root', to: 'left', label: 'L', color: '#6B7280' },
    { id: 'e2', from: 'root', to: 'right', label: 'R', color: '#6B7280' }
  ];

  return {
    ...baseViz,
    data: { nodes, edges },
    config: {
      ...baseViz.config,
      layout: 'hierarchical'
    }
  };
}

function generateGraphVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  // Sample graph - would be built from adjacency list/matrix
  const nodes: Node[] = [
    { id: 'A', label: 'A', x: 400, y: 100, color: '#4F46E5', size: 45 },
    { id: 'B', label: 'B', x: 200, y: 200, color: '#4F46E5', size: 45 },
    { id: 'C', label: 'C', x: 600, y: 200, color: '#4F46E5', size: 45 },
    { id: 'D', label: 'D', x: 400, y: 300, color: '#4F46E5', size: 45 }
  ];

  const edges: Edge[] = [
    { id: 'e1', from: 'A', to: 'B', weight: 4 },
    { id: 'e2', from: 'A', to: 'C', weight: 2 },
    { id: 'e3', from: 'B', to: 'D', weight: 5 },
    { id: 'e4', from: 'C', to: 'D', weight: 1 }
  ];

  return {
    ...baseViz,
    data: { nodes, edges },
    config: {
      ...baseViz.config,
      layout: 'force'
    }
  };
}

function generateDPTableVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  // Sample DP table - would be built from actual DP state
  const rows = 5;
  const cols = 5;
  const cellSize = 40;
  const nodes: Node[] = [];

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const value = i === 0 || j === 0 ? 0 : i * j; // Example values
      nodes.push({
        id: `cell_${i}_${j}`,
        label: String(value),
        value,
        x: 100 + j * cellSize,
        y: 100 + i * cellSize,
        color: value > 0 ? '#4F46E5' : '#E5E7EB',
        size: 35,
        highlighted: i === rows - 1 && j === cols - 1,
        metadata: { row: i, col: j }
      });
    }
  }

  const annotations: Annotation[] = [
    {
      id: 'dp_hint',
      text: 'DP[i][j] = DP[i-1][j] + DP[i][j-1]',
      position: { x: 100, y: 50 },
      type: 'info',
      pinned: true
    }
  ];

  return {
    ...baseViz,
    data: { nodes, annotations },
    config: {
      ...baseViz.config,
      width: 400,
      height: 400,
      layout: 'grid'
    }
  };
}

function generateRecursionTreeVisualization(
  baseViz: Visualization,
  trace: ExecutionTrace
): Visualization {
  // Sample recursion tree
  const nodes: Node[] = [
    { id: 'f5', label: 'f(5)', x: 400, y: 50, color: '#4F46E5', size: 45 },
    { id: 'f4', label: 'f(4)', x: 250, y: 150, color: '#4F46E5', size: 40 },
    { id: 'f3', label: 'f(3)', x: 550, y: 150, color: '#4F46E5', size: 40 },
    { id: 'f2_1', label: 'f(2)', x: 150, y: 250, color: '#4F46E5', size: 35 },
    { id: 'f2_2', label: 'f(2)', x: 350, y: 250, color: '#4F46E5', size: 35 },
    { id: 'base1', label: 'base', x: 100, y: 350, color: '#10B981', size: 30 },
    { id: 'base2', label: 'base', x: 200, y: 350, color: '#10B981', size: 30 }
  ];

  const edges: Edge[] = [
    { id: 'e1', from: 'f5', to: 'f4', color: '#6B7280' },
    { id: 'e2', from: 'f5', to: 'f3', color: '#6B7280' },
    { id: 'e3', from: 'f4', to: 'f2_1', color: '#6B7280' },
    { id: 'e4', from: 'f4', to: 'f2_2', color: '#6B7280' },
    { id: 'e5', from: 'f2_1', to: 'base1', color: '#6B7280' },
    { id: 'e6', from: 'f2_1', to: 'base2', color: '#6B7280' }
  ];

  return {
    ...baseViz,
    data: { nodes, edges },
    config: {
      ...baseViz.config,
      layout: 'hierarchical'
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION & INTERACTION SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

export interface AnimationSequence {
  id: string;
  steps: AnimationStep[];
  currentStep: number;
  loop: boolean;
  autoPlay: boolean;
}

export interface AnimationStep {
  id: string;
  duration: number;
  changes: {
    nodes?: Partial<Node>[];
    edges?: Partial<Edge>[];
    highlights?: Highlight[];
    annotations?: Annotation[];
  };
  description?: string;
}

export type InteractionHandler = (interaction: Interaction, visualization: Visualization) => void;

export interface Interaction {
  type: InteractionType;
  target?: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

export class Visualizer {
  private visualization: Visualization;
  private animationSequence: AnimationSequence | null = null;
  private interactionHandlers: Map<string, InteractionHandler> = new Map();

  constructor(visualization: Visualization) {
    this.visualization = visualization;
    this.setupDefaultHandlers();
  }

  // ── Animation Control ──

  play(duration?: number): void {
    if (this.animationSequence) {
      this.visualization.state.playing = true;
      this.visualization.state.paused = false;
      this.executeAnimation(duration);
    }
  }

  pause(): void {
    this.visualization.state.playing = false;
    this.visualization.state.paused = true;
  }

  stop(): void {
    this.visualization.state.playing = false;
    this.visualization.state.paused = false;
    this.visualization.state.currentStep = 0;
    this.resetVisualization();
  }

  stepForward(): void {
    if (this.visualization.state.currentStep < this.visualization.state.totalSteps) {
      this.visualization.state.currentStep++;
      this.updateVisualizationForStep();
    }
  }

  stepBackward(): void {
    if (this.visualization.state.currentStep > 0) {
      this.visualization.state.currentStep--;
      this.updateVisualizationForStep();
    }
  }

  // ── Interaction Handling ──

  onInteraction(type: InteractionType, handler: InteractionHandler): void {
    this.interactionHandlers.set(type, handler);
  }

  triggerInteraction(type: InteractionType, details: Record<string, any>): void {
    const handler = this.interactionHandlers.get(type);
    if (handler) {
      handler({ type, details, timestamp: new Date() }, this.visualization);
    }

    this.visualization.interactions.push({
      timestamp: new Date(),
      type,
      details
    });

    this.logEngagement(type, details);
  }

  // ── Highlight Management ──

  highlightElements(
    elementIds: string[],
    options: {
      color?: string;
      pulsating?: boolean;
      label?: string;
      duration?: number;
    } = {}
  ): void {
    const { color = '#F59E0B', pulsating = true, label, duration } = options;

    elementIds.forEach(id => {
      const highlight: Highlight = {
        type: id.startsWith('cell_') ? 'index' : 'node',
        indices: id.startsWith('cell_') ? [parseInt(id.split('_')[1])] : undefined,
        nodeId: !id.startsWith('cell_') ? id : undefined,
        color,
        label,
        pulsating
      };

      this.visualization.data.highlights?.push(highlight);

      if (duration) {
        setTimeout(() => {
          const index = this.visualization.data.highlights?.findIndex(h => h === highlight);
          if (index !== undefined && index !== -1) {
            this.visualization.data.highlights?.splice(index, 1);
          }
        }, duration);
      }
    });
  }

  clearHighlights(): void {
    this.visualization.data.highlights = [];
  }

  // ── Annotation Management ──

  addAnnotation(annotation: Omit<Annotation, 'id'>): void {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `anno_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    this.visualization.data.annotations?.push(newAnnotation);
  }

  removeAnnotation(id: string): void {
    this.visualization.data.annotations = this.visualization.data.annotations?.filter(a => a.id !== id);
  }

  // ── State Updates ──

  updateFromTrace(trace: ExecutionTrace): void {
    this.visualization.state.totalSteps = trace.step;
    this.updateVisualizationForStep();
  }

  // ── Private Methods ──

  private setupDefaultHandlers(): void {
    this.interactionHandlers.set('hover_node', this.handleHoverNode);
    this.interactionHandlers.set('click_node', this.handleClickNode);
    this.interactionHandlers.set('step_forward', this.handleStepForward);
    this.interactionHandlers.set('step_backward', this.handleStepBackward);
    this.interactionHandlers.set('play_pause', this.handlePlayPause);
  }

  private async executeAnimation(duration?: number): Promise<void> {
    if (!this.animationSequence) return;

    const startTime = Date.now();
    const targetDuration = duration || this.animationSequence.steps.reduce((sum, step) => sum + step.duration, 0);

    while (this.visualization.state.playing) {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % targetDuration) / targetDuration;

      const currentStepIndex = Math.floor(progress * this.animationSequence!.steps.length);
      this.executeStep(currentStepIndex);

      await this.sleep(16); // ~60fps
    }
  }

  private executeStep(stepIndex: number): void {
    if (!this.animationSequence) return;

    const step = this.animationSequence.steps[stepIndex];
    if (!step) return;

    // Apply changes
    if (step.changes.nodes) {
      step.changes.nodes.forEach(nodeUpdate => {
        const node = this.visualization.data.nodes.find(n => n.id === nodeUpdate.id);
        if (node) {
          Object.assign(node, nodeUpdate);
        }
      });
    }

    if (step.changes.highlights) {
      this.visualization.data.highlights = step.changes.highlights;
    }

    this.visualization.state.currentStep = stepIndex + 1;
  }

  private updateVisualizationForStep(): void {
    // In a real implementation, this would update based on the execution trace
    // For now, we'll just mark it as needing update
    this.visualization.state.paused = true;
  }

  private resetVisualization(): void {
    // Reset to initial state
    this.clearHighlights();
  }

  private handleHoverNode = (details: Record<string, any>): void => {
    const nodeId = details.nodeId;
    if (nodeId) {
      this.highlightElements([nodeId], { color: '#3B82F6', pulsating: false });
    }
  };

  private handleClickNode = (details: Record<string, any>): void => {
    const nodeId = details.nodeId;
    if (nodeId) {
      this.addAnnotation({
        text: `Node: ${nodeId}`,
        position: { x: details.x, y: details.y - 30 },
        type: 'info'
      });
    }
  };

  private handleStepForward = (): void => {
    this.stepForward();
  };

  private handleStepBackward = (): void => {
    this.stepBackward();
  };

  private handlePlayPause = (): void => {
    if (this.visualization.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  };

  private logEngagement(type: InteractionType, details: Record<string, any>): void {
    // Log to analytics
    console.log(`Engagement: ${type}`, details);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGAGEMENT METRICS
// ─────────────────────────────────────────────────────────────────────────────

export interface EngagementMetrics {
  totalInteractions: number;
  interactionsByType: Record<InteractionType, number>;
  averageInteractionDuration: number;
  visualizationViews: number;
  animationPlays: number;
  annotationCreates: number;
  hintsViewed: number;
  conceptsExplored: Set<ConceptId>;
  engagementScore: number;
}

export function calculateEngagementScore(
  metrics: EngagementMetrics,
  sessionDuration: number
): number {
  let score = 0;

  // Interaction diversity bonus
  const interactionTypes = Object.keys(metrics.interactionsByType).length;
  score += Math.min(interactionTypes * 10, 30);

  // Active engagement bonus
  if (metrics.averageInteractionDuration > 5) {
    score += 20;
  }

  // Visualization exploration bonus
  if (metrics.visualizationViews > 0) {
    score += Math.min(metrics.visualizationViews * 5, 20);
  }

  // Concept exploration bonus
  score += Math.min(metrics.conceptsExplored.size * 5, 30);

  // Normalize by session duration (encourage sustained engagement)
  const durationBonus = Math.min(sessionDuration / 300, 1) * 20; // Max 20 for 5+ min
  score += durationBonus;

  return Math.min(score, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS VISUALIZATION
// ─────────────────────────────────────────────────────────────────────────────

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
  graph: any, // StudentKnowledgeGraph from personalization engine
  sessionHistory: any[]
): ProgressVisualization {
  // This would integrate with the personalization engine
  // For now, return a sample visualization
  const progressNodes: Node[] = [
    { id: 'mastery', label: 'Overall Mastery', value: 75, x: 400, y: 300, color: '#4F46E5', size: 60, highlighted: true },
    { id: 'concepts', label: 'Concepts', value: 12, x: 200, y: 200, color: '#10B981', size: 50 },
    { id: 'practice', label: 'Sessions', value: 45, x: 600, y: 200, color: '#F59E0B', size: 50 }
  ];

  const progressEdges: Edge[] = [
    { id: 'e1', from: 'mastery', to: 'concepts', label: 'built on' },
    { id: 'e2', from: 'mastery', to: 'practice', label: 'earned by' }
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
          text: '7-day streak! 🔥',
          position: { x: 400, y: 100 },
          type: 'tip',
          pinned: true
        }
      ]
    },
    config: {
      width: 800,
      height: 500,
      theme: 'light',
      animationSpeed: 'normal',
      showLabels: true,
      interactive: true,
      layout: 'force'
    },
    state: {
      currentStep: 0,
      totalSteps: 1,
      playing: false,
      speed: 1,
      paused: true,
      completed: false
    },
    interactions: []
  };

  return {
    overallMastery: 75,
    conceptProgress: [],
    learningVelocity: 0.8,
    streakDays: 7,
    visualization: progressViz
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function parseArrayRepresentation(representation: string): (string | number | null)[] {
  // Simple parser for array-like strings
  const match = representation.match(/\[(.*?)\]/);
  if (!match) return [];

  return match[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s)
    .map(s => {
      const num = parseFloat(s);
      return isNaN(num) ? s : num;
    });
}

function extractRangeFromDescription(description: string): [number, number] | null {
  const rangeMatch = description.match(/\[(\d+),\s*(\d+)\]/);
  if (rangeMatch) {
    return [parseInt(rangeMatch[1]), parseInt(rangeMatch[2])];
  }
  return null;
}

function getColorForVariable(name: string): string {
  const colors: Record<string, string> = {
    left: '#3B82F6',
    right: '#EF4444',
    mid: '#10B981',
    i: '#F59E0B',
    j: '#8B5CF6',
    start: '#3B82F6',
    end: '#EF4444',
    low: '#3B82F6',
    high: '#EF4444',
    slow: '#3B82F6',
    fast: '#EF4444'
  };
  return colors[name] || '#6B7280';
}

// ─────────────────────────────────────────────────────────────────────────────
// END OF FILE
// ─────────────────────────────────────────────────────────────────────────────
