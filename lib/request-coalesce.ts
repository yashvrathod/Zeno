const inFlight = new Map<string, { promise: Promise<unknown>; createdAt: number }>();

const MAX_STALE_AGE_MS = 30_000;

let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inFlight) {
      if (now - entry.createdAt > MAX_STALE_AGE_MS) {
        inFlight.delete(key);
      }
    }
    if (inFlight.size === 0 && cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
  }, 60_000);
}

export async function coalesce<T>(
  key: string,
  fn: () => Promise<T>
): Promise<boolean> {
  const existing = inFlight.get(key);
  if (existing) {
    if (Date.now() - existing.createdAt < MAX_STALE_AGE_MS) {
      await existing.promise;
      return false;
    }
    inFlight.delete(key);
  }

  ensureCleanup();

  const promise = fn().then(
    (result) => {
      inFlight.delete(key);
      return result;
    },
    (error) => {
      inFlight.delete(key);
      throw error;
    }
  );

  inFlight.set(key, { promise, createdAt: Date.now() });

  return true;
}
