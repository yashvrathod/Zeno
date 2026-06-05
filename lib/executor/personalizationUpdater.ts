/**
 * Personalization Updater
 *
 * Hooks into problem-solving sessions to update the student's knowledge graph in real-time.
 * Runs after every test execution and mentor interaction.
 */

import prisma from '../prisma';
import type { TeachingStage } from '../mentorContext';
import { updateConceptMastery, calculateNextReview, CONCEPT_DEPENDENCIES } from '../mentor/personalizationEngine';
import type { ErrorType, ErrorPattern } from '../mentor/personalization/types';

const MAX_ERROR_PATTERN_ENTRIES = 50;
const MAX_ERROR_MESSAGE_LENGTH = 200;

// Prisma Json value type
type PrismaJson = Parameters<typeof prisma.userKnowledgeGraph.create>[0]['data']['learningStyle'];

// Default learning style for new users
const defaultLearningStyle: Record<string, unknown> = {
  prefersVisual: false,
  prefersExamples: true,
  learnsByDoing: true,
  hintLevelPreference: 1,
  explanationDensity: 'detailed',
  feedbackTiming: 'immediate',
};

// Default empty trajectory array
const defaultTrajectory: unknown[] = [];

/**
 * Ensure the UserKnowledgeGraph row exists for `userId`.
 *
 * Prisma's `upsert` does NOT create the parent row — it only creates the
 * child. If `userId` has no matching `User` row, the FK constraint
 * `UserKnowledgeGraph_userId_fkey` is violated with P2003. We see this in
 * the wild when:
 *   - The session cookie references a User that was deleted
 *   - A dev/test id is passed that was never persisted
 *   - A DB reset cleared users but left dangling auth tokens
 *
 * Returns `null` in that case so callers can skip the personalization
 * pipeline gracefully instead of throwing (the route's try/catch would
 * otherwise return 500 to the client and spam the logs).
 */
async function ensureKnowledgeGraph(userId: string): Promise<{ id: string } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    console.warn(
      `[personalizationUpdater] ensureKnowledgeGraph: user ${userId} not found, skipping personalization`,
    );
    return null;
  }
  return prisma.userKnowledgeGraph.upsert({
    where: { userId },
    create: {
      userId,
      learningStyle: defaultLearningStyle as PrismaJson,
      strengths: [],
      weaknesses: [],
      learningTrajectory: defaultTrajectory as PrismaJson,
    },
    update: {},
    select: { id: true },
  });
}

export type ExecutionStats = {
  passed: boolean;
  testResults: Array<{ passed: boolean; input: string; expected: string; actual: string }>;
  runtime: number;
};

export type ProblemContext = {
  problemId: string;
  problemSlug?: string;
  concepts: string[]; // e.g., ['binary_search', 'two_pointer']
  patterns: string[]; // e.g., ['sliding_window']
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
};

/**
 * Updates knowledge graph after code execution
 * Called after every "Run" or "Submit" action
 */
export async function updateAfterExecution(
  userId: string,
  problemContext: ProblemContext,
  executionStats: ExecutionStats,
  stage?: TeachingStage
): Promise<void> {
  try {
    const { passed, testResults, runtime } = executionStats;
    const { concepts, patterns, difficulty } = problemContext;

    // Update concept mastery
    for (const conceptId of concepts) {
      try {
        await updateConceptMasteryForConcept(userId, conceptId, { passed, testResults, runtime, difficulty });
      } catch (error) {
        console.error(`Failed to update concept mastery for concept ${conceptId}:`, error);
      }
    }

    // Update pattern strength
    for (const pattern of patterns) {
      try {
        await updatePatternStrength(userId, pattern, passed, runtime);
      } catch (error) {
        console.error(`Failed to update pattern strength for pattern ${pattern}:`, error);
      }
    }

    // Record error patterns if failed
    if (!passed && testResults.some(t => !t.passed)) {
      try {
        await recordErrorPattern(userId, concepts, testResults.filter(t => !t.passed)[0]);
      } catch (error) {
        console.error('Failed to record error pattern:', error);
      }
    }

    // Update overall stats
    try {
      await updateProblemStats(userId, problemContext.problemId, passed, runtime);
    } catch (error) {
      console.error('Failed to update problem stats:', error);
    }
  } catch (error) {
    console.error('Error in updateAfterExecution:', error);
    throw error; // Re-throw to maintain existing error handling behavior
  }
}

/**
 * Updates knowledge graph when mentor interaction happens
 * Called after every AI response
 */
