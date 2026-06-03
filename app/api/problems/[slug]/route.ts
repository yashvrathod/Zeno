import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    const problem = await prisma.problem.findFirst({
      where: {
        OR: [
          { id: slug },
          { slug: slug }
        ]
      },
      include: {
        patterns: { include: { pattern: true } },
        hints: { orderBy: { order: 'asc' } },
        testCases: {
          where: { isHidden: false },
          orderBy: { order: 'asc' },
          select: { id: true, order: true, input: true, expected: true, isHidden: true },
        },
      },
    });

    if (!problem || !problem.isPublished) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      problem: {
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        statementMd: problem.statementMd,
        constraintsMd: problem.constraintsMd,
        difficulty: problem.difficulty,
        patterns: problem.patterns.map((p) => ({ id: p.pattern.id, name: p.pattern.name })),
        hints: problem.hints.map((h) => h.textMd),
        testCases: problem.testCases.map((tc) => ({
          id: tc.id,
          order: tc.order,
          input: tc.input,
          expected: tc.expected,
          isSample: !tc.isHidden,
        })),
        publicTestCases: problem.testCases.map(({ order, input, expected }) => ({ order, input, expected })),
        starterCode: problem.starterCode ?? {},
        animationType: problem.animationType,
        animationData: problem.animationData,
      },
    });
  } catch (error) {
    console.error('Problem fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to load problem' },
      { status: 500 }
    );
  }
}
