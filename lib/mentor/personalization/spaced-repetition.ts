import type { ConceptMastery, ReviewSchedule, ConceptId } from './types';

const REVIEW_INTERVALS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
  6: 60,
  7: 90,
  8: 180,
};

export function calculateNextReview(
  mastery: ConceptMastery,
  recentPerformance: number
): Date {
  const baseInterval = REVIEW_INTERVALS[Math.min(Math.ceil(mastery.mastery / 12.5), 8)];
  const performanceFactor = 0.5 + recentPerformance;
  const difficultyFactor = 1 + (mastery.difficultyRating / 10);

  const intervalDays = Math.round(baseInterval * performanceFactor * difficultyFactor);
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  return nextReview;
}

export function getDueConcepts(
  concepts: Map<ConceptId, ConceptMastery>,
  maxCount: number = 5
): ConceptMastery[] {
  const now = new Date();
  return Array.from(concepts.values())
    .filter(concept => concept.nextReviewDue && concept.nextReviewDue <= now)
    .sort((a, b) => {
      const aOverdue = now.getTime() - (a.nextReviewDue?.getTime() || 0);
      const bOverdue = now.getTime() - (b.nextReviewDue?.getTime() || 0);
      return bOverdue - aOverdue;
    })
    .slice(0, maxCount);
}

export function getReviewSchedule(
  concepts: Map<ConceptId, ConceptMastery>
): ReviewSchedule[] {
  const now = new Date();
  return Array.from(concepts.values())
    .filter(c => c.practiceCount > 0)
    .map(c => {
      const overdue = c.nextReviewDue ? now.getTime() - c.nextReviewDue.getTime() : 0;
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (overdue > 0 || c.mastery < 50) priority = 'high';
      else if (c.mastery < 75) priority = 'medium';

      return {
        conceptId: c.concept,
        nextReviewDue: c.nextReviewDue || now,
        interval: Math.ceil(overdue / (1000 * 60 * 60 * 24)) || 1,
        difficulty: c.difficultyRating,
        priority,
      };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
}
