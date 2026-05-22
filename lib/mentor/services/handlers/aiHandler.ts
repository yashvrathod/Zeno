import crypto from "crypto";
import type { TeachingStage } from "@/lib/mentorContext";
import type { Verbosity } from "@/lib/aiPreferences";
import type { IntentClassification } from "../../intent";
import type { ConversationIntent } from "../../enhancedIntentClassifier";
import type { StudentKnowledgeGraph } from "../../personalizationEngine";
import type { DebugAnalysis } from "../../enhancedDebuggingAssistant";
import { getWeakestConcepts } from "../../personalizationEngine";
import { buildContextualGuidance, getAdaptiveTemperature, detectLearningRung } from "@/lib/mentorContext";
import { features } from "@/lib/features";
import { inferVerbosityFromText, verbosityToModelMaxTokens, verbosityToStylePrompt } from "@/lib/aiPreferences";
import { extractProblemContext, selectGuideQuestion } from "@/lib/mentorQuestions";
import { getOrCreateSession, saveMessage, tryAdvanceStage, type TransitionContext, type MentorSession } from "../../stage";
import { saveToCache } from "../../routing";
import { getWeakPatternReport } from "../../pattern";
import prisma from "@/lib/prisma";
import { type ApiConfig, type LlmMessage, callLlmAndExtract } from "../../llm";
import {
  buildAdaptiveProblemContext, buildAnimationContext,
} from "../../context/problem";
import {
  buildUserCodeContext, buildStatsContext, buildConversationHistory, inferUnderstandingFromHistory,
} from "../../context/user";
import type { HistoryMsg, UserStats } from "../../context/user";
import { detectTone, buildMentorSystemPrompt } from "../../prompt/system";
import {
  sanitizeResponse, buildSolutionResponse, buildAiUnavailableFallback,
  shouldTriggerAnimation, parseAnimationMarker, parseMentorMemory,
} from "../../guardrails";
import { parseVisualizations, removeVisualizationMarkers, autoGenerateVisualization } from "../visualizationParser";
import { findPausePoints } from "../traceDebugger";
import { detectVisualizationType } from "../visualScaffolding";
import { triggerArchitectReview, formatArchitectFeedback } from "../seniorArchitect";
import { enqueueArchitectReview, isQueueAvailable } from "@/lib/queue";
import type { MentorRequest, MentorResponse } from "../../orchestrator";
import {
  validateAIResponse, extractStageAssessment, detectFrustration,
} from "@/lib/responseValidator";
import { bigramJaccard } from '@/lib/embeddings';
import { logMentorInteraction, logDbError } from "../../logging";

const VALID_VERBOSITIES: Verbosity[] = ["short", "normal", "detailed"];

function isValidVerbosity(v: unknown): v is Verbosity {
  return typeof v === "string" && VALID_VERBOSITIES.includes(v as Verbosity);
}

const LOOP_SIM_THRESHOLD = 0.94;
const LOOP_IDENTICAL_THRESHOLD = 0.98;

function detectLoop(history: HistoryMsg[]): boolean {
  const userMessages = history.filter((msg) => msg.role === "user");
  if (userMessages.length < 3) return false;
  const recent = userMessages.slice(-3);
  const sim12 = bigramJaccard(recent[0].content, recent[1].content);
  const sim23 = bigramJaccard(recent[1].content, recent[2].content);
  const sim13 = bigramJaccard(recent[0].content, recent[2].content);
  const sims = [sim12, sim23, sim13];
  const hasNearIdentical = sims.some(s => s > LOOP_IDENTICAL_THRESHOLD);
  const allAboveThreshold = sims.every(s => s > LOOP_SIM_THRESHOLD);
  return hasNearIdentical && allAboveThreshold;
}

function applyGuardrails(
  message: string,
  stage: TeachingStage,
  intent: IntentClassification | undefined,
  allowFullSolution: boolean,
): { text: string; wasViolation: boolean } {
  const validationResult = validateAIResponse(message, stage, intent);

  if (!validationResult.isValid && validationResult.rewrittenResponse) {
    return { text: validationResult.rewrittenResponse, wasViolation: true };
  }

  const { text: sanitized, wasViolation: sanitizeViolation } = sanitizeResponse(message, allowFullSolution);

  const finalWasViolation = !validationResult.isValid || sanitizeViolation;

  if (sanitizeViolation && !allowFullSolution) {
    return { text: sanitized, wasViolation: true };
  }

  if (!validationResult.isValid && !validationResult.rewrittenResponse) {
    return { text: buildSolutionResponse(stage), wasViolation: true };
  }

  return { text: sanitized, wasViolation: finalWasViolation };
}

