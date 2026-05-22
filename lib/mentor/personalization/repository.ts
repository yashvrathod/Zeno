import prisma from '@/lib/prisma';
import type {
  StudentKnowledgeGraph, ConceptMastery, ConceptId, LearningPattern,
  Misconception, TrajectoryPoint, ProblemAttempt, LearningStyle, PatternType,
} from './types';

function convertDbConceptMastery(cm: {
  conceptId: string; mastery: number; lastPracticed: Date | null;
  practiceCount: number; successRate: number; averageTimeToSolve: number | null;
  commonErrors: unknown; prerequisites: unknown; dependents: unknown;
  nextReviewDue: Date | null; difficultyRating: number; confidenceRating: number;
}): ConceptMastery {
  return {
    concept: cm.conceptId as ConceptId,
    mastery: cm.mastery,
    lastPracticed: cm.lastPracticed,
    practiceCount: cm.practiceCount,
    successRate: cm.successRate,
    averageTimeToSolve: cm.averageTimeToSolve,
    commonErrors: (cm.commonErrors as any[]) || [],
    prerequisites: (cm.prerequisites as ConceptId[]) || [],
    dependents: (cm.dependents as ConceptId[]) || [],
    nextReviewDue: cm.nextReviewDue,
    difficultyRating: cm.difficultyRating,
    confidenceRating: cm.confidenceRating,
  };
}

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

    const concepts = new Map<ConceptId, ConceptMastery>();
    userData.conceptMasteries.forEach(cm => {
      concepts.set(cm.conceptId as ConceptId, convertDbConceptMastery(cm));
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
      learningStyle: userData.learningStyle as unknown as LearningStyle,
      misconceptions: (userData.misconceptions || []) as unknown as Misconception[],
      strengths: (userData.strengths as ConceptId[]) || [],
      weaknesses: (userData.weaknesses as ConceptId[]) || [],
      learningTrajectory: (userData.learningTrajectory || []) as unknown as TrajectoryPoint[],
      problemHistory: (userData.problemAttempts || []) as unknown as ProblemAttempt[],
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
      mastery: update.mastery ?? 0,
      practiceCount: update.practiceCount ?? 0,
      successRate: update.successRate ?? 0,
      difficultyRating: update.difficultyRating ?? 3,
      confidenceRating: update.confidenceRating ?? 3,
      commonErrors: [],
      prerequisites: update.prerequisites || [],
    },
    update: { ...update },
  });
}

export async function recordProblemAttempt(
  attempt: Omit<ProblemAttempt, 'date'>
): Promise<void> {
  const kg = await prisma.userKnowledgeGraph.findUnique({
    where: { userId: attempt.userId },
  });

  const errorsJson = (attempt.errors || []).map(e => ({
    type: e.type,
    message: e.message,
    line: e.line,
    timestamp: e.timestamp,
  }));

  await prisma.problemAttempt.create({
    data: {
      userId: kg?.id || attempt.userId,
      problemId: attempt.problemId,
      problemSlug: attempt.problemSlug,
      concepts: attempt.concepts as string[],
      patterns: attempt.patterns as string[],
      attempts: attempt.attempts,
      solved: attempt.solved,
      timeSpent: attempt.timeSpent,
      firstAttemptSuccess: attempt.firstAttemptSuccess,
      hintCount: attempt.hintCount,
      stageReached: attempt.stageReached as string,
      rungReached: attempt.rungReached as number,
      date: new Date(),
      errors: errorsJson as any,
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
      learningStyle: style as any,
    },
  });
}
