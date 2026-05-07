/**
 * Student Personalization Engine
 *
 * Tracks individual student knowledge, learning patterns, and preferences
 * to generate personalized hints, explanations, and learning paths.
 */

import prisma from '@/lib/prisma';
import type { TeachingStage, LearningRung } from '../mentorContext';

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE GRAPH TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ConceptId =
  | 'binary_search'
  | 'two_pointer'
  | 'sliding_window'
  | 'hash_map'
  | 'stack'
  | 'queue'
  | 'heap'
  | 'dfs'
  | 'bfs'
  | 'union_find'
  | 'trie'
  | 'segment_tree'
  | 'fenwick_tree'
  | 'dp'
  | 'recursion'
  | 'backtracking'
  | 'greedy'
  | 'graph'
  | 'tree'
  | 'topological_sort'
  | 'dijkstra'
  | 'mst'
  | 'string_matching'
  | 'rolling_hash'
  | 'bit_manipulation'
  | 'math'
  | 'geometry'
  | 'array_manipulation';

export interface ConceptMastery {
  concept: ConceptId;
  mastery: number; // 0-100
  lastPracticed: Date | null;
  practiceCount: number;
  successRate: number; // 0-1
  averageTimeToSolve: number | null; // seconds
  commonErrors: ErrorPattern[];
  prerequisites: ConceptId[];
  dependents: ConceptId[];
  nextReviewDue: Date | null;
  difficultyRating: number; // 1-5, student's perceived difficulty
  confidenceRating: number; // 1-5, student's self-rated confidence
}

export interface ErrorPattern {
  type: ErrorType;
  message: string;
  occurrences: number;
  lastSeen: Date;
  relatedConcept: ConceptId | null;
}

export type ErrorType =
  | 'off_by_one'
  | 'index_out_of_bounds'
  | 'null_pointer'
  | 'infinite_loop'
  | 'wrong_termination'
  | 'state_not_reset'
  | 'edge_case_missed'
  | 'wrong_algorithm'
  | 'implementation_error'
  | 'logic_error';

export interface LearningPattern {
  pattern: PatternType;
  strength: number; // 0-1, how well student uses this pattern
  lastUsed: Date | null;
  successRate: number;
  preferredContext: string[];
}

export type PatternType =
  | 'sliding_window'
  | 'two_pointer'
  | 'binary_search'
  | 'dp_tabulation'
  | 'dp_memoization'
  | 'bfs'
  | 'dfs'
  | 'greedy'
  | 'divide_conquer'
  | 'backtracking';

export interface LearningStyle {
  prefersVisual: boolean;
  prefersExamples: boolean;
  prefersTheory: boolean;
  learnsByDoing: boolean;
  needsStepByStep: boolean;
  prefersAnalogy: boolean;
  hintLevelPreference: 0 | 1 | 2 | 3; // Which hint level is most effective
  explanationDensity: 'concise' | 'detailed' | 'comprehensive';
  feedbackTiming: 'immediate' | 'delayed' | 'on_request';
}

export interface StudentKnowledgeGraph {
  userId: string;
  concepts: Map<ConceptId, ConceptMastery>;
  patterns: Map<PatternType, LearningPattern>;
  learningStyle: LearningStyle;
  misconceptions: Misconception[];
  strengths: ConceptId[];
  weaknesses: ConceptId[];
  learningTrajectory: TrajectoryPoint[];
  problemHistory: ProblemAttempt[];
}

export interface Misconception {
  concept: ConceptId;
  description: string;
  detectedDate: Date;
  corrected: boolean;
  correctionDate: Date | null;
  relatedProblems: string[];
}

export interface TrajectoryPoint {
  date: Date;
  overallMastery: number;
  conceptsMastered: number;
  problemsSolved: number;
  avgTimeToSolve: number;
}