function shouldAllowFullSolution(stage: TeachingStage, intent?: IntentClassification): boolean {
  if (stage === "REFLECT") return true;
  if (intent?.intent === "help_me_solve" || intent?.intent === "debug") return true;
  return false;
}

const MAX_GUIDANCE_CHARS = 1500;

function trimToBudget(text: string, budget: number): string {
  if (text.length <= budget) return text;
  return text.slice(0, budget) + `\n[...trimmed ${text.length - budget} chars]`;
}

function buildEnhancedGuidance(params: {
  intentContext: string;
  understandingContext: string;
  contextualGuidance: string;
  weaknessContext: string;
  debuggerContext: string;
  debugContext: string;
  knowledgeContext: string;
  traceContextSection: string;
  vizInstruction: string;
}): string {
  const parts = [
    params.intentContext,
    params.understandingContext,
    params.contextualGuidance,
    params.weaknessContext,
    params.debuggerContext,
    params.debugContext,
    params.knowledgeContext,
    params.traceContextSection,
    params.vizInstruction,
  ].filter(Boolean);

  let combined = parts.join("\n\n");
  if (combined.length > MAX_GUIDANCE_CHARS) {
    combined = trimToBudget(combined, MAX_GUIDANCE_CHARS);
  }
  return combined;
}

