/**
 * Request Coalescing for Global Cache
 *
 * When identical requests arrive concurrently, only the first one calls the AI.
 * All others wait for the result instead of hitting the API.
 *
 * Example: Users A and B both ask "what does this mean?" at the same time.
 * Without coalescing: 2 AI calls.
 * With coalescing: 1 AI call, both get the same result.
 *
 * Usage:
 *   const { result, isNew } = await coalesce(
 *     `cache-key:${problemId}:${questionMd5}`,
 *     () => callAIAndCache(...)
 *   );
 */

// Active in-flight promises keyed by dedup hash
const inFlight = new Map<string, Promise<{
  ok: boolean;
  data?: unknown;
  error?: string;
}>>();

/**
 * Execute a function with request deduplication.
 * If the same key is already in-flight, return the same promise.
 *
 * @param key - Deduplication key (typically problemId + question hash)
 * @param fn - The async function to execute if not already in-flight
 * @returns Result from the function execution
 */
export async function coalesce<T>(
  key: string,
  fn: () => Promise<T>
): Promise<boolean> {
  // Already in-flight? Return false (caller was deduped)
  if (inFlight.has(key)) {
    await inFlight.get(key);
    return false;
  }

  // Create in-flight entry
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

  inFlight.set(key, promise as Promise<any>);

  return true; // Caller should execute (it's a new request)
}
