import type {
  StudentKnowledgeGraph, ConceptId, LearningPath, ConceptNode,
  RecommendedProblem, ConceptMastery,
} from './types';

export const CONCEPT_DEPENDENCIES: Partial<Record<ConceptId, ConceptId[]>> = {
  sliding_window: ['two_pointer'],
  two_pointer: ['array_manipulation'],
  binary_search: ['array_manipulation', 'recursion'],
  dp: ['recursion', 'array_manipulation'],
  bfs: ['graph'],
  dfs: ['graph', 'recursion'],
  dijkstra: ['graph', 'heap'],
  mst: ['graph', 'greedy'],
  topological_sort: ['graph', 'dfs'],
  union_find: ['graph'],
  trie: ['tree'],
  segment_tree: ['tree', 'recursion'],
  fenwick_tree: ['tree', 'bit_manipulation'],
  string_matching: ['array_manipulation'],
  rolling_hash: ['string_matching', 'bit_manipulation'],
  bit_manipulation: [],
  math: [],
  geometry: [],
  array_manipulation: [],
  hash_map: ['array_manipulation'],
  stack: ['array_manipulation'],
  queue: ['array_manipulation'],
  heap: ['array_manipulation'],
  tree: ['recursion'],
  graph: ['array_manipulation'],
  recursion: [],
  backtracking: ['recursion'],
  greedy: [],
};

export function generateLearningPath(
  graph: StudentKnowledgeGraph,
  targetConcept?: ConceptId
): LearningPath {
  const currentWeakness = identifyPrimaryWeakness(graph);
  const focusConcept = targetConcept || currentWeakness;

  if (!focusConcept) {
    return {
      currentSkill: 'dp',
      nextConcepts: [],
      recommendedProblems: getAdvancedProblems(),
      estimatedTimeToMastery: 0,
    };
  }

  const nextConcepts = buildConceptProgression(graph, focusConcept);
  const recommendedProblems = recommendProblems(graph, focusConcept, nextConcepts);
  const estimatedTime = calculateMasteryTime(graph, focusConcept, nextConcepts);

  return {
    currentSkill: focusConcept,
    nextConcepts,
    recommendedProblems,
    estimatedTimeToMastery: estimatedTime,
  };
}

function identifyPrimaryWeakness(graph: StudentKnowledgeGraph): ConceptId | null {
  const concepts = Array.from(graph.concepts.values());

  const blockers = concepts.filter(c => {
    if (c.mastery >= 70) return false;
    return c.dependents.some(depId => {
      const dep = graph.concepts.get(depId);
      return dep && dep.practiceCount > 0;
    });
  });

  if (blockers.length > 0) {
    return blockers.sort((a, b) => a.mastery - b.mastery)[0].concept;
  }

  const practiced = concepts.filter(c => c.practiceCount > 0);
  const weak = practiced.sort((a, b) => a.mastery - b.mastery);

  const weakest = weak[0];
  if (!weakest || weakest.mastery >= 70) return null;

  return weakest.concept;
}

function buildConceptProgression(
  graph: StudentKnowledgeGraph,
  targetConcept: ConceptId
): ConceptNode[] {
  const nodes: ConceptNode[] = [];
  const visited = new Set<ConceptId>();

  function buildNode(conceptId: ConceptId): ConceptNode {
    if (visited.has(conceptId)) {
      return nodes.find(n => n.concept === conceptId)!;
    }

    visited.add(conceptId);
    const mastery = graph.concepts.get(conceptId);

    let status: ConceptNode['status'] = 'not_started';
    if (!mastery) {
      status = 'not_started';
    } else if (mastery.mastery >= 80) {
      status = 'mastered';
    } else if (mastery.practiceCount > 0) {
      status = 'learning';
    }

    const prereqs = CONCEPT_DEPENDENCIES[conceptId] || [];
    const unmasteredPrereqs = prereqs.filter(p => {
      const pMastery = graph.concepts.get(p);
      return !pMastery || pMastery.mastery < 70;
    });

    if (unmasteredPrereqs.length > 0 && status !== 'mastered') {
      status = 'blocked';
    }

    const actions: string[] = [];
    if (status === 'blocked') {
      actions.push('Review prerequisites first');
    }
    if (status === 'learning' && mastery) {
      if (mastery.mastery < 50) {
        actions.push('Practice more problems');
      } else {
        actions.push('Try harder problems to solidify');
      }
    }

    const node: ConceptNode = {
      concept: conceptId,
      mastery: mastery?.mastery || 0,
      prerequisites: prereqs,
      status,
      recommendedActions: actions,
    };

    nodes.push(node);
    return node;
  }

  buildNode(targetConcept);

  const queue = [targetConcept];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const prereqs = CONCEPT_DEPENDENCIES[current] || [];
    for (const prereq of prereqs) {
      if (!visited.has(prereq)) {
        buildNode(prereq);
        queue.push(prereq);
      }
    }
  }

  return nodes.sort((a, b) => {
    const order = { blocked: 0, not_started: 1, learning: 2, mastered: 3 };
    return order[a.status] - order[b.status];
  });
}

