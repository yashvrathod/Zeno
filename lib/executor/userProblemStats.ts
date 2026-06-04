/**
 * UserProblemStats — single transactional writer.
 *
 * Extracted from /api/execute so the upsert logic is testable without
 * firing up Next.js. The previous shape had TWO writers:
 *
 *   1. /api/execute/route.ts on submit (runAll=true)
 *   2. lib/executor/personalizationUpdater.ts on every execution
 *
 * They used the same unique key and no transaction, so concurrent
 * runs + a submit could lose updates and double-count `runCount`. This
 * module replaces both with a single function that:
 *
 *   - Always increments `runCount` (every execution is a run).
 *   - On submit (runAll=true), additionally increments `submitCount`,
 *     `acceptedCount` / `wrongAnswerCount` / `runtimeErrorCount`, and
 *     sets `solvedAt` only on the first successful submit.
 *   - Initializes `firstAttemptAt` only on the first row insert.
 *
 * Returns the new/updated row so callers can use it without an extra
 * fetch.
 */

import prisma from '@/lib/prisma';

export type RecordExecutionInput = {
  userId: string;
  /**
   * MUST be a Problem.id (cuid), not a slug. The execute route accepts
   * either from the client, but the FK on UserProblemStats.problemId
   * references Problem.id. Pass `problem.id` after resolving slug→id.
   * If you pass a slug-shaped value here you'll get a Prisma P2003
   * (foreign key constraint) and the write will fail silently inside
   * the route's try/catch.
   */
  problemId: string;
  runAll: boolean;
  results: ReadonlyArray<{
    status: 'passed' | 'wrong_answer' | 'runtime_error' | 'compile_error' | 'time_limit_exceeded';
    error?: string;
  }>;
  now?: Date;
};

export type LastStatus =
  | 'accepted'
  | 'wrong_answer'
  | 'runtime_error';

function pickLastStatus(
  results: ReadonlyArray<{ status: string }>,
): LastStatus {
  if (results.some((r) => r.status === 'runtime_error' || r.status === 'compile_error')) {
    return 'runtime_error';
  }
  if (results.some((r) => r.status === 'wrong_answer')) {
    return 'wrong_answer';
  }
  if (results.some((r) => r.status === 'time_limit_exceeded')) {
    return 'runtime_error';
  }
  return 'accepted';
}

function firstError(results: ReadonlyArray<{ error?: string }>): string | null {
  return results.find((r) => r.error)?.error ?? null;
}

export async function recordExecution(input: RecordExecutionInput) {
  const now = input.now ?? new Date();
  const allPassed = input.results.length > 0 && input.results.every((r) => r.status === 'passed');
  const hasWrongAnswer = input.results.some((r) => r.status === 'wrong_answer');
  const hasRuntimeError = input.results.some(
    (r) => r.status === 'runtime_error' || r.status === 'compile_error' || r.status === 'time_limit_exceeded',
  );
  const lastStatus = pickLastStatus(input.results);
  const lastError = allPassed ? null : (firstError(input.results) ?? 'Execution failed');

  return prisma.$transaction(async (tx) => {
    const existing = await tx.userProblemStats.findUnique({
      where: { userId_problemId: { userId: input.userId, problemId: input.problemId } },
      select: { firstAttemptAt: true, solvedAt: true },
    });

    return tx.userProblemStats.upsert({
      where: { userId_problemId: { userId: input.userId, problemId: input.problemId } },
      create: {
        userId: input.userId,
        problemId: input.problemId,
        runCount: 1,
        submitCount: input.runAll ? 1 : 0,
        acceptedCount: input.runAll && allPassed ? 1 : 0,
        wrongAnswerCount: input.runAll && hasWrongAnswer ? 1 : 0,
        runtimeErrorCount: input.runAll && hasRuntimeError ? 1 : 0,
        firstAttemptAt: now,
        lastStatus,
        lastError,
        lastAt: now,
        solvedAt: input.runAll && allPassed ? now : null,
        timeSpentSeconds: 0,
      },
      update: {
        runCount: { increment: 1 },
        ...(input.runAll
          ? {
              submitCount: { increment: 1 },
              acceptedCount: allPassed ? { increment: 1 } : undefined,
              wrongAnswerCount: hasWrongAnswer ? { increment: 1 } : undefined,
              runtimeErrorCount: hasRuntimeError ? { increment: 1 } : undefined,
              solvedAt: allPassed && !existing?.solvedAt ? now : undefined,
            }
          : {}),
        lastStatus,
        lastError,
        lastAt: now,
      },
    });
  });
}
