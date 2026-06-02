import { Worker } from 'bullmq';
import { getQueueConnection } from '../connection';
import { handleArchitectReviewJob } from './architectReviewJob';

let worker: Worker | null = null;

export function startArchitectReviewWorker(): void {
  if (worker) return;

  const connection = getQueueConnection();
  worker = new Worker('architect-review', async (job) => {
    try {
      return await handleArchitectReviewJob(job.data);
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
