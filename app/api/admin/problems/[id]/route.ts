export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { isPrismaKnownError, prismaErrorToHttp } from '@/lib/httpErrors';
import { UpdateProblemSchema, normalizeTestCases } from '@/lib/validation/adminProblem';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  // const admin = await requireAdmin();
  // if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const admin = true;

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

  try {
    const json = await req.json();
    const body = UpdateProblemSchema.parse(json);

    const normalizedTestCases = body.testCases ? normalizeTestCases(body.testCases) : null;

    const updated = await prisma.$transaction(async (tx) => {
      const scalar = await tx.problem.update({
        where: { id },
        data: {
          slug: typeof body.slug === 'string' ? body.slug.trim() : undefined,
          title: typeof body.title === 'string' ? body.title.trim() : undefined,
          statementMd: typeof body.statementMd === 'string' ? body.statementMd : undefined,
          constraintsMd: body.constraintsMd !== undefined ? body.constraintsMd : undefined,
          difficulty: body.difficulty,
          isPublished: body.isPublished,
          tags: body.tags,
          starterCode: body.starterCode,
          animationType: body.animationType,
          animationData: body.animationData,
        },
        select: { id: true },
      });

      if (Array.isArray(body.patternIds)) {
        await tx.problemPattern.deleteMany({ where: { problemId: id } });
        if (body.patternIds.length) {
          await tx.problemPattern.createMany({
            data: body.patternIds.map((patternId) => ({ problemId: id, patternId })),
            skipDuplicates: true,
          });
        }
      }

      if (Array.isArray(body.hints)) {
        await tx.hint.deleteMany({ where: { problemId: id } });
        const cleaned = body.hints.map((h) => h.trim()).filter(Boolean);
        if (cleaned.length) {
          await tx.hint.createMany({
            data: cleaned.map((textMd, idx) => ({ problemId: id, order: idx + 1, textMd })),
          });
        }
      }

      if (normalizedTestCases) {
        await tx.testCase.deleteMany({ where: { problemId: id } });
        if (normalizedTestCases.length) {
          await tx.testCase.createMany({
            data: normalizedTestCases.map((tc) => ({
              problemId: id,
              order: tc.order,
              input: tc.input,
              expected: tc.expected,
              isHidden: tc.isHidden,
            })),
          });
        }
      }

      return scalar;
    });

    return NextResponse.json({ problem: updated });
  } catch (e: unknown) {
    if (isPrismaKnownError(e)) {
      const { status, message } = prismaErrorToHttp(e);
      return NextResponse.json({ error: message }, { status });
    }

    const message = e instanceof Error ? e.message : 'Save failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
