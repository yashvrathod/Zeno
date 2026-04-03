/**
 * Health Check API
 *
 * GET /api/health
 *
 * Returns system status for monitoring and debugging.
 * Checks:
 * - Database connectivity
 * - Redis connectivity
 * - Groq API availability
 * - Embedding model loaded
 * - Cache entry count
 * - Server uptime
 */

import { getHealthStatus } from "@/lib/startup";

export const runtime = "nodejs";

export async function GET() {
  try {
    const health = await getHealthStatus();

    return Response.json(health, {
      status: health.status === "ok" ? 200 : health.status === "degraded" ? 203 : 503,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json(
      {
        status: "down" as const,
        db: false,
        redis: false,
        groq: false,
        embeddingModel: false,
        cacheEntries: 0,
        uptime: process.uptime(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
