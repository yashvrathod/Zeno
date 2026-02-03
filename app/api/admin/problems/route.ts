import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

type CreateProblemBody = {
  slug: string;
  title: string;
  statementMd: string;
  constraintsMd?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  isPublished?: boolean;
  tags?: string[];
  patternIds?: string[];
  hints?: string[]; // markdown strings in order
  starterCode?: Record<string, string>; // language -> code
  testCases?: Array<{ input: string; expected: string; isHidden?: boolean }>; // order derived
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  // If you see `prisma.problem is undefined`, your Prisma Client is stale.
  // Run: `npx prisma generate` (and restart dev server) after updating schema.
  if (!(prisma as any).problem) {
    return NextResponse.json(
      { error: 'Prisma Client is stale (missing model Problem). Run `npx prisma generate` and restart the server.' },
      { status: 500 },
    );
  }

  const body = (await req.json()) as Partial<CreateProblemBody>;
  const slug = body.slug?.trim();
  const title = body.title?.trim();
  const statementMd = body.statementMd ?? '';

  if (!slug || !title || !statementMd.trim()) {
    return NextResponse.json({ error: 'slug, title, statementMd are required' }, { status: 400 });
  }

  const patternIds = Array.isArray(body.patternIds) ? body.patternIds : [];
  const hints = Array.isArray(body.hints) ? body.hints : [];
  const testCases = Array.isArray(body.testCases) ? body.testCases : [];

  const problem = await prisma.problem.create({
    data: {
      slug,
      title,
      statementMd,
      constraintsMd: body.constraintsMd ?? null,
      difficulty: (body.difficulty as any) ?? 'EASY',
      isPublished: body.isPublished ?? false,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      starterCode: body.starterCode ?? undefined,
      patterns: {
        create: patternIds.map((patternId) => ({ patternId })),
      },
      hints: {
        create: hints.map((textMd, idx) => ({ order: idx + 1, textMd })),
      },
      testCases: {
        create: testCases.map((tc, idx) => ({
          order: idx + 1,
          input: tc.input,
          expected: tc.expected,
          isHidden: tc.isHidden ?? false,
        })),
      },
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ problem });
}
