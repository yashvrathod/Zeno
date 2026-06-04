import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { buildStreakHeatmap, buildWeeklySolves, type StreakDay, type WeeklySolvePoint } from '@/lib/profile/streak';

export const runtime = 'nodejs';

const HEATMAP_DAYS = 105;
const WEEKLY_BUCKETS = 10;

export type ProfileStats = {
  currentStreak: number;
  longestStreak: number;
  totalSolved: number;
  totalAttempted: number;
  heatmap: StreakDay[];
  weeklySolves: WeeklySolvePoint[];
  hasAnyActivity: boolean;
  recentSolvedProblems: Array<{
    title: string;
    slug: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    solvedAt: string;
  }>;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, solvedStats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        totalSolved: true,
      },
    }),
    prisma.userProblemStats.findMany({
      where: { userId, acceptedCount: { gt: 0 }, solvedAt: { not: null } },
      orderBy: { solvedAt: 'desc' },
      take: 200,
      select: {
        problemId: true,
        solvedAt: true,
        problem: { select: { slug: true, title: true, difficulty: true } },
      },
    }),
  ]);

  const acceptedAt = solvedStats
    .map((s) => s.solvedAt)
    .filter((d): d is Date => d !== null);

  const heatmap = buildStreakHeatmap({ acceptedAt, days: HEATMAP_DAYS });
  const weeklySolves = buildWeeklySolves(acceptedAt, WEEKLY_BUCKETS);
  const hasAnyActivity = acceptedAt.length > 0;

  const totalAttempted = await prisma.userProblemStats.count({ where: { userId } });
  const totalSolved = user?.totalSolved ?? acceptedAt.length;

  const recentSolvedProblems = solvedStats.slice(0, 10).map((s) => ({
    title: s.problem.title,
    slug: s.problem.slug,
    difficulty: s.problem.difficulty,
    solvedAt: (s.solvedAt ?? new Date(0)).toISOString(),
  }));

  const body: ProfileStats = {
    currentStreak: user?.currentStreak ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    totalSolved,
    totalAttempted,
    heatmap,
    weeklySolves,
    hasAnyActivity,
    recentSolvedProblems,
  };

  return NextResponse.json({ stats: body });
}
