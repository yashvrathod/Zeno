/**
 * Tests for handleArchitectReviewJob — the pure handler extracted from
 * the BullMQ worker.
 *
 * Guards the regression: the original worker called
 * `triggerArchitectReview(userId, problemId, code, language, sessionId)`
 * positionally with 5 args, but the function expects a single object.
 * TypeScript caught it; at runtime every queued job crashed silently.
 * These tests pin the call shape so it can't regress.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const triggerMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@/lib/mentor/services/seniorArchitect", () => ({
  triggerArchitectReview: (...args: unknown[]) => triggerMock(...args),
}));

// Import AFTER the mock is registered so the lazy `await import` resolves
// to the mock.
import { handleArchitectReviewJob } from "../architectReviewJob";

const BASE_DATA = {
  userId: "u1",
  problemId: "p1",
  code: "function solve(){}",
  language: "javascript",
  sessionId: "s1",
  problemTitle: "Two Sum",
  codeHash: "abc123",
};

beforeEach(() => {
  triggerMock.mockReset();
});

describe("handleArchitectReviewJob", () => {
  it("calls triggerArchitectReview with a single object containing all 6 fields", async () => {
    triggerMock.mockResolvedValue({ overallScore: 80, grade: "B" });
    await handleArchitectReviewJob(BASE_DATA);
    expect(triggerMock).toHaveBeenCalledTimes(1);
    const [arg] = triggerMock.mock.calls[0]!;
    expect(arg).toEqual({
      userId: "u1",
      problemId: "p1",
      code: "function solve(){}",
      language: "javascript",
      problemTitle: "Two Sum",
      codeHash: "abc123",
    });
  });

  it("forwards problemTitle and codeHash from the job data unchanged", async () => {
    triggerMock.mockResolvedValue(null);
    await handleArchitectReviewJob({
      ...BASE_DATA,
      problemTitle: "Binary Search Variants",
      codeHash: "deadbeef",
    });
    const [arg] = triggerMock.mock.calls[0]!;
    expect(arg).toMatchObject({
      problemTitle: "Binary Search Variants",
      codeHash: "deadbeef",
    });
  });

  it("bubbles errors thrown by triggerArchitectReview (so BullMQ retry kicks in)", async () => {
    triggerMock.mockRejectedValue(new Error("DB connection lost"));
    await expect(handleArchitectReviewJob(BASE_DATA)).rejects.toThrow(
      "DB connection lost",
    );
  });

  it("returns the same value as triggerArchitectReview (ArchitectReview or null)", async () => {
    const review = { overallScore: 92, grade: "A" };
    triggerMock.mockResolvedValue(review);
    const result = await handleArchitectReviewJob(BASE_DATA);
    expect(result).toBe(review);

    triggerMock.mockResolvedValue(null);
    const nullResult = await handleArchitectReviewJob(BASE_DATA);
    expect(nullResult).toBeNull();
  });
});
