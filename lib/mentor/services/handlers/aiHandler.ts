/**
 * AI Handler — Full LLM Call Path
 *
 * Handles the AI_NEEDED decision path:
 *  1. Build context and system prompt
 *  2. Call LLM
 *  3. Apply guardrails
 *  4. Persist messages, cache, stage state, memory
 */

import type { TeachingStage } from "@/lib/mentorContext";
import type { Verbosity } from "@/lib/aiPreferences";
import { buildContextualGuidance, getAdaptiveTemperature, detectLearningRung } from "@/lib/mentorContext";
import { inferVerbosityFromText, verbosityToModelMaxTokens, verbosityToStylePrompt } from "@/lib/aiPreferences";
import { extractProblemContext, selectGuideQuestion } from "@/lib/mentorQuestions";
import { getOrCreateSession, saveMessage, tryAdvanceStage, type TransitionContext } from "@/lib/mentor/stageEngine";
import { saveToCache } from "@/lib/mentor/interactionRouter";
import prisma from "@/lib/prisma";
import { type ApiConfig, type LlmMessage, callLlmAndExtract } from "../llmClient";
import {
  buildAdaptiveProblemContext,
  buildUserCodeContext,
  buildStatsContext,
  buildConversationHistory,
  buildAnimationContext,
} from "../contextBuilder";
import type { HistoryMsg, UserStats } from "../contextBuilder";
import { detectTone, buildMentorSystemPrompt } from "../promptBuilder";
import {
  sanitizeResponse,
  buildSolutionResponse,
  buildAiUnavailableFallback,
  isSolutionRequest,
  shouldTriggerAnimation,
  parseAnimationMarker,
  parseMentorMemory,
} from "../responseGuardrails";
import type { MentorRequest, MentorResponse } from "../mentorService";

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

export type MentorSession = {
  id: string;
  stage: string;
  messages: Array<{ role: string; content: string }>;
};

function detectLoop(history: HistoryMsg[]): boolean {
  if (history.length < 6) return false;
  const recentUserMessages = history
    .filter((h) => h.role === "user")
    .slice(-3)
    .map((h) => h.content.toLowerCase());

  if (recentUserMessages.length !== 3) return false;

  const [msg1, msg2, msg3] = recentUserMessages;
  const words1 = new Set(msg1.split(/\s+/).filter((w) => w.length > 3));
  const words2 = new Set(msg2.split(/\s+/).filter((w) => w.length > 3));
  const words3 = new Set(msg3.split(/\s+/).filter((w) => w.length > 3));

  const overlap12 = [...words1].filter((w) => words2.has(w)).length;
  const overlap23 = [...words2].filter((w) => words3.has(w)).length;
  const overlap13 = [...words1].filter((w) => words3.has(w)).length;

  const avgOverlap = (overlap12 + overlap23 + overlap13) / 3;
  const avgSize = (words1.size + words2.size + words3.size) / 3;

  return avgSize > 0 && avgOverlap / avgSize > 0.6;
}

