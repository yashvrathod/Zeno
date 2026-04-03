/**
 * Rate Limiting for AlgoMentor
 *
 * Uses sliding window algorithm via Redis (ioredis) for distributed rate limiting.
 * Falls back to in-memory limiting if Redis is unavailable.
 */

import Redis from "ioredis";

// ─────────────────────────────────────────────────────────────────────────
// REDIS CONNECTION
// ─────────────────────────────────────────────────────────────────────────

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis(process.env.UPSTASH_REDIS_REST_URL, {
      maxRetriesPerRequest: 1,
    })
  : null;

// In-memory fallback for development (not distributed, but functional)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

const MEMORY_WINDOW_MS = 60 * 60 * 1000; // 1 hour window for memory store

// ─────────────────────────────────────────────────────────────────────────
// SLIDING WINDOW RATE LIMITER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Sliding window rate limit implementation using Redis sorted sets.
 * Each request is a timestamp in a sorted set. We count requests in the
 * last windowMs milliseconds.
 */
async function slidingWindowLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}> {
  const { key, limit, windowMs } = params;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Try Redis first
  if (redis) {
    try {
      const pipeline = redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current entries in window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiry on the key (cleanup)
      pipeline.expire(key, Math.ceil(windowMs / 1000) + 1);

      const results = await pipeline.exec();

      // results[1] is the count before adding current request
      const count = (results?.[1]?.[1] as number) ?? 0;

      if (count < limit) {
        // Allowed
        return {
          allowed: true,
          remaining: limit - count - 1,
          resetAt: new Date(now + windowMs),
        };
      } else {
        // Rate limited - find oldest entry to calculate reset time
        const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
        const oldestTimestamp = oldest?.[1] ? parseInt(oldest[1], 10) : now;

        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(oldestTimestamp + windowMs),
          retryAfterMs: oldestTimestamp + windowMs - now,
        };
      }
    } catch (error) {
      console.warn("Redis rate limit failed, falling back to memory:", error);
      // Fall through to memory store
    }
  }

  // Memory store fallback
  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt - windowMs) {
    // New window
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  if (entry.count < limit) {
    entry.count++;
    memoryStore.set(key, entry);
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: new Date(entry.resetAt),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: new Date(entry.resetAt),
    retryAfterMs: entry.resetAt - now,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// PUBLIC RATE LIMIT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Check rate limit for AI calls.
 * Sliding window: 10 AI calls per user per hour.
 *
 * @param userId - User ID to check
 * @returns Rate limit result with remaining count and reset time
 */
export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message: string;
}> {
  const key = `ratelimit:ai:${userId}`;
  const limit = 20; // 20 AI calls per user per hour (scales well with 60%+ cache hit rate)
  const windowMs = 60 * 60 * 1000; // 1 hour

  const result = await slidingWindowLimit({ key, limit, windowMs });

  if (result.allowed) {
    return {
      allowed: true,
      remaining: result.remaining,
      resetAt: result.resetAt,
      message: `AI calls remaining: ${result.remaining}`,
    };
  }

  const retryAfterMinutes = Math.ceil((result.retryAfterMs ?? 0) / 60000);
  return {
    allowed: false,
    remaining: 0,
    resetAt: result.resetAt,
    message: `Rate limit exceeded. Please wait ${retryAfterMinutes} minute(s) before making another AI request.`,
  };
}

/**
 * Check hint limit for a specific problem.
 * Max 4 hints per problem per user (enforced via DB session rung).
 *
 * @param userId - User ID
 * @param problemId - Problem ID
 * @returns Hint limit result
 */
export async function checkHintLimit(
  userId: string,
  problemId: string
): Promise<{
  allowed: boolean;
  hintsUsed: number;
  hintsRemaining: number;
}> {
  try {
    const session = await import("@/lib/prisma").then((m) => m.default)
      .then((prisma) =>
        prisma.mentorSession.findUnique({
          where: { userId_problemId: { userId, problemId } },
          select: { currentRung: true },
        })
      )
      .catch(() => null);

    const currentRung = session?.currentRung ?? 1;
    const hintsUsed = Math.max(0, currentRung - 1);
    const hintsRemaining = Math.max(0, 4 - hintsUsed);

    return {
      allowed: hintsRemaining > 0,
      hintsUsed,
      hintsRemaining,
    };
  } catch {
    // If DB fails, allow the hint (fail open)
    return {
      allowed: true,
      hintsUsed: 0,
      hintsRemaining: 4,
    };
  }
}

/**
 * Check daily problem limit for FREE plan users.
 * FREE: 5 problems/day, PRO/TEAM: unlimited.
 *
 * @param userId - User ID
 * @param plan - User's subscription plan
 * @returns Plan limit result
 */
export async function checkPlanLimit(
  userId: string,
  plan: "FREE" | "PRO" | "TEAM"
): Promise<{
  allowed: boolean;
  problemsToday: number;
  limit: number;
}> {
  // PRO and TEAM have unlimited access
  if (plan === "PRO" || plan === "TEAM") {
    return {
      allowed: true,
      problemsToday: 0,
      limit: -1, // -1 means unlimited
    };
  }

  // FREE plan: 5 problems per day
  const limit = 5;

  try {
    const prisma = await import("@/lib/prisma").then((m) => m.default);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Count distinct problems attempted today
    const sessionsToday = await prisma.mentorSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { problemId: true },
      distinct: ["problemId"],
    });

    const problemsToday = sessionsToday.length;

    return {
      allowed: problemsToday < limit,
      problemsToday,
      limit,
    };
  } catch {
    // If DB fails, allow access (fail open)
    return {
      allowed: true,
      problemsToday: 0,
      limit,
    };
  }
}

/**
 * Increment rate limit counter for a custom key.
 * Useful for tracking custom events.
 */
export async function incrementRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  return slidingWindowLimit(params);
}

/**
 * Reset rate limit for a specific key.
 * Useful for admin operations or user requests.
 */
export async function resetRateLimit(key: string): Promise<void> {
  if (redis) {
    await redis.del(key).catch(console.warn);
  }
  memoryStore.delete(key);
}

/**
 * Get current rate limit status without incrementing.
 */
export async function getRateLimitStatus(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{
  current: number;
  remaining: number;
  resetAt: Date;
}> {
  const { key, limit, windowMs } = params;
  const now = Date.now();
  const windowStart = now - windowMs;

  if (redis) {
    try {
      const count = await redis.zcount(key, windowStart, now);
      const oldest = await redis.zrange(key, 0, 0, "WITHSCORES");
      const oldestTimestamp = oldest?.[1] ? parseInt(oldest[1], 10) : now;

      return {
        current: count,
        remaining: Math.max(0, limit - count),
        resetAt: new Date(oldestTimestamp + windowMs),
      };
    } catch {
      // Fall through to memory
    }
  }

  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    return {
      current: 0,
      remaining: limit,
      resetAt: new Date(now + windowMs),
    };
  }

  return {
    current: entry.count,
    remaining: Math.max(0, limit - entry.count),
    resetAt: new Date(entry.resetAt),
  };
}
