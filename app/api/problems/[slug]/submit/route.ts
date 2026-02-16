import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { runOnPiston } from '@/lib/piston';
import { auth } from '@/lib/auth';

function clampDbText(input: unknown, max = 800) {
  const s = typeof input === 'string' ? input : '';
  return s.length > max ? s.slice(0, max) + `…[truncated ${s.length - max}]` : s;
}

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
      id: true,
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

  let sawRuntimeError = false;
  let lastRuntimeError: string | null = null;

  for (const tc of problem.testCases) {
    let output = '';
    let thisTestRuntimeError = false;

    try {
      ({ output } = await runOnPiston({
        code: body.code,
        language: body.language,
        stdin: tc.input,
      }));
    } catch (e) {
      // Don’t leak hidden test IO. We only store a short error string.
      sawRuntimeError = true;
      thisTestRuntimeError = true;
      lastRuntimeError = clampDbText(e instanceof Error ? e.message : 'Runtime Error');
      // Treat this test as failed.
      output = lastRuntimeError;
    }

    const passed = !thisTestRuntimeError && output.trim() === tc.expected.trim();
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

  // Update bounded per-user-per-problem stats.
  // NOTE: This does not store full transcripts or code; just aggregate counters + lastStatus.
  const lastStatus = sawRuntimeError ? 'Runtime Error' : allPassed ? 'Accepted' : 'Wrong Answer';
  await prisma.userProblemStats.upsert({
    where: { userId_problemId: { userId: session.user.id, problemId: problem.id } },
    create: {
      userId: session.user.id,
      problemId: problem.id,
      submitCount: 1,
      acceptedCount: allPassed ? 1 : 0,
      wrongAnswerCount: allPassed ? 0 : 1,
      runtimeErrorCount: sawRuntimeError ? 1 : 0,
      lastStatus,
      lastError: sawRuntimeError ? lastRuntimeError : null,
      lastAt: new Date(),
    },
    update: {
      submitCount: { increment: 1 },
      acceptedCount: allPassed ? { increment: 1 } : undefined,
      wrongAnswerCount: allPassed ? undefined : { increment: 1 },
      runtimeErrorCount: sawRuntimeError ? { increment: 1 } : undefined,
      lastStatus,
      lastError: sawRuntimeError ? lastRuntimeError : null,
      lastAt: new Date(),
    },
  });

  // IMPORTANT: do NOT return hidden test inputs/expected.
  return NextResponse.json({ allPassed, passedCount, total, details });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
