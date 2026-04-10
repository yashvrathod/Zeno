/**
 * =============================================================================
 * STARTUP CHECKS FOR ALGOMENTOR
 * =============================================================================
 *
 * Run on server startup to:
 * 1. Validate all required env vars are present
 * 2. Warm up the embedding model (load into memory)
 * 3. Pre-seed embeddings for all ProblemMeta.whatAsked fields
 * 4. Log startup summary
 *
 * USAGE:
 *   Import in app/layout.tsx server component or middleware:
 *   import { runStartupChecks } from '@/lib/startup';
 *   await runStartupChecks();
 */

import { debug, startTimer } from "@/lib/debug";

// ─────────────────────────────────────────────────────────────────────────
// REQUIRED ENVIRONMENT VARIABLES
// ─────────────────────────────────────────────────────────────────────────

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
];

const OPTIONAL_ENV_VARS = [
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "OPENROUTER_API_KEY",
  "REDIS_URL",
  "UPSTASH_REDIS_REST_URL",
  "DEBUG",
  "DEBUG_MENTOR",
];

interface StartupResult {
  success: boolean;
  checks: {
    envVars: boolean;
    database: boolean;
    redis: boolean;
    embeddings: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Validates that all required environment variables are present.
 */
function checkEnvVars(): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required env var: ${envVar}`);
    }
  }

  // Check optional vars (warn if missing)
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar]) {
      warnings.push(`Optional env var not set: ${envVar}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Tests database connection.
 */
async function checkDatabase(): Promise<{ connected: boolean; error?: string }> {
  try {
    const prisma = await import("@/lib/prisma").then((m) => m.default);
    await prisma.$connect();
    debug.db("Database connection successful");
    return { connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    debug.db("Database connection failed", message);
    return { connected: false, error: message };
  }
}

/**
 * Tests Redis connection.
 */
async function checkRedis(): Promise<{ connected: boolean; error?: string }> {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (!redisUrl) {
    debug.cache("Redis not configured (REDIS_URL not set)");
    return { connected: false, error: "REDIS_URL not configured" };
  }

  try {
    const { Redis } = await import("ioredis");
    const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });

    await redis.ping();
    await redis.quit();

    debug.cache("Redis connection successful");
    return { connected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    debug.cache("Redis connection failed", message);
    return { connected: false, error: message };
  }
}

/**
 * Warms up the embedding model.
 */
async function warmupEmbeddings(): Promise<{ loaded: boolean; error?: string }> {
  try {
    debug.embed("Warming up embedding model...");
    const { getEmbedding } = await import("@/lib/embeddings");
    await getEmbedding("warmup check");
    debug.embed("Embedding model loaded successfully");
    return { loaded: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    debug.embed("Embedding warmup failed", message);
    return { loaded: false, error: message };
  }
}

/**
 * Pre-seeds cache with common problem breakdowns.
 */
async function warmupCache(): Promise<void> {
  try {
    debug.cache("Warming up cache with common breakdowns...");
    const { warmupCache: warmup } = await import("@/lib/embeddings");
    await warmup();
  } catch (error) {
    debug.cache("Cache warmup failed", error);
    // Non-fatal: don't throw, just log
  }
}

/**
 * Runs all startup checks and returns a summary.
 */
export async function runStartupChecks(): Promise<StartupResult> {
  const totalTimer = startTimer("startup");
  debug.mentor("Running startup checks...");

  const result: StartupResult = {
    success: true,
    checks: {
      envVars: false,
      database: false,
      redis: false,
      embeddings: false,
    },
    errors: [],
    warnings: [],
  };

  // 1. Check environment variables
  const envCheck = checkEnvVars();
  result.checks.envVars = envCheck.valid;
  result.errors.push(...envCheck.errors);
  result.warnings.push(...envCheck.warnings);

  if (!envCheck.valid) {
    result.success = false;
  }

  // 2. Check database connection
  const dbCheck = await checkDatabase();
  result.checks.database = dbCheck.connected;
  if (!dbCheck.connected) {
    result.errors.push(`Database: ${dbCheck.error}`);
    result.success = false;
  }

  // 3. Check Redis connection
  const redisCheck = await checkRedis();
  result.checks.redis = redisCheck.connected;
  if (!redisCheck.connected) {
    result.warnings.push(`Redis: ${redisCheck.error}`);
  }

  // 4. Warm up embeddings
  const embedCheck = await warmupEmbeddings();
  result.checks.embeddings = embedCheck.loaded;
  if (!embedCheck.loaded) {
    result.errors.push(`Embeddings: ${embedCheck.error}`);
    result.success = false;
  }

  // 5. Warm up cache (non-fatal)
  await warmupCache();

  // Log summary
  const totalMs = totalTimer();
  logStartupSummary(result, totalMs);

  return result;
}

/**
 * Logs a formatted startup summary.
 */
function logStartupSummary(result: StartupResult, totalMs: number): void {
  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  AlgoMentor Startup Summary");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Status: ${result.success ? "✅ OK" : "⚠️  DEGRADED"}`);
  console.log(`  Total time: ${totalMs.toFixed(2)}ms`);
  console.log("───────────────────────────────────────────────────────────");
  console.log("  Checks:");
  console.log(`    Env Vars:    ${result.checks.envVars ? "✅" : "❌"}`);
  console.log(`    Database:    ${result.checks.database ? "✅" : "❌"}`);
  console.log(`    Redis:       ${result.checks.redis ? "✅" : "⚠️ "}`);
  console.log(`    Embeddings:  ${result.checks.embeddings ? "✅" : "❌"}`);
  console.log("───────────────────────────────────────────────────────────");

  if (result.errors.length > 0) {
    console.log("  Errors:");
    for (const error of result.errors) {
      console.log(`    ❌ ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("  Warnings:");
    for (const warning of result.warnings) {
      console.log(`    ⚠️  ${warning}`);
    }
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
}

/**
 * Health check function for /api/health route.
 */
export async function getHealthStatus(): Promise<{
  status: "ok" | "degraded" | "down";
  db: boolean;
  redis: boolean;
  groq: boolean;
  embeddingModel: boolean;
  cacheEntries: number;
  uptime: number;
}> {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkGroq(),
    checkEmbeddingModel(),
    getCacheCount(),
  ]);

  const [db, redis, groq, embeddingModel, cacheEntries] = checks;

  // Determine overall status
  let status: "ok" | "degraded" | "down" = "ok";

  if (!db.connected) {
    status = "down"; // Database is critical
  } else if (!embeddingModel.loaded || !groq.available) {
    status = "degraded"; // AI features unavailable
  }

  return {
    status,
    db: db.connected,
    redis: redis.connected,
    groq: groq.available,
    embeddingModel: embeddingModel.loaded,
    cacheEntries,
    uptime: process.uptime(),
  };
}

/**
 * Tests Groq API connectivity.
 */
async function checkGroq(): Promise<{ available: boolean; error?: string }> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return { available: false, error: "GROQ_API_KEY not configured" };
  }

  try {
    // Simple ping with minimal token
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
    });

    if (!response.ok) {
      return { available: false, error: `HTTP ${response.status}` };
    }

    return { available: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { available: false, error: message };
  }
}

/**
 * Checks if embedding model is loaded.
 */
async function checkEmbeddingModel(): Promise<{ loaded: boolean; error?: string }> {
  try {
    const { getEmbedding } = await import("@/lib/embeddings");
    // This will fail if model isn't loaded
    await getEmbedding("warmup check");
    return { loaded: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { loaded: false, error: message };
  }
}

/**
 * Gets cache entry count.
 */
async function getCacheCount(): Promise<number> {
  try {
    const prisma = await import("@/lib/prisma").then((m) => m.default);
    const count = await prisma.cacheEntry.count();
    return count;
  } catch {
    return 0;
  }
}