async function buildPromptContext(params: {
  body: MentorRequest;
  userId: string;
  stage: TeachingStage;
  rung: number;
  history: HistoryMsg[];
  stats: UserStats;
  conversationIntent?: ConversationIntent | null;
  knowledgeGraph?: StudentKnowledgeGraph | null;
  debugAnalysis?: DebugAnalysis | null;
  traceContext?: string;
  rollingSummaryMd: string | null;
  tone: ReturnType<typeof detectTone>;
  verbosity: Verbosity;
  loopDetected: boolean;
  weaknessContext?: string;
  debuggerContext?: string;
}) {
  const { body, stage, rung, history, stats, conversationIntent, knowledgeGraph, debugAnalysis, traceContext } = params;

  const stylePrompt = verbosityToStylePrompt(params.verbosity);
  const contextualGuidance = buildContextualGuidance(body, stats, history);
  const conversationHistory = buildConversationHistory(history, params.rollingSummaryMd);
  const problemContext = buildAdaptiveProblemContext(body, stage);
  const codeContext = buildUserCodeContext(body);
  const statsContext = buildStatsContext(stats, body.userMessage, stage);
  const probContext = extractProblemContext(body.userCode, body.problemStatementMd);
  const guideQuestion = selectGuideQuestion(rung, stage, probContext);
  const triggerAnimFlag = shouldTriggerAnimation(body.userMessage);
  const animationContext = buildAnimationContext(body.animationType, body.animationData, triggerAnimFlag);

  const understanding = inferUnderstandingFromHistory(history, stage);
  const understandingContext = understanding.demonstrated.length > 0 || understanding.gaps.length > 0
    ? `STUDENT UNDERSTANDING ASSESSMENT:\n${understanding.demonstrated.length > 0 ? `✓ Demonstrated: ${understanding.demonstrated.join(", ")}` : "✗ No clear demonstrations yet"}\n${understanding.gaps.length > 0 ? `⚠ Gaps to verify: ${understanding.gaps.join(", ")}` : ""}\n${understanding.suggestedFocus}`
    : "";

  let loopAlert = "";
  if (params.loopDetected) {
    loopAlert = `\nNOTE: The last few messages share similar patterns. Consider changing your teaching angle — try a different example, ask a new question, or shift focus to a different aspect of the problem.`;
  }

  let vizType: string | null = null;
  if (stage === "STRATEGIZE" || stage === "EXPLORE") {
    vizType = detectVisualizationType(body.problemTitle || "", body.problemStatementMd || "");
  }

  const existingMem = params.rollingSummaryMd?.trim() || null;

  let knowledgeContext = "";
  if (knowledgeGraph && features.personalization) {
    try {
      const weakConcepts = getWeakestConcepts(knowledgeGraph);
      if (weakConcepts.length > 0) {
        knowledgeContext = `STUDENT KNOWLEDGE GRAPH: Weaker mastery (${weakConcepts.map((wc: any) => `${wc.concept}@${wc.mastery}`).join(", ")}). Focus on ${weakConcepts[0]?.concept}.`;
      }
    } catch (e) {
      console.warn("Failed to get weak concepts:", e);
    }
  }

  const intentContext = conversationIntent
    ? `CONVERSATION INTENT: ${conversationIntent.primaryIntent} (confidence: ${conversationIntent.confidence}). ${conversationIntent.secondaryIntents.length > 0 ? `Secondary: ${conversationIntent.secondaryIntents.join(", ")}` : ""}. ${conversationIntent.shouldEnforceStage ? "Enforce stage progression." : "Flexible stage allowed."}`
    : "";

  let debugContext = "";
  if (debugAnalysis && features.debugAnalysis) {
    debugContext = `DEBUG ANALYSIS: ${debugAnalysis.bugHypotheses.map(bh => `${bh.type} (${bh.confidence})`).join("; ")}. Root cause: ${debugAnalysis.rootCause?.whyItHappened || "pending"}. Fixes: ${debugAnalysis.fixSuggestions.map(fs => fs.description).join("; ")}.`;
  }

  const vizInstruction = vizType
    ? `VISUAL SCAFFOLDING: This problem involves ${vizType}. Output format: {{VISUALIZATION:${vizType}:[array,left,right,target,...]}}`
    : "";

  const enhancedGuidance = buildEnhancedGuidance({
    intentContext, understandingContext, contextualGuidance,
    weaknessContext: params.weaknessContext || "",
    debuggerContext: params.debuggerContext || "",
    debugContext, knowledgeContext,
    traceContextSection: traceContext || "",
    vizInstruction,
  });

  const systemMessage = buildMentorSystemPrompt(
    stage, rung, params.tone, params.verbosity, stylePrompt, enhancedGuidance,
    problemContext, codeContext, statsContext, conversationHistory,
    guideQuestion, loopAlert, existingMem, animationContext,
    params.conversationIntent?.primaryIntent as any, history.length,
  );

  return {
    systemMessage,
    vizType,
    triggerAnimFlag,
    animationContext,
  };
}

async function callLlmWithGuardrails(params: {
  systemMessage: string;
  body: MentorRequest;
  history: HistoryMsg[];
  stage: TeachingStage;
  rung: number;
  verbosity: Verbosity;
  apiConfig: ApiConfig;
  mentorSessionId: string;
  userId: string;
  problemId: string;
  intent?: IntentClassification;
  debugAnalysis?: DebugAnalysis | null;
  onChunk?: (chunk: string) => void;
}): Promise<{ message: string; rawMessage?: string; wasViolation: boolean; wantsAnimation: boolean } | { error: string }> {
  const temperature = getAdaptiveTemperature(params.body, params.body as any);
  const maxTokens = verbosityToModelMaxTokens(params.verbosity);

  const messages: LlmMessage[] = [{ role: "system", content: params.systemMessage }];

  const recentTurns = params.history.slice(-4).map(h => ({
    role: h.role,
    content: h.content.length > 600 ? h.content.slice(0, 600) + "[truncated]" : h.content,
  }));
  for (const msg of recentTurns) {
    messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
  }
  messages.push({ role: "user", content: params.body.userMessage });

  let rawMessage: string;
  try {
    rawMessage = await callLlmAndExtract({ messages, temperature, maxTokens, apiConfig: params.apiConfig, onChunk: params.onChunk });
  } catch (e) {
    const fallbackMessage = buildAiUnavailableFallback(params.stage);
    const errorStr = e instanceof Error ? e.message.slice(0, 200) : String(e);
    await saveMessage(params.mentorSessionId, "assistant", fallbackMessage, params.stage);
    logMentorInteraction({
      userId: params.userId, problemId: params.problemId, userMessage: params.body.userMessage,
      decisionType: "AI_NEEDED", responseData: fallbackMessage, stage: params.stage, rung: params.rung,
      aiCalled: false, error: errorStr,
    }).catch(logDbError);
    return { message: fallbackMessage, wasViolation: false, wantsAnimation: false };
  }

  if (!rawMessage) {
    return { error: "Received empty response from AI service" };
  }

  const allowFull = shouldAllowFullSolution(params.stage, params.intent);
  const { text: cleanFromGuardrails, wasViolation } = applyGuardrails(rawMessage, params.stage, params.intent, allowFull);
  const processedMessage = cleanFromGuardrails;

  const { text: afterAnim, wantsAnimation } = parseAnimationMarker(processedMessage);

  return { message: afterAnim, rawMessage, wasViolation, wantsAnimation };
}

