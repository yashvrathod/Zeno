/**
 * Mentor Conversation Debug API
 *
 * GET  /api/debug/mentor-log — recent session messages + cache state
 * POST /api/debug/mentor-log — log an interaction (called by mentor route)
 * DELETE /api/debug/mentor-log — clear the log
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────
// IN-MEMORY INTERACTION LOG (per-session, not persisted across restarts)
// ─────────────────────────────────────────────
export type MentorLogEntry = {
  id: number;
  userId: string;
  problemId: string;
  timestamp: string;
  userMessage: string;
  decisionType: "STATIC" | "CACHE_HIT" | "AI_NEEDED";
  aiCalled: boolean;
  aiRequestPayload?: { system: string; messages: Array<{ role: string; content: string }> };
  aiResponse?: string;
  cacheHitData?: { similarity: string; cacheEntryId: string; responseUsed: string };
  responseData: string;
  stage: string;
  rung: number;
  embedMs?: number;
  aiMs?: number;
  totalMs?: number;
  error?: string;
};

const log: MentorLogEntry[] = [];
let nextId = 1;

const MAX_LOG = 200;

export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Fetch recent mentor sessions & messages
    const sessions = await prisma.mentorSession.findMany({
      where: userId ? { userId: userId } : {},
      orderBy: { updatedAt: "desc" },
      take: 3,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 30,
        },
      },
    });

    // Fetch cache stats
    const cacheEntries = await prisma.cacheEntry.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        problemId: true,
        questionMd5: true,
        response: true,
        stage: true,
        rung: true,
        usedCount: true,
        updatedAt: true,
      },
    });

    const cacheCount = await prisma.cacheEntry.count();

    // Fetch recent interaction log
    const interactionLogs = await prisma.mentorInteractionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return Response.json({
      ok: true,
      sessions: sessions.map((s) => ({
        id: s.id,
        problemId: s.problemId,
        stage: s.stage,
        currentRung: s.currentRung,
        updatedAt: s.updatedAt,
        messages: s.messages.map((m) => ({
          id: m.id,
          role: m.role,
          stage: m.stage,
          content: m.content,
          createdAt: m.createdAt,
        })),
      })),
      cache: {
        count: cacheCount,
        entries: cacheEntries,
      },
      recentLogs: interactionLogs.map((l) => ({
        id: l.id,
        userId: l.userId,
        problemId: l.problemId,
        eventType: l.eventType,
        mentorQuestion: l.mentorQuestion,
        createdAt: l.createdAt,
      })),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    userId,
    problemId,
    userMessage,
    decisionType,
    aiCalled,
    aiRequestPayload,
    aiResponse,
    cacheHitData,
    responseData,
    stage,
    rung,
    embedMs,
    aiMs,
    totalMs,
    error,
  } = body;

  if (!userMessage || !problemId || !stage) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const entry: MentorLogEntry = {
    id: nextId++,
    userId: userId || "anonymous",
    problemId,
    timestamp: new Date().toISOString(),
    userMessage,
    decisionType,
    aiCalled,
    aiRequestPayload,
    aiResponse,
    cacheHitData,
    responseData,
    stage,
    rung: rung || 1,
    embedMs,
    aiMs,
    totalMs,
    error,
  };

  if (log.length >= MAX_LOG) log.shift();
  log.push(entry);

  return Response.json({ ok: true, logId: entry.id });
}

export async function DELETE(req: NextRequest) {
  log.length = 0;
  nextId = 1;
  return Response.json({ ok: true, cleared: true });
}
