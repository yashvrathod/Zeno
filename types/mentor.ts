/**
 * =============================================================================
 * MENTOR SYSTEM TYPES
 * =============================================================================
 *
 * Centralized type definitions for the AlgoMentor system.
 * These types are used across all mentor-related modules.
 */

// ─────────────────────────────────────────────────────────────────────────
// STAGE AND PROGRESSION TYPES
// ─────────────────────────────────────────────────────────────────────────

/**
 * The four main stages of the mentor-guided problem-solving process.
 * Students progress through these stages in order (with some exceptions).
 */
export type MentorStage = "UNDERSTAND" | "APPROACH" | "CODE" | "COMPLETE";

/**
 * Learning rung represents the student's depth of understanding (1-6).
 * Maps to the "Learning Ladder" framework.
 */
export type LearningRung = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Teaching stage from the reactive detection system.
 * More granular than MentorStage, used for AI prompt construction.
 */
export type TeachingStage =
  | "EXPLORE"
  | "STRATEGIZE"
  | "IMPLEMENT"
  | "DEBUG"
  | "STUCK"
  | "REFLECT";

/**
 * Conversation tone for AI responses.
 * Adapted based on student's emotional state and progress.
 */
export type ConversationTone =
  | "encouraging"
  | "analytical"
  | "challenging"
  | "empathetic";

// ─────────────────────────────────────────────────────────────────────────
// SESSION AND MESSAGE TYPES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Chat message within a mentor session.
 */
export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  stage: MentorStage;
  createdAt: Date;
}

/**
 * Mentor session with associated messages.
 * Represents the current state of a user's work on a problem.
 */
