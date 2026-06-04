/**
 * Regression test for the bug where ProblemAttempt.problemSlug was
 * incorrectly stored as the problemId. The fix has two layers:
 *
 *   1. ProblemContext accepts an optional `problemSlug` field.
 *   2. recordProblemAttempt falls back to a prisma lookup if no slug
 *      is passed, so old call sites that only send problemId still
 *      produce a real slug in the persisted row.
 *
 * This test mocks prisma and exercises both layers.
 */

// The module under test imports `@/lib/prisma` and other heavy deps. We
// jest.mock them at the top of the file before the import statement.
jest.mock('@/lib/prisma', () => {
  const create = jest.fn();
  const upsert = jest.fn();
  return {
    __esModule: true,
    default: {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      userKnowledgeGraph: {
        upsert: jest.fn().mockResolvedValue({ id: 'kg-1' }),
      },
      userProblemStats: {
        upsert,
      },
      problem: {
        findUnique: jest.fn().mockResolvedValue({ slug: 'two-sum' }),
      },
      problemAttempt: {
        create,
      },
    },
  };
});

// The personalization updater also imports things that pull in
// `@/lib/mentor/personalizationEngine`. Stub the engine + dependencies
// that the test path doesn't exercise.
jest.mock('@/lib/mentor/personalizationEngine', () => ({
  updateConceptMastery: jest.fn(),
  calculateNextReview: jest.fn().mockReturnValue(new Date()),
  CONCEPT_DEPENDENCIES: {},
}));

import prisma from '@/lib/prisma';

const mockUserFindUnique = prisma.user.findUnique as unknown as jest.Mock;
const mockCreate = prisma.problemAttempt.create as unknown as jest.Mock;
const mockProblemFindUnique = prisma.problem.findUnique as unknown as jest.Mock;
const mockStatsUpsert = prisma.userProblemStats.upsert as unknown as jest.Mock;

beforeEach(() => {
  mockUserFindUnique.mockClear();
  mockCreate.mockClear();
  mockProblemFindUnique.mockClear();
  mockStatsUpsert.mockClear();
  mockUserFindUnique.mockResolvedValue({ id: 'user-1' });
  mockCreate.mockResolvedValue({});
  mockProblemFindUnique.mockResolvedValue({ slug: 'two-sum' });
  mockStatsUpsert.mockResolvedValue({});
});

describe('recordProblemAttempt problemSlug resolution', () => {
  it('uses ProblemContext.problemSlug when supplied', async () => {
    const { updateAfterSolve } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterSolve(
      'user-1',
      {
        problemId: 'problem-1',
        problemSlug: 'two-sum',
        concepts: ['arrays'],
        patterns: ['two_pointer'],
        difficulty: 'EASY',
      },
      1200,
      1,
      0,
    );

    expect(mockProblemFindUnique).not.toHaveBeenCalled();
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.problemSlug).toBe('two-sum');
    expect(data.problemId).toBe('problem-1');
  });

  it('looks up the slug from the DB when ProblemContext.problemSlug is omitted', async () => {
    const { updateAfterSolve } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterSolve(
      'user-1',
      {
        problemId: 'problem-2',
        concepts: [],
        patterns: [],
        difficulty: 'MEDIUM',
      } as any,
      500,
      2,
      1,
    );

    expect(mockProblemFindUnique).toHaveBeenCalledWith({
      where: { id: 'problem-2' },
      select: { slug: true },
    });
    const data = mockCreate.mock.calls[0][0].data;
    expect(data.problemSlug).toBe('two-sum');
    // Critical: must NOT be the problemId
    expect(data.problemSlug).not.toBe('problem-2');
  });

  it('falls back to problemId only if the problem row is missing', async () => {
    mockProblemFindUnique.mockResolvedValueOnce(null);
    const { updateAfterSolve } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterSolve(
      'user-1',
      {
        problemId: 'orphan-id',
        concepts: [],
        patterns: [],
        difficulty: 'HARD',
      } as any,
      100,
      1,
      0,
    );

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.problemSlug).toBe('orphan-id');
  });
});
