/**
 * Pure helper to build the dashboard "recent activity" rows from mentor
 * messages plus a lookup of real problem title/slug.
 *
 * Why extracted: the original code stored `msg.problemId` in both
 * `problemTitle` and `problemSlug`, which meant activity links went to
 * `/problems/${cuid}` and the UI showed cuid instead of the title.
 */

export type MentorMessageLite = {
  id: string;
  problemId: string;
  role: string;
  content: string;
  createdAt: Date;
};

export type ProblemLite = {
  id: string;
  slug: string;
  title: string;
};

export type RecentActivity = {
  id: string;
  type: 'review' | 'attempted';
  problemTitle: string;
  problemSlug: string;
  timestamp: string;
  detail: string;
};

export type BuildRecentActivityParams = {
  messages: ReadonlyArray<MentorMessageLite>;
  problemLookup: ReadonlyMap<string, ProblemLite>;
  /** Cap on output size. Default 10 (matches the upstream query). */
  limit?: number;
};

export function buildRecentActivity(params: BuildRecentActivityParams): RecentActivity[] {
  const limit = params.limit ?? 10;
  const out: RecentActivity[] = [];
  const seen = new Set<string>();

  for (const msg of params.messages) {
    if (seen.has(msg.problemId)) continue;
    seen.add(msg.problemId);
    const meta = params.problemLookup.get(msg.problemId);
    out.push({
      id: msg.id,
      type: msg.role === 'assistant' ? 'review' : 'attempted',
      problemTitle: meta?.title ?? msg.problemId,
      problemSlug: meta?.slug ?? msg.problemId,
      timestamp: msg.createdAt.toISOString(),
      detail: msg.content.slice(0, 120),
    });
    if (out.length >= limit) break;
  }
  return out;
}
