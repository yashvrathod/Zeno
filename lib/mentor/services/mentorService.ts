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
// ENHANCED FEATURE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────
import {
  classifyIntentWithContext,
  makeRoutingDecision,
  detectInterventionNeed,
  type ConversationIntent
} from "../enhancedIntentClassifier";
import {
  getStudentKnowledgeGraph,
  updateConceptMastery,
  recordProblemAttempt,
  calculateOverallMastery,
  getWeakestConcepts,
  type ConceptId
} from "../personalizationEngine";
import {
  analyzeCodeForDebugging,
  type DebugAnalysis
} from "../enhancedDebuggingAssistant";
import {
  generateVisualizationFromTrace,
  type VisualizationType
} from "../interactiveVisualization";
import { features } from "@/lib/features";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS FOR ENHANCED FEATURES
// ─────────────────────────────────────────────────────────────────────────────

function detectFrustrationLevel(message: string): number {
  const frustrationWords = [
    'frustrated', 'stuck', 'hate', 'confused', 'lost',
    'impossible', 'give up', 'ugh', 'wtf', 'screw this',
    'annoying', 'terrible', 'worst', 'fed up'
  ];
  const lower = message.toLowerCase();
  const count = frustrationWords.filter(word => lower.includes(word)).length;
  return Math.min(count / 5, 1); // Normalize to 0-1
}

async function handleIntervention(
  intervention: any,
  body: MentorRequest,
  session: any,
  context: any
): Promise<MentorResponse> {
  let message = '';

  switch (intervention.type) {
    case 'frustration':
      message = `I can see you're feeling frustrated, and that's completely okay.
Let's take a step back. ${intervention.suggestedAction}`;
      break;

    case 'confusion':
      message = `It sounds like we're going in circles. Let me try a different approach.
${intervention.suggestedAction}`;
      break;

    case 'escalation':
      message = `I notice you're asking for more direct help.
${intervention.suggestedAction}`;
      break;

    case 'stuck':
      message = `You've been working on this for a while. ${intervention.suggestedAction}`;
      break;

    case 'repetition':
      message = `I notice you're asking similar questions.
${intervention.suggestedAction}`;
      break;

    default:
      message = intervention.suggestedAction;
  }

  // Save the intervention message
  await saveMessage(
    session.id,
    "assistant",
    message,
    session.stage as any,
  );

  return {
    ok: true,
    message,
    metadata: {
      interventionType: intervention.type,
      stage: session.stage,
      requiresAttention: true
    }
  };
}

function extractConceptsFromProblem(body: MentorRequest): ConceptId[] {
  const concepts: ConceptId[] = [];
  const text = (body.problemTitle + ' ' + (body.problemStatementMd || '')).toLowerCase();

  // Map keywords to concepts
  const conceptMap: Record<string, ConceptId> = {
    'binary search': 'binary_search',
    'two pointer': 'two_pointer',
    'sliding window': 'sliding_window',
    'hash map': 'hash_map',
    'hashmap': 'hash_map',
    'stack': 'stack',
    'queue': 'queue',
    'heap': 'heap',
    'dfs': 'dfs',
    'bfs': 'bfs',
    'tree': 'tree',
    'graph': 'graph',
    'dp': 'dp',
    'dynamic programming': 'dp',
    'recursion': 'recursion',
    'backtrack': 'backtracking',
    'greedy': 'greedy',
  };

  for (const [keyword, concept] of Object.entries(conceptMap)) {
    if (text.includes(keyword) && !concepts.includes(concept)) {
      concepts.push(concept);
    }
  }

  return concepts;
}

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

  // ── 4. ENHANCED INTENT CLASSIFICATION & PERSONALIZATION ──
  let knowledgeGraph = null;
  let conversationIntent: ConversationIntent | null = null;
  let routingDecision: any = null;
  let intervention = null;

  if (features.enhancedIntent || features.personalization) {
    // Fetch student knowledge graph for personalization
    if (features.personalization) {
      knowledgeGraph = await getStudentKnowledgeGraph(userId);
    }

    // Enhanced intent classification with conversation context
    if (features.enhancedIntent) {
      const allIntents = await Promise.all(
        history.map(async (h) => ({
          intent: h.role === "user"
            ? (await classifyIntentWithContext(h.content, {})).primaryIntent
            : ("assistant" as any),
          confidence: "medium" as any,
          shouldEnforceStage: true,
          requiresValidation: true,
          reason: "from_history",
          keywords: [],
          metadata: {}
        }))
      );
      const previousIntents = allIntents.filter((h: any) => h.intent !== "assistant");

      conversationIntent = classifyIntentWithContext(body.userMessage, {
        stage: mentorSession.stage as any,
        previousIntents,
        userFrustrationLevel: detectFrustrationLevel(body.userMessage),
        attemptCount: stats?.submitCount || 0
      });

      routingDecision = makeRoutingDecision(conversationIntent, {
        stage: mentorSession.stage,
        userFrustrationLevel: detectFrustrationLevel(body.userMessage)
      });

      // Detect need for proactive intervention
      intervention = detectInterventionNeed(
        conversationIntent,
        previousIntents,
        {
          frustrationLevel: detectFrustrationLevel(body.userMessage),
          attemptCount: stats?.submitCount || 0
        }
      );

      // Handle intervention immediately
      if (intervention) {
        return handleIntervention(intervention, body, mentorSession, {
          stage: mentorSession.stage,
          problemTitle: problemRecord.title
        });
      }
    }
  }

  // ── 5. ROUTE INTERACTION ──
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
  // CACHE HIT — HARD (exact match, similarity = 1.0)
  // ──────────────────────────────────────────────────────────────────────────
  if (decision.type === "CACHE_HIT" && decision.similarity === 1.0) {
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
  // CACHE HIT — SOFT (semantic match, needs refinement via AI)
  // ───────────────────────────────────────────────────────────────────────────
  if (decision.type === "CACHE_HIT" && decision.similarity >= 0.6 && decision.similarity < 1.0) {
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

  // By this point, decision must be AI_NEEDED (STATIC and CACHE_HIT handled above)
  const intent = decision.type === "AI_NEEDED" ? decision.intent : undefined;

  // ── Enhanced Debugging Analysis (if in DEBUG stage with errors) ──
  let analysis: DebugAnalysis | null = null;
  if (features.debugAnalysis && mentorSession.stage === "DEBUG" && body.userCode && (body.syntaxError || body.userMessage.toLowerCase().includes("error") || body.userMessage.toLowerCase().includes("bug"))) {
    try {
      analysis = await analyzeCodeForDebugging(body.userCode, body.language as any, { errorMessage: body.syntaxError });
    } catch (e) {
      console.warn("Debug analysis failed:", e);
    }
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
    intent,
    conversationIntent,
    knowledgeGraph,
    debugAnalysis: analysis,
  });
}
