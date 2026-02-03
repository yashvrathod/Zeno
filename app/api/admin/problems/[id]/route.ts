import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

type UpdateProblemBody = Partial<{
  slug: string;
  title: string;
  statementMd: string;
  constraintsMd: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  isPublished: boolean;
  tags: string[];
  patternIds: string[];
  hints: string[];
  starterCode: Record<string, string>;
  testCases: Array<{ input: string; expected: string; isHidden?: boolean }>;
}>;

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const problem = await prisma.problem.findUnique({
    where: { id },
    include: {
      patterns: { include: { pattern: true } },
      hints: { orderBy: { order: 'asc' } },
      testCases: { orderBy: [{ isHidden: 'asc' }, { order: 'asc' }] },
    },
  });

  if (!problem) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({
    problem: {
      ...problem,
      patternIds: problem.patterns.map((p) => p.patternId),
      patterns: problem.patterns.map((p) => p.pattern),
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = (await req.json()) as UpdateProblemBody;

  // Update scalar fields
  const updated = await prisma.problem.update({
    where: { id },
    data: {
      slug: typeof body.slug === 'string' ? body.slug.trim() : undefined,
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
      statementMd: typeof body.statementMd === 'string' ? body.statementMd : undefined,
      constraintsMd: body.constraintsMd !== undefined ? body.constraintsMd : undefined,
      difficulty: (body.difficulty as any) ?? undefined,
      isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      starterCode: body.starterCode ?? undefined,
    },
    select: { id: true },
  });

  // Replace patterns/hints/testCases if provided
  if (Array.isArray(body.patternIds)) {
    await prisma.problemPattern.deleteMany({ where: { problemId: id } });
    await prisma.problemPattern.createMany({
      data: body.patternIds.map((patternId) => ({ problemId: id, patternId })),
    });
  }

  if (Array.isArray(body.hints)) {
    await prisma.hint.deleteMany({ where: { problemId: id } });
    await prisma.hint.createMany({
      data: body.hints.map((textMd, idx) => ({ problemId: id, order: idx + 1, textMd })),
    });
  }

  if (Array.isArray(body.testCases)) {
    await prisma.testCase.deleteMany({ where: { problemId: id } });
    await prisma.testCase.createMany({
      data: body.testCases.map((tc, idx) => ({
        problemId: id,
        order: idx + 1,
        input: tc.input,
        expected: tc.expected,
        isHidden: tc.isHidden ?? false,
      })),
    });
  }

  return NextResponse.json({ problem: updated });
}