export interface SessionWithMessages {
  id: string;
  userId: string;
  problemId: string;
  stage: MentorStage;
  currentRung: number;
  hintLevel: number;
  solved: boolean;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minimal session object for router decisions.
 */
export interface RouterSession {
  id: string;
  userId: string;
  problemId: string;
  stage: MentorStage;
  messages: Array<{ role: string; content: string }>;
}

// ─────────────────────────────────────────────────────────────────────────
// PROBLEM TYPES
// ─────────────────────────────────────────────────────────────────────────

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

/**
 * Problem metadata for caching and routing.
 */
export interface ProblemMeta {
  whatAsked: string;
  inputFormat: string;
  outputFormat: string;
  edgeCases: string[];
  bruteForceHint: string;
  optimalHint: string;
}

/**
 * Complete problem object with metadata.
 */
export interface ProblemWithMeta {
  id: string;
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  description: string;
  examples: Example[];
  constraints: string[];
  meta: ProblemMeta;
}

/**
 * Minimal problem object for router decisions.
 */
export interface RouterProblem {
  id: string;
  slug: string;
  title: string;
  statementMd: string;
  constraintsMd?: string;
  meta: {
    difficulty: string;
    tags?: string[];
    patterns?: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────
// INTERACTION TYPES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Complete context for a mentor interaction.
 */
export interface InteractionContext {
  userId: string;
  session: SessionWithMessages;
  problem: ProblemWithMeta;
  input: string;
  isHintRequest: boolean;
}

/**
 * Route decision from the interaction router.
 * Determines how to handle each user interaction.
 */
export type RouteDecision =
  | {
      type: "STATIC";
      handler: "breakdown" | "stage_gate";
      reason?: string;
    }
  | {
      type: "CACHE_HIT";
      entry: CacheEntry;
      similarity: number;
    }
  | {
      type: "AI_NEEDED";
      reason: string;
    };

/**
 * Cache entry for semantic search.
 */
export interface CacheEntry {
  id: string;
  userId: string;
  problemId: string;
  questionMd5: string;
  embedding: number[];
  response: string;
  stage: string;
  rung: number;
  similarity?: number;
  usedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result from cache search.
 */
export interface CacheSearchResult {
  answer: string;
  score: number;
  source: "redis" | "db";
  hitCount: number;
}

// ─────────────────────────────────────────────────────────────────────────
// RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Standard mentor response structure.
 */
export interface MentorResponse {
  message: string;
  stage: MentorStage;
  approachCorrect?: boolean;
  codeCorrect?: boolean;
  isOptimal?: boolean;
  fromCache: boolean;
  hintsRemaining?: number;
  rateLimitRemaining?: number;
  weakPatternsDetected?: string[];
  debugInfo?: {
    routeDecision: string;
    cacheScore?: number;
    aiCallMade: boolean;
    totalMs: number;
  };
}

/**
 * Streaming response chunk for AI completions.
 */
export interface StreamChunk {
  token: string;
  isDone: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// RATE LIMIT TYPES
// ─────────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message: string;
}

export interface HintLimitResult {
  allowed: boolean;
  hintsUsed: number;
  hintsRemaining: number;
}

export interface PlanLimitResult {
  allowed: boolean;
  problemsToday: number;
  limit: number;
}

// ─────────────────────────────────────────────────────────────────────────
// PATTERN TRACKING TYPES
// ─────────────────────────────────────────────────────────────────────────

export type WeakPatternTag =
  | "missed-edge-case"
  | "null-check-missing"
  | "off-by-one"
  | "wrong-complexity"
  | "suboptimal-approach"
  | "infinite-loop-risk"
  | "wrong-base-case"
  | "index-out-of-bounds";

export interface PatternMetadata {
  friendlyName: string;
  description: string;
  howToFix: string;
  relatedTags: string[];
}

export interface WeakPatternReport {
  tag: WeakPatternTag;
  count: number;
  friendlyName: string;
  description: string;
  howToFix: string;
  percentOfSessions: number;
}

// ─────────────────────────────────────────────────────────────────────────
// STAGE ENGINE TYPES
// ─────────────────────────────────────────────────────────────────────────

export type Stage = MentorStage;

export type MessageRole = "user" | "assistant" | "system";

export interface MentorSessionDb {
  id: string;
  userId: string;
  problemId: string;
  stage: Stage;
  currentRung: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDb {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  stage: Stage;
  createdAt: Date;
}

export interface TransitionContext {
  approachCorrect?: boolean;
  codeCorrect?: boolean;
  isOptimal?: boolean;
}

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

export interface AdvanceStageResult {
  success: boolean;
  newStage: Stage;
  message?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// DEBUG TYPES
// ─────────────────────────────────────────────────────────────────────────

export type DebugSystem =
  | "MENTOR"
  | "CACHE"
  | "AI"
  | "STAGE"
  | "EMBED"
  | "DB"
  | "RATE"
  | "PATTERN";

export interface DebugLogEntry {
  timestamp: Date;
  system: DebugSystem;
  message: string;
  data?: unknown;
}

export interface TimerResult {
  label: string;
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────
// API REQUEST/RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────

export interface UnderstandRequest {
  problemId: string;
  problemTitle: string;
  problemStatementMd: string;
  problemConstraintsMd?: string;
}

export interface ApproachRequest {
  problemId: string;
  problemTitle: string;
  problemStatementMd: string;
  userApproach: string;
}

export interface ApproachResponse {
  message: string;
  approachCorrect: boolean;
  fromCache: boolean;
  stage: string;
  weakPatterns?: Array<{ tag: string; count: number }>;
}

export interface CodeRequest {
  problemId: string;
  problemTitle: string;
  userCode: string;
  language: string;
  userApiKey?: string;
}

export interface CodeResponse {
  message: string;
  codeCorrect: boolean;
  isOptimal: boolean;
  complexity?: string;
  weakPatterns?: Array<{ tag: string; count: number }>;
  stage: string;
}

export interface CacheStatsResponse {
  totalEntries: number;
  hitRate: number;
  topQueriedQuestions: Array<{ question: string; hits: number }>;
  redisMemoryUsed?: number;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  db: boolean;
  redis: boolean;
  groq: boolean;
  embeddingModel: boolean;
  cacheEntries: number;
  uptime: number;
}
