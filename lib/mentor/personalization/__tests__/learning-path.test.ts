import { generateLearningPath, CONCEPT_DEPENDENCIES } from '../learning-path';
import type { StudentKnowledgeGraph, ConceptMastery, ConceptId } from '../types';

function makeGraph(overrides: Partial<StudentKnowledgeGraph> = {}): StudentKnowledgeGraph {
  const concepts = new Map<ConceptId, ConceptMastery>();
  concepts.set('binary_search', {
    concept: 'binary_search', mastery: 50, lastPracticed: null, practiceCount: 3,
    successRate: 0.5, averageTimeToSolve: null, commonErrors: [], prerequisites: ['array_manipulation'],
    dependents: [], nextReviewDue: null, difficultyRating: 3, confidenceRating: 3,
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

describe('generateLearningPath', () => {
  it('returns a learning path for a concept in progress', () => {
    const graph = makeGraph();
    const path = generateLearningPath(graph, 'binary_search');
    expect(path.currentSkill).toBe('binary_search');
    expect(path.estimatedTimeToMastery).toBeGreaterThan(0);
  });

  it('returns advanced problems when all concepts mastered', () => {
    const graph = makeGraph();
    graph.concepts.set('binary_search', {
      concept: 'binary_search', mastery: 100, lastPracticed: new Date(), practiceCount: 20,
      successRate: 1, averageTimeToSolve: 120, commonErrors: [],
      prerequisites: [], dependents: [], nextReviewDue: new Date(),
      difficultyRating: 1, confidenceRating: 5,
    });
    const path = generateLearningPath(graph);
    expect(path.recommendedProblems.length).toBeGreaterThan(0);
  });

  it('identifies blocked concepts from dependencies', () => {
    const graph = makeGraph();
    graph.concepts.set('sliding_window', {
      concept: 'sliding_window', mastery: 20, lastPracticed: null, practiceCount: 1,
      successRate: 0.2, averageTimeToSolve: null, commonErrors: [],
      prerequisites: ['two_pointer'], dependents: [], nextReviewDue: null,
      difficultyRating: 4, confidenceRating: 2,
    });
    const path = generateLearningPath(graph, 'sliding_window');
    const blocked = path.nextConcepts.filter(n => n.status === 'blocked');
    expect(blocked.length).toBeGreaterThan(0);
  });
});

describe('CONCEPT_DEPENDENCIES', () => {
  it('has expected dependency chains', () => {
    expect(CONCEPT_DEPENDENCIES.sliding_window).toContain('two_pointer');
    expect(CONCEPT_DEPENDENCIES.binary_search).toContain('array_manipulation');
    expect(CONCEPT_DEPENDENCIES.dp).toContain('recursion');
  });
});
