/**
 * Personalization Updater
 *
 * Hooks into problem-solving sessions to update the student's knowledge graph in real-time.
 * Runs after every test execution and mentor interaction.
 */

import prisma from '../prisma';
import type { TeachingStage } from '../mentorContext';
import { updateConceptMastery, calculateNextReview, CONCEPT_DEPENDENCIES } from '../mentor/personalizationEngine';

export type ExecutionStats = {
  passed: boolean;
  testResults: Array<{ passed: boolean; input: string; expected: string; actual: string }>;
  runtime: number;
};

export type ProblemContext = {
  problemId: string;
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
  const { passed, testResults, runtime } = executionStats;
  const { concepts, patterns, difficulty } = problemContext;

  // Update concept mastery
  for (const conceptId of concepts) {
    await updateConceptMasteryForConcept(userId, conceptId, { passed, testResults, runtime, difficulty });
  }

  // Update pattern strength
  for (const pattern of patterns) {
    await updatePatternStrength(userId, pattern, passed, runtime);
  }

  // Record error patterns if failed
  if (!passed && testResults.some(t => !t.passed)) {
    await recordErrorPattern(userId, testResults.filter(t => !t.passed)[0]);
  }

  // Update overall stats
  await updateProblemStats(userId, problemContext.problemId, passed, runtime);
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
  const { concepts } = problemContext;

  // Adjust confidence rating based on interaction
  for (const conceptId of concepts) {
    if (wasHelpful) {
      await incrementConfidence(userId, conceptId);
    } else {
      await incrementDifficulty(userId, conceptId);
    }
  }

  // Track learning style preferences
  await trackLearningStyle(userId, intent, wasHelpful);
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
  const { concepts, patterns, difficulty } = problemContext;

  // Boost mastery for all concepts
  const baseBoost = difficulty === 'EASY' ? 5 : difficulty === 'MEDIUM' ? 8 : 12;
  const attemptFactor = attemptCount === 1 ? 1.5 : attemptCount <= 3 ? 1.0 : 0.7;
  const hintPenalty = Math.max(0.5, 1 - hintCount * 0.1);

  for (const conceptId of concepts) {
    await boostMastery(userId, conceptId, baseBoost * attemptFactor * hintPenalty);
    await updateNextReviewDate(userId, conceptId, true);
  }

  // Record successful problem attempt
  await recordProblemAttempt(userId, problemContext, timeSpent, attemptCount, hintCount, true);
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
    practiceCount: { increment: 1 },
    lastPracticed: new Date(),
    lastError: !stats.passed ? 'Execution failed' : null,
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
  const patternType = pattern.toLowerCase().replace(/-/g, '') as any;

  const existing = await prisma.learningPattern.findUnique({
    where: { userId_patternType: { userId, patternType } },
  });

  if (existing) {
    const strengthChange = passed ? 0.05 : -0.03;
    const newStrength = Math.max(0, Math.min(1, existing.strength + strengthChange));

    await prisma.learningPattern.update({
      where: { userId_patternType: { userId, patternType } },
      data: {
        strength: newStrength,
        lastUsed: new Date(),
        successRate: passed ? existing.successRate + 0.1 : existing.successRate - 0.05,
      },
    });
  } else {
    await prisma.learningPattern.create({
      data: {
        userId,
        patternType,
        strength: passed ? 0.5 : 0.3,
        lastUsed: new Date(),
        successRate: passed ? 1.0 : 0.0,
        preferredContext: [],
      },
    });
  }
}

async function recordErrorPattern(
  userId: string,
  failedTest: { input: string; expected: string; actual: string }
): Promise<void> {
  // Simple error type detection
  let errorType: string = 'logic_error';
  if (failedTest.actual.includes('undefined') || failedTest.actual.includes('null')) {
    errorType = 'null_pointer';
  } else if (failedTest.actual.includes('index') || failedTest.actual.includes('out of bounds')) {
    errorType = 'index_out_of_bounds';
  } else if (/off.*by.*one|boundary/i.test(failedTest.actual)) {
    errorType = 'off_by_one';
  }

  await prisma.userKnowledgeGraph.update({
    where: { userId },
    data: {
      errorPatterns: {
        push: {
          type: errorType,
          message: `Expected ${failedTest.expected}, got ${failedTest.actual}`,
          occurrences: 1,
          lastSeen: new Date(),
        },
      },
    },
  });
}

async function updateProblemStats(
  userId: string,
  problemId: string,
  passed: boolean,
  runtime: number
): Promise<void> {
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
      timeSpentSeconds: { increment: runtime / 1000 },
      lastAt: new Date(),
    },
  });
}

async function getOrCreateConceptMastery(
  userId: string,
  conceptId: string
): Promise<{ mastery: number; practiceCount: number }> {
  const existing = await prisma.conceptMastery.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
  });

  if (existing) {
    return { mastery: existing.mastery, practiceCount: existing.practiceCount };
  }

  const defaultMastery = 50; // Start at 50 for new concepts
  await prisma.conceptMastery.create({
    data: {
      userId,
      conceptId,
      mastery: defaultMastery,
      practiceCount: 0,
      successRate: 0,
      difficultyRating: 3,
      confidenceRating: 3,
      prerequisites: CONCEPT_DEPENDENCIES[conceptId as any] || [],
      nextReviewDue: new Date(),
    },
  });

  return { mastery: defaultMastery, practiceCount: 0 };
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
  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId, conceptId } },
    data: { confidenceRating: { increment: 1 } },
  });
}

async function incrementDifficulty(userId: string, conceptId: string): Promise<void> {
  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId, conceptId } },
    data: { difficultyRating: { increment: 0.5 } },
  });
}

async function boostMastery(userId: string, conceptId: string, boost: number): Promise<void> {
  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId, conceptId } },
    data: { mastery: { increment: boost } },
  });
}

async function updateNextReviewDate(userId: string, conceptId: string, succeeded: boolean): Promise<void> {
  const mastery = await prisma.conceptMastery.findUnique({
    where: { userId_conceptId: { userId, conceptId } },
  });

  if (!mastery) return;

  const performance = succeeded ? 1.0 : 0.3;
  const nextReview = calculateNextReview(mastery as any, performance);

  await prisma.conceptMastery.update({
    where: { userId_conceptId: { userId, conceptId } },
    data: { nextReviewDue: nextReview },
  });
}

async function trackLearningStyle(userId: string, intent: string, wasHelpful: boolean): Promise<void> {
  const graph = await prisma.userKnowledgeGraph.findUnique({
    where: { userId },
  });

  if (!graph) return;

  const style = graph.learningStyle as any || {};

  // Update based on what worked
  if (wasHelpful) {
    if (intent === 'visual') style.prefersVisual = true;
    if (intent.includes('example')) style.prefersExamples = true;
    if (intent.includes('theory')) style.prefersTheory = true;
  }

  await prisma.userKnowledgeGraph.update({
    where: { userId },
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
  await prisma.problemAttempt.create({
    data: {
      userId,
      problemId: problemContext.problemId,
      problemSlug: problemContext.problemId, // Would need problem lookup for actual slug
      concepts: problemContext.concepts,
      patterns: problemContext.patterns,
      attempts: attemptCount,
      solved,
      timeSpent,
      firstAttemptSuccess: attemptCount === 1 && solved,
      hintCount,
      stageReached: solved ? 'REFLECT' : 'DEBUG',
      date: new Date(),
      errors: [],
    },
  });
}
