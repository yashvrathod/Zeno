import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { runOnPiston } from '@/lib/piston';
import { auth } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

    let body: { code: string; language: 'javascript' | 'python' | 'java' | 'cpp' };
    try {
      body = (await req.json()) as { code: string; language: 'javascript' | 'python' | 'java' | 'cpp' };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

  const problem = await prisma.problem.findUnique({
    where: { slug },
    select: {
      isPublished: true,
      testCases: {
        orderBy: [{ isHidden: 'asc' }, { order: 'asc' }],
        select: { order: true, input: true, expected: true, isHidden: true },
      },
    },
  });

  if (!problem || !problem.isPublished) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let passedCount = 0;
  const details: Array<{ order: number; isHidden: boolean; passed: boolean; output?: string }> = [];

  for (const tc of problem.testCases) {
    const { output } = await runOnPiston({
      code: body.code,
      language: body.language,
      stdin: tc.input,
    });

    const passed = output.trim() === tc.expected.trim();
    if (passed) passedCount++;

    // Only return user output for *public* tests (never leak hidden test IO).
    details.push({
      order: tc.order,
      isHidden: tc.isHidden,
      passed,
      output: tc.isHidden ? undefined : output,
    });
  }

  const total = problem.testCases.length;
  const allPassed = passedCount === total;

  // IMPORTANT: do NOT return hidden test inputs/expected.
  return NextResponse.json({ allPassed, passedCount, total, details });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
