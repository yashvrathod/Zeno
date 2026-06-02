import { Queue } from 'bullmq';
import { getQueueConnection, isQueueAvailable } from './connection';

let architectReviewQueue: Queue | null = null;
let knowledgeGraphQueue: Queue | null = null;
let telemetryQueue: Queue | null = null;
let cacheWarmupQueue: Queue | null = null;

function getOrCreateQueue(name: string): Queue | null {
  if (!isQueueAvailable()) return null;
  return new Queue(name, { connection: getQueueConnection() });
}

export function getArchitectReviewQueue(): Queue | null {
  if (!architectReviewQueue) architectReviewQueue = getOrCreateQueue('architect-review');
  return architectReviewQueue;
}

export function getKnowledgeGraphQueue(): Queue | null {
  if (!knowledgeGraphQueue) knowledgeGraphQueue = getOrCreateQueue('knowledge-graph');
  return knowledgeGraphQueue;
}

export function getTelemetryQueue(): Queue | null {
  if (!telemetryQueue) telemetryQueue = getOrCreateQueue('telemetry');
  return telemetryQueue;
}

export function getCacheWarmupQueue(): Queue | null {
  if (!cacheWarmupQueue) cacheWarmupQueue = getOrCreateQueue('cache-warmup');
  return cacheWarmupQueue;
}

export async function enqueueArchitectReview(data: {
  userId: string;
  problemId: string;
  code: string;
  language: string;
  sessionId: string;
  problemTitle?: string;
  codeHash?: string;
}): Promise<void> {
  const q = getArchitectReviewQueue();
  if (!q) return;
  await q.add('review', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}

export async function enqueueKnowledgeGraphUpdate(data: {
  userId: string;
  problemId: string;
  attempt: Record<string, unknown>;
}): Promise<void> {
  const q = getKnowledgeGraphQueue();
  if (!q) return;
  await q.add('update', data);
}

export async function enqueueTelemetryFlush(data: Record<string, unknown>): Promise<void> {
  const q = getTelemetryQueue();
  if (!q) return;
  await q.add('flush', data);
}

export async function enqueueCacheWarmup(data: {
  problemIds: string[];
}): Promise<void> {
  const q = getCacheWarmupQueue();
  if (!q) return;
  await q.add('warmup', data);
}

export async function closeAllQueues(): Promise<void> {
  const queues = [architectReviewQueue, knowledgeGraphQueue, telemetryQueue, cacheWarmupQueue];
  await Promise.all(queues.filter(Boolean).map(q => q!.close()));
  architectReviewQueue = null;
  knowledgeGraphQueue = null;
  telemetryQueue = null;
  cacheWarmupQueue = null;
}
