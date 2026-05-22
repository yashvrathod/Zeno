import { Worker } from 'bullmq';
import { getQueueConnection } from '../connection';

let worker: Worker | null = null;

export function startKnowledgeGraphWorker(): void {
  if (worker) return;

  const connection = getQueueConnection();
  worker = new Worker('knowledge-graph', async (job) => {
    const { userId, problemId, attempt } = job.data;

    try {
      const { recordProblemAttempt } = await import('@/lib/mentor/personalization/repository');
      await recordProblemAttempt(attempt as any);
    } catch (error) {
      console.error(`[queue] KG update failed for job ${job.id}:`, error);
      throw error;
    }
  }, { connection, concurrency: 2 });
}

export function stopKnowledgeGraphWorker(): void {
  if (worker) {
    worker.close();
    worker = null;
  }
}
