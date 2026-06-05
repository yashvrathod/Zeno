import type { InteractionType, InteractionLog, ConceptId } from '../personalization/types';

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
  if (metrics.totalInteractions === 0) return 0;

  let score = 0;

  const interactionTypes = Object.keys(metrics.interactionsByType).length;
  score += Math.min(interactionTypes * 10, 30);

  if (metrics.averageInteractionDuration > 5) {
    score += 20;
  }

  if (metrics.visualizationViews > 0) {
    score += Math.min(metrics.visualizationViews * 5, 20);
  }

  score += Math.min(metrics.conceptsExplored.size * 5, 30);

  const durationBonus = Math.min(sessionDuration / 300, 1) * 20;
  score += durationBonus;

  return Math.min(score, 100);
}
