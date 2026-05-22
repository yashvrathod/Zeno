export type {
  VisualizationType, Visualization, VisualizationData, VisualizationConfig, VisualizationState,
  Node, Edge, ArrayState, Pointer, Highlight, Annotation,
  InteractionType, InteractionLog, Interaction, InteractionHandler,
  AnimationSequence, AnimationStep,
} from './types';

export {
  generateVisualizationFromTrace,
  Visualizer,
} from './engine';

export {
  calculateEngagementScore,
} from './engagement';

export type {
  EngagementMetrics,
} from './engagement';

export {
  generateProgressVisualization,
} from './progress';

export type {
  ProgressVisualization, ConceptProgress,
} from './progress';

export {
  parseArrayRepresentation,
  extractRangeFromDescription,
  getColorForVariable,
} from './utils';
