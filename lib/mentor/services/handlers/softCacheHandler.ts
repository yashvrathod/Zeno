/**
 * Soft Cache Hit Handler
 *
 * Handles CACHE_HIT with quality "SOFT" — refines cached response via AI.
 */

import type { TeachingStage } from "@/lib/mentorContext";
import type { Verbosity } from "@/lib/aiPreferences";
import { getAdaptiveTemperature, detectLearningRung } from "@/lib/mentorContext";
import { inferVerbosityFromText, verbosityToModelMaxTokens } from "@/lib/aiPreferences";
import { saveMessage } from "@/lib/mentor/stageEngine";
import { resolveApiConfig, callLlmAndExtract, type LlmMessage, type ApiConfig } from "../llmClient";
import { clampText } from "../contextBuilder";
import type { HistoryMsg, UserStats } from "../contextBuilder";
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

export async function handleSoftCacheHit(params: {
  body: MentorRequest;
  userId: string;
  problemId: string;
  mentorSession: MentorSession;
  history: HistoryMsg[];
  stats: UserStats;
  userAiSettings: any;
  existingSummary: any;
  problemRecord: any;
  decision: any;
}): Promise<MentorResponse> {
  const { body, userId, problemId, mentorSession, history, stats, userAiSettings, existingSummary, decision } = params;

  let apiConfig: ApiConfig;
  try {
    apiConfig = await resolveApiConfig(userAiSettings);
  } catch {
    return { ok: false, error: "No AI provider available. Please configure your API key in Settings or contact support." };
  }

  const verb = inferVerbosityFromText(body.userMessage);
  const verbosity: Verbosity = (userAiSettings?.verbosity as Verbosity) || "normal";

  const currentRung = existingSummary?.lastRung ?? 1;
  const refinementRung = detectLearningRung(history, stats, body.userMessage, body.userCode, currentRung);

  const refinedSystemPrompt = `You are a helpful Socratic mentor for DSA.
A student just asked: "${body.userMessage}"

Someone previously asked a very similar question. Their question was: "${(decision as any).entry?.questionText || (decision as any).similarity?.toFixed(2) + " similar"}"
The answer we gave was:

${(decision.entry as any).response.slice(0, 1200)}

Do NOT repeat that answer verbatim. Instead:
1. Give a fresh, tailored response to the student's exact wording
2. Keep it Socratic — ask guiding questions, don't give code
3. Adapt to the current teaching stage: ${mentorSession.stage as string}
4. Be concise and conversational`;

  const refinementMessages: LlmMessage[] = [
    { role: "system", content: refinedSystemPrompt },
    {
      role: "assistant",
      content: clampText(
        history.filter((h) => h.role === "assistant").slice(-2).map((h) => h.content).join("\n"),
        800,
      ),
    },
    { role: "user", content: body.userMessage },
  ];

  let refinedMessage: string;
  try {
    refinedMessage = await callLlmAndExtract({
      messages: refinementMessages,
      temperature: getAdaptiveTemperature(body, stats),
      maxTokens: verbosityToModelMaxTokens(verbosity),
      apiConfig,
    });
  } catch {
    return { ok: false, error: "AI service unavailable — try again in a moment." };
  }

  if (!refinedMessage) {
    return { ok: false, error: "Empty response from AI service" };
  }

  await saveMessage(mentorSession.id, "assistant", refinedMessage, mentorSession.stage as TeachingStage);

  logInteraction({
    userId,
    problemId,
    userMessage: body.userMessage,
    decisionType: "CACHE_HIT",
    responseData: refinedMessage,
    stage: mentorSession.stage as string,
    rung: refinementRung,
    cacheHitData: {
      similarity: (decision.similarity as any)?.toFixed(4) ?? "0",
      cacheEntryId: (decision.entry as any).id,
    },
  });

  return {
    ok: true,
    message: refinedMessage,
    animation: null,
    metadata: { stage: mentorSession.stage, type: "cache_hit_soft", similarity: decision.similarity },
  };
}
