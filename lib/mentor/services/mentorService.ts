/**
 * Mentor Service Orchestrator — Thin Coordinator
 *
 * Coordinates the full mentor interaction flow by delegating to specialized handlers:
 *  1. Route the user's question (static → cache → AI)
 *  2. Delegate to appropriate handler (soft cache or AI)
 *  3. Return the structured response
 *
 * All business logic lives in:
 *  - contextBuilder.ts — transforms data into prompt text
 *  - promptBuilder.ts — builds system prompts
 *  - responseGuardrails.ts — output sanitization
 *  - llmClient.ts — API config and LLM calls
 *  - handlers/softCacheHandler.ts — CACHE_HIT "SOFT" path
 *  - handlers/aiHandler.ts — AI_NEEDED full path
 *  - stageEngine.ts — session and stage management
 */

import type { TeachingStage } from "@/lib/mentorContext";
import { routeInteraction } from "@/lib/mentor/interactionRouter";
import { getOrCreateSession, saveMessage } from "@/lib/mentor/stageEngine";
import { buildSolutionResponse } from "./responseGuardrails";
import { resolveApiConfig, type ApiConfig } from "./llmClient";
import { handleSoftCacheHit } from "./handlers/softCacheHandler";
import { handleAiNeeded } from "./handlers/aiHandler";
import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type HistoryMsg = { role: "user" | "assistant"; content: string };

export type MentorRequest = {
  problemId: string;
  problemTitle?: string;
  problemStatementMd?: string;
  problemConstraintsMd?: string;
  publicTestCases?: Array<{ order: number; input: string; expected: string }>;
  language: string;
  userMessage: string;
  userCode?: string;
  syntaxError?: string;
  history?: HistoryMsg[];
  animationType?: string | null;
  animationData?: string | null;
};

export type MentorResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  animation?: object | null;
  metadata?: Record<string, unknown>;
};

// Re-export from contextBuilder for handlers
export type { UserStats, HistoryMsg as ContextHistoryMsg } from "./contextBuilder";

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG LOG — posts to /api/debug/mentor-log (fire-and-forget)
// ─────────────────────────────────────────────────────────────────────────────

async function logInteraction(data: {
  userId: string;
  problemId: string;
  userMessage: string;
  decisionType: "STATIC" | "CACHE_HIT" | "AI_NEEDED";
  responseData: string;
  stage: string;
  rung: number;
  aiCalled?: boolean;
  cacheHitData?: { similarity: string; cacheEntryId: string };
  error?: string;
}) {
  fetch(
    new URL("/api/debug/mentor-log", process.env.NEXTAUTH_URL || "http://localhost:3000"),
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
  ).catch(() => {});
}

// ───────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTE
// ───────────────────────────────────────────────────────────────────────────────