function parseResponse(assistantMessage: string, vizType: string | null, stage: TeachingStage, body: MentorRequest): {
  cleanMessage: string;
  memoryJson: string | null;
  vizData: { type: string; data: unknown } | null;
  animationData: object | null;
  wantsAnimation: boolean;
  triggerAnimFlag: boolean;
} {
  const { text: cleanText, memoryJson } = parseMentorMemory(assistantMessage);
  let cleanMessage = cleanText;

  const visualizations = parseVisualizations(cleanMessage);
  let vizData: { type: string; data: unknown } | null = null;
  if (visualizations.length > 0) {
    cleanMessage = removeVisualizationMarkers(cleanMessage);
    vizData = { type: visualizations[0].type, data: visualizations[0].data };
  } else if (vizType && (stage === "STRATEGIZE" || stage === "EXPLORE")) {
    const inputStr = body.publicTestCases?.[0]?.input;
    let array: number[] | undefined;
    try {
      array = inputStr?.split(",").map(Number).filter(n => !isNaN(n));
    } catch {}
    const autoViz = autoGenerateVisualization(cleanMessage, vizType, array ? { array } : undefined);
    if (autoViz) {
      vizData = { type: autoViz.type, data: autoViz.data };
    }
  }

  return { cleanMessage, memoryJson, vizData, animationData: null, wantsAnimation: false, triggerAnimFlag: false };
}

async function advanceStage(params: {
  stage: TeachingStage;
  mentorSessionId: string;
  transitionCtx: TransitionContext;
  body: MentorRequest;
  userId: string;
  problemId: string;
}): Promise<{ architectReviewData: { score: number; grade: "A" | "B" | "C" | "D" | "F"; feedback: string } | null }> {
  const { stage, mentorSessionId, transitionCtx, body, userId, problemId } = params;
  let architectReviewData = null;

  try {
    if (stage === "EXPLORE") {
      await tryAdvanceStage(mentorSessionId, "STRATEGIZE", transitionCtx);
    } else if (stage === "STRATEGIZE" && transitionCtx.approachCorrect) {
      await tryAdvanceStage(mentorSessionId, "IMPLEMENT", transitionCtx);
    } else if (stage === "IMPLEMENT" && transitionCtx.codeCorrect) {
      await tryAdvanceStage(mentorSessionId, "REFLECT", transitionCtx);
      if (body.userCode) {
        const codeHash = crypto.createHash("md5").update(body.userCode).digest("hex");
        try {
          if (isQueueAvailable()) {
            enqueueArchitectReview({ userId, problemId, code: body.userCode, language: body.language, sessionId: mentorSessionId }).catch(() => {});
          } else {
            const review = await triggerArchitectReview({
              userId, problemId, code: body.userCode, language: body.language, problemTitle: body.problemTitle, codeHash,
            });
            if (review) {
              const g: "A" | "B" | "C" | "D" | "F" = review.overallScore >= 90 ? "A" : review.overallScore >= 80 ? "B" : review.overallScore >= 70 ? "C" : review.overallScore >= 60 ? "D" : "F";
              architectReviewData = { score: review.overallScore, grade: g, feedback: formatArchitectFeedback(review) };
            }
          }
        } catch {}
      }
    } else if (stage === "IMPLEMENT" && transitionCtx.hasErrors) {
      await tryAdvanceStage(mentorSessionId, "DEBUG", transitionCtx);
    } else if (stage === "DEBUG" && !transitionCtx.hasErrors) {
      await tryAdvanceStage(mentorSessionId, "IMPLEMENT", transitionCtx);
    }
  } catch (e) {
    console.error("Stage transition failed:", e);
  }

  return { architectReviewData };
}

