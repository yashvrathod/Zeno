import { findProblemBySlug, findProblemById } from '../problemRepository';
import { findUserSettings } from '../userSettingsRepository';
import { findProblemStats } from '../statsRepository';
import { findConversationSummary } from '../conversationSummaryRepository';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    problem: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'p1', slug: 'two-sum', title: 'Two Sum',
        statementMd: 'Find two numbers that add up to target.',
        difficulty: 'EASY', tags: ['array'], patterns: [],
      }),
    },
    userAiSettings: {
      findUnique: jest.fn().mockResolvedValue({
        apiProvider: 'groq', groqApiKey: null,
      }),
    },
    userProblemStats: {
      findUnique: jest.fn().mockResolvedValue({
        runCount: 5, submitCount: 3, acceptedCount: 2,
        wrongAnswerCount: 1, runtimeErrorCount: 0, lastStatus: 'accepted', lastError: null,
      }),
    },
    mentorConversationSummary: {
      findUnique: jest.fn().mockResolvedValue({
        summaryMd: 'User solved with two-pointer approach.',
        messageCount: 12, lastRung: 4,
      }),
    },
  },
}));

describe('problemRepository', () => {
  it('findProblemBySlug returns problem with patterns', async () => {
    const problem = await findProblemBySlug('two-sum');
    expect(problem).not.toBeNull();
    expect(problem!.slug).toBe('two-sum');
    expect(problem!.patterns).toBeDefined();
  });

  it('findProblemById returns problem by id', async () => {
    const problem = await findProblemById('p1');
    expect(problem).not.toBeNull();
  });
});

describe('userSettingsRepository', () => {
  it('findUserSettings returns settings with select fields', async () => {
    const settings = await findUserSettings('u1');
    expect(settings).not.toBeNull();
    expect(settings).toHaveProperty('apiProvider');
  });
});

describe('statsRepository', () => {
  it('findProblemStats returns stats', async () => {
    const stats = await findProblemStats('u1', 'p1');
    expect(stats).not.toBeNull();
    expect(stats!.runCount).toBe(5);
  });
});

describe('conversationSummaryRepository', () => {
  it('findConversationSummary returns summary', async () => {
    const summary = await findConversationSummary('u1', 'p1');
    expect(summary).not.toBeNull();
    expect(summary!.lastRung).toBe(4);
  });
});