export interface ProblemAttempt {
  problemId: string;
  problemSlug: string;
  concepts: ConceptId[];
  patterns: PatternType[];
  attempts: number;
  solved: boolean;
  timeSpent: number; // seconds
  firstAttemptSuccess: boolean;
  hintCount: number;
  stageReached: TeachingStage;
  rungReached: LearningRung;
  date: Date;
  errors: AttemptError[];
}

export interface AttemptError {
  type: ErrorType;
  message: string;
  line?: number;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPACED REPETITION SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────

export interface ReviewSchedule {
  conceptId: ConceptId;
  nextReviewDue: Date;
  interval: number; // days
  difficulty: number;
  priority: 'high' | 'medium' | 'low';
}

const REVIEW_INTERVALS: Record<number, number> = {
  1: 1,      // 1 day
  2: 3,      // 3 days
  3: 7,      // 1 week
  4: 14,     // 2 weeks
  5: 30,     // 1 month
  6: 60,     // 2 months
  7: 90,     // 3 months
  8: 180,    // 6 months
};

/**
 * Calculates next review date using spaced repetition algorithm
 */
export function calculateNextReview(
  mastery: ConceptMastery,
  recentPerformance: number // 0-1, success rate in last 5 attempts
): Date {
  const baseInterval = REVIEW_INTERVALS[Math.min(Math.ceil(mastery.mastery / 12.5), 8)];
  const performanceFactor = 0.5 + recentPerformance; // 0.5 to 1.5
  const difficultyFactor = 1 + (mastery.difficultyRating / 10);

  const intervalDays = Math.round(baseInterval * performanceFactor * difficultyFactor);
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + intervalDays);

  return nextReview;
}

/**
 * Gets due concepts for review
 */
export function getDueConcepts(
  graph: StudentKnowledgeGraph,
  maxCount: number = 5
): ConceptMastery[] {
  const now = new Date();
  const due = Array.from(graph.concepts.values())
    .filter(concept => concept.nextReviewDue && concept.nextReviewDue <= now)
    .sort((a, b) => {
      // Prioritize by: overdue time, difficulty, importance
      const aOverdue = now.getTime() - (a.nextReviewDue?.getTime() || 0);
      const bOverdue = now.getTime() - (b.nextReviewDue?.getTime() || 0);
      return bOverdue - aOverdue;
    })
    .slice(0, maxCount);

  return due;
}

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALIZED HINT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export interface PersonalizedHint {
  level: 0 | 1 | 2 | 3;
  content: string;
  modality: 'text' | 'visual' | 'interactive' | 'analogy';
  conceptsTargeted: ConceptId[];
  estimatedEffectiveness: number; // 0-1
  rationale: string;
}

/**
 * Generates personalized hint based on student profile
 */
export function generatePersonalizedHint(
  problemContext: {
    problemId: string;
    concepts: ConceptId[];
    patterns: PatternType[];
    currentStage: TeachingStage;
  },
  studentGraph: StudentKnowledgeGraph,
  currentRung: LearningRung
): PersonalizedHint | null {
  const { concepts, patterns, currentStage } = problemContext;

  // Identify weakest relevant concepts
  const weakConcepts = concepts
    .map(c => studentGraph.concepts.get(c))
    .filter((c): c is ConceptMastery => c != null)
    .filter(c => c.mastery < 70)
    .sort((a, b) => a.mastery - b.mastery);

  if (weakConcepts.length === 0) return null;

  const weakest = weakConcepts[0];
  const hintLevel = determineHintLevel(studentGraph, currentRung, weakest.mastery);
  const modality = determineModality(studentGraph.learningStyle, currentStage);

  const hint = craftHint(weakest, hintLevel, modality, studentGraph.learningStyle);

  return {
    level: hintLevel,
    content: hint,
    modality,
    conceptsTargeted: [weakest.concept],
    estimatedEffectiveness: calculateEffectiveness(studentGraph, weakest, hintLevel),
    rationale: `Targeting ${weakest.concept} (mastery: ${weakest.mastery}%) with ${modality} hint at level ${hintLevel}`
  };
}

/**
 * Determines appropriate hint level
 */