function recommendProblems(
  graph: StudentKnowledgeGraph,
  targetConcept: ConceptId,
  conceptNodes: ConceptNode[]
): RecommendedProblem[] {
  const recommendations: RecommendedProblem[] = [];

  const attempted = new Set(graph.problemHistory.map(p => p.problemId));

  const mastery = graph.concepts.get(targetConcept)?.mastery || 0;
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';

  if (mastery >= 70) difficulty = 'medium';
  if (mastery >= 85) difficulty = 'hard';

  const sampleProblems = getSampleProblemsForConcept(targetConcept, difficulty);

  for (const problem of sampleProblems) {
    if (attempted.has(problem.problemId)) continue;

    const priority = calculatePriority(graph, problem, conceptNodes);
    recommendations.push({
      ...problem,
      priority,
      reason: getRecommendationReason(graph, problem, conceptNodes),
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

function calculatePriority(
  graph: StudentKnowledgeGraph,
  problem: RecommendedProblem,
  conceptNodes: ConceptNode[]
): number {
  let priority = 0;

  for (const concept of problem.concepts) {
    const mastery = graph.concepts.get(concept)?.mastery || 0;
    priority += (100 - mastery) / 100;
  }

  const blockedConcepts = conceptNodes.filter(n => n.status === 'blocked');
  if (blockedConcepts.some(bc => problem.concepts.includes(bc.concept))) {
    priority += 2;
  }

  return priority;
}

function getRecommendationReason(
  graph: StudentKnowledgeGraph,
  problem: RecommendedProblem,
  conceptNodes: ConceptNode[]
): string {
  const weakestConcept = problem.concepts
    .map(c => ({ concept: c, mastery: graph.concepts.get(c)?.mastery || 0 }))
    .sort((a, b) => a.mastery - b.mastery)[0];

  if (weakestConcept.mastery < 50) {
    return `Builds foundational understanding of ${weakestConcept.concept}`;
  }

  return `Practices ${weakestConcept.concept} in context`;
}

function getSampleProblemsForConcept(
  concept: ConceptId,
  difficulty: 'easy' | 'medium' | 'hard'
): RecommendedProblem[] {
  const samples: Partial<Record<ConceptId, Record<string, RecommendedProblem[]>>> = {
    binary_search: {
      easy: [
        {
          problemId: '704',
          problemSlug: 'binary-search',
          title: 'Binary Search',
          difficulty: 'easy',
          concepts: ['binary_search'],
          reason: 'Classic binary search implementation',
          priority: 1,
          estimatedTime: 20,
        },
      ],
      medium: [
        {
          problemId: '34',
          problemSlug: 'find-first-and-last-position',
          title: 'Find First and Last Position',
          difficulty: 'medium',
          concepts: ['binary_search'],
          reason: 'Binary search with boundary handling',
          priority: 1,
          estimatedTime: 35,
        },
      ],
      hard: [],
    },
  };

  return samples[concept]?.[difficulty] || [];
}

function getAdvancedProblems(): RecommendedProblem[] {
  return [
    {
      problemId: '4',
      problemSlug: 'median-of-two-sorted-arrays',
      title: 'Median of Two Sorted Arrays',
      difficulty: 'hard',
      concepts: ['binary_search', 'recursion'],
      reason: 'Advanced binary search application',
      priority: 5,
      estimatedTime: 60,
    },
  ];
}

function calculateMasteryTime(
  graph: StudentKnowledgeGraph,
  concept: ConceptId,
  nodes: ConceptNode[]
): number {
  const mastery = graph.concepts.get(concept)?.mastery || 0;
  const remaining = 100 - mastery;

  let hours = (remaining / 10) * 2;

  const blockedNodes = nodes.filter(n => n.status === 'blocked');
  hours += blockedNodes.length * 3;

  return hours;
}
