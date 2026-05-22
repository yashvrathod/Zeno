import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { runOnPiston } from '@/lib/piston';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      code: string;
      language: 'javascript' | 'python' | 'java' | 'cpp';
      problemId?: string;
      runAll?: boolean;
    };
    const { code, language, problemId, runAll } = body;

    if (!code || !language) {
      return NextResponse.json({ ok: false, error: 'Missing code or language' }, { status: 400 });
    }

    const problem = problemId ? await prisma.problem.findFirst({
      where: { OR: [{ id: problemId }, { slug: problemId }] },
      select: {
        testCases: {
          where: runAll ? undefined : { isHidden: false },
          orderBy: { order: 'asc' },
          select: { id: true, input: true, expected: true, isHidden: true },
        },
      },
    }) : null;

    const testCases = problem?.testCases ?? [];
    if (testCases.length === 0) {
      return NextResponse.json({ ok: false, error: 'No test cases available' }, { status: 400 });
    }

    const results = [];

    for (const tc of testCases) {
      const start = Date.now();
      try {
        const { output } = await runOnPiston({
          code,
          language,
          stdin: tc.input,
        });

        const actual = output.trim();
        const passed = actual === tc.expected.trim();

        results.push({
          testCaseId: tc.id,
          status: passed ? 'passed' as const : 'wrong_answer' as const,
          input: tc.input,
          expected: tc.expected,
          actual,
          executionTime: Date.now() - start,
        });
      } catch (e) {
        results.push({
          testCaseId: tc.id,
          status: 'runtime_error' as const,
          input: tc.input,
          expected: tc.expected,
          actual: '',
          error: e instanceof Error ? e.message : 'Runtime error',
        });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (error: unknown) {
    console.error('Execution error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute code';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
