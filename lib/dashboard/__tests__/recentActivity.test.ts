import { buildRecentActivity } from '@/lib/dashboard/recentActivity';

describe('buildRecentActivity', () => {
  const lookup = new Map([
    ['p-1', { id: 'p-1', slug: 'two-sum', title: 'Two Sum' }],
    ['p-2', { id: 'p-2', slug: 'reverse-linked-list', title: 'Reverse Linked List' }],
  ]);

  it('uses real problem title and slug from the lookup', () => {
    const out = buildRecentActivity({
      messages: [
        { id: 'm-1', problemId: 'p-1', role: 'user', content: 'I think we should...', createdAt: new Date('2026-06-01T00:00:00Z') },
      ],
      problemLookup: lookup,
    });
    expect(out).toHaveLength(1);
    expect(out[0].problemTitle).toBe('Two Sum');
    expect(out[0].problemSlug).toBe('two-sum');
  });

  it('falls back to problemId when the problem is not in the lookup', () => {
    const out = buildRecentActivity({
      messages: [
        { id: 'm-1', problemId: 'p-missing', role: 'user', content: 'hi', createdAt: new Date() },
      ],
      problemLookup: lookup,
    });
    expect(out[0].problemTitle).toBe('p-missing');
    expect(out[0].problemSlug).toBe('p-missing');
  });

  it('dedupes per problem — first message wins', () => {
    const out = buildRecentActivity({
      messages: [
        { id: 'm-1', problemId: 'p-1', role: 'user', content: 'first', createdAt: new Date('2026-06-02T00:00:00Z') },
        { id: 'm-2', problemId: 'p-1', role: 'assistant', content: 'second', createdAt: new Date('2026-06-01T00:00:00Z') },
        { id: 'm-3', problemId: 'p-2', role: 'user', content: 'third', createdAt: new Date('2026-05-30T00:00:00Z') },
      ],
      problemLookup: lookup,
    });
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('m-1');
    expect(out[0].problemSlug).toBe('two-sum');
    expect(out[1].problemSlug).toBe('reverse-linked-list');
  });

  it('maps assistant role to "review" and user role to "attempted"', () => {
    const out = buildRecentActivity({
      messages: [
        { id: 'a', problemId: 'p-1', role: 'assistant', content: 'ok', createdAt: new Date() },
        { id: 'b', problemId: 'p-2', role: 'user', content: 'ok', createdAt: new Date() },
      ],
      problemLookup: lookup,
    });
    expect(out.find((r) => r.id === 'a')?.type).toBe('review');
    expect(out.find((r) => r.id === 'b')?.type).toBe('attempted');
  });

  it('truncates detail to 120 chars', () => {
    const long = 'x'.repeat(500);
    const out = buildRecentActivity({
      messages: [{ id: 'a', problemId: 'p-1', role: 'user', content: long, createdAt: new Date() }],
      problemLookup: lookup,
    });
    expect(out[0].detail).toHaveLength(120);
  });

  it('respects the limit', () => {
    const messages = Array.from({ length: 20 }, (_, i) => ({
      id: `m-${i}`,
      problemId: `p-${i}`,
      role: 'user',
      content: 'x',
      createdAt: new Date(),
    }));
    const lookupBig = new Map(messages.map((m) => [m.problemId, { id: m.problemId, slug: `slug-${m.problemId}`, title: `Title ${m.problemId}` }]));
    const out = buildRecentActivity({ messages, problemLookup: lookupBig, limit: 5 });
    expect(out).toHaveLength(5);
  });
});