export async function updateAfterMentorInteraction(
  userId: string,
  problemContext: ProblemContext,
  intent: string,
  wasHelpful: boolean
): Promise<void> {
  try {
    const { concepts } = problemContext;

    // Adjust confidence rating based on interaction
    for (const conceptId of concepts) {
      try {
        if (wasHelpful) {
          await incrementConfidence(userId, conceptId);
        } else {
          await incrementDifficulty(userId, conceptId);
        }
      } catch (error) {
        console.error(`Failed to update concept ${conceptId} confidence/difficulty:`, error);
      }
    }

    // Track learning style preferences
    try {
      await trackLearningStyle(userId, intent, wasHelpful);
    } catch (error) {
      console.error('Failed to track learning style:', error);
    }
  } catch (error) {
    console.error('Error in updateAfterMentorInteraction:', error);
    throw error; // Re-throw to maintain existing error handling behavior
  }
}

/**
 * Updates when a problem is solved
 * Called when stage advances to REFLECT
 */
export async function updateAfterSolve(
  userId: string,
  problemContext: ProblemContext,
  timeSpent: number,
  attemptCount: number,
  hintCount: number
): Promise<void> {
  try {
    const { concepts, patterns, difficulty } = problemContext;

    // Boost mastery for all concepts
    const baseBoost = difficulty === 'EASY' ? 5 : difficulty === 'MEDIUM' ? 8 : 12;
    const attemptFactor = attemptCount === 1 ? 1.5 : attemptCount <= 3 ? 1.0 : 0.7;
    const hintPenalty = Math.max(0.5, 1 - hintCount * 0.1);

    for (const conceptId of concepts) {
      try {
        await boostMastery(userId, conceptId, baseBoost * attemptFactor * hintPenalty);
        await updateNextReviewDate(userId, conceptId, true);
      } catch (error) {
        console.error(`Failed to boost mastery for concept ${conceptId}:`, error);
      }
    }

    // Record successful problem attempt
    try {
      await recordProblemAttempt(userId, problemContext, timeSpent, attemptCount, hintCount, true);
    } catch (error) {
      console.error('Failed to record problem attempt:', error);
    }
  } catch (error) {
    console.error('Error in updateAfterSolve:', error);
    throw error; // Re-throw to maintain existing error handling behavior
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function updateConceptMasteryForConcept(
  userId: string,
  conceptId: string,
  stats: ExecutionStats & { difficulty: string }
): Promise<void> {
  const current = await getOrCreateConceptMastery(userId, conceptId);
  if (!current) return; // user missing → personalization skipped

  // Calculate mastery change
  let masteryChange = 0;
  if (stats.passed) {
    masteryChange = stats.testResults.length > 0 ?
      (stats.testResults.filter(t => t.passed).length / stats.testResults.length) * 10 : 5;
  } else {
    masteryChange = -3;
  }

  // Adjust for difficulty
  const difficultyMultiplier = stats.difficulty === 'EASY' ? 0.8 : stats.difficulty === 'MEDIUM' ? 1.0 : 1.3;
  masteryChange *= difficultyMultiplier;

  const newMastery = Math.max(0, Math.min(100, current.mastery + masteryChange));

  // Update in database
  await updateConceptMastery(userId, conceptId as any, {
    mastery: newMastery,
    practiceCount: (current.practiceCount || 0) + 1,
    lastPracticed: new Date(),
  });

  // Update success rate
  const recentAttempts = await getRecentAttempts(userId, conceptId, 10);
  const successRate = recentAttempts.filter(a => a.success).length / recentAttempts.length;

  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId, conceptId } },
    data: { successRate },
  });
}

async function updatePatternStrength(
  userId: string,
  pattern: string,
  passed: boolean,
  runtime: number
): Promise<void> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  const patternType = pattern.toLowerCase().replace(/-/g, '') as any;

  const existing = await prisma.learningPattern.findFirst({
    where: { userId: kg.id, patternType },
  });

  if (existing) {
    const strengthChange = passed ? 0.05 : -0.03;
    const newStrength = Math.max(0, Math.min(1, existing.strength + strengthChange));

    await prisma.learningPattern.update({
      where: { id: existing.id },
      data: {
        strength: newStrength,
        lastUsed: new Date(),
        successRate: passed ? existing.successRate + 0.1 : existing.successRate - 0.05,
      },
    });
  } else {
    await prisma.learningPattern.create({
      data: {
        userId: kg.id,
        patternType,
        strength: passed ? 0.5 : 0.3,
        lastUsed: new Date(),
        successRate: passed ? 1.0 : 0.0,
        preferredContext: [],
      },
    });
  }
}