export async function handleAiNeeded(params: {
  body: MentorRequest;
  userId: string;
  problemId: string;
  mentorSession: MentorSession;
  history: HistoryMsg[];
  stats: UserStats;
  userAiSettings: any;
  existingSummary: any;
  apiConfig: ApiConfig;
}): Promise<MentorResponse> {
  const { body, userId, problemId, mentorSession, history, stats, userAiSettings, existingSummary, apiConfig } = params;
  const stage = mentorSession.stage as TeachingStage;

  // ── Verbosity ──
  const inferred = inferVerbosityFromText(body.userMessage);
  let verbosity: Verbosity = (userAiSettings?.verbosity as Verbosity) || "normal";

  if (inferred && inferred !== verbosity) {
    verbosity = inferred;
    prisma.userAiSettings
      .upsert({ where: { userId }, create: { userId, verbosity }, update: { verbosity } })
      .catch(() => {});
  }

  const rollingSummaryMd = existingSummary?.summaryMd ?? null;
  const currentMessageCount = existingSummary?.messageCount ?? 0;
  const tone = detectTone(history, body.userMessage, stage);
  const previousRung = existingSummary?.lastRung ?? 1;
  const rung = detectLearningRung(history, stats, body.userMessage, body.userCode, previousRung);

  // ── Loop detection ──
  const loopDetected = detectLoop(history);
  const allowFullSolution = isSolutionRequest(body.userMessage);

  if (!allowFullSolution && stage !== "REFLECT") {
    const isSuspicious =
      /just show|just tell|skip|shortcut|cheat|i give up|forget it|just|directly/i.test(body.userMessage) &&
      /code|solution|answer|implement|write/i.test(body.userMessage);

    if (isSuspicious) {
      return { ok: true, message: buildSolutionResponse(stage), animation: null, metadata: { verbosity, stage, tone, wasGated: true } };
    }
  }

  // ── Build context ──
  const stylePrompt = verbosityToStylePrompt(verbosity);
  const contextualGuidance = buildContextualGuidance(body, stats, history);
  const conversationHistory = buildConversationHistory(history, rollingSummaryMd);
  const problemContext = buildAdaptiveProblemContext(body, stage);
  const codeContext = buildUserCodeContext(body);
  const statsContext = buildStatsContext(stats, body.userMessage, stage);
  const probContext = extractProblemContext(body.userCode, body.problemStatementMd);
  const guideQuestion = selectGuideQuestion(rung, stage, probContext);
  const triggerAnimation = shouldTriggerAnimation(body.userMessage);
  const animationContext = buildAnimationContext(body.animationType, body.animationData, triggerAnimation);

  let loopAlert = "";
  if (loopDetected) {
    loopAlert = `
⚠️ ALERT: Student appears to be looping — asking similar questions repeatedly.
Change your approach completely. Try:
- A real-world analogy
- Shrink to a 3-element example and solve by hand together
- Ask a completely different angle of question
- Acknowledge the loop: "I notice we keep circling back to X. Let's reset..."
`;
  }

  const existingMem = rollingSummaryMd?.trim() || null;

  const systemMessage = buildMentorSystemPrompt(
    stage,
    rung,
    tone,
    verbosity,
    stylePrompt,
    contextualGuidance,
    problemContext,
    codeContext,
    statsContext,
    conversationHistory,
    guideQuestion,
    loopAlert,
    existingMem,
    animationContext,
  );

  const messages: LlmMessage[] = [{ role: "system", content: systemMessage }];

  const recentTurns = history.slice(-4).map((h) => ({
    role: h.role,
    content: h.content.length > 600 ? h.content.slice(0, 600) + "\n[truncated]" : h.content,
  }));
  for (const msg of recentTurns) {
    messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
  }
  messages.push({ role: "user", content: body.userMessage });

  const temperature = getAdaptiveTemperature(body, stats);
  const maxTokens = verbosityToModelMaxTokens(verbosity);

  // ── CALL AI ──
  let assistantMessage: string;
  try {
    assistantMessage = await callLlmAndExtract({ messages, temperature, maxTokens, apiConfig });
  } catch (e) {
    const fallbackMessage = buildAiUnavailableFallback(stage);
    await saveMessage(mentorSession.id, "assistant", fallbackMessage, stage);
    logInteraction({
      userId,
      problemId,
      userMessage: body.userMessage,
      decisionType: "STATIC",
      responseData: fallbackMessage,
      stage,
      rung,
      error: e instanceof Error ? e.message.slice(0, 200) : String(e),
    });
    return { ok: true, message: fallbackMessage, animation: null, metadata: { stage, runGated: true, reason: "ai_unavailable" } };
  }

  if (!assistantMessage) {
    return { ok: false, error: "Received empty response from AI service" };
  }

  // ── Output guardrails ──
  const { text: sanitized, wasViolation } = sanitizeResponse(assistantMessage, allowFullSolution);
  assistantMessage = sanitized;
  if (wasViolation && !allowFullSolution) {
    assistantMessage = buildSolutionResponse(stage);
  }

  // ── Parse animation marker ──
  const { text: afterAnim, wantsAnimation } = parseAnimationMarker(assistantMessage);
  assistantMessage = afterAnim;
  let animationData: object | null = null;
  if (wantsAnimation && triggerAnimation && body.animationType && body.animationData) {
    animationData = { type: body.animationType, data: body.animationData, title: body.problemTitle || "Algorithm Visualization" };
  }

  // ── STAGE ENGINE PERSISTENCE ──
  await saveMessage(mentorSession.id, "assistant", assistantMessage, stage);

  // ── SAVE TO CACHE (fire-and-forget) ──
  saveToCache({ problemId, question: body.userMessage, response: assistantMessage, stage, rung }).catch(() => {});

  // ── STAGE ADVANCEMENT ──
  const lowerResponse = assistantMessage.toLowerCase();
  const transitionCtx: TransitionContext = {
    approachCorrect: lowerResponse.includes("approach is correct") || lowerResponse.includes("great strategy") || (stage === "STRATEGIZE" && lowerResponse.includes("exactly")),
    codeCorrect: lowerResponse.includes("code looks good") || lowerResponse.includes("solved it") || (stage === "IMPLEMENT" && Boolean(stats?.acceptedCount)),
    isOptimal: lowerResponse.includes("optimal") || lowerResponse.includes("most efficient"),
    hasErrors: !!body.syntaxError || Boolean(stats?.wrongAnswerCount),
    isFrustrated: /frustrat|give up|don't understand/i.test(body.userMessage.toLowerCase()),
  };

  if (stage === "EXPLORE") {
    await tryAdvanceStage(mentorSession.id, "STRATEGIZE", transitionCtx);
  } else if (stage === "STRATEGIZE" && transitionCtx.approachCorrect) {
    await tryAdvanceStage(mentorSession.id, "IMPLEMENT", transitionCtx);
  } else if (stage === "IMPLEMENT" && transitionCtx.codeCorrect) {
    await tryAdvanceStage(mentorSession.id, "REFLECT", transitionCtx);
  } else if (stage === "IMPLEMENT" && transitionCtx.hasErrors) {
    await tryAdvanceStage(mentorSession.id, "DEBUG", transitionCtx);
  } else if (stage === "DEBUG" && !transitionCtx.hasErrors) {
    await tryAdvanceStage(mentorSession.id, "IMPLEMENT", transitionCtx);
  }

  // ── Legacy Persistence (background) ──
  const conversationMetadata = { rung, stage, tone };
  prisma.mentorConversationMessage.create({
    data: { userId, problemId, role: "user", content: body.userMessage, metadata: conversationMetadata },
  }).catch(() => {});
  prisma.mentorConversationMessage.create({
    data: { userId, problemId, role: "assistant", content: assistantMessage, metadata: conversationMetadata },
  }).catch(() => {});

  // ── Parse inline memory ──
  const { text: cleanText, memoryJson } = parseMentorMemory(assistantMessage);
  assistantMessage = cleanText;
  const newMessageCount = currentMessageCount + 2;

  if (memoryJson) {
    prisma.mentorConversationSummary
      .upsert({
        where: { userId_problemId: { userId, problemId } },
        create: { userId, problemId, status: "ONGOING", summaryMd: memoryJson, messageCount: newMessageCount, lastRung: rung },
        update: { summaryMd: memoryJson, messageCount: newMessageCount, lastRung: rung },
      })
      .catch(() => {});
  } else {
    prisma.mentorConversationSummary
      .upsert({
        where: { userId_problemId: { userId, problemId } },
        create: { userId, problemId, status: "ONGOING", summaryMd: rollingSummaryMd || "", messageCount: newMessageCount, lastRung: rung },
        update: { messageCount: newMessageCount, lastRung: rung },
      })
      .catch(() => {});
  }

  return {
    ok: true,
    message: assistantMessage,
    animation: animationData,
    metadata: { verbosity, temperature, model: apiConfig.model, stage, rung, tone, wasViolation, wantsAnimation },
  };
}
