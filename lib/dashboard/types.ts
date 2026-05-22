export interface DashboardData {
  overallStats: {
    problemsAttempted: number;
    problemsSolved: number;
    successRate: number;
    currentStreak: number;
    longestStreak: number;
    totalRunCount: number;
    totalSubmitCount: number;
    interviewReadiness: number;
  };
  conceptMastery: ConceptMasteryItem[];
  learningVelocity: LearningVelocityPoint[];
  reviewQueue: ReviewItem[];
  recentActivity: ActivityItem[];
  weakAreas: WeakArea[];
  masteredPatterns: string[];
  stuckProblems: string[];
  recommendedNext: string | null;
}

export interface ConceptMasteryItem {
  concept: string;
  mastery: number;
  practiceCount: number;
  successRate: number;
  lastPracticed: string | null;
  status: 'mastered' | 'learning' | 'not_started' | 'blocked';
}

export interface LearningVelocityPoint {
  date: string;
  overallMastery: number;
  conceptsMastered: number;
  problemsSolved: number;
}

export interface ReviewItem {
  concept: string;
  nextReviewDue: string;
  interval: number;
  priority: 'high' | 'medium' | 'low';
  mastery: number;
}

export interface ActivityItem {
  id: string;
  type: 'solved' | 'attempted' | 'hint' | 'debug' | 'review';
  problemTitle: string;
  problemSlug: string;
  timestamp: string;
  detail: string;
}

export interface WeakArea {
  tag: string;
  friendlyName: string;
  count: number;
  percentOfSessions: number;
  description: string;
}