/**
 * Pure helper: merges a freshly-detected error into an existing commonErrors
 * list. If an entry with the same `type` already exists, increments
 * `occurrences`, refreshes `lastSeen`, and preserves the original `message`
 * (the first-seen message is the most diagnostic). Otherwise inserts a new
 * entry. The returned array is capped at MAX_ERROR_PATTERN_ENTRIES by
 * dropping the entry with the oldest `lastSeen`. Truncates `message` on
 * insert to MAX_ERROR_MESSAGE_LENGTH. Always returns a new array; the input
 * is never mutated.
 *
 * Exported for unit testing; the prisma-touching recordErrorPattern calls
 * it once per concept.
 */
export function mergeErrorPattern(
  existing: ErrorPattern[],
  detected: { type: ErrorType; message: string },
  now: Date = new Date()
): ErrorPattern[] {
  const matched = existing.find((e) => e.type === detected.type);
  let next: ErrorPattern[];
  if (matched) {
    next = existing.map((e) =>
      e === matched
        ? { ...e, occurrences: e.occurrences + 1, lastSeen: now }
        : e
    );
  } else {
    const truncated =
      detected.message.length > MAX_ERROR_MESSAGE_LENGTH
        ? detected.message.slice(0, MAX_ERROR_MESSAGE_LENGTH)
        : detected.message;
    next = [
      ...existing,
      {
        type: detected.type,
        message: truncated,
        occurrences: 1,
        lastSeen: now,
        relatedConcept: null,
      },
    ];
  }
  if (next.length > MAX_ERROR_PATTERN_ENTRIES) {
    next = [...next].sort(
      (a, b) => a.lastSeen.getTime() - b.lastSeen.getTime()
    );
    next = next.slice(next.length - MAX_ERROR_PATTERN_ENTRIES);
  }
  return next;
}

async function recordErrorPattern(
  userId: string,
  concepts: string[],
  failedTest: { input: string; expected: string; actual: string }
): Promise<void> {
  if (concepts.length === 0) return;

  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  // Simple error type detection
  let errorType: ErrorType = 'logic_error';
  if (failedTest.actual.includes('undefined') || failedTest.actual.includes('null')) {
    errorType = 'null_pointer';
  } else if (failedTest.actual.includes('index') || failedTest.actual.includes('out of bounds')) {
    errorType = 'index_out_of_bounds';
  } else if (/off.*by.*one|boundary/i.test(failedTest.actual)) {
    errorType = 'off_by_one';
  }

  const detected = {
    type: errorType,
    message: `Expected ${failedTest.expected}, got ${failedTest.actual}`,
  };

  // We can't attribute a runtime error to a single concept, so we stamp the
  // pattern on every concept the problem exercises with relatedConcept: null.
  // Consumers can filter problem-level signals from concept-attributed ones.
  for (const conceptId of concepts) {
    try {
      const current = await getOrCreateConceptMastery(kg.id, conceptId);
      if (!current) continue;
      const merged = mergeErrorPattern(
        current.commonErrors as ErrorPattern[],
        detected
      );
      await prisma.conceptMastery.update({
        where: {
          userId_conceptId: { userId: kg.id, conceptId },
        },
        data: { commonErrors: merged as unknown as import('@prisma/client').Prisma.InputJsonValue },
      });
    } catch (error) {
      console.error(`Failed to record error pattern for concept ${conceptId}:`, error);
    }
  }
}

async function updateProblemStats(
  userId: string,
  problemId: string,
  passed: boolean,
  runtime: number
): Promise<void> {
  // Skip when the user is missing — UserProblemStats.userId is also a
  // FK to User, so an upsert would crash with P2003 the same way
  // ensureKnowledgeGraph used to. The personalization signal is
  // unavailable, but the route's try/catch should not turn this into 500.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    console.warn(
      `[personalizationUpdater] updateProblemStats: user ${userId} not found, skipping`,
    );
    return;
  }
  await prisma.userProblemStats.upsert({
    where: { userId_problemId: { userId, problemId } },
    create: {
      userId,
      problemId,
      runCount: 1,
      lastStatus: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      lastError: passed ? null : 'Execution failed',
      lastAt: new Date(),
      firstAttemptAt: new Date(),
    },
    update: {
      runCount: { increment: 1 },
      lastStatus: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
      lastError: passed ? null : 'Execution failed',
      timeSpentSeconds: { increment: Math.min(Math.round(runtime / 1000), 60) },
      lastAt: new Date(),
    },
  });
}

