/**
 * Tests for the UserProblemStats transactional writer.
 *
 * Verifies the bug-class: the old code had two writers (execute route on
 * submit + personalizationUpdater on every execution) racing on the
 * same row. recordExecution collapses both into a single function
 * inside a $transaction.
 */

type TxCallback = (tx: { userProblemStats: { findUnique: jest.Mock; upsert: jest.Mock } }) => Promise<unknown>;

jest.mock('@/lib/prisma', () => {
  const findUnique = jest.fn();
  const upsert = jest.fn();
  return {
    __esModule: true,
    default: {
      $transaction: jest.fn((cb: TxCallback) => cb({ userProblemStats: { findUnique, upsert } })),
      userProblemStats: { findUnique, upsert },
    },
  };
});

import prisma from '@/lib/prisma';
import { recordExecution } from '@/lib/executor/userProblemStats';

const mockFindUnique = prisma.userProblemStats.findUnique as unknown as jest.Mock;
const mockUpsert = prisma.userProblemStats.upsert as unknown as jest.Mock;
const mockTx = prisma.$transaction as unknown as jest.Mock;

beforeEach(() => {
  mockFindUnique.mockReset();
  mockUpsert.mockReset();
  mockTx.mockClear();
  mockFindUnique.mockResolvedValue(null);
  mockUpsert.mockResolvedValue({});
});

describe('recordExecution', () => {
  it('runs inside a transaction', async () => {
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: false,
      results: [{ status: 'passed' }],
    });
    expect(mockTx).toHaveBeenCalledTimes(1);
    expect(typeof mockTx.mock.calls[0][0]).toBe('function');
  });

  it('first run: increments runCount, no submitCount, sets firstAttemptAt', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: false,
      results: [{ status: 'passed' }],
      now: new Date('2026-06-03T00:00:00Z'),
    });
    const call = mockUpsert.mock.calls[0][0];
    expect(call.where).toEqual({ userId_problemId: { userId: 'u1', problemId: 'p1' } });
    expect(call.create.runCount).toBe(1);
    expect(call.create.submitCount).toBe(0);
    expect(call.create.firstAttemptAt).toEqual(new Date('2026-06-03T00:00:00Z'));
    expect(call.update.runCount).toEqual({ increment: 1 });
    // No submit-related updates on a plain run
    expect(call.update.submitCount).toBeUndefined();
    expect(call.update.solvedAt).toBeUndefined();
  });

  it('first submit that passes: sets solvedAt', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: true,
      results: [{ status: 'passed' }, { status: 'passed' }],
      now: new Date('2026-06-03T00:00:00Z'),
    });
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.submitCount).toBe(1);
    expect(call.create.acceptedCount).toBe(1);
    expect(call.create.solvedAt).toEqual(new Date('2026-06-03T00:00:00Z'));
    expect(call.create.wrongAnswerCount).toBe(0);
    expect(call.create.runtimeErrorCount).toBe(0);
  });

  it('second submit that passes: does NOT overwrite solvedAt', async () => {
    // Row already has solvedAt set — must not be overwritten
    mockFindUnique.mockResolvedValueOnce({ firstAttemptAt: new Date(), solvedAt: new Date('2026-05-01') });
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: true,
      results: [{ status: 'passed' }, { status: 'passed' }],
    });
    const call = mockUpsert.mock.calls[0][0];
    // The update only sets solvedAt when the existing row has none
    expect(call.update.solvedAt).toBeUndefined();
    // submitCount + acceptedCount still increment
    expect(call.update.submitCount).toEqual({ increment: 1 });
    expect(call.update.acceptedCount).toEqual({ increment: 1 });
  });

  it('submit that fails: increments wrongAnswerCount, no solvedAt', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: true,
      results: [{ status: 'passed' }, { status: 'wrong_answer' }],
    });
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.acceptedCount).toBe(0);
    expect(call.create.wrongAnswerCount).toBe(1);
    expect(call.create.solvedAt).toBeNull();
  });

  it('submit with runtime error: runtimeErrorCount incremented, lastError captured', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: true,
      results: [{ status: 'runtime_error', error: 'TypeError: undefined' }],
    });
    const call = mockUpsert.mock.calls[0][0];
    expect(call.create.runtimeErrorCount).toBe(1);
    expect(call.create.lastError).toBe('TypeError: undefined');
    expect(call.create.lastStatus).toBe('runtime_error');
  });

  it('plain run after a previous submit: only runCount increments, submitCount untouched', async () => {
    mockFindUnique.mockResolvedValueOnce({ firstAttemptAt: new Date(), solvedAt: new Date() });
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: false,
      results: [{ status: 'passed' }],
    });
    const call = mockUpsert.mock.calls[0][0];
    expect(call.update.runCount).toEqual({ increment: 1 });
    expect(call.update.submitCount).toBeUndefined();
    expect(call.update.acceptedCount).toBeUndefined();
  });

  it('clears lastError on success, preserves it on failure', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await recordExecution({
      userId: 'u1',
      problemId: 'p1',
      runAll: true,
      results: [{ status: 'passed' }, { status: 'passed' }],
    });
    expect(mockUpsert.mock.calls[0][0].create.lastError).toBeNull();

    mockFindUnique.mockResolvedValueOnce(null);
    await recordExecution({
      userId: 'u1',
      problemId: 'p2',
      runAll: true,
      results: [{ status: 'wrong_answer', error: 'expected 4, got 3' }],
    });
    expect(mockUpsert.mock.calls[1][0].create.lastError).toBe('expected 4, got 3');
  });
});

describe('recordExecution contract: problemId must be a Problem.id (cuid)', () => {
  // Regression for the FK violation seen in dev.log:
  //   `Foreign key constraint violated on the constraint:
  //    UserProblemStats_problemId_fkey`
  // The execute route accepts id OR slug. The contract is: callers MUST
  // pass the resolved cuid. recordExecution itself does not validate
  // the shape — it just hands the value to Prisma, which fails at the
  // FK. The fix lives in the route (use `problem.id`, not the raw
  // request body). These tests document the contract so future callers
  // don't regress.

  it('passes the caller-supplied problemId straight through to upsert', async () => {
    await recordExecution({
      userId: 'u1',
      problemId: 'clq1234abcd5678efghij9012', // cuid-shaped
      runAll: false,
      results: [{ status: 'passed' }],
    });
    expect(mockUpsert.mock.calls[0][0].where.userId_problemId.problemId).toBe(
      'clq1234abcd5678efghij9012',
    );
    expect(mockUpsert.mock.calls[0][0].create.problemId).toBe(
      'clq1234abcd5678efghij9012',
    );
  });

  it('does not silently rewrite a slug-shaped problemId into a cuid', async () => {
    // If a future change added a `slug → id` lookup inside
    // recordExecution, this test would fail. That's the canary.
    await recordExecution({
      userId: 'u1',
      problemId: 'two-sum', // slug-shaped, NOT a cuid
      runAll: false,
      results: [{ status: 'passed' }],
    });
    expect(mockUpsert.mock.calls[0][0].where.userId_problemId.problemId).toBe('two-sum');
    expect(mockUpsert.mock.calls[0][0].create.problemId).toBe('two-sum');
  });
});
