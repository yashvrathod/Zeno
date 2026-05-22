import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { runOnPiston } from '@/lib/piston';
import { auth } from '@/lib/auth';
import { updateAfterExecution } from '@/lib/executor/personalizationUpdater';

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
      sawRuntimeError = true;
      thisTestRuntimeError = true;
      lastRuntimeError = clampDbText(e instanceof Error ? e.message : 'Runtime Error');
      output = lastRuntimeError;
    }

    const passed = !thisTestRuntimeError && output.trim() === tc.expected.trim();
    results.push({ order: tc.order, passed, output, expected: tc.expected });
  }

  const passedCount = results.filter((r) => r.passed).length;

  const allPassed = passedCount === results.length;
  const lastStatus = sawRuntimeError ? 'Runtime Error' : allPassed ? 'Accepted' : 'Wrong Answer';

  await prisma.userProblemStats.upsert({
    where: { userId_problemId: { userId: session.user.id, problemId: problem.id } },
    create: {
      userId: session.user.id,
      problemId: problem.id,
      runCount: 1,
      acceptedCount: allPassed ? 1 : 0,
      wrongAnswerCount: allPassed ? 0 : 1,
      runtimeErrorCount: sawRuntimeError ? 1 : 0,
      lastStatus,
      lastError: sawRuntimeError ? lastRuntimeError : allPassed ? null : clampDbText('Failed some public tests'),
      lastAt: new Date(),
    },
    update: {
      runCount: { increment: 1 },
      acceptedCount: allPassed ? { increment: 1 } : undefined,
      wrongAnswerCount: allPassed ? undefined : { increment: 1 },
      runtimeErrorCount: sawRuntimeError ? { increment: 1 } : undefined,
      lastStatus,
      lastError: sawRuntimeError ? lastRuntimeError : allPassed ? null : clampDbText('Failed some public tests'),
      lastAt: new Date(),
    },
  });

  // Update personalization system with execution results
  if (session?.user?.id) {
    try {
      // Extract problem concepts (this would typically come from the problem data)
      const concepts = ['binary_search', 'two_pointer', 'sliding_window']; // This should be dynamic
      const problemContext = {
        problemId: problem.id,
        concepts: concepts,
        patterns: [] as string[], // This should also be dynamic
        difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'HARD'
      };

      const executionStats = {
        passed: allPassed,
        testResults: results.map(r => ({
          passed: r.passed,
          input: r.output,
          expected: r.expected,
          actual: r.output
        })),
        runtime: 100 // This should be the actual runtime
      };

      // Update the knowledge graph
      await updateAfterExecution(
        session.user.id,
        problemContext,
        executionStats
      );
    } catch (error) {
      console.error('Personalization update failed:', error);
    }
  }

  return NextResponse.json({ passedCount, total: results.length, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