async function getOrCreateConceptMastery(
  userId: string,
  conceptId: string
): Promise<{ mastery: number; practiceCount: number; commonErrors: unknown[] } | null> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return null;

  const existing = await prisma.conceptMastery.findUnique({
    where: { userId_conceptId: { userId: kg.id, conceptId } },
  });

  if (existing) {
    return {
      mastery: existing.mastery,
      practiceCount: existing.practiceCount,
      commonErrors: (existing.commonErrors as unknown[]) || [],
    };
  }

  const defaultMastery = 50;
  const created = await prisma.conceptMastery.create({
    data: {
      userId: kg.id,
      conceptId,
      mastery: defaultMastery,
      practiceCount: 0,
      successRate: 0,
      difficultyRating: 3,
      confidenceRating: 3,
      commonErrors: [],
      prerequisites: (CONCEPT_DEPENDENCIES as Record<string, string[]>)[conceptId] || [],
    },
  });

  return {
    mastery: created.mastery,
    practiceCount: created.practiceCount,
    commonErrors: (created.commonErrors as unknown[]) || [],
  };
}

async function getRecentAttempts(userId: string, conceptId: string, count: number): Promise<{ success: boolean }[]> {
  // This is a simplified version - in production, you'd track individual attempts
  const graph = await prisma.userKnowledgeGraph.findUnique({
    where: { userId },
    include: { problemAttempts: true },
  });

  const relevantAttempts = graph?.problemAttempts.filter((p: any) =>
    (p.concepts as string[]).includes(conceptId)
  ).slice(-count) || [];

  return relevantAttempts.map((p: any) => ({ success: p.solved }));
}

async function incrementConfidence(userId: string, conceptId: string): Promise<void> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId: kg.id, conceptId } },
    data: { confidenceRating: { increment: 1 } },
  });
}

async function incrementDifficulty(userId: string, conceptId: string): Promise<void> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId: kg.id, conceptId } },
    data: { difficultyRating: { increment: 0.5 } },
  });
}

async function boostMastery(userId: string, conceptId: string, boost: number): Promise<void> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId: kg.id, conceptId } },
    data: { mastery: { increment: boost } },
  });
}

async function updateNextReviewDate(userId: string, conceptId: string, succeeded: boolean): Promise<void> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  const mastery = await prisma.conceptMastery.findUnique({
    where: { userId_conceptId: { userId: kg.id, conceptId } },
  });

  if (!mastery) return;

  const performance = succeeded ? 1.0 : 0.3;
  const nextReview = calculateNextReview(mastery as any, performance);

  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId: kg.id, conceptId } },
    data: { nextReviewDue: nextReview },
  });
}

async function trackLearningStyle(userId: string, intent: string, wasHelpful: boolean): Promise<void> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  const fullKg = await prisma.userKnowledgeGraph.findUnique({
    where: { id: kg.id },
    select: { learningStyle: true },
  });
  const style = (fullKg?.learningStyle as any) || {};

  // Update based on what worked
  if (wasHelpful) {
    if (intent === 'visual') style.prefersVisual = true;
    if (intent.includes('example')) style.prefersExamples = true;
    if (intent.includes('theory')) style.prefersTheory = true;
  }

  await prisma.userKnowledgeGraph.update({
    where: { userId: kg.id },
    data: { learningStyle: style },
  });
}

async function recordProblemAttempt(
  userId: string,
  problemContext: ProblemContext,
  timeSpent: number,
  attemptCount: number,
  hintCount: number,
  solved: boolean
): Promise<void> {
  const kg = await ensureKnowledgeGraph(userId);
  if (!kg) return;

  let problemSlug = problemContext.problemSlug;
  if (!problemSlug) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemContext.problemId },
      select: { slug: true },
    });
    problemSlug = problem?.slug ?? problemContext.problemId;
  }

  await prisma.problemAttempt.create({
    data: {
      userId: kg.id,
      problemId: problemContext.problemId,
      problemSlug,
      concepts: problemContext.concepts,
      patterns: problemContext.patterns,
      attempts: attemptCount,
      solved,
      timeSpent,
      firstAttemptSuccess: attemptCount === 1 && solved,
      hintCount,
      stageReached: solved ? 'REFLECT' : 'DEBUG',
      rungReached: 1,
      date: new Date(),
      errors: [] as never[],
    },
  });
}
