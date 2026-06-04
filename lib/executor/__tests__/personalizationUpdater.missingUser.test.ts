/**
 * Regression tests for the P2003 foreign-key violation seen in the wild
 * when `updateAfterExecution` (or its siblings) is called with a `userId`
 * that has no matching `User` row.
 *
 * Before the fix: `prisma.userKnowledgeGraph.upsert` would crash with
 *   `Foreign key constraint violated on the constraint:
 *    'UserKnowledgeGraph_userId_fkey'` (P2003)
 * because `upsert()` does not create the parent row, only the child.
 *
 * After the fix: `ensureKnowledgeGraph` checks the parent exists first
 * and returns `null`. All callers short-circuit on `null` and the
 * personalization pipeline no-ops gracefully. The route's try/catch
 * around `updateAfterExecution` then returns 200 instead of 500.
 */

jest.mock('@/lib/prisma', () => {
  const userFindUnique = jest.fn();
  const userKgUpsert = jest.fn();
  const userKgFindUnique = jest.fn();
  const userKgUpdate = jest.fn();
  const conceptFindUnique = jest.fn();
  const conceptCreate = jest.fn();
  const conceptUpdate = jest.fn();
  const learningPatternFindFirst = jest.fn();
  const learningPatternUpdate = jest.fn();
  const learningPatternCreate = jest.fn();
  const problemStatsUpsert = jest.fn();
  const problemAttemptCreate = jest.fn();

  return {
    __esModule: true,
    default: {
      user: { findUnique: userFindUnique },
      userKnowledgeGraph: {
        upsert: userKgUpsert,
        findUnique: userKgFindUnique,
        update: userKgUpdate,
      },
      conceptMastery: {
        findUnique: conceptFindUnique,
        create: conceptCreate,
        update: conceptUpdate,
      },
      learningPattern: {
        findFirst: learningPatternFindFirst,
        update: learningPatternUpdate,
        create: learningPatternCreate,
      },
      userProblemStats: { upsert: problemStatsUpsert },
      problemAttempt: { create: problemAttemptCreate },
    },
  };
});

jest.mock('@/lib/mentor/personalizationEngine', () => ({
  updateConceptMastery: jest.fn(),
  calculateNextReview: jest.fn().mockReturnValue(new Date()),
  CONCEPT_DEPENDENCIES: {},
}));

import prisma from '@/lib/prisma';

const mockUserFindUnique = prisma.user.findUnique as unknown as jest.Mock;
const mockUpsert = prisma.userKnowledgeGraph.upsert as unknown as jest.Mock;
const mockFindUnique = prisma.userKnowledgeGraph.findUnique as unknown as jest.Mock;
const mockKgUpdate = prisma.userKnowledgeGraph.update as unknown as jest.Mock;
const mockConceptFindUnique = prisma.conceptMastery.findUnique as unknown as jest.Mock;
const mockConceptCreate = prisma.conceptMastery.create as unknown as jest.Mock;
const mockConceptUpdate = prisma.conceptMastery.update as unknown as jest.Mock;
const mockPatternFindFirst = prisma.learningPattern.findFirst as unknown as jest.Mock;
const mockPatternCreate = prisma.learningPattern.create as unknown as jest.Mock;
const mockPatternUpdate = prisma.learningPattern.update as unknown as jest.Mock;
const mockProblemStatsUpsert = prisma.userProblemStats.upsert as unknown as jest.Mock;
const mockProblemAttemptCreate = prisma.problemAttempt.create as unknown as jest.Mock;

const validProblemContext = {
  problemId: 'p1',
  concepts: ['arrays'],
  patterns: ['two_pointer'],
  difficulty: 'EASY' as const,
};

