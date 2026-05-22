import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

let connection: Redis | null = null;

export function getQueueConnection(): Redis {
  if (connection) return connection;

  if (!REDIS_URL) {
    throw new Error('REDIS_URL required for job queue. Set REDIS_URL or UPSTASH_REDIS_REST_URL.');
  }

  connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });

  return connection;
}

export function closeQueueConnection(): void {
  if (connection) {
    connection.disconnect();
    connection = null;
  }
}

export function isQueueAvailable(): boolean {
  return !!REDIS_URL;
}