function determineHintLevel(
  graph: StudentKnowledgeGraph,
  rung: LearningRung,
  conceptMastery: number
): 0 | 1 | 2 | 3 {
  // Consider student's hint preference
  const preferredLevel = graph.learningStyle.hintLevelPreference;

  // Adjust based on concept mastery
  if (conceptMastery < 30) return Math.min(3, preferredLevel + 1) as 0 | 1 | 2 | 3;
  if (conceptMastery < 50) return preferredLevel;
  if (conceptMastery < 70) return Math.max(0, preferredLevel - 1) as 0 | 1 | 2 | 3;

  return Math.max(0, preferredLevel - 2) as 0 | 1 | 2 | 3;
}

/**
 * Determines best modality for hint delivery
 */
function determineModality(
  style: LearningStyle,
  stage: TeachingStage
): 'text' | 'visual' | 'interactive' | 'analogy' {
  if (stage === 'DEBUG' && style.prefersVisual) return 'visual';
  if (style.learnsByDoing) return 'interactive';
  if (style.prefersAnalogy) return 'analogy';
  return 'text';
}

const conceptHints: Partial<Record<ConceptId, string[]>> = {
  binary_search: [
    'Remember: binary search requires a sorted array and a way to eliminate half the search space each step.',
    'Think about what condition lets you discard the left half vs the right half.',
    'The key is the comparison at mid - what does it tell you about where the target must be?',
    `To implement: set left=0, right=n-1. While left<=right: mid=(left+right)/2. If arr[mid]==target, done. If arr[mid]<target, left=mid+1. Else right=mid-1.`,
  ],
  two_pointer: [
    'Two pointers often work when you need to compare elements from different positions.',
    'Consider what happens when you move each pointer - which direction improves your situation?',
    'The key insight: what invariant is maintained as pointers move?',
    'Start both pointers at strategic positions. Move the one that brings you closer to the goal.',
  ],
  sliding_window: [
    'Sliding window helps when you need to find optimal subarrays/strings.',
    'Think: what makes a window valid? How do you know when to expand vs shrink?',
    'The window represents a candidate solution. Expand to explore, shrink to optimize.',
    'Maintain: what to track in the window (sum, count, etc.) and how to update it efficiently.',
  ],
  dp: [
    'Dynamic programming = optimal substructure + overlapping subproblems.',
    'First: what state represents the subproblem? (This is crucial!)',
    'Second: how do smaller subproblems combine to solve larger ones?',
    'Start with recursion, add memoization, then convert to bottom-up if needed.',
  ],
  hash_map: [
    'Hash maps trade space for time - O(1) lookups enable O(n) solutions.',
    'Ask: what do I need to look up quickly? What will be the key vs value?',
    'Common pattern: store seen elements, check for complement, count frequencies.',
    'Remember to handle collisions (though most languages do this automatically).',
  ],
};

const conceptAnalogies: Partial<Record<ConceptId, string>> = {
  binary_search: 'Like looking up a word in a dictionary - you open to the middle, see if your word comes before or after, and eliminate half the pages.',
  hash_map: 'Like a real dictionary or phone book - you can instantly find any entry if you know its key (the word/name).',
  two_pointer: 'Like two people starting at opposite ends of a hallway and walking toward each other - they meet in the middle.',
  sliding_window: 'Like looking through a fixed-size frame at a painting - you can slide it around to see different parts.',
  dp: 'Like climbing stairs - to reach step n, you must first reach steps n-1 and n-2 (Fibonacci). Each step builds on previous ones.',
};

/**
 * Crafts personalized hint content
 */
