export interface FeedbackRecord {
  sessionId: string;
  userId: string;
  problemId: string;
  messageId: string;
  mentorResponse: string;
  studentReaction: StudentReaction;
  helpfulScore: 1 | 2 | 3 | 4 | 5;
  studentCodeBefore?: string;
  studentCodeAfter?: string;
  executionTraceAvailable: boolean;
  timestamp: number;
}

export type StudentReaction = "solved" | "progressed" | "stuck" | "gave_up" | "irrelevant";

export interface StudentProfile {
  userId: string;
  totalProblems: number;
  solvedProblems: number;
  avgHelpfulScore: number;
  topPatterns: string[];
  weakAreas: string[];
  preferredVerbosity: "concise" | "normal" | "detailed";
  preferredTone: "encouraging" | "analytical" | "challenging" | "empathetic";
  recentResponses: ScoredResponse[];
}

export interface ScoredResponse {
  messageId: string;
  rung: number;
  stage: string;
  helpfulScore: number;
  studentReaction: StudentReaction;
  timestamp: number;
}

export interface ModelInsights {
  whatWorks: string[];
  whatDoesnt: string[];
  suggestedAdjustments: PromptAdjustment[];
}

export interface PromptAdjustment {
  field: "verbosity" | "tone" | "stage_enforcement" | "hint_directness";
  value: string;
  reason: string;
}
