/**
 * Tests for updateAfterMentorInteraction — the personalization hook that
 * the orchestrator calls after every AI response (orchestrator.ts:393).
 *
 * If this function ever silently fails or skips, the personalization
 * pipeline is dead and dashboards never update from mentor interactions.
 */

jest.mock('@/lib/prisma', () => {
  const update = jest.fn();
  return {
    __esModule: true,
    default: {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      userKnowledgeGraph: {
        upsert: jest.fn().mockResolvedValue({ id: 'kg-1' }),
        findUnique: jest.fn(),
        update,
      },
      conceptMastery: {
        update,
        findUnique: jest.fn().mockResolvedValue(null),
      },
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
const mockCmUpdate = prisma.conceptMastery.update as unknown as jest.Mock;
const mockKgUpdate = prisma.userKnowledgeGraph.update as unknown as jest.Mock;

beforeEach(() => {
  mockUserFindUnique.mockClear();
  mockUpsert.mockClear();
  mockFindUnique.mockClear();
  mockCmUpdate.mockClear();
  mockKgUpdate.mockClear();
  mockUserFindUnique.mockResolvedValue({ id: 'user-1' });
  mockUpsert.mockResolvedValue({ id: 'kg-1' });
  mockFindUnique.mockResolvedValue({
    learningStyle: { prefersVisual: false, prefersExamples: true, learnsByDoing: true },
  });
  mockCmUpdate.mockResolvedValue({});
  mockKgUpdate.mockResolvedValue({});
});

describe('updateAfterMentorInteraction', () => {
  it('ensures the knowledge graph exists before any other write', async () => {
    const { updateAfterMentorInteraction } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterMentorInteraction(
      'user-1',
      { problemId: 'p1', concepts: ['arrays'], patterns: [], difficulty: 'EASY' },
      'visual',
      true,
    );

    expect(mockUpsert.mock.calls.length).toBeGreaterThan(0);
    // upsert happens with the userId we passed
    expect(mockUpsert.mock.calls[0][0].where).toEqual({ userId: 'user-1' });
  });

  it('increments confidenceRating per concept on a helpful interaction', async () => {
    const { updateAfterMentorInteraction } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterMentorInteraction(
      'user-1',
      { problemId: 'p1', concepts: ['arrays', 'hashing'], patterns: [], difficulty: 'MEDIUM' },
      'general',
      true,
    );

    const confidenceCalls = mockCmUpdate.mock.calls.filter(
      (c: unknown[]) => Array.isArray(c) && (c[0] as { data?: { confidenceRating?: unknown } })?.data?.confidenceRating !== undefined,
    );
    expect(confidenceCalls.length).toBe(2);
    for (const call of confidenceCalls) {
      expect((call[0] as { data: { confidenceRating: unknown } }).data.confidenceRating).toEqual({ increment: 1 });
    }
  });

  it('increments difficultyRating on an unhelpful interaction', async () => {
    const { updateAfterMentorInteraction } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterMentorInteraction(
      'user-1',
      { problemId: 'p1', concepts: ['arrays'], patterns: [], difficulty: 'MEDIUM' },
      'general',
      false,
    );

    const difficultyCalls = mockCmUpdate.mock.calls.filter(
      (c: unknown[]) => Array.isArray(c) && (c[0] as { data?: { difficultyRating?: unknown } })?.data?.difficultyRating !== undefined,
    );
    expect(difficultyCalls.length).toBe(1);
    expect((difficultyCalls[0][0] as { data: { difficultyRating: unknown } }).data.difficultyRating).toEqual({ increment: 0.5 });
  });

  it('updates learning style for visual intent when helpful', async () => {
    const { updateAfterMentorInteraction } = await import('@/lib/executor/personalizationUpdater');

    await updateAfterMentorInteraction(
      'user-1',
      { problemId: 'p1', concepts: [], patterns: [], difficulty: 'EASY' },
      'visual',
      true,
    );

    expect(mockKgUpdate).toHaveBeenCalled();
    const data = mockKgUpdate.mock.calls[0][0].data;
    expect(data.learningStyle.prefersVisual).toBe(true);
  });

  it('does not error when there are no concepts (empty concepts array)', async () => {
    const { updateAfterMentorInteraction } = await import('@/lib/executor/personalizationUpdater');

    await expect(
      updateAfterMentorInteraction(
        'user-1',
        { problemId: 'p1', concepts: [], patterns: [], difficulty: 'EASY' },
        'general',
        true,
      ),
    ).resolves.toBeUndefined();
  });
});
