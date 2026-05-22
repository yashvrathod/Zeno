import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getTelemetrySnapshot } from "@/lib/clients/llmClient";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshot = getTelemetrySnapshot();

    const summary = {
      totalCalls: snapshot.length,
      totalSuccesses: snapshot.filter(t => t.success).length,
      totalFailures: snapshot.filter(t => !t.success).length,
      avgDurationMs: snapshot.length > 0
        ? Math.round(snapshot.reduce((s, t) => s + t.durationMs, 0) / snapshot.length)
        : 0,
      byProvider: groupByProvider(snapshot),
    };

    return Response.json({ ok: true, snapshot, summary });
  } catch (error) {
    console.error("Telemetry API Error:", error);
    return Response.json({ error: "Failed to fetch telemetry" }, { status: 500 });
  }
}

function groupByProvider(telemetry: ReturnType<typeof getTelemetrySnapshot>) {
  const map = new Map<string, { calls: number; failures: number; totalMs: number; tokens: number }>();
  for (const t of telemetry) {
    const key = `${t.provider}:${t.model}`;
    const existing = map.get(key) ?? { calls: 0, failures: 0, totalMs: 0, tokens: 0 };
    existing.calls++;
    if (!t.success) existing.failures++;
    existing.totalMs += t.durationMs;
    existing.tokens += t.totalTokens ?? 0;
    map.set(key, existing);
  }
  return Array.from(map.entries()).map(([key, stats]) => ({
    key,
    calls: stats.calls,
    failures: stats.failures,
    avgMs: Math.round(stats.totalMs / stats.calls),
    failRate: ((stats.failures / stats.calls) * 100).toFixed(1) + "%",
    totalTokens: stats.tokens,
  }));
}
