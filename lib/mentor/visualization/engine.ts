import type { Visualization, InteractionType, InteractionHandler, Interaction, Highlight, Annotation, AnimationSequence, VisualizationType } from './types';
import type { ExecutionTrace } from '../enhancedDebuggingAssistant';
import type { ConceptId } from '../personalization/types';
import { generateArrayVisualization, generateBinarySearchVisualization } from './renderers/array';
import { generateStackQueueVisualization } from './renderers/stack-queue';
import { generateTreeVisualization, generateGraphVisualization } from './renderers/tree-graph';
import { generateDPTableVisualization, generateRecursionTreeVisualization } from './renderers/dp-recursion';

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
      layout: 'force',
    },
    state: {
      currentStep: 0,
      totalSteps: trace.step,
      playing: false,
      speed: 1,
      paused: true,
      completed: false,
    },
    interactions: [],
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

export class Visualizer {
  private visualization: Visualization;
  private animationSequence: AnimationSequence | null = null;
  private interactionHandlers: Map<string, InteractionHandler> = new Map();

  constructor(visualization: Visualization) {
    this.visualization = visualization;
    this.setupDefaultHandlers();
  }

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
      details,
    });

    this.logEngagement(type, details);
  }

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
        pulsating,
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

  addAnnotation(annotation: Omit<Annotation, 'id'>): void {
    const newAnnotation: Annotation = {
      ...annotation,
      id: `anno_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    this.visualization.data.annotations?.push(newAnnotation);
  }

  removeAnnotation(id: string): void {
    this.visualization.data.annotations = this.visualization.data.annotations?.filter(a => a.id !== id);
  }

  updateFromTrace(trace: ExecutionTrace): void {
    this.visualization.state.totalSteps = trace.step;
    this.updateVisualizationForStep();
  }

  getVisualization(): Visualization {
    return this.visualization;
  }

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

      await this.sleep(16);
    }
  }

  private executeStep(stepIndex: number): void {
    if (!this.animationSequence) return;

    const step = this.animationSequence.steps[stepIndex];
    if (!step) return;

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
    this.visualization.state.paused = true;
  }

  private resetVisualization(): void {
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
        type: 'info',
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
    console.log(`Engagement: ${type}`, details);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
