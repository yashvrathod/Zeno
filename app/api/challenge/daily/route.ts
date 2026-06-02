import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export async function GET() {
  const problems = await prisma.problem.findMany({
    where: { isPublished: true },
    select: { id: true, slug: true, title: true, difficulty: true },
  });

  if (problems.length === 0) {
    return NextResponse.json({ problem: null });
  }

  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const idx = Math.floor(seededRandom(dateSeed) * problems.length);
  const problem = problems[idx];

  const stats = await prisma.userProblemStats.groupBy({
    by: ['problemId'],
    where: { problemId: problem.id, acceptedCount: { gt: 0 } },
    _count: true,
  });

  return NextResponse.json({
    problem: {
      ...problem,
      totalSolvers: stats[0]?._count ?? 0,
    },
    date: today.toISOString().split('T')[0],
  });
}
