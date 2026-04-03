/**
 * Mentor Conversation Debug API
 *
 * GET  /api/debug/mentor-log — get recent conversation entries
 * POST /api/debug/mentor-log — log a conversation entry
 * DELETE /api/debug/mentor-log — clear entries
 */

import { NextRequest } from "next/server";

type ConversationEntry = {
  id: number;
  timestamp: string;
  userMessage: string;
  decisionType: "STATIC" | "CACHE_HIT" | "AI_NEEDED";
  aiCalled: boolean;
  aiRequestMessages?: Array<{ role: string; content: string }>;
  aiResponse?: string;
  cacheHitData?: { similarity: string; entryId: string };
  responseData: string;
  stage: string;
  rung: number;
  embedMs?: number;
  aiMs?: number;
  totalMs?: number;
  error?: string;
};

const entries: ConversationEntry[] = [];
let nextId = 1;
const MAX = 200;

export async function GET() {
  return Response.json({ ok: true, entries, count: entries.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry: ConversationEntry = {
    id: nextId++,
    timestamp: new Date().toLocaleTimeString(),
    userMessage: body.userMessage ?? String(body.userMessage || ""),
    decisionType: body.decisionType ?? "AI_NEEDED",
    aiCalled: body.aiCalled ?? false,
    aiRequestMessages: body.aiRequestMessages ?? undefined,
    aiResponse: body.aiResponse ?? undefined,
    cacheHitData: body.cacheHitData ?? undefined,
    responseData: body.responseData ?? "",
    stage: body.stage ?? "EXPLORE",
    rung: body.rung ?? 1,
    embedMs: body.embedMs ?? undefined,
    aiMs: body.aiMs ?? undefined,
    totalMs: body.totalMs ?? undefined,
    error: body.error ?? undefined,
  };
  if (entries.length >= MAX) entries.shift();
  entries.push(entry);
  return Response.json({ ok: true, logId: entry.id });
}

export async function DELETE() {
  entries.length = 0;
  nextId = 1;
  return Response.json({ ok: true, cleared: true });
}