export async function execute(params: {
  body: MentorRequest;
  userId: string;
}): Promise<MentorResponse> {
  const { body, userId } = params;
  const problemId = body.problemId;

  // ── 1. INITIALIZE STAGE ENGINE SESSION ──
  const mentorSession = await getOrCreateSession(userId, problemId);

  // Save user message to session
  await saveMessage(
    mentorSession.id,
    "user",
    body.userMessage,
    mentorSession.stage as TeachingStage,
  );

  // ── 2. FETCH PROBLEM METADATA ──
  const problemRecord = await prisma.problem.findUnique({
    where: { id: problemId },
    include: { patterns: { include: { pattern: true } } },
  });

  if (!problemRecord) {
    return { ok: false, error: "Problem not found" };
  }

  const problemForRouter = {
    id: problemRecord.id,
    slug: problemRecord.slug,
    title: problemRecord.title,
    statementMd: problemRecord.statementMd,
    constraintsMd: problemRecord.constraintsMd || undefined,
    meta: {
      difficulty: problemRecord.difficulty,
      tags: (problemRecord.tags as string[]) || [],
      patterns: problemRecord.patterns.map((p) => p.pattern.name),
    },
  };

  // ── 3. Parallel fetch: settings, stats, summary ──
  const [userAiSettings, stats, existingSummary] = await Promise.all([
    prisma.userAiSettings.findUnique({
      where: { userId: userId },
      select: {
        apiProvider: true,
        groqApiKey: true,
        openaiApiKey: true,
        googleApiKey: true,
        openrouterApiKey: true,
        ollamaBaseUrl: true,
        ollamaModel: true,
        preferredFreeModel: true,
        verbosity: true,
      },
    }),
    prisma.userProblemStats.findUnique({
      where: { userId_problemId: { userId, problemId } },
      select: {
        runCount: true,
        submitCount: true,
        acceptedCount: true,
        wrongAnswerCount: true,
        runtimeErrorCount: true,
        lastStatus: true,
        lastError: true,
      },
    }),
    prisma.mentorConversationSummary.findUnique({
      where: { userId_problemId: { userId, problemId } },
      select: { summaryMd: true, messageCount: true, lastRung: true },
    }),
  ]);

  const history = mentorSession.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // ── 4. ROUTE INTERACTION ──
  const decision = await routeInteraction(body.userMessage, mentorSession, problemForRouter);

  // ────────────────────────────────
  // STATIC PATH
  // ─────────────────────────────────
  if (decision.type === "STATIC") {
    let message = "I'm here to help you learn. Let's focus on the current step.";

    if (decision.handler === "breakdown") {
      message = `Let's break down "${problemRecord.title}" together. What part of the problem statement is most confusing to you right now?`;
    } else if (decision.handler === "stage_gate") {
      message = buildSolutionResponse(mentorSession.stage as TeachingStage);
    }

    await saveMessage(
      mentorSession.id,
      "assistant",
      message,
      mentorSession.stage as TeachingStage,
    );

    logInteraction({
      userId,
      problemId,
      userMessage: body.userMessage,
      decisionType: "STATIC",
      responseData: message,
      stage: mentorSession.stage as string,
      rung: 1,
    });

    return {
      ok: true,
      message,
      animation: null,
      metadata: { stage: mentorSession.stage, type: "static", handler: decision.handler },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CACHE HIT — HARD
  // ──────────────────────────────────────────────────────────────────────────
  if (decision.type === "CACHE_HIT" && decision.quality === "HARD") {
    await saveMessage(
      mentorSession.id,
      "assistant",
      decision.entry.response,
      mentorSession.stage as TeachingStage,
    );

    prisma.cacheEntry.update({
      where: { id: decision.entry.id },
      data: { usedCount: { increment: 1 } },
    }).catch(console.warn);

    logInteraction({
      userId,
      problemId,
      userMessage: body.userMessage,
      decisionType: "CACHE_HIT",
      responseData: decision.entry.response,
      stage: mentorSession.stage as string,
      rung: 1,
      cacheHitData: {
        similarity: decision.similarity?.toFixed(4) ?? "0",
        cacheEntryId: decision.entry.id,
      },
    });

    return {
      ok: true,
      message: decision.entry.response,
      animation: null,
      metadata: {
        stage: mentorSession.stage,
        type: "cache_hit_hard",
        similarity: decision.similarity,
      },
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CACHE HIT — SOFT (refine via AI)
  // ───────────────────────────────────────────────────────────────────────────
  if (decision.type === "CACHE_HIT" && decision.quality === "SOFT") {
    return handleSoftCacheHit({
      body,
      userId,
      problemId,
      mentorSession,
      history,
      stats,
      userAiSettings,
      existingSummary,
      problemRecord,
      decision,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────────
  // AI_NEEDED — Full LLM call
  // ───────────────────────────────────────────────────────────────────────────────────

  // Resolve API config
  let apiConfig: ApiConfig;
  try {
    apiConfig = await resolveApiConfig(userAiSettings);
  } catch {
    return {
      ok: false,
      error: "No AI provider available. Please configure your API key in Settings or contact support.",
    };
  }

  return handleAiNeeded({
    body,
    userId,
    problemId,
    mentorSession,
    history,
    stats,
    userAiSettings,
    existingSummary,
    apiConfig,
  });
}
