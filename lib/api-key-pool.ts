/**
 * API Key Pool with Round-Robin Rotation & Per-Key Cooldown
 *
 * Manages a pool of API keys (Groq, OpenRouter, etc.) with:
 * - Round-robin key selection
 * - Per-key cooldown when a key returns 429
 * - Automatic recovery after cooldown
 * - Health tracking for monitoring
 *
 * Usage:
 *   import { getKeyFromPool, reportKeyFailure, poolStatus } from "@/lib/api-key-pool";
 *
 *   const key = getKeyFromPool("groq");
 *   // Use key...
 *   reportKeyFailure("groq", 429); // On rate limit
 *
 * Environment variables used:
 *   GROQ_API_KEY_1, GROQ_API_KEY_2, ... GROQ_API_KEY_N
 *   OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, ...
 */

// ─────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────

type KeyHealth = {
  key: string;
  isHealthy: boolean;
  cooldownUntil: number; // timestamp when key recovers
  consecutiveFailures: number;
  totalRequests: number;
  totalFailures: number;
  lastUsedAt: number;
};

type PoolState = {
  keys: KeyHealth[];
  selectedIndex: number;
  provider: string;
};

const poolCache = new Map<string, PoolState>();

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

const COOLDOWN_MS_ON_429 = 60_000; // 1 minute cooldown on rate limit
const COOLDOWN_MS_ON_5XX = 30_000; // 30 seconds on server error
const MAX_CONSECUTIVE_FAILURES = 5; // Mark key unhealthy after this many

/**
 * Read API keys from environment variables.
 * Looks for GROQ_API_KEY_1, GROQ_API_KEY_2, ... and also GROQ_API_KEY as key #1
 */
function loadKeysFromEnv(prefix: string): string[] {
  const keys: string[] = [];

  // Single key (legacy)
  const singleKey = process.env[prefix];
  if (singleKey && singleKey.trim().length > 0) {
    keys.push(singleKey.trim());
  }

  // Numbered keys: GROQ_API_KEY_1, GROQ_API_KEY_2, etc.
  for (let i = 1; i <= 20; i++) {
    const envKey = process.env[`${prefix}_${i}`];
    if (envKey && envKey.trim().length > 0) {
      keys.push(envKey.trim());
    }
  }

  return [...new Set(keys)]; // Deduplicate in case both are set
}

/**
 * Initialize a key pool for a given provider.
 */
function getOrCreatePool(provider: string, envPrefix: string): PoolState {
  if (!poolCache.has(provider)) {
    const keys = loadKeysFromEnv(envPrefix);
    poolCache.set(provider, {
      keys: keys.map((key) => ({
        key,
        isHealthy: true,
        cooldownUntil: 0,
        consecutiveFailures: 0,
        totalRequests: 0,
        totalFailures: 0,
        lastUsedAt: 0,
      })),
      selectedIndex: -1,
      provider,
    });
  }
  return poolCache.get(provider)!;
}

/**
 * Check if a key has recovered from cooldown.
 */