function mockHappyPath() {
  mockUserFindUnique.mockResolvedValue({ id: 'user-1' });
  mockUpsert.mockResolvedValue({ id: 'kg-1' });
  mockConceptFindUnique.mockResolvedValue({
    mastery: 50,
    practiceCount: 0,
    commonErrors: [],
  });
  mockConceptUpdate.mockResolvedValue({});
  mockPatternFindFirst.mockResolvedValue(null);
  mockPatternCreate.mockResolvedValue({});
  mockProblemStatsUpsert.mockResolvedValue({});
}

function mockMissingUser() {
  mockUserFindUnique.mockResolvedValue(null);
}

beforeEach(() => {
  jest.clearAllMocks();
  // Suppress the expected console.warn during these tests so the test
  // runner output stays clean. We re-enable it in the dedicated log test.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore?.();
});

describe('ensureKnowledgeGraph — FK guard (P2003 regression)', () => {
  it('updateAfterExecution returns without throwing when the user does not exist', async () => {
    mockMissingUser();
    const { updateAfterExecution } = await import('@/lib/executor/personalizationUpdater');

    await expect(
      updateAfterExecution('ghost-user', validProblemContext, {
        passed: false,
        testResults: [{ passed: false, input: '1', expected: '2', actual: '1' }],
        runtime: 100,
      }),
    ).resolves.toBeUndefined();

    // The userKnowledgeGraph.upsert that previously threw P2003 was NEVER
    // called. This is the assertion that proves the regression is fixed.
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('updateAfterExecution does not write concept mastery, patterns, or problem stats when the user is missing', async () => {
    mockMissingUser();
    const { updateAfterExecution } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterExecution('ghost-user', validProblemContext, {
      passed: false,
      testResults: [{ passed: false, input: '1', expected: '2', actual: '1' }],
      runtime: 100,
    });

    // Every personalization write that would have touched the DB should
    // have been skipped. These are the calls that previously cascaded
    // from the failed upsert.
    expect(mockConceptFindUnique).not.toHaveBeenCalled();
    expect(mockConceptCreate).not.toHaveBeenCalled();
    expect(mockPatternFindFirst).not.toHaveBeenCalled();
    expect(mockProblemStatsUpsert).not.toHaveBeenCalled();
  });

  it('logs a warning naming the missing userId for observability', async () => {
    mockMissingUser();
    const warnSpy = console.warn as jest.Mock;
    const { updateAfterExecution } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterExecution('ghost-user', validProblemContext, {
      passed: true,
      testResults: [{ passed: true, input: '1', expected: '1', actual: '1' }],
      runtime: 50,
    });

    expect(warnSpy).toHaveBeenCalled();
    const messages = warnSpy.mock.calls.map((c) => String(c[0] ?? ''));
    expect(messages.some((m) => m.includes('ghost-user'))).toBe(true);
  });

  it('updateAfterMentorInteraction no-ops when the user is missing', async () => {
    mockMissingUser();
    const { updateAfterMentorInteraction } = await import('@/lib/executor/personalizationUpdater');

    await expect(
      updateAfterMentorInteraction('ghost-user', validProblemContext, 'visual', true),
    ).resolves.toBeUndefined();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockConceptUpdate).not.toHaveBeenCalled();
    expect(mockKgUpdate).not.toHaveBeenCalled();
  });

  it('updateAfterSolve no-ops when the user is missing', async () => {
    mockMissingUser();
    const { updateAfterSolve } = await import('@/lib/executor/personalizationUpdater');

    await expect(
      updateAfterSolve('ghost-user', validProblemContext, 100, 1, 0),
    ).resolves.toBeUndefined();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockProblemAttemptCreate).not.toHaveBeenCalled();
  });

  it('happy path: ensureKnowledgeGraph still upserts when the user exists', async () => {
    mockHappyPath();
    const { updateAfterExecution } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterExecution('user-1', validProblemContext, {
      passed: true,
      testResults: [{ passed: true, input: '1', expected: '1', actual: '1' }],
      runtime: 50,
    });

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true },
    });
    expect(mockUpsert).toHaveBeenCalled();
  });
});
