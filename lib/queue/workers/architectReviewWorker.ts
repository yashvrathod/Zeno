import { Worker } from 'bullmq';
import { getQueueConnection } from '../connection';

let worker: Worker | null = null;

export function startArchitectReviewWorker(): void {
  if (worker) return;

  const connection = getQueueConnection();
  worker = new Worker('architect-review', async (job) => {
    const { userId, problemId, code, language, sessionId } = job.data;

    try {
      const { triggerArchitectReview } = await import('@/lib/mentor/services/seniorArchitect');
      await triggerArchitectReview(userId, problemId, code, language, sessionId);
    } catch (error) {
      console.error(`[queue] Architect review failed for job ${job.id}:`, error);
      throw error;
    }
  }, { connection, concurrency: 2 });
}

export function stopArchitectReviewWorker(): void {
  if (worker) {
    worker.close();
    worker = null;
  }
}
