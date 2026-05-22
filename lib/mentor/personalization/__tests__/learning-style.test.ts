import { updateLearningStyle, calculateOverallMastery, getWeakestConcepts, getStrongestConcepts } from '../learning-style';
import type { StudentKnowledgeGraph, ConceptMastery, ConceptId } from '../types';

function makeGraph(withConcepts: boolean = true): StudentKnowledgeGraph {
  const concepts = new Map<ConceptId, ConceptMastery>();
  if (withConcepts) {
    concepts.set('binary_search', {
      concept: 'binary_search', mastery: 80, lastPracticed: new Date(), practiceCount: 10,
      successRate: 0.8, averageTimeToSolve: 120, commonErrors: [], prerequisites: [],
      dependents: [], nextReviewDue: null, difficultyRating: 2, confidenceRating: 4,
    });
    concepts.set('two_pointer', {
      concept: 'two_pointer', mastery: 30, lastPracticed: new Date(), practiceCount: 3,
      successRate: 0.3, averageTimeToSolve: 300, commonErrors: [], prerequisites: [],
      dependents: [], nextReviewDue: null, difficultyRating: 4, confidenceRating: 2,
    });
  }

  return {
    userId: 'test',
    concepts,
    patterns: new Map(),
    learningStyle: {
      prefersVisual: false, prefersExamples: false, prefersTheory: false,
      learnsByDoing: false, needsStepByStep: false, prefersAnalogy: false,
      hintLevelPreference: 1, explanationDensity: 'detailed', feedbackTiming: 'immediate',
    },
    misconceptions: [], strengths: [], weaknesses: [], learningTrajectory: [], problemHistory: [],
  };
}

describe('updateLearningStyle', () => {
  it('adjusts hint preference upward when hint was ineffective', () => {
    const graph = makeGraph();
    const updated = updateLearningStyle(graph, {
      hintLevelUsed: 1, hintEffective: false, responseType: 'text',
      timeToUnderstand: 60, askedForMoreExamples: false,
    });
    expect(updated.hintLevelPreference).toBe(2);
  });

  it('keeps hint preference when effective', () => {
    const graph = makeGraph();
    const updated = updateLearningStyle(graph, {
      hintLevelUsed: 1, hintEffective: true, responseType: 'text',
      timeToUnderstand: 20, askedForMoreExamples: false,
    });
    expect(updated.hintLevelPreference).toBe(1);
  });

  it('sets visual preference when visual response fast', () => {
    const graph = makeGraph();
    const updated = updateLearningStyle(graph, {
      hintLevelUsed: 1, hintEffective: true, responseType: 'visual',
      timeToUnderstand: 30, askedForMoreExamples: false,
    });
    expect(updated.prefersVisual).toBe(true);
  });
});

describe('calculateOverallMastery', () => {
  it('averages all concept masteries', () => {
    const graph = makeGraph();
    const mastery = calculateOverallMastery(graph);
    expect(mastery).toBe(55); // (80 + 30) / 2
  });

  it('returns 0 when no concepts', () => {
    const graph = makeGraph(false);
    expect(calculateOverallMastery(graph)).toBe(0);
  });
});

describe('getWeakestConcepts', () => {
  it('returns lowest mastery concepts first', () => {
    const graph = makeGraph();
    const weak = getWeakestConcepts(graph, 2);
    expect(weak[0].mastery).toBe(30);
    expect(weak[1].mastery).toBe(80);
  });
});

describe('getStrongestConcepts', () => {
  it('returns highest mastery concepts first', () => {
    const graph = makeGraph();
    const strong = getStrongestConcepts(graph, 2);
    expect(strong[0].mastery).toBe(80);
    expect(strong[1].mastery).toBe(30);
  });
});
