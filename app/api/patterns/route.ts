export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Public endpoint used by the Problems page.
 * Returns patterns + their published problems.
 * Hidden test cases are NOT returned here.
 */
export async function GET() {
  const patterns = await prisma.pattern.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      problems: {
        select: {
          problem: {
            select: {
              id: true,
              slug: true,
              title: true,
              difficulty: true,
              updatedAt: true,
              isPublished: true,
            },
          },
        },
      },
    },
  });

  const out = patterns.map((p) => {
    const publishedProblems = p.problems
      .map((pp) => pp.problem)
      .filter((pr) => pr.isPublished)
      // keep stable order (latest first) - change as you like
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      problemCount: publishedProblems.length,
      problems: publishedProblems.map((pr) => ({
        id: pr.id,
        slug: pr.slug,
        title: pr.title,
        difficulty: pr.difficulty,
      })),
    };
  });

  return NextResponse.json({ patterns: out });
}
