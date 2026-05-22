import crypto from "crypto";
import type { TeachingStage } from "@/lib/mentorContext";
import { routeInteraction } from "./routing/interactionRouter";
import { getOrCreateSession, saveMessage } from "./stage/core";
import { buildSolutionResponse } from "./guardrails";
import { resolveApiConfig, type ApiConfig } from "./llm";
import { handleSoftCacheHit } from "./services/handlers/softCacheHandler";
import { handleAiNeeded } from "./services/handlers/aiHandler";
import {
  findProblemBySlug,
  findUserSettings,
  findProblemStats,
  findConversationSummary,
} from "@/lib/repositories";
import { generateTrace } from "@/lib/execution-trace/executor";
import { buildTraceContext } from "@/lib/execution-trace/context/trace-context";
import { detectDivergencePatterns } from "@/lib/execution-trace/analysis/divergence-detector";
import { buildVisualizationFromTrace } from "@/lib/visualization/builders";
import type { ExecutionTrace } from "@/lib/execution-trace/types";

import {
  classifyIntentWithContext,
  detectInterventionNeed,
  type ConversationIntent,
} from "./enhancedIntentClassifier";
import { getStudentKnowledgeGraph } from "./personalizationEngine";
import { analyzeCodeForDebugging, type DebugAnalysis } from "./enhancedDebuggingAssistant";
import { features } from "@/lib/features";
import { detectFrustrationLevel } from "./services/enhancedFeatures";
import { handleIntervention } from "./services/intervention";
import { logMentorInteraction, logDbError } from "./logging";
import { classifyIntent } from "./intent/core";
import type { IntentClassification } from "./intent/core";

// ── Idempotency store ──
// In-memory Map keyed by "userId:problemId:idempotencyKey"
// TTL 60s to prevent unbounded growth. For multi-instance, replace with Redis.
const idempotencyStore = new Map<string, { response: MentorResponse; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 60_000;

function getIdempotencyKey(userId: string, problemId: string, key: string): string {
  return `${userId}:${problemId}:${key}`;
}

function setIdempotentResponse(key: string, response: MentorResponse): void {
  idempotencyStore.set(key, { response, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
}

function getIdempotentResponse(key: string): MentorResponse | null {
  const entry = idempotencyStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    idempotencyStore.delete(key);
    return null;
  }
  return entry.response;
}

function computeCodeHash(code?: string): string | null {
  if (!code || code.trim().length < 10) return null;
  return crypto.createHash("sha256").update(code).digest("hex").slice(0, 12);
}

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
  idempotencyKey?: string;
  stream?: boolean;
};

export type ArchitectReviewData = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  feedback: string;
};

export type MentorResponse = {
  ok: boolean;
  message?: string;
  error?: string;
  animation?: object | null;
  architectReview?: ArchitectReviewData | null;
  visualization?: object | null;
  metadata?: Record<string, unknown>;
};

export type { UserStats, HistoryMsg as ContextHistoryMsg } from "./context";

function collectIntentHistory(
  messages: Array<{ role: string; content: string }>,
): IntentClassification[] {
  const intents: IntentClassification[] = [];
  for (const msg of messages) {
    if (msg.role === "user") {
      try {
        intents.push(classifyIntent(msg.content));
      } catch {
      }
    }
  }
  return intents;
}

