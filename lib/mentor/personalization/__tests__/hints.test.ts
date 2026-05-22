import { generatePersonalizedHint } from '../hints';
import type { StudentKnowledgeGraph, ConceptMastery, LearningStyle, ConceptId } from '../types';

function makeGraph(overrides: Partial<StudentKnowledgeGraph> = {}): StudentKnowledgeGraph {
  const concepts = new Map<ConceptId, ConceptMastery>();
  concepts.set('binary_search', {
    concept: 'binary_search', mastery: 30, lastPracticed: null, practiceCount: 2,
    successRate: 0.3, averageTimeToSolve: null, commonErrors: [], prerequisites: [],
    dependents: [], nextReviewDue: null, difficultyRating: 4, confidenceRating: 2,
  });

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
    ...overrides,
  };
}

describe('generatePersonalizedHint', () => {
  it('returns null when student has no weak concepts', () => {
    const strongGraph = makeGraph();
    strongGraph.concepts.set('binary_search', {
      concept: 'binary_search', mastery: 90, lastPracticed: null, practiceCount: 10,
      successRate: 0.9, averageTimeToSolve: null, commonErrors: [], prerequisites: [],
      dependents: [], nextReviewDue: null, difficultyRating: 2, confidenceRating: 5,
    });

    const hint = generatePersonalizedHint(
      { problemId: 'test', concepts: ['binary_search'], patterns: [], currentStage: 'IMPLEMENT' },
      strongGraph, 1 as any,
    );
    expect(hint).toBeNull();
  });

  it('generates hint targeting weakest concept', () => {
    const graph = makeGraph();
    const hint = generatePersonalizedHint(
      { problemId: 'test', concepts: ['binary_search'], patterns: [], currentStage: 'IMPLEMENT' },
      graph, 1 as any,
    );
    expect(hint).not.toBeNull();
    expect(hint!.conceptsTargeted).toContain('binary_search');
    expect(hint!.estimatedEffectiveness).toBeGreaterThan(0);
    expect(hint!.rationale).toContain('binary_search');
  });

  it('includes rationale with mastery percentage', () => {
    const graph = makeGraph();
    const hint = generatePersonalizedHint(
      { problemId: 'test', concepts: ['binary_search'], patterns: [], currentStage: 'IMPLEMENT' },
      graph, 1 as any,
    );
    expect(hint!.rationale).toContain('30%');
  });
});
