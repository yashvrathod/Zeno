import { Worker } from 'bullmq';
import { getQueueConnection } from '../connection';

let worker: Worker | null = null;

export function startCacheWarmupWorker(): void {
  if (worker) return;

  const connection = getQueueConnection();
  worker = new Worker('cache-warmup', async (job) => {
    const { problemIds } = job.data;

    try {
      const { warmupCache } = await import('@/lib/embeddings');
      if (problemIds?.length) {
        await warmupCache(problemIds.map((id: string) => ({ id, title: '' })));
      } else {
        await warmupCache();
      }
    } catch (error) {
      console.error(`[queue] Cache warmup failed:`, error);
      throw error; // Re-throw for BullMQ retry
    }
  }, { connection, concurrency: 1 });
}

export function stopCacheWarmupWorker(): void {
  if (worker) {
    worker.close();
    worker = null;
  }
}
