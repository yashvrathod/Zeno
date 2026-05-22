import prisma from '@/lib/prisma';

const statsSelect = {
  runCount: true, submitCount: true, acceptedCount: true,
  wrongAnswerCount: true, runtimeErrorCount: true, lastStatus: true, lastError: true,
} as const;

export async function findProblemStats(userId: string, problemId: string) {
  return prisma.userProblemStats.findUnique({
    where: { userId_problemId: { userId, problemId } },
    select: statsSelect,
  });
}

export type ProblemStatsResult = Awaited<ReturnType<typeof findProblemStats>>;