async function persistSession(params: {
  mentorSessionId: string;
  memoryJson: string | null;
  currentMessageCount: number;
  newMessageCount: number;
  rung: number;
  userId: string;
  problemId: string;
  assistantMessage: string;
  /** Pre-guardrails version saved to cache so future users get the raw AI output, not the processed/weakened version */
  cacheMessage?: string;
  body: MentorRequest;
  stage: TeachingStage;
}): Promise<void> {
  const { memoryJson, currentMessageCount, newMessageCount, rung, userId, problemId, assistantMessage, body, stage, cacheMessage } = params;

  await saveMessage(params.mentorSessionId, "assistant", assistantMessage, stage);

  try {
    saveToCache({
      problemId, question: body.userMessage, response: cacheMessage || assistantMessage, stage, rung, intent: undefined,
    });
  } catch (e) {
    console.warn("Cache save failed:", e);
  }

  try {
    if (memoryJson) {
      await prisma.mentorConversationSummary.upsert({
        where: { userId_problemId: { userId, problemId } },
        create: { userId, problemId, status: "ONGOING", summaryMd: memoryJson, messageCount: newMessageCount, lastRung: rung },
        update: { summaryMd: memoryJson, messageCount: newMessageCount, lastRung: rung },
      });
    } else if (currentMessageCount === 0) {
      await prisma.mentorConversationSummary.upsert({
        where: { userId_problemId: { userId, problemId } },
        create: { userId, problemId, status: "ONGOING", summaryMd: "", messageCount: newMessageCount, lastRung: rung },
        update: { messageCount: newMessageCount, lastRung: rung },
      });
    } else {
      await prisma.mentorConversationSummary.update({
        where: { userId_problemId: { userId, problemId } },
        data: { messageCount: newMessageCount, lastRung: rung },
      });
    }
  } catch (e) {
    console.error("Summary persistence failed:", e);
    logDbError(e);
  }

  logMentorInteraction({
    userId, problemId, userMessage: body.userMessage, decisionType: "AI_NEEDED",
    responseData: assistantMessage, stage, rung, aiCalled: true,
  }).catch(logDbError);
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
  intent?: IntentClassification;
  conversationIntent?: ConversationIntent | null;
  knowledgeGraph?: StudentKnowledgeGraph | null;
  debugAnalysis?: DebugAnalysis | null;
  rung?: number;
  traceContext?: string;
  onChunk?: (chunk: string) => void;
}): Promise<MentorResponse> {
  const { body, userId, problemId, mentorSession, history, stats, userAiSettings, existingSummary, apiConfig, intent, conversationIntent, knowledgeGraph, debugAnalysis, rung: rungFromOrch, traceContext, onChunk } = params;
  const stage = mentorSession.stage as TeachingStage;

  // ── Verbosity inference ──
  const inferred = inferVerbosityFromText(body.userMessage);
  let verbosity: Verbosity = "normal";
  if (userAiSettings?.verbosity && isValidVerbosity(userAiSettings.verbosity)) {
    verbosity = userAiSettings.verbosity;
  }
  if (inferred && inferred !== verbosity) {
    verbosity = inferred;
    prisma.userAiSettings.upsert({
      where: { userId }, create: { userId, verbosity }, update: { verbosity },
    }).catch((e: unknown) => console.warn("Verbosity upsert failed:", e));
  }

  const rollingSummaryMd = existingSummary?.summaryMd ?? null;
  const currentMessageCount = existingSummary?.messageCount ?? 0;
  const tone = detectTone(history, body.userMessage, stage);
  const previousRung = existingSummary?.lastRung ?? 1;
  const rung = detectLearningRung(history, stats, body.userMessage, body.userCode, previousRung);

  // ── Weakness/debug context (non-blocking, logged) ──
  let weaknessContext = "";
  try {
    const weakPatterns = await getWeakPatternReport(userId);
    const top = weakPatterns?.[0];
    if (top && top.percentOfSessions > 20) {
      weaknessContext = `PATTERN ALERT: Weakness in "${top.friendlyName}" (${top.count} occurrences, ${top.percentOfSessions.toFixed(1)}% of sessions). ${top.howToFix}`;
    }
  } catch (e) {
    console.warn("Weak pattern fetch failed:", e);
  }

  let debuggerContext = "";
  if (stage === "DEBUG" && body.userCode && body.syntaxError) {
    try {
      const pausePoints = findPausePoints(body.userCode, body.language);
      if (pausePoints.length > 0) {
        debuggerContext = `DEBUGGER MODE: Syntax/runtime error. Pause points: ${pausePoints.map(p => `L${p.line}`).join(", ")}. Consider trace at L${pausePoints[0].line}.`;
      }
    } catch (e) {
      console.warn("Pause points failed:", e);
    }
  }

  const loopDetected = detectLoop(history);

  // ── Build prompt context ──
  const promptCtx = await buildPromptContext({
    body, userId, stage, rung, history, stats, conversationIntent, knowledgeGraph, debugAnalysis, traceContext,
    rollingSummaryMd, tone, verbosity, loopDetected, weaknessContext, debuggerContext,
  });

  // ── Call LLM ──
  const llmResult = await callLlmWithGuardrails({
    systemMessage: promptCtx.systemMessage,
    body, history, stage, rung, verbosity, apiConfig, onChunk,
    mentorSessionId: mentorSession.id, userId, problemId, intent, debugAnalysis,
  });

  if ("error" in llmResult) {
    return { ok: false, error: llmResult.error };
  }

  let assistantMessage = llmResult.message;
  const rawMessage = llmResult.rawMessage;
  const wasViolation = llmResult.wasViolation;
  const wantsAnimation = llmResult.wantsAnimation;

  // ── Parse response ──
  const parsed = parseResponse(assistantMessage, promptCtx.vizType, stage, body);
  assistantMessage = parsed.cleanMessage;
  const { memoryJson, vizData } = parsed;

  const animationData: object | null =
    wantsAnimation && promptCtx.triggerAnimFlag && body.animationType && body.animationData
      ? { type: body.animationType, data: body.animationData, title: body.problemTitle || "Algorithm Visualization" }
      : null;

  const newMessageCount = currentMessageCount + 2;

  // ── Persist message + cache + summary ──
  await persistSession({
    mentorSessionId: mentorSession.id, memoryJson, currentMessageCount, newMessageCount, rung,
    userId, problemId, assistantMessage, body, stage, cacheMessage: rawMessage,
  });

  // ── Stage transitions ──
  const stageAssessment = extractStageAssessment(assistantMessage, stage);
  const frustrationLevel = detectFrustration(body.userMessage);

  const transitionCtx: TransitionContext = {
    approachCorrect: stage === "STRATEGIZE" ? stageAssessment.readyToAdvance && stageAssessment.confidence !== "low" : false,
    codeCorrect: stage === "IMPLEMENT" ? stageAssessment.readyToAdvance && stageAssessment.confidence !== "low" : false,
    isOptimal: stageAssessment.confidence === "high" && stageAssessment.readyToAdvance,
    hasErrors: !!body.syntaxError || Boolean(stats?.wrongAnswerCount) || !stageAssessment.readyToAdvance,
    isFrustrated: frustrationLevel === "high" || frustrationLevel === "medium",
  };

  const { architectReviewData } = await advanceStage({
    stage, mentorSessionId: mentorSession.id, transitionCtx, body, userId, problemId,
  });

  return {
    ok: true, message: assistantMessage, animation: animationData,
    architectReview: architectReviewData, visualization: vizData,
    metadata: {
      verbosity, temperature: getAdaptiveTemperature(body, stats), model: apiConfig.model,
      stage, rung, tone, wasViolation, wantsAnimation,
      hasArchitectReview: !!architectReviewData, hasVisualization: !!vizData,
      stageAssessment: {
        readyToAdvance: stageAssessment.readyToAdvance,
        confidence: stageAssessment.confidence,
        assessedStage: stageAssessment.assessedStage,
      },
      frustrationLevel,
    },
  };
}
