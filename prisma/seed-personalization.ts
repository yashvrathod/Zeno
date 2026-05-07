/**
 * Seed Data for DSA Mentor Personalization System
 *
 * Run with: npx prisma db seed
 * Or: tsx prisma/seed-personalization.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot run seed.');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Create Sample User Knowledge Graphs
  // ─────────────────────────────────────────────────────────────────────────────

  const userKnowledgeGraph1 = await prisma.userKnowledgeGraph.upsert({
    where: { userId: 'user_1' },
    update: {},
    create: {
      userId: 'user_1',
      learningStyle: {
        prefersVisual: true,
        prefersExamples: true,
        prefersTheory: false,
        learnsByDoing: true,
        needsStepByStep: true,
        prefersAnalogy: true,
        hintLevelPreference: 1,
        explanationDensity: 'detailed',
        feedbackTiming: 'immediate',
      },
      strengths: ['two_pointer', 'sliding_window', 'hash_map'],
      weaknesses: ['dp', 'recursion', 'graph'],
      learningTrajectory: {
        startedAt: '2024-01-15',
        totalProblemsAttempted: 45,
        totalProblemsSolved: 32,
        averageTimePerProblem: 25,
        preferredDifficulty: 'medium',
      },
    },
  });

  const userKnowledgeGraph2 = await prisma.userKnowledgeGraph.upsert({
    where: { userId: 'user_2' },
    update: {},
    create: {
      userId: 'user_2',
      learningStyle: {
        prefersVisual: false,
        prefersExamples: true,
        prefersTheory: true,
        learnsByDoing: false,
        needsStepByStep: false,
        prefersAnalogy: false,
        hintLevelPreference: 2,
        explanationDensity: 'concise',
        feedbackTiming: 'on_request',
      },
      strengths: ['dp', 'recursion', 'tree'],
      weaknesses: ['two_pointer', 'sliding_window', 'graph'],
      learningTrajectory: {
        startedAt: '2024-02-01',
        totalProblemsAttempted: 78,
        totalProblemsSolved: 65,
        averageTimePerProblem: 18,
        preferredDifficulty: 'hard',
      },
    },
  });

  const userKnowledgeGraph3 = await prisma.userKnowledgeGraph.upsert({
    where: { userId: 'user_3' },
    update: {},
    create: {
      userId: 'user_3',
      learningStyle: {
        prefersVisual: true,
        prefersExamples: false,
        prefersTheory: true,
        learnsByDoing: true,
        needsStepByStep: true,
        prefersAnalogy: true,
        hintLevelPreference: 0,
        explanationDensity: 'comprehensive',
        feedbackTiming: 'immediate',
      },
      strengths: ['array_manipulation', 'hash_map', 'stack'],
      weaknesses: ['dp', 'graph', 'recursion'],
      learningTrajectory: {
        startedAt: '2024-03-10',
        totalProblemsAttempted: 23,
        totalProblemsSolved: 12,
        averageTimePerProblem: 35,
        preferredDifficulty: 'easy',
      },
    },
  });

  // Map userId strings to graph IDs for relations
  const graphIdMap: Record<string, string> = {
    'user_1': userKnowledgeGraph1.id,
    'user_2': userKnowledgeGraph2.id,
    'user_3': userKnowledgeGraph3.id,
  };

  console.log('✅ Created 3 user knowledge graphs');

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Create Concept Mastery Data
  // ─────────────────────────────────────────────────────────────────────────────

  const conceptMasteryData = [
    // User 1 - Strong in arrays/pointers, weak in DP
    { userId: 'user_1', conceptId: 'two_pointer', mastery: 85, practiceCount: 12, successRate: 0.92, difficultyRating: 2, confidenceRating: 4 },
    { userId: 'user_1', conceptId: 'sliding_window', mastery: 78, practiceCount: 8, successRate: 0.88, difficultyRating: 3, confidenceRating: 4 },
    { userId: 'user_1', conceptId: 'hash_map', mastery: 72, practiceCount: 10, successRate: 0.85, difficultyRating: 3, confidenceRating: 3 },
    { userId: 'user_1', conceptId: 'dp', mastery: 25, practiceCount: 5, successRate: 0.40, difficultyRating: 5, confidenceRating: 1 },
    { userId: 'user_1', conceptId: 'recursion', mastery: 35, practiceCount: 4, successRate: 0.50, difficultyRating: 4, confidenceRating: 2 },
    { userId: 'user_1', conceptId: 'graph', mastery: 30, practiceCount: 3, successRate: 0.33, difficultyRating: 5, confidenceRating: 1 },
    { userId: 'user_1', conceptId: 'binary_search', mastery: 65, practiceCount: 6, successRate: 0.83, difficultyRating: 3, confidenceRating: 3 },
    { userId: 'user_1', conceptId: 'stack', mastery: 70, practiceCount: 7, successRate: 0.86, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_1', conceptId: 'queue', mastery: 68, practiceCount: 5, successRate: 0.80, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_1', conceptId: 'tree', mastery: 45, practiceCount: 4, successRate: 0.50, difficultyRating: 4, confidenceRating: 2 },

    // User 2 - Strong in DP/recursion, weak in pointers
    { userId: 'user_2', conceptId: 'dp', mastery: 88, practiceCount: 15, successRate: 0.93, difficultyRating: 2, confidenceRating: 5 },
    { userId: 'user_2', conceptId: 'recursion', mastery: 82, practiceCount: 12, successRate: 0.92, difficultyRating: 2, confidenceRating: 4 },
    { userId: 'user_2', conceptId: 'tree', mastery: 75, practiceCount: 8, successRate: 0.88, difficultyRating: 3, confidenceRating: 4 },
    { userId: 'user_2', conceptId: 'two_pointer', mastery: 35, practiceCount: 4, successRate: 0.50, difficultyRating: 4, confidenceRating: 2 },
    { userId: 'user_2', conceptId: 'sliding_window', mastery: 40, practiceCount: 5, successRate: 0.60, difficultyRating: 4, confidenceRating: 2 },
    { userId: 'user_2', conceptId: 'graph', mastery: 55, practiceCount: 6, successRate: 0.67, difficultyRating: 4, confidenceRating: 3 },
    { userId: 'user_2', conceptId: 'hash_map', mastery: 70, practiceCount: 9, successRate: 0.78, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_2', conceptId: 'binary_search', mastery: 65, practiceCount: 7, successRate: 0.86, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_2', conceptId: 'heap', mastery: 60, practiceCount: 5, successRate: 0.80, difficultyRating: 3, confidenceRating: 3 },
    { userId: 'user_2', conceptId: 'greedy', mastery: 72, practiceCount: 8, successRate: 0.88, difficultyRating: 2, confidenceRating: 4 },

    // User 3 - Beginner, strong in basics, weak in advanced
    { userId: 'user_3', conceptId: 'array_manipulation', mastery: 75, practiceCount: 10, successRate: 0.80, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_3', conceptId: 'hash_map', mastery: 68, practiceCount: 8, successRate: 0.75, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_3', conceptId: 'stack', mastery: 65, practiceCount: 6, successRate: 0.83, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_3', conceptId: 'queue', mastery: 60, practiceCount: 5, successRate: 0.80, difficultyRating: 2, confidenceRating: 3 },
    { userId: 'user_3', conceptId: 'dp', mastery: 15, practiceCount: 2, successRate: 0.00, difficultyRating: 5, confidenceRating: 1 },
    { userId: 'user_3', conceptId: 'recursion', mastery: 20, practiceCount: 3, successRate: 0.33, difficultyRating: 5, confidenceRating: 1 },
    { userId: 'user_3', conceptId: 'graph', mastery: 10, practiceCount: 1, successRate: 0.00, difficultyRating: 5, confidenceRating: 1 },
    { userId: 'user_3', conceptId: 'tree', mastery: 25, practiceCount: 2, successRate: 0.50, difficultyRating: 4, confidenceRating: 2 },
    { userId: 'user_3', conceptId: 'two_pointer', mastery: 40, practiceCount: 4, successRate: 0.50, difficultyRating: 3, confidenceRating: 2 },
    { userId: 'user_3', conceptId: 'sliding_window', mastery: 35, practiceCount: 3, successRate: 0.33, difficultyRating: 4, confidenceRating: 2 },
  ];

  for (const data of conceptMasteryData) {
    const graphId = graphIdMap[data.userId];
    await prisma.conceptMastery.upsert({
      where: {
        userId_conceptId: {
          userId: graphId,
          conceptId: data.conceptId,
        },
      },
      update: {
        mastery: data.mastery,
        practiceCount: data.practiceCount,
        successRate: data.successRate,
        difficultyRating: data.difficultyRating,
        confidenceRating: data.confidenceRating,
        lastPracticed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        commonErrors: generateCommonErrors(data.conceptId, data.mastery),
        prerequisites: getPrerequisites(data.conceptId),
        dependents: getDependents(data.conceptId),
        nextReviewDue: calculateNextReviewDate(data.mastery),
      },
      create: {
        userId: graphId,
        conceptId: data.conceptId,
        mastery: data.mastery,
        practiceCount: data.practiceCount,
        successRate: data.successRate,
        difficultyRating: data.difficultyRating,
        confidenceRating: data.confidenceRating,
        lastPracticed: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        commonErrors: generateCommonErrors(data.conceptId, data.mastery),
        prerequisites: getPrerequisites(data.conceptId),
        dependents: getDependents(data.conceptId),
        nextReviewDue: calculateNextReviewDate(data.mastery),
      },
    });
  }

  console.log(`✅ Created ${conceptMasteryData.length} concept mastery records`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Create Learning Pattern Data
  // ─────────────────────────────────────────────────────────────────────────────

  const learningPatternData = [
    { userId: 'user_1', patternType: 'two_pointer', strength: 0.85, successRate: 0.92, preferredContext: ['array', 'sorting'] },
    { userId: 'user_1', patternType: 'sliding_window', strength: 0.78, successRate: 0.88, preferredContext: ['array', 'subarray'] },
    { userId: 'user_1', patternType: 'hash_map', strength: 0.72, successRate: 0.85, preferredContext: ['lookup', 'counting'] },
    { userId: 'user_1', patternType: 'dp', strength: 0.35, successRate: 0.40, preferredContext: ['optimization'] },
    { userId: 'user_1', patternType: 'recursion', strength: 0.40, successRate: 0.50, preferredContext: ['tree', 'divide'] },

    { userId: 'user_2', patternType: 'dp', strength: 0.88, successRate: 0.93, preferredContext: ['optimization', 'subproblems'] },
    { userId: 'user_2', patternType: 'recursion', strength: 0.82, successRate: 0.92, preferredContext: ['tree', 'divide'] },
    { userId: 'user_2', patternType: 'tree', strength: 0.75, successRate: 0.88, preferredContext: ['hierarchy', 'traversal'] },
    { userId: 'user_2', patternType: 'two_pointer', strength: 0.45, successRate: 0.50, preferredContext: ['array'] },
    { userId: 'user_2', patternType: 'sliding_window', strength: 0.50, successRate: 0.60, preferredContext: ['subarray'] },

    { userId: 'user_3', patternType: 'array_manipulation', strength: 0.75, successRate: 0.80, preferredContext: ['iteration', 'indexing'] },
    { userId: 'user_3', patternType: 'hash_map', strength: 0.68, successRate: 0.75, preferredContext: ['lookup'] },
    { userId: 'user_3', patternType: 'stack', strength: 0.65, successRate: 0.83, preferredContext: ['lifo', 'nesting'] },
    { userId: 'user_3', patternType: 'queue', strength: 0.60, successRate: 0.80, preferredContext: ['fifo', 'ordering'] },
    { userId: 'user_3', patternType: 'dp', strength: 0.20, successRate: 0.00, preferredContext: [] },
  ];

  for (const data of learningPatternData) {
    const graphId = graphIdMap[data.userId];
    // Find existing by userId (graph ID) and patternType
    const existing = await prisma.learningPattern.findFirst({
      where: {
        userId: graphId,
        patternType: data.patternType,
      },
    });

    if (existing) {
      await prisma.learningPattern.update({
        where: { id: existing.id },
        data: {
          strength: data.strength,
          successRate: data.successRate,
          preferredContext: data.preferredContext,
          lastUsed: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        },
      });
    } else {
      await prisma.learningPattern.create({
        data: {
          userId: graphId,
          patternType: data.patternType,
          strength: data.strength,
          successRate: data.successRate,
          preferredContext: data.preferredContext,
          lastUsed: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log(`✅ Created ${learningPatternData.length} learning pattern records`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Create Problem Attempt Data
  // ─────────────────────────────────────────────────────────────────────────────

  const problemAttemptData = [
    // User 1 attempts
    { userId: 'user_1', problemId: '1', problemSlug: 'two-sum', concepts: ['hash_map', 'array_manipulation'], patterns: ['hash_map'], attempts: 3, solved: true, timeSpent: 1200, firstAttemptSuccess: false, hintCount: 1, stageReached: 'REFLECT', rungReached: 6 },
    { userId: 'user_1', problemId: '167', problemSlug: 'two-sum-ii', concepts: ['two_pointer', 'array_manipulation'], patterns: ['two_pointer'], attempts: 2, solved: true, timeSpent: 900, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 6 },
    { userId: 'user_1', problemId: '3', problemSlug: 'longest-substring', concepts: ['sliding_window', 'hash_map'], patterns: ['sliding_window'], attempts: 4, solved: true, timeSpent: 1800, firstAttemptSuccess: false, hintCount: 2, stageReached: 'REFLECT', rungReached: 5 },
    { userId: 'user_1', problemId: '704', problemSlug: 'binary-search', concepts: ['binary_search', 'array_manipulation'], patterns: ['binary_search'], attempts: 2, solved: true, timeSpent: 600, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 6 },
    { userId: 'user_1', problemId: '300', problemSlug: 'longest-increasing-subsequence', concepts: ['dp', 'binary_search'], patterns: ['dp'], attempts: 5, solved: false, timeSpent: 2400, firstAttemptSuccess: false, hintCount: 3, stageReached: 'STUCK', rungReached: 3 },
    { userId: 'user_1', problemId: '20', problemSlug: 'valid-parentheses', concepts: ['stack', 'array_manipulation'], patterns: ['stack'], attempts: 2, solved: true, timeSpent: 720, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 6 },

    // User 2 attempts
    { userId: 'user_2', problemId: '70', problemSlug: 'climbing-stairs', concepts: ['dp', 'recursion'], patterns: ['dp'], attempts: 1, solved: true, timeSpent: 300, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 6 },
    { userId: 'user_2', problemId: '198', problemSlug: 'house-robber', concepts: ['dp', 'recursion'], patterns: ['dp'], attempts: 2, solved: true, timeSpent: 480, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 6 },
    { userId: 'user_2', problemId: '322', problemSlug: 'coin-change', concepts: ['dp', 'recursion'], patterns: ['dp'], attempts: 3, solved: true, timeSpent: 900, firstAttemptSuccess: false, hintCount: 1, stageReached: 'REFLECT', rungReached: 5 },
    { userId: 'user_2', problemId: '104', problemSlug: 'maximum-depth-of-binary-tree', concepts: ['tree', 'recursion'], patterns: ['recursion'], attempts: 1, solved: true, timeSpent: 240, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 6 },
    { userId: 'user_2', problemId: '15', problemSlug: '3sum', concepts: ['two_pointer', 'array_manipulation'], patterns: ['two_pointer'], attempts: 4, solved: false, timeSpent: 1800, firstAttemptSuccess: false, hintCount: 2, stageReached: 'STUCK', rungReached: 3 },
    { userId: 'user_2', problemId: '11', problemSlug: 'container-with-most-water', concepts: ['two_pointer', 'array_manipulation'], patterns: ['two_pointer'], attempts: 3, solved: true, timeSpent: 720, firstAttemptSuccess: false, hintCount: 1, stageReached: 'REFLECT', rungReached: 5 },

    // User 3 attempts
    { userId: 'user_3', problemId: '1', problemSlug: 'two-sum', concepts: ['hash_map', 'array_manipulation'], patterns: ['hash_map'], attempts: 5, solved: true, timeSpent: 1800, firstAttemptSuccess: false, hintCount: 3, stageReached: 'REFLECT', rungReached: 4 },
    { userId: 'user_3', problemId: '217', problemSlug: 'contains-duplicate', concepts: ['array_manipulation', 'hash_map'], patterns: ['hash_map'], attempts: 3, solved: true, timeSpent: 900, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 5 },
    { userId: 'user_3', problemId: '242', problemSlug: 'valid-anagram', concepts: ['array_manipulation', 'hash_map'], patterns: ['hash_map'], attempts: 2, solved: true, timeSpent: 480, firstAttemptSuccess: true, hintCount: 0, stageReached: 'REFLECT', rungReached: 6 },
    { userId: 'user_3', problemId: '20', problemSlug: 'valid-parentheses', concepts: ['stack', 'array_manipulation'], patterns: ['stack'], attempts: 4, solved: true, timeSpent: 1200, firstAttemptSuccess: false, hintCount: 2, stageReached: 'REFLECT', rungReached: 4 },
    { userId: 'user_3', problemId: '232', problemSlug: 'implement-queue-using-stacks', concepts: ['stack', 'queue'], patterns: ['stack'], attempts: 6, solved: false, timeSpent: 2400, firstAttemptSuccess: false, hintCount: 4, stageReached: 'STUCK', rungReached: 2 },
    { userId: 'user_3', problemId: '704', problemSlug: 'binary-search', concepts: ['binary_search', 'array_manipulation'], patterns: ['binary_search'], attempts: 3, solved: true, timeSpent: 720, firstAttemptSuccess: false, hintCount: 1, stageReached: 'REFLECT', rungReached: 5 },
  ];

  for (const data of problemAttemptData) {
    const graphId = graphIdMap[data.userId];
    // Use upsert to avoid duplicates - find by userId (graph ID) and problemId
    const existing = await prisma.problemAttempt.findFirst({
      where: {
        userId: graphId,
        problemId: data.problemId,
      },
    });

    if (existing) {
      await prisma.problemAttempt.update({
        where: { id: existing.id },
        data: {
          attempts: data.attempts,
          solved: data.solved,
          timeSpent: data.timeSpent,
          hintCount: data.hintCount,
          stageReached: data.stageReached,
          rungReached: data.rungReached,
          date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          errors: generateErrors(data.solved, data.concepts),
        },
      });
    } else {
      await prisma.problemAttempt.create({
        data: {
          userId: graphId,
          problemId: data.problemId,
          problemSlug: data.problemSlug,
          concepts: data.concepts,
          patterns: data.patterns,
          attempts: data.attempts,
          solved: data.solved,
          timeSpent: data.timeSpent,
          firstAttemptSuccess: data.firstAttemptSuccess,
          hintCount: data.hintCount,
          stageReached: data.stageReached,
          rungReached: data.rungReached,
          date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
          errors: generateErrors(data.solved, data.concepts),
        },
      });
    }
  }

  console.log(`✅ Created ${problemAttemptData.length} problem attempt records`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Create Misconception Data
  // ─────────────────────────────────────────────────────────────────────────────

  const misconceptionData = [
    { userId: 'user_1', conceptId: 'dp', description: 'Thinks DP always requires O(n²) space', detectedDate: new Date('2024-02-15'), corrected: false, relatedProblems: ['300', '322'] },
    { userId: 'user_1', conceptId: 'recursion', description: 'Confuses base case with recursive case', detectedDate: new Date('2024-03-01'), corrected: false, relatedProblems: ['104', '226'] },
    { userId: 'user_1', conceptId: 'two_pointer', description: 'Thinks pointers always move in same direction', detectedDate: new Date('2024-01-20'), corrected: true, correctionDate: new Date('2024-01-25'), relatedProblems: ['167', '11'] },

    { userId: 'user_2', conceptId: 'two_pointer', description: 'Forgets to sort array before using two pointers', detectedDate: new Date('2024-02-20'), corrected: false, relatedProblems: ['15', '11'] },
    { userId: 'user_2', conceptId: 'sliding_window', description: 'Doesn\'t handle window shrinking correctly', detectedDate: new Date('2024-03-05'), corrected: false, relatedProblems: ['3', '209'] },
    { userId: 'user_2', conceptId: 'graph', description: 'Confuses BFS with DFS for shortest path', detectedDate: new Date('2024-02-28'), corrected: true, correctionDate: new Date('2024-03-02'), relatedProblems: ['127', '733'] },

    { userId: 'user_3', conceptId: 'dp', description: 'Tries to solve DP problems with greedy approach', detectedDate: new Date('2024-03-15'), corrected: false, relatedProblems: ['70', '198'] },
    { userId: 'user_3', conceptId: 'recursion', description: 'Doesn\'t understand memoization necessity', detectedDate: new Date('2024-03-18'), corrected: false, relatedProblems: ['509', '70'] },
    { userId: 'user_3', conceptId: 'stack', description: 'Uses stack when queue is needed', detectedDate: new Date('2024-03-10'), corrected: true, correctionDate: new Date('2024-03-12'), relatedProblems: ['232', '641'] },
  ];

  for (const data of misconceptionData) {
    const graphId = graphIdMap[data.userId];
    // Check if misconception already exists
    const existing = await prisma.misconception.findFirst({
      where: {
        userId: graphId,
        conceptId: data.conceptId,
        description: data.description,
      },
    });

    if (existing) {
      await prisma.misconception.update({
        where: { id: existing.id },
        data: {
          corrected: data.corrected,
          correctionDate: data.correctionDate,
          relatedProblems: data.relatedProblems,
        },
      });
    } else {
      await prisma.misconception.create({
        data: {
          userId: graphId,
          conceptId: data.conceptId,
          description: data.description,
          detectedDate: data.detectedDate,
          corrected: data.corrected,
          correctionDate: data.correctionDate,
          relatedProblems: data.relatedProblems,
        },
      });
    }
  }

  console.log(`✅ Created ${misconceptionData.length} misconception records`);

  console.log('🎉 Seed completed successfully!');
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function generateCommonErrors(conceptId: string, mastery: number): any[] {
  const errorMap: Record<string, any[]> = {
    two_pointer: [
      { type: 'off_by_one', message: 'Pointer index out of bounds', occurrences: mastery < 50 ? 3 : 1 },
      { type: 'wrong_termination', message: 'Loop condition incorrect', occurrences: mastery < 50 ? 2 : 0 },
    ],
    sliding_window: [
      { type: 'edge_case_missed', message: 'Window size not handled correctly', occurrences: mastery < 50 ? 4 : 1 },
      { type: 'wrong_termination', message: 'Window shrink condition wrong', occurrences: mastery < 50 ? 2 : 0 },
    ],
    dp: [
      { type: 'wrong_algorithm', message: 'Using greedy instead of DP', occurrences: mastery < 50 ? 5 : 2 },
      { type: 'state_not_reset', message: 'DP state not properly initialized', occurrences: mastery < 50 ? 3 : 1 },
    ],
    recursion: [
      { type: 'infinite_loop', message: 'Missing base case', occurrences: mastery < 50 ? 4 : 1 },
      { type: 'stack_overflow', message: 'Too deep recursion', occurrences: mastery < 50 ? 2 : 0 },
    ],
    graph: [
      { type: 'wrong_algorithm', message: 'Using wrong traversal type', occurrences: mastery < 50 ? 3 : 1 },
      { type: 'edge_case_missed', message: 'Disconnected graph not handled', occurrences: mastery < 50 ? 2 : 0 },
    ],
    binary_search: [
      { type: 'off_by_one', message: 'Mid calculation overflow', occurrences: mastery < 50 ? 2 : 0 },
      { type: 'wrong_termination', message: 'Loop condition incorrect', occurrences: mastery < 50 ? 2 : 0 },
    ],
    hash_map: [
      { type: 'null_pointer', message: 'Key not found handling', occurrences: mastery < 50 ? 2 : 0 },
      { type: 'wrong_algorithm', message: 'Using array instead of hash map', occurrences: mastery < 50 ? 1 : 0 },
    ],
    stack: [
      { type: 'wrong_termination', message: 'Stack empty check missing', occurrences: mastery < 50 ? 2 : 0 },
      { type: 'logic_error', message: 'Push/pop order incorrect', occurrences: mastery < 50 ? 1 : 0 },
    ],
    queue: [
      { type: 'wrong_termination', message: 'Queue empty check missing', occurrences: mastery < 50 ? 2 : 0 },
      { type: 'logic_error', message: 'Enqueue/dequeue order incorrect', occurrences: mastery < 50 ? 1 : 0 },
    ],
    tree: [
      { type: 'null_pointer', message: 'Null child not handled', occurrences: mastery < 50 ? 3 : 1 },
      { type: 'wrong_algorithm', message: 'Wrong traversal order', occurrences: mastery < 50 ? 2 : 0 },
    ],
  };

  return errorMap[conceptId] || [];
}

function getPrerequisites(conceptId: string): string[] {
  const prereqMap: Record<string, string[]> = {
    two_pointer: ['array_manipulation'],
    sliding_window: ['two_pointer'],
    binary_search: ['array_manipulation'],
    dp: ['recursion'],
    recursion: [],
    graph: ['array_manipulation'],
    tree: ['recursion'],
    hash_map: ['array_manipulation'],
    stack: ['array_manipulation'],
    queue: ['array_manipulation'],
    heap: ['array_manipulation'],
    array_manipulation: [],
  };

  return prereqMap[conceptId] || [];
}

function getDependents(conceptId: string): string[] {
  const depMap: Record<string, string[]> = {
    array_manipulation: ['two_pointer', 'sliding_window', 'binary_search', 'hash_map', 'stack', 'queue', 'heap', 'graph'],
    two_pointer: ['sliding_window'],
    recursion: ['dp', 'tree'],
    graph: ['bfs', 'dfs', 'dijkstra'],
  };

  return depMap[conceptId] || [];
}

function calculateNextReviewDate(mastery: number): Date {
  const daysUntilReview = Math.max(1, Math.floor((100 - mastery) / 10));
  return new Date(Date.now() + daysUntilReview * 24 * 60 * 60 * 1000);
}

function generateErrors(solved: boolean, concepts: string[]): any[] {
  if (solved) return [];

  const errorTypes = [
    'off_by_one',
    'index_out_of_bounds',
    'null_pointer',
    'infinite_loop',
    'wrong_termination',
    'edge_case_missed',
    'wrong_algorithm',
  ];

  return errorTypes.slice(0, Math.floor(Math.random() * 3) + 1).map(type => ({
    type,
    message: `${type} error in ${concepts[0] || 'unknown'}`,
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
  }));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });