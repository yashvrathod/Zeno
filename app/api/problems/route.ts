import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const problems = await prisma.problem.findMany({
    where: { isPublished: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      updatedAt: true,
      patterns: { include: { pattern: true } },
    },
  });

  return NextResponse.json({
    problems: problems.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      updatedAt: p.updatedAt,
      patterns: p.patterns.map((pp) => ({ id: pp.pattern.id, name: pp.pattern.name })),
    })),
  });
}