function craftHint(
  concept: ConceptMastery,
  level: 0 | 1 | 2 | 3,
  modality: 'text' | 'visual' | 'interactive' | 'analogy',
  style: LearningStyle
): string {

  const hints = conceptHints[concept.concept] || [
    `For ${concept.concept}: think about what makes this technique work.`,
    `The key insight for ${concept.concept} is understanding its core property.`,
    `To implement ${concept.concept}, focus on the state you need to maintain.`,
    `Remember: ${concept.concept} works because of its fundamental characteristic.`,
  ];

  let hint = hints[Math.min(level, hints.length - 1)];

  // Add learning-style adaptation
  if (modality === 'analogy' && style.prefersAnalogy) {
    const analogy = conceptAnalogies[concept.concept];
    if (analogy) {
      hint = `Analogy: ${analogy}\n\n${hint}`;
    }
  }

  if (style.prefersVisual && modality !== 'visual') {
    hint = `Visual tip: [imagine a diagram here showing ${concept.concept}]\n\n${hint}`;
  }

  return hint;
}

/**
 * Calculates estimated hint effectiveness
 */
function calculateEffectiveness(
  graph: StudentKnowledgeGraph,
  concept: ConceptMastery,
  hintLevel: number
): number {
  let effectiveness = 0.5;

  // Adjust based on hint level appropriateness
  const levelDiff = Math.abs(hintLevel - graph.learningStyle.hintLevelPreference);
  effectiveness -= levelDiff * 0.1;

  // Adjust based on concept difficulty
  effectiveness += (100 - concept.mastery) / 200;

  // Adjust based on learning style match
  if (graph.learningStyle.prefersVisual) effectiveness += 0.1;
  if (graph.learningStyle.learnsByDoing) effectiveness += 0.1;

  return Math.max(0.1, Math.min(0.95, effectiveness));
}

// ─────────────────────────────────────────────────────────────────────────────
// LEARNING STYLE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects and updates learning style based on interactions
 */
export function updateLearningStyle(
  graph: StudentKnowledgeGraph,
  interaction: {
    hintLevelUsed: 0 | 1 | 2 | 3;
    hintEffective: boolean;
    responseType: 'visual' | 'text' | 'analogy' | 'interactive';
    timeToUnderstand: number; // seconds
    askedForMoreExamples: boolean;
  }
): LearningStyle {
  const style = { ...graph.learningStyle };

  // Update hint level preference based on effectiveness
  if (interaction.hintEffective) {
    // Current level worked well
    style.hintLevelPreference = interaction.hintLevelUsed;
  } else {
    // Try different level next time
    style.hintLevelPreference = Math.min(3, interaction.hintLevelUsed + 1) as 0 | 1 | 2 | 3;
  }

  // Update modality preferences
  if (interaction.responseType === 'visual' && interaction.timeToUnderstand < 60) {
    style.prefersVisual = true;
  }

  if (interaction.askedForMoreExamples) {
    style.prefersExamples = true;
  }

  if (interaction.timeToUnderstand < 30) {
    style.explanationDensity = 'concise';
  } else if (interaction.timeToUnderstand < 120) {
    style.explanationDensity = 'detailed';
  } else {
    style.explanationDensity = 'comprehensive';
  }

  return style;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEARNING PATH GENERATION
// ─────────────────────────────────────────────────────────────────────────────

export interface LearningPath {
  currentSkill: ConceptId;
  nextConcepts: ConceptNode[];
  recommendedProblems: RecommendedProblem[];
  estimatedTimeToMastery: number; // hours
}

export interface ConceptNode {
  concept: ConceptId;
  mastery: number;
  prerequisites: ConceptId[];
  status: 'mastered' | 'learning' | 'not_started' | 'blocked';
  recommendedActions: string[];
}

export interface RecommendedProblem {
  problemId: string;
  problemSlug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  concepts: ConceptId[];
  reason: string;
  priority: number;
  estimatedTime: number; // minutes
}

/**
 * Generates personalized learning path
 */
export function generateLearningPath(
  graph: StudentKnowledgeGraph,
  targetConcept?: ConceptId
): LearningPath {
  const currentWeakness = identifyPrimaryWeakness(graph);
  const focusConcept = targetConcept || currentWeakness;

  if (!focusConcept) {
    // All concepts mastered - suggest advanced topics
    return {
      currentSkill: 'dp', // Default advanced topic
      nextConcepts: [],
      recommendedProblems: getAdvancedProblems(),
      estimatedTimeToMastery: 0
    };
  }

  const nextConcepts = buildConceptProgression(graph, focusConcept);
  const recommendedProblems = recommendProblems(graph, focusConcept, nextConcepts);

  const estimatedTime = calculateMasteryTime(graph, focusConcept, nextConcepts);

  return {
    currentSkill: focusConcept,
    nextConcepts,
    recommendedProblems,
    estimatedTimeToMastery: estimatedTime
  };
}

/**
 * Identifies primary weakness
 */
function identifyPrimaryWeakness(graph: StudentKnowledgeGraph): ConceptId | null {
  const concepts = Array.from(graph.concepts.values());

  // Find concepts with low mastery that are prerequisites for others
  const blockers = concepts.filter(c => {
    if (c.mastery >= 70) return false;

    // Check if this is a prerequisite for other concepts being attempted
    return c.dependents.some(depId => {
      const dep = graph.concepts.get(depId);
      return dep && dep.practiceCount > 0;
    });
  });

  if (blockers.length > 0) {
    return blockers.sort((a, b) => a.mastery - b.mastery)[0].concept;
  }

  // Otherwise, return weakest concept
  const weak = concepts
    .filter(c => c.practiceCount > 0)
    .sort((a, b) => a.mastery - b.mastery);

  return weak[0]?.concept || null;
}

/**
 * Builds concept progression tree
 */
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

    // Check if blocked by unmastered prerequisites
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
      recommendedActions: actions
    };

    nodes.push(node);
    return node;
  }

  // Build dependency tree
  buildNode(targetConcept);

  // Add prerequisite nodes
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
    // Sort by: blocked first, then not started, then learning, then mastered
    const order = { blocked: 0, not_started: 1, learning: 2, mastered: 3 };
    return order[a.status] - order[b.status];
  });
}

