export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { isPrismaKnownError, prismaErrorToHttp } from '@/lib/httpErrors';
import { CreateProblemSchema, normalizeTestCases } from '@/lib/validation/adminProblem';

export async function GET() {
  // const admin = await requireAdmin();
  // if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = true;
  
  const problems = await prisma.problem.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      isPublished: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ problems });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const json = await req.json();
    const body = CreateProblemSchema.parse(json);

    // Normalize per LeetCode semantics: public and hidden orders both start at 1.
    const normalizedTestCases = normalizeTestCases(body.testCases);

    const problem = await prisma.$transaction(async (tx) => {
      const created = await tx.problem.create({
        data: {
          slug: body.slug,
          title: body.title,
          statementMd: body.statementMd,
          constraintsMd: body.constraintsMd ?? null,
          difficulty: body.difficulty,
          isPublished: body.isPublished,
          tags: body.tags,
          starterCode: body.starterCode,
        },
        select: { id: true, slug: true },
      });

      if (body.patternIds.length) {
        await tx.problemPattern.createMany({
          data: body.patternIds.map((patternId) => ({ problemId: created.id, patternId })),
          skipDuplicates: true,
        });
      }

      if (body.hints.length) {
        await tx.hint.createMany({
          data: body.hints
            .map((textMd) => textMd.trim())
            .filter(Boolean)
            .map((textMd, idx) => ({ problemId: created.id, order: idx + 1, textMd })),
        });
      }

      if (normalizedTestCases.length) {
        await tx.testCase.createMany({
          data: normalizedTestCases.map((tc) => ({
            problemId: created.id,
            order: tc.order,
            input: tc.input,
            expected: tc.expected,
            isHidden: tc.isHidden,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ problem });
  } catch (e: unknown) {
    if (isPrismaKnownError(e)) {
      const { status, message } = prismaErrorToHttp(e);
      return NextResponse.json({ error: message }, { status });
    }

    // zod error or generic error
    const message = e instanceof Error ? e.message : 'Failed to create problem';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
