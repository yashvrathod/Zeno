import { isQueueAvailable } from './connection';

export {
  getArchitectReviewQueue, getKnowledgeGraphQueue, getTelemetryQueue, getCacheWarmupQueue,
  enqueueArchitectReview, enqueueKnowledgeGraphUpdate, enqueueTelemetryFlush, enqueueCacheWarmup,
  closeAllQueues,
} from './queues';

export {
  startArchitectReviewWorker, stopArchitectReviewWorker,
} from './workers/architectReviewWorker';

export {
  startKnowledgeGraphWorker, stopKnowledgeGraphWorker,
} from './workers/knowledgeGraphWorker';

export {
  startCacheWarmupWorker, stopCacheWarmupWorker,
} from './workers/cacheWarmupWorker';

export {
  isQueueAvailable, closeQueueConnection,
} from './connection';

export async function startAllWorkers(): Promise<void> {
  if (!isQueueAvailable()) {
    console.log('[queue] Redis not configured, workers not started');
    return;
  }

  const { startArchitectReviewWorker } = await import('./workers/architectReviewWorker');
  const { startKnowledgeGraphWorker } = await import('./workers/knowledgeGraphWorker');
  const { startCacheWarmupWorker } = await import('./workers/cacheWarmupWorker');

  startArchitectReviewWorker();
  startKnowledgeGraphWorker();
  startCacheWarmupWorker();

  console.log('[queue] All workers started');
}

export async function stopAllWorkers(): Promise<void> {
  const { stopArchitectReviewWorker } = await import('./workers/architectReviewWorker');
  const { stopKnowledgeGraphWorker } = await import('./workers/knowledgeGraphWorker');
  const { stopCacheWarmupWorker } = await import('./workers/cacheWarmupWorker');

  stopArchitectReviewWorker();
  stopKnowledgeGraphWorker();
  stopCacheWarmupWorker();
}