/**
 * Recommends problems for practice
 */
function recommendProblems(
  graph: StudentKnowledgeGraph,
  targetConcept: ConceptId,
  conceptNodes: ConceptNode[]
): RecommendedProblem[] {
  const recommendations: RecommendedProblem[] = [];

  // Check already attempted problems to avoid repeats
  const attempted = new Set(graph.problemHistory.map(p => p.problemId));

  // Generate recommendations based on concept and mastery level
  const mastery = graph.concepts.get(targetConcept)?.mastery || 0;
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';

  if (mastery >= 70) difficulty = 'medium';
  if (mastery >= 85) difficulty = 'hard';

  // This would typically query from a problem database
  const sampleProblems = getSampleProblemsForConcept(targetConcept, difficulty);

  for (const problem of sampleProblems) {
    if (attempted.has(problem.problemId)) continue;

    const priority = calculatePriority(graph, problem, conceptNodes);
    recommendations.push({
      ...problem,
      priority,
      reason: getRecommendationReason(graph, problem, conceptNodes)
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

  // Higher priority for concepts with lower mastery
  for (const concept of problem.concepts) {
    const mastery = graph.concepts.get(concept)?.mastery || 0;
    priority += (100 - mastery) / 100;
  }

  // Bonus for filling gaps
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
  // In production, this would query the database
  // For now, return sample data
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
          estimatedTime: 20
        }
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
          estimatedTime: 35
        }
      ],
      hard: []
    }
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
      estimatedTime: 60
    }
  ];
}

