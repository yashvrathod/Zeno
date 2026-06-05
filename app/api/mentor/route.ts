/**
 * DSA Mentor API — Socratic Teaching Engine
 *
 * Thin HTTP handler. All business logic lives in lib/mentor/services/.
 *
 * Architecture (4-layer defense against rate limits):
 * 1. Per-user rate limiting
 * 2. Global cache — reuse answers across ALL users
 * 3. Request coalescing — deduplicate concurrent identical requests
 * 4. API key pool — round-robin rotation with per-key cooldown
 *
 * Streaming: Pass `stream: true` in the body to receive SSE (Server-Sent Events).
 * Events:
 *   event: delta  → {"token": "..."} (streaming token)
 *   event: done   → {"ok": true, "message": "...", ...} (full response after guardrails)
 *   event: error  → {"error": "..."}
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { execute, type MentorRequest } from "@/lib/mentor/services/mentorService";

export const runtime = "nodejs";

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ──
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse body ──
    const body = (await req.json().catch(() => null)) as MentorRequest | null;
    if (!body?.problemId || !body.language || !body.userMessage) {
      return Response.json(
        { error: "Missing required fields: problemId, language, userMessage" },
        { status: 400 },
      );
    }

    // ── 3. Validate user code language ──
    const validLanguages = ["python", "java", "cpp", "c", "c++", "go", "rust", "kotlin"];
    if (!validLanguages.includes(body.language)) {
      return Response.json(
        { error: `Unsupported language: ${body.language}` },
        { status: 400 },
      );
    }

    // ── 4. Rate limit ──
    const rateLimit = await checkRateLimit(session.user.id);
    if (!rateLimit.allowed) {
      return Response.json({ error: rateLimit.message }, { status: 429 });
    }

    // ── 5. Streaming mode ──
    if (body.stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = await execute({
              body,
              userId: session.user.id,
              onChunk: (chunk: string) => {
                controller.enqueue(encoder.encode(sseEvent("delta", { token: chunk })));
              },
            });

            if (result.ok) {
              controller.enqueue(encoder.encode(sseEvent("done", {
                ok: true,
                message: result.message,
                animation: result.animation,
                visualization: result.visualization ?? null,
                architectReview: result.architectReview ?? null,
                metadata: result.metadata,
              })));
            } else {
              controller.enqueue(encoder.encode(sseEvent("error", { error: result.error })));
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Internal server error";
            controller.enqueue(encoder.encode(sseEvent("error", { error: msg })));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── 6. Non-streaming: execute mentor flow ──
    const result = await execute({ body, userId: session.user.id });

    // ── 7. Return response ──
    if (result.ok) {
      return Response.json({
        ok: true,
        message: result.message,
        animation: result.animation,
        visualization: result.visualization ?? null,
        architectReview: result.architectReview ?? null,
        metadata: result.metadata,
      });
    }

    if (result.error?.includes("Not found") || result.error?.includes("Problem not found")) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    if (result.error?.includes("provider") || result.error?.includes("No AI")) {
      return Response.json({ error: result.error }, { status: 503 });
    }
    if (result.error?.includes("Empty response")) {
      return Response.json({ error: result.error }, { status: 502 });
    }

    return Response.json({ error: result.error || "Unknown error" }, { status: 500 });
  } catch (error) {
    console.error("Mentor API Error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
