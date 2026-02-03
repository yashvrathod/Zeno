import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { runOnPiston } from '@/lib/piston';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = (await req.json()) as { code: string; language: 'javascript' | 'python' | 'java' | 'cpp' };

  const problem = await prisma.problem.findUnique({
    where: { slug },
    select: {
      isPublished: true,
      testCases: {
        where: { isHidden: false },
        orderBy: { order: 'asc' },
        select: { order: true, input: true, expected: true },
      },
    },
  });

  if (!problem || !problem.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const results = [] as Array<{ order: number; passed: boolean; output: string; expected: string }>;

  for (const tc of problem.testCases) {
    const { output } = await runOnPiston({
      code: body.code,
      language: body.language,
      stdin: tc.input,
    });

    const passed = output.trim() === tc.expected.trim();
    results.push({ order: tc.order, passed, output, expected: tc.expected });
  }

  const passedCount = results.filter((r) => r.passed).length;
  return NextResponse.json({ passedCount, total: results.length, results });
}