function calculateMasteryTime(
  graph: StudentKnowledgeGraph,
  concept: ConceptId,
  nodes: ConceptNode[]
): number {
  const mastery = graph.concepts.get(concept)?.mastery || 0;
  const remaining = 100 - mastery;

  // Rough estimate: 2 hours per 10% mastery remaining
  let hours = (remaining / 10) * 2;

  // Add time for prerequisites
  const blockedNodes = nodes.filter(n => n.status === 'blocked');
  hours += blockedNodes.length * 3;

  return hours;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// PRISMA DATABASE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentKnowledgeGraph(
  userId: string
): Promise<StudentKnowledgeGraph | null> {
  try {
    const userData = await prisma.userKnowledgeGraph.findUnique({
      where: { userId },
      include: {
        conceptMasteries: true,
        learningPatterns: true,
        problemAttempts: true,
        misconceptions: true,
      },
    });

    if (!userData) return null;

    // Convert to StudentKnowledgeGraph format
    const concepts = new Map<ConceptId, ConceptMastery>();
    userData.conceptMasteries.forEach(cm => {
      concepts.set(cm.conceptId as ConceptId, {
        concept: cm.conceptId as ConceptId,
        mastery: cm.mastery,
        lastPracticed: cm.lastPracticed,
        practiceCount: cm.practiceCount,
        successRate: cm.successRate,
        averageTimeToSolve: cm.averageTimeToSolve,
        commonErrors: cm.commonErrors as ErrorPattern[],
        prerequisites: (cm.prerequisites as ConceptId[]) || [],
        dependents: (cm.dependents as ConceptId[]) || [],
        nextReviewDue: cm.nextReviewDue,
        difficultyRating: cm.difficultyRating,
        confidenceRating: cm.confidenceRating,
      });
    });

    const patterns = new Map<PatternType, LearningPattern>();
    userData.learningPatterns.forEach(lp => {
      patterns.set(lp.patternType as PatternType, {
        pattern: lp.patternType as PatternType,
        strength: lp.strength,
        lastUsed: lp.lastUsed,
        successRate: lp.successRate,
        preferredContext: lp.preferredContext,
      });
    });

    return {
      userId: userData.userId,
      concepts,
      patterns,
      learningStyle: userData.learningStyle as LearningStyle,
      misconceptions: userData.misconceptions as Misconception[],
      strengths: userData.strengths as ConceptId[],
      weaknesses: userData.weaknesses as ConceptId[],
      learningTrajectory: userData.learningTrajectory as TrajectoryPoint[],
      problemHistory: userData.problemAttempts as ProblemAttempt[],
    };
  } catch (error) {
    console.error('Error fetching knowledge graph:', error);
    return null;
  }
}

export async function updateConceptMastery(
  userId: string,
  conceptId: ConceptId,
  update: Partial<Omit<ConceptMastery, 'concept'>>
): Promise<void> {
  await prisma.conceptMastery.upsert({
    where: {
      userId_conceptId: {
        userId,
        conceptId,
      },
    },
    create: {
      userId,
      conceptId,
      ...update,
    },
    update: {
      ...update,
      updatedAt: new Date(),
    },
  });
}

export async function recordProblemAttempt(
  attempt: Omit<ProblemAttempt, 'date'>
): Promise<void> {
  await prisma.problemAttempt.create({
    data: {
      ...attempt,
      date: new Date(),
    },
  });
}

export async function updateLearningStyleInDB(
  userId: string,
  style: Partial<LearningStyle>
): Promise<void> {
  await prisma.userKnowledgeGraph.upsert({
    where: { userId },
    create: {
      userId,
      learningStyle: style as any,
      strengths: [],
      weaknesses: [],
      learningTrajectory: [],
    },
    update: {
      learningStyle: {
        ...style,
      } as any,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function calculateOverallMastery(graph: StudentKnowledgeGraph): number {
  const concepts = Array.from(graph.concepts.values());
  if (concepts.length === 0) return 0;

  const totalMastery = concepts.reduce((sum, c) => sum + c.mastery, 0);
  return Math.round(totalMastery / concepts.length);
}

export function getWeakestConcepts(
  graph: StudentKnowledgeGraph,
  count: number = 3
): ConceptMastery[] {
  return Array.from(graph.concepts.values())
    .filter(c => c.practiceCount > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, count);
}

export function getStrongestConcepts(
  graph: StudentKnowledgeGraph,
  count: number = 3
): ConceptMastery[] {
  return Array.from(graph.concepts.values())
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, count);
}
