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
