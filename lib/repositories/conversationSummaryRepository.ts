import prisma from '@/lib/prisma';

const summarySelect = {
  summaryMd: true, messageCount: true, lastRung: true,
} as const;

export async function findConversationSummary(userId: string, problemId: string) {
  return prisma.mentorConversationSummary.findUnique({
    where: { userId_problemId: { userId, problemId } },
    select: summarySelect,
  });
}

export async function upsertConversationSummary(
  userId: string,
  problemId: string,
  data: {
    summaryMd?: string;
    messageCount?: number;
    lastRung?: number;
    status?: string;
  },
) {
  return prisma.mentorConversationSummary.upsert({
    where: { userId_problemId: { userId, problemId } },
    create: { userId, problemId, ...data, summaryMd: data.summaryMd || '' },
    update: data,
  });
}

export type ConversationSummaryResult = Awaited<ReturnType<typeof findConversationSummary>>;