export async function execute(params: {
  body: MentorRequest;
  userId: string;
  onChunk?: (chunk: string) => void;
}): Promise<MentorResponse> {
  const { body, userId, onChunk } = params;
  const problemId = body.problemId;

  // ── Idempotency check ──
  const idKey = body.idempotencyKey
    ? getIdempotencyKey(userId, problemId, body.idempotencyKey)
    : null;
  if (idKey) {
    const existing = getIdempotentResponse(idKey);
    if (existing) {
      return existing;
    }
  }

  const codeHash = computeCodeHash(body.userCode);

  const mentorSession = await getOrCreateSession(userId, problemId);

  await saveMessage(
    mentorSession.id, "user", body.userMessage, mentorSession.stage as TeachingStage,
  );

  const problemRecord = await findProblemBySlug(problemId);

  if (!problemRecord) {
    return { ok: false, error: "Problem not found" };
  }

  const problemForRouter = {
    id: problemRecord.id, slug: problemRecord.slug, title: problemRecord.title,
    statementMd: problemRecord.statementMd, constraintsMd: problemRecord.constraintsMd || undefined,
    meta: {
      difficulty: problemRecord.difficulty,
      tags: (problemRecord.tags as string[]) || [],
      patterns: problemRecord.patterns.map((p) => p.pattern.name),
    },
  };

  const [userAiSettings, stats, existingSummary] = await Promise.all([
    findUserSettings(userId),
    findProblemStats(userId, problemId),
    findConversationSummary(userId, problemId),
  ]);

  const history = mentorSession.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let knowledgeGraph = null;
  let conversationIntent: ConversationIntent | null = null;
  let intervention = null;

  if (features.enhancedIntent || features.personalization) {
    if (features.personalization) {
      knowledgeGraph = await getStudentKnowledgeGraph(userId);
    }

    if (features.enhancedIntent) {
      const previousIntents = collectIntentHistory(mentorSession.messages.slice(0, -1));

      conversationIntent = classifyIntentWithContext(body.userMessage, {
        stage: mentorSession.stage,
        previousIntents,
        userFrustrationLevel: detectFrustrationLevel(body.userMessage),
        attemptCount: stats?.submitCount || 0,
      });

      intervention = detectInterventionNeed(
        conversationIntent, previousIntents, {
          frustrationLevel: detectFrustrationLevel(body.userMessage),
          attemptCount: stats?.submitCount || 0,
        },
      );

      if (intervention) {
        return handleIntervention(intervention, body, mentorSession, {
          stage: mentorSession.stage,
          problemTitle: problemRecord.title,
        });
      }
    }
  }

  const decision = await routeInteraction(body.userMessage, mentorSession, problemForRouter);

  const currentRung = existingSummary?.lastRung ?? 1;

  if (decision.type === "STATIC") {
    let message = "I'm here to help you learn. Let's focus on the current step.";

    if (decision.handler === "breakdown") {
      message = `Let's break down "${problemRecord.title}" together. What part of the problem statement is most confusing to you right now?`;
    } else if (decision.handler === "stage_gate") {
      message = buildSolutionResponse(mentorSession.stage as TeachingStage);
    }

    await saveMessage(
      mentorSession.id, "assistant", message, mentorSession.stage as TeachingStage,
    );

    const staticResponse: MentorResponse = {
      ok: true, message, animation: null,
      metadata: { stage: mentorSession.stage, type: "static", handler: decision.handler },
    };

    if (idKey) setIdempotentResponse(idKey, staticResponse);

    logMentorInteraction({
      userId, problemId, userMessage: body.userMessage, decisionType: "STATIC",
      responseData: message, stage: mentorSession.stage, rung: currentRung,
    }).catch(logDbError);

    return staticResponse;
  }

  if (decision.type === "CACHE_HIT" && decision.similarity >= 0.99) {
    await saveMessage(
      mentorSession.id, "assistant", decision.entry.response,
      mentorSession.stage as TeachingStage,
    );

    const cacheHitResponse: MentorResponse = {
      ok: true, message: decision.entry.response, animation: null,
      metadata: { stage: mentorSession.stage, type: "cache_hit_hard", similarity: decision.similarity },
    };

    if (idKey) setIdempotentResponse(idKey, cacheHitResponse);

    logMentorInteraction({
      userId, problemId, userMessage: body.userMessage, decisionType: "CACHE_HIT",
      responseData: decision.entry.response, stage: mentorSession.stage,
      rung: currentRung,
      cacheHitData: { similarity: decision.similarity.toFixed(4), cacheEntryId: decision.entry.id },
    }).catch(logDbError);

    return cacheHitResponse;
  }

  if (decision.type === "CACHE_HIT" && decision.similarity >= 0.6) {
    const softHitResponse = await handleSoftCacheHit({
      body, userId, problemId, mentorSession, history, stats, userAiSettings,
      existingSummary, problemRecord, decision, currentRung,
    });
    if (idKey) setIdempotentResponse(idKey, softHitResponse);
    return softHitResponse;
  }

  let apiConfig: ApiConfig;
  try {
    apiConfig = await resolveApiConfig(userAiSettings);
  } catch {
    const noProviderResponse: MentorResponse = {
      ok: false,
      error: "No AI provider available. Please configure your API key in Settings.",
    };
    if (idKey) setIdempotentResponse(idKey, noProviderResponse);
    return noProviderResponse;
  }

  const intent = decision.intent;

  let analysis: DebugAnalysis | null = null;
  if (features.debugAnalysis && mentorSession.stage === "DEBUG" && body.userCode &&
      (body.syntaxError || /error|bug/i.test(body.userMessage))) {
    try {
      analysis = await analyzeCodeForDebugging(body.userCode, body.language as any, {
        errorMessage: body.syntaxError,
      });
    } catch (e) {
      console.warn("Debug analysis failed:", e);
    }
  }

  let traceContext = "";
  let traceData: ExecutionTrace | null = null;
  let vizData: any = null;
  if (body.userCode && body.userCode.trim().length > 20) {
    try {
      const parsedInput = body.publicTestCases?.[0]
        ? { input: body.publicTestCases[0].input, expected: body.publicTestCases[0].expected, parsedInput: parseTestCaseInput(body.publicTestCases[0].input) }
        : { input: "", expected: "", parsedInput: [] };

      traceData = await generateTrace({
        code: body.userCode,
        language: body.language as any,
        testCase: parsedInput,
        maxSteps: 300,
        timeout: 5000,
      });

      const detection = detectDivergencePatterns(traceData);
      try {
        vizData = buildVisualizationFromTrace(traceData);
      } catch {}

      const built = buildTraceContext(traceData, detection, vizData);
      traceContext = built.fullContext;
    } catch {
    }
  }

  const aiResponse = await handleAiNeeded({
    body, userId, problemId, mentorSession, history, stats, userAiSettings,
    existingSummary, apiConfig, intent, conversationIntent, knowledgeGraph,
    debugAnalysis: analysis, rung: currentRung, traceContext, onChunk,
  });

  if (idKey) setIdempotentResponse(idKey, aiResponse);
  return aiResponse;
}

function parseTestCaseInput(input: string): unknown[] {
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [input];
  }
}