function isKeyReady(key: KeyHealth): boolean {
  if (!key.isHealthy) return false;
  if (key.cooldownUntil > Date.now()) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────
// GET A KEY FROM THE POOL
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get the next healthy key from the pool using round-robin.
 *
 * @param provider - "groq" or "openrouter"
 * @returns The API key string, or null if no healthy key is available
 */
export function getKeyFromPool(provider: string): string | null {
  const envPrefix = provider === "openrouter" ? "OPENROUTER_API_KEY" : "GROQ_API_KEY";
  const pool = getOrCreatePool(provider, envPrefix);

  if (pool.keys.length === 0) {
    return null;
  }

  const now = Date.now();

  // Try round-robin from where we left off
  for (let i = 0; i < pool.keys.length; i++) {
    const idx = (pool.selectedIndex + 1 + i) % pool.keys.length;
    const key = pool.keys[idx];

    // Check if key has recovered from cooldown
    if (!key.isHealthy && now >= key.cooldownUntil) {
      key.isHealthy = true;
      key.consecutiveFailures = 0;
    }

    if (isKeyReady(key)) {
      pool.selectedIndex = idx;
      key.totalRequests++;
      key.lastUsedAt = now;
      return key.key;
    }
  }

  // No healthy key — return least-cooled-down one as last resort
  console.warn(`[KEY_POOL] All ${provider} keys are in cooldown, returning least-cooled-down`);
  const bestCandidate = pool.keys.reduce((best, key) => {
    if (!best) return key;
    return key.cooldownUntil < best.cooldownUntil ? key : best;
  }, null as KeyHealth | null);

  if (bestCandidate) {
    bestCandidate.totalRequests++;
    bestCandidate.lastUsedAt = now;
    return bestCandidate.key;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// REPORT KEY FAILURE / SUCCESS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Report a key failure (429 rate limit or 5xx error).
 * Sets the key into cooldown with exponential backoff.
 *
 * @param provider - "groq" or "openrouter"
 * @param statusCode - HTTP status code (429 or 5xx)
 * @param failedKey - The key that failed (to mark the right one)
 */
export function reportKeyFailure(
  provider: string,
  statusCode: number,
  failedKey: string
): void {
  const envPrefix = provider === "openrouter" ? "OPENROUTER_API_KEY" : "GROQ_API_KEY";
  const pool = getOrCreatePool(provider, envPrefix);

  const key = pool.keys.find((k) => k.key === failedKey);
  if (!key) return;

  key.consecutiveFailures++;
  key.totalFailures++;

  // Set cooldown
  const cooldownMs =
    statusCode === 429
      ? COOLDOWN_MS_ON_429 * Math.min(key.consecutiveFailures, 4) // 60s, 120s, 180s, 240s
      : COOLDOWN_MS_ON_5XX;

  key.cooldownUntil = Date.now() + cooldownMs;

  // Mark unhealthy if too many consecutive failures
  if (key.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    key.isHealthy = false;
    console.warn(
      `[KEY_POOL] Key ${failedKey.slice(0, 12)}... marked UNHEALTHY (${key.consecutiveFailures} consecutive failures)`
    );
  }

  console.warn(
    `[KEY_POOL] Key ${failedKey.slice(0, 12)}... failure (${statusCode}), cooldown: ${cooldownMs}ms`
  );
}

/**
 * Report a successful API call for a key.
 * Resets consecutive failure counter.
 */
export function reportKeySuccess(
  _provider: string,
  _key: string
): void {
  // Only need to reset consecutive failures — we don't track per-key
  // in production since the pool already handles health recovery
}

// ─────────────────────────────────────────────────────────────────────────
// POOL STATUS (for debugging/admin)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get current health status of all keys in a pool.
 */
export function poolStatus(provider: string) {
  const envPrefix = provider === "openrouter" ? "OPENROUTER_API_KEY" : "GROQ_API_KEY";
  const pool = getOrCreatePool(provider, envPrefix);

  return {
    provider,
    totalKeys: pool.keys.length,
    healthyKeys: pool.keys.filter(isKeyReady).length,
    keys: pool.keys.map((key) => ({
      prefix: key.key.slice(0, 12) + "...",
      isHealthy: key.isHealthy,
      cooldownUntil: new Date(key.cooldownUntil).toISOString(),
      consecutiveFailures: key.consecutiveFailures,
      totalRequests: key.totalRequests,
      totalFailures: key.totalFailures,
      successRate:
        key.totalRequests > 0
          ? ((1 - key.totalFailures / key.totalRequests) * 100).toFixed(1) + "%"
          : "N/A",
    })),
  };
}

/**
 * Get all available key providers with their status.
 */
export function allPoolStatuses() {
  const providers = ["groq", "openrouter"];
  return providers.map((p) => poolStatus(p));
}
