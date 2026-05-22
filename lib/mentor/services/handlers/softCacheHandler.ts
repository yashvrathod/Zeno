import type { TeachingStage } from "@/lib/mentorContext";
import type { Verbosity } from "@/lib/aiPreferences";
import { getAdaptiveTemperature, detectLearningRung } from "@/lib/mentorContext";
import { inferVerbosityFromText, verbosityToModelMaxTokens } from "@/lib/aiPreferences";
import { saveMessage } from "../../stage";
import { resolveApiConfig, callLlmAndExtract, type LlmMessage, type ApiConfig } from "../../llm";
import { clampText } from "../../context";
import type { HistoryMsg, UserStats } from "../../context";
import type { MentorRequest, MentorResponse } from "../../orchestrator";
import { logMentorInteraction, logDbError } from "../../logging";
import { isCacheCompatible } from "../../cache/eligibility";

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
  currentRung: number;
}): Promise<MentorResponse> {
  const { body, userId, problemId, mentorSession, history, stats, userAiSettings, existingSummary, decision, currentRung } = params;

  const cachedStage: string = decision.entry?.stage ?? "";
  if (!isCacheCompatible(cachedStage, decision.entry?.rung ?? 1, mentorSession.stage, currentRung)) {
    return {
      ok: false,
      error: "No AI provider available. Please configure your API key in Settings.",
    };
  }

  let apiConfig: ApiConfig;
  try {
    apiConfig = await resolveApiConfig(userAiSettings);
  } catch {
    return { ok: false, error: "No AI provider available. Please configure your API key in Settings or contact support." };
  }

  const verb = inferVerbosityFromText(body.userMessage);
  const verbosity: Verbosity = (userAiSettings?.verbosity as Verbosity) || "normal";

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

  logMentorInteraction({
    userId, problemId, userMessage: body.userMessage, decisionType: "CACHE_HIT",
    responseData: refinedMessage, stage: mentorSession.stage, rung: refinementRung,
    cacheHitData: {
      similarity: (decision.similarity as any)?.toFixed(4) ?? "0",
      cacheEntryId: (decision.entry as any).id,
    },
  }).catch(logDbError);

  return {
    ok: true, message: refinedMessage, animation: null,
    metadata: { stage: mentorSession.stage, type: "cache_hit_soft", similarity: decision.similarity },
  };
}
