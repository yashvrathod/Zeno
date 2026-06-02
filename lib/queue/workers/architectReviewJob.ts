/**
 * Architect review job handler — extracted from the BullMQ worker so the
 * bug-fix is unit-testable without spinning up a queue connection.
 *
 * History: the original worker called `triggerArchitectReview(userId, ...)`
 * positionally with 5 args, but the function expects a single object param.
 * TypeScript caught it (`Expected 1 arguments, but got 5`); at runtime, JS
 * destructured the first string arg and the rest were undefined, causing
 * the first DB call to crash silently inside BullMQ's retry loop. This
 * module is the single place that constructs the object, so the bug class
 * is fixed at the boundary.
 */

import type { ArchitectReview } from "@/lib/mentor/services/seniorArchitect";

export type ArchitectReviewJobData = {
  userId: string;
  problemId: string;
  code: string;
  language: string;
  sessionId: string;
  problemTitle?: string;
  codeHash?: string;
};

/**
 * Run a single architect-review job. Lazy-imports seniorArchitect so the
 * heavy LLM provider resolution does not happen at worker init.
 *
 * Returns whatever `triggerArchitectReview` returns (`ArchitectReview | null`).
 * Throws if the underlying call throws, so BullMQ's retry/backoff kicks in.
 */
export async function handleArchitectReviewJob(
  data: ArchitectReviewJobData,
): Promise<ArchitectReview | null> {
  const { triggerArchitectReview } = await import(
    "@/lib/mentor/services/seniorArchitect"
  );
  return triggerArchitectReview({
    userId: data.userId,
    problemId: data.problemId,
    code: data.code,
    language: data.language,
    problemTitle: data.problemTitle,
    codeHash: data.codeHash,
  });
}
