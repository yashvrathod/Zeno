import { calculateNextReview, getDueConcepts, getReviewSchedule } from '../spaced-repetition';
import type { ConceptMastery, ConceptId } from '../types';

function makeConcept(overrides: Partial<ConceptMastery> & { concept: ConceptId }): ConceptMastery {
  return {
    mastery: 50,
    lastPracticed: null,
    practiceCount: 1,
    successRate: 0.5,
    averageTimeToSolve: null,
    commonErrors: [],
    prerequisites: [],
    dependents: [],
    nextReviewDue: null,
    difficultyRating: 3,
    confidenceRating: 3,
    ...overrides,
  };
}

describe('calculateNextReview', () => {
  it('returns a future date for a concept with low mastery', () => {
    const mastery = makeConcept({ concept: 'binary_search', mastery: 30, difficultyRating: 3 });
    const result = calculateNextReview(mastery, 0.5);
    expect(result.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns farther future for higher mastery', () => {
    const low = makeConcept({ concept: 'binary_search', mastery: 25, difficultyRating: 3 });
    const high = makeConcept({ concept: 'binary_search', mastery: 80, difficultyRating: 3 });
    const lowNext = calculateNextReview(low, 0.5);
    const highNext = calculateNextReview(high, 0.5);
    expect(highNext.getTime()).toBeGreaterThan(lowNext.getTime());
  });
});

describe('getDueConcepts', () => {
  it('returns empty array when no concepts are due', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const concepts = new Map<ConceptId, ConceptMastery>([
      ['binary_search', makeConcept({ concept: 'binary_search', mastery: 80, practiceCount: 5, nextReviewDue: future })],
    ]);
    expect(getDueConcepts(concepts)).toHaveLength(0);
  });

  it('returns concepts with past due dates', () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    const concepts = new Map<ConceptId, ConceptMastery>([
      ['binary_search', makeConcept({ concept: 'binary_search', mastery: 80, practiceCount: 5, nextReviewDue: past })],
    ]);
    const due = getDueConcepts(concepts);
    expect(due).toHaveLength(1);
    expect(due[0].concept).toBe('binary_search');
  });
});

describe('getReviewSchedule', () => {
  it('returns sorted schedule with high priority first', () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    const concepts = new Map<ConceptId, ConceptMastery>([
      ['binary_search', makeConcept({ concept: 'binary_search', mastery: 80, practiceCount: 5, nextReviewDue: past })],
      ['two_pointer', makeConcept({ concept: 'two_pointer', mastery: 40, practiceCount: 3, nextReviewDue: null })],
    ]);
    const schedule = getReviewSchedule(concepts);
    expect(schedule.length).toBeGreaterThan(0);
  });
});
