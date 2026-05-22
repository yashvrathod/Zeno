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
  mastery: number;
  lastPracticed: Date | null;
  practiceCount: number;
  successRate: number;
  averageTimeToSolve: number | null;
  commonErrors: ErrorPattern[];
  prerequisites: ConceptId[];
  dependents: ConceptId[];
  nextReviewDue: Date | null;
  difficultyRating: number;
  confidenceRating: number;
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
  strength: number;
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
  hintLevelPreference: 0 | 1 | 2 | 3;
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
  timeSpent: number;
  firstAttemptSuccess: boolean;
  hintCount: number;
  stageReached: string;
  rungReached: number;
  date: Date;
  errors: AttemptError[];
}

export interface AttemptError {
  type: ErrorType;
  message: string;
  line?: number;
  timestamp: Date;
}

export interface ReviewSchedule {
  conceptId: ConceptId;
  nextReviewDue: Date;
  interval: number;
  difficulty: number;
  priority: 'high' | 'medium' | 'low';
}

export interface PersonalizedHint {
  level: 0 | 1 | 2 | 3;
  content: string;
  modality: 'text' | 'visual' | 'interactive' | 'analogy';
  conceptsTargeted: ConceptId[];
  estimatedEffectiveness: number;
  rationale: string;
}

export interface LearningPath {
  currentSkill: ConceptId;
  nextConcepts: ConceptNode[];
  recommendedProblems: RecommendedProblem[];
  estimatedTimeToMastery: number;
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
  estimatedTime: number;
}

export interface HintContext {
  problemId: string;
  concepts: ConceptId[];
  patterns: PatternType[];
  currentStage: string;
}

export interface LearningStyleInteraction {
  hintLevelUsed: 0 | 1 | 2 | 3;
  hintEffective: boolean;
  responseType: 'visual' | 'text' | 'analogy' | 'interactive';
  timeToUnderstand: number;
  askedForMoreExamples: boolean;
}
