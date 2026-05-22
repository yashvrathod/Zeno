export type {
  ConceptId, ConceptMastery, ErrorPattern, ErrorType,
  LearningPattern, PatternType, LearningStyle,
  StudentKnowledgeGraph, Misconception, TrajectoryPoint,
  ProblemAttempt, AttemptError, ReviewSchedule,
  PersonalizedHint, LearningPath, ConceptNode, RecommendedProblem,
  HintContext, LearningStyleInteraction,
} from './types';

export {
  calculateNextReview, getDueConcepts, getReviewSchedule,
} from './spaced-repetition';

export {
  generatePersonalizedHint,
} from './hints';

export {
  updateLearningStyle, calculateOverallMastery,
  getWeakestConcepts, getStrongestConcepts,
} from './learning-style';

export {
  generateLearningPath,
  CONCEPT_DEPENDENCIES,
} from './learning-path';

export {
  getStudentKnowledgeGraph, updateConceptMastery,
  recordProblemAttempt, updateLearningStyleInDB,
} from './repository';
