/**
 * AI Handler — Full LLM Call Path (Intent-First Architecture)
 *
 * This is the CORE AI RESPONSE GENERATOR with multi-layer protection:
 *   Layer 1: Intent classification (already done before this point)
 *   Layer 2: Stage-based enforcement (already checked before AI call)
 *   Layer 3: Prompt-level constraints (strict no-solution rules in system prompt)
 *   Layer 4: Output validation (applied below to catch any violations)
 *
 * The handler assumes the intent has already been classified and the request
 * has passed through the stage controller. This function generates the actual
 * AI response while ensuring strict adherence to learning-stage constraints.
 */

import type { TeachingStage } from "@/lib/mentorContext";
import type { Verbosity } from "@/lib/aiPreferences";
import type { IntentClassification } from "@/lib/mentor/intentClassifier";
import type { ConversationIntent } from "@/lib/mentor/enhancedIntentClassifier";
import type { StudentKnowledgeGraph, ConceptMastery } from "@/lib/mentor/personalizationEngine";
import type { DebugAnalysis } from "@/lib/mentor/enhancedDebuggingAssistant";
import { getWeakestConcepts } from "@/lib/mentor/personalizationEngine";
import { buildContextualGuidance, getAdaptiveTemperature, detectLearningRung } from "@/lib/mentorContext";
import { features } from "@/lib/features";
import { inferVerbosityFromText, verbosityToModelMaxTokens, verbosityToStylePrompt } from "@/lib/aiPreferences";
import { extractProblemContext, selectGuideQuestion } from "@/lib/mentorQuestions";
import { getOrCreateSession, saveMessage, tryAdvanceStage, type TransitionContext, type MentorSession } from "@/lib/mentor/stageEngine";
import { saveToCache } from "@/lib/mentor/interactionRouter";
import { getWeakPatternReport, type WeakPatternTag } from "@/lib/mentor/patternTracker";
import prisma from "@/lib/prisma";
import { type ApiConfig, type LlmMessage, callLlmAndExtract } from "../llmClient";
import {
  buildAdaptiveProblemContext,
  buildUserCodeContext,
  buildStatsContext,
  buildConversationHistory,
  buildAnimationContext,
  inferUnderstandingFromHistory,
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
import { parseVisualizations, removeVisualizationMarkers, autoGenerateVisualization } from "../visualizationParser";
import { findPausePoints, generateDebuggerPrompt } from "../traceDebugger";
import { detectVisualizationType, injectVisualizationMarker } from "../visualScaffolding";
import { triggerArchitectReview, formatArchitectFeedback } from "../seniorArchitect";
import type { MentorRequest, MentorResponse } from "../mentorService";
import {
  validateAIResponse,
  type ValidationResult,
  extractStageAssessment,
  isSolutionRequest,
  detectFrustration,
} from "../../responseValidator";
import { bigramJaccard } from '@/lib/embeddings';

function detectLoop(history: HistoryMsg[]): boolean {
  const userMessages = history.filter((msg) => msg.role === "user");
  if (userMessages.length < 2) return false;
  // Look at the last 3 user messages (or all if fewer)
  const recent = userMessages.slice(-3);
  for (let i = 0; i < recent.length; i++) {
    for (let j = i + 1; j < recent.length; j++) {
      const similarity = bigramJaccard(recent[i].content, recent[j].content);
      if (similarity > 0.7) {
        return true;
      }
    }
  }
  return false;
}

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
}): Promise<MentorResponse> {
  const { body, userId, problemId, mentorSession, history, stats, userAiSettings, existingSummary, apiConfig, intent, conversationIntent, knowledgeGraph, debugAnalysis } = params;
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

  // ── FETCH WEAKNESS MAP (Pattern Recognition) ──
  let weaknessContext = "";
  try {
    const weakPatterns = await getWeakPatternReport(userId);
    if (weakPatterns.length > 0) {
      const topWeakness = weakPatterns[0];
      if (topWeakness && topWeakness.percentOfSessions > 20) {
        weaknessContext = `PATTERN ALERT: This student has shown weakness in "${topWeakness.friendlyName}" (${topWeakness.count} occurrences, ${topWeakness.percentOfSessions.toFixed(1)}% of sessions). Watch for this pattern and provide targeted guidance. How to fix: ${topWeakness.howToFix}`;
      }
    }
  } catch {
    // Non-critical: continue without weakness context
  }

  // ── TRACE DEBUGGER (for DEBUG stage) ──
  let debuggerContext = "";
  if (stage === "DEBUG" && body.userCode && body.syntaxError) {
    try {
      const pausePoints = findPausePoints(body.userCode, body.language);
      if (pausePoints.length > 0) {
        const firstPause = pausePoints[0];
        debuggerContext = `DEBUGGER MODE: Student has syntax/runtime error. Consider asking them to trace line ${firstPause.line}: "${firstPause.prompt}". Pause points available: ${pausePoints.map(p => `L${p.line}`).join(", ")}`;
      }
    } catch {
      // Non-critical: continue without debugger context
    }
  }

  // ── Loop detection ──
  const loopDetected = detectLoop(history);
  const allowFullSolution = isSolutionRequest(body.userMessage);

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

  // ── UNDERSTANDING INFERENCE ──
  const understanding = inferUnderstandingFromHistory(history, stage);
  const understandingContext = understanding.demonstrated.length > 0 || understanding.gaps.length > 0
    ? `STUDENT UNDERSTANDING ASSESSMENT:
${understanding.demonstrated.length > 0 ? `✓ Demonstrated: ${understanding.demonstrated.join(", ")}` : "✗ No clear demonstrations yet"}
${understanding.gaps.length > 0 ? `⚠ Gaps to verify: ${understanding.gaps.join(", ")}` : ""}
${understanding.suggestedFocus}`
    : "";

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

  // ── VISUAL SCAFFOLDING detection ──
  let vizType = null;
  if (stage === "STRATEGIZE" || stage === "EXPLORE") {
    vizType = detectVisualizationType(body.problemTitle || "", body.problemStatementMd || "");
  }

  const existingMem = rollingSummaryMd?.trim() || null;

  // Combine all contexts
  let knowledgeContext = "";
  if (knowledgeGraph && features.personalization) {
    const weakConcepts = getWeakestConcepts(knowledgeGraph);
    if (weakConcepts.length > 0) {
      knowledgeContext = `STUDENT KNOWLEDGE GRAPH: Student shows weaker mastery (${weakConcepts.map((wc: any) => `${wc.concept}@${wc.mastery}`).join(", ")}). Focus explanations on building up ${weakConcepts[0]?.concept}. Personalize hints and scaffolding for these areas.`;
    }
  }

  const intentContext = conversationIntent ? `CONVERSATION INTENT: ${conversationIntent.primaryIntent} (confidence: ${conversationIntent.confidence}). ${conversationIntent.secondaryIntents.length > 0 ? `Secondary: ${conversationIntent.secondaryIntents.join(", ")}` : ""}. ${conversationIntent.shouldEnforceStage ? "Enforce stage progression." : "Flexible stage allowed."} ${conversationIntent.reason}` : "";

  let debugContext = "";
  if (debugAnalysis && features.debugAnalysis) {
    debugContext = `DEBUG ANALYSIS: ${debugAnalysis.bugHypotheses.map(bh => `${bh.type} (${bh.confidence})`).join("; ")}. Key issues: ${debugAnalysis.rootCause ? debugAnalysis.rootCause.whyItHappened : "pending"}. Suggested fixes: ${debugAnalysis.fixSuggestions.map(fs => fs.description).join("; ")}. Generate targeted test cases.`;
  }

  // Combine all contexts
  const enhancedGuidance = [
    intentContext,
    understandingContext,
    contextualGuidance,
    weaknessContext,
    debuggerContext,
    debugContext,
    knowledgeContext,
    vizType ? `VISUAL SCAFFOLDING: This problem involves ${vizType}. Consider using ASCII visualization to explain the algorithm state. Use {{VISUALIZATION}} marker when appropriate.` : "",
  ].filter(Boolean).join("\n\n");

  const systemMessage = buildMentorSystemPrompt(
    stage,
    rung,
    tone,
    verbosity,
    stylePrompt,
    enhancedGuidance,
    problemContext,
    codeContext,
    statsContext,
    conversationHistory,
    guideQuestion,
    loopAlert,
    existingMem,
    animationContext,
    intent?.intent,
    history.length,
  );

  const messages: LlmMessage[] = [{ role: "system", content: systemMessage }];

  const recentTurns = history.slice(-4).map((h) => ({
    role: h.role,
    content: h.content.length > 600 ? h.content.slice(0, 600) + "[truncated]" : h.content,
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

  // ── LAYER 4: Output Validation ──
  // Validate response against stage constraints BEFORE returning to student
  let validatedMessage = assistantMessage;
  const validationResult = validateAIResponse(assistantMessage, stage, intent);

  let wasViolation = false;
  let stageAdvanceFromValidation = false;

  if (!validationResult.isValid) {
    wasViolation = true;
    // Use rewritten response if available
    if (validationResult.rewrittenResponse) {
      validatedMessage = validationResult.rewrittenResponse;
    } else {
      // Fallback to legacy sanitizer
      const { text: sanitized } = sanitizeResponse(assistantMessage, allowFullSolution);
      validatedMessage = sanitized;
      if (!allowFullSolution) {
        validatedMessage = buildSolutionResponse(stage);
      }
    }
  } else {
    // Even if no violation, check if validation suggests stage advancement
    if (validationResult.stageAssessment.readyToAdvance) {
      stageAdvanceFromValidation = true;
    }
  }

  // Also apply legacy sanitizer for defense in depth (only if not already rewritten)
  if (validatedMessage === assistantMessage) {
    const { text: sanitized, wasViolation: legacyViolation } = sanitizeResponse(assistantMessage, allowFullSolution);
    validatedMessage = sanitized;
    if (legacyViolation && !allowFullSolution) {
      validatedMessage = buildSolutionResponse(stage);
      wasViolation = true;
    }
  }

  assistantMessage = validatedMessage;

  // ── Parse animation marker ──
  const { text: afterAnim, wantsAnimation } = parseAnimationMarker(assistantMessage);
  assistantMessage = afterAnim;
  let animationData: object | null = null;
  if (wantsAnimation && triggerAnimation && body.animationType && body.animationData) {
    animationData = { type: body.animationType, data: body.animationData, title: body.problemTitle || "Algorithm Visualization" };
  }

  // ── STAGE ENGINE PERSISTENCE ──
  await saveMessage(mentorSession.id, "assistant", assistantMessage, stage);

  // ── SAVE TO CACHE (conditional) ──
  saveToCache({ problemId, question: body.userMessage, response: assistantMessage, stage, rung, intent }).catch(() => {});

 // ── STRUCTURED STAGE ASSESSMENT (replaces fragile string matching) ──
  // Parse the AI's actual assessment intent instead of looking for specific phrases
  const stageAssessment = extractStageAssessment(assistantMessage, stage);
  const frustrationLevel = detectFrustration(body.userMessage);

  const transitionCtx: TransitionContext = {
    approachCorrect:
      stage === "STRATEGIZE"
        ? stageAssessment.readyToAdvance && stageAssessment.confidence !== "low"
        : false,
    codeCorrect:
      stage === "IMPLEMENT"
        ? stageAssessment.readyToAdvance && stageAssessment.confidence !== "low"
        : false,
    isOptimal: stageAssessment.confidence === "high" && stageAssessment.readyToAdvance,
    hasErrors: !!body.syntaxError || Boolean(stats?.wrongAnswerCount) || !stageAssessment.readyToAdvance,
    isFrustrated: frustrationLevel === "high" || frustrationLevel === "medium",
  };

  let architectReviewData = null;

  if (stage === "EXPLORE") {
    await tryAdvanceStage(mentorSession.id, "STRATEGIZE", transitionCtx);
  } else if (stage === "STRATEGIZE" && transitionCtx.approachCorrect) {
    await tryAdvanceStage(mentorSession.id, "IMPLEMENT", transitionCtx);
  } else if (stage === "IMPLEMENT" && transitionCtx.codeCorrect) {
    await tryAdvanceStage(mentorSession.id, "REFLECT", transitionCtx);

    // ── TRIGGER SENIOR ARCHITECT REVIEW ──
    if (body.userCode) {
      try {
        const architectReview = await triggerArchitectReview({
          userId,
          problemId,
          code: body.userCode,
          language: body.language,
          problemTitle: body.problemTitle,
        });
        if (architectReview) {
          const grade: "A" | "B" | "C" | "D" | "F" =
            architectReview.overallScore >= 90 ? "A" :
            architectReview.overallScore >= 80 ? "B" :
            architectReview.overallScore >= 70 ? "C" :
            architectReview.overallScore >= 60 ? "D" : "F";
          architectReviewData = {
            score: architectReview.overallScore,
            grade,
            feedback: formatArchitectFeedback(architectReview),
          };
        }
      } catch {
        // Non-critical: continue without architect review
      }
    }
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

  // Parse visualizations from AI response
  const visualizations = parseVisualizations(assistantMessage);
  let vizData = null;

  if (visualizations.length > 0) {
    // Remove visualization markers from the displayed text
    assistantMessage = removeVisualizationMarkers(assistantMessage);
    // Pass first visualization to frontend
    vizData = {
      type: visualizations[0].type,
      data: visualizations[0].data
    };
  } else if (vizType && (stage === "STRATEGIZE" || stage === "EXPLORE")) {
    // Auto-generate visualization if AI didn't include one but should have
    const autoViz = autoGenerateVisualization(assistantMessage, vizType, {
      array: body.publicTestCases?.[0]?.input?.split(",").map(Number) || [2, 7, 11, 15],
      target: 9
    });
    if (autoViz) {
      vizData = { type: autoViz.type, data: autoViz.data };
    }
  }

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
    architectReview: architectReviewData,
    visualization: vizData,
    metadata: {
      verbosity,
      temperature,
      model: apiConfig.model,
      stage,
      rung,
      tone,
      wasViolation,
      wantsAnimation,
      hasArchitectReview: !!architectReviewData,
      hasVisualization: !!vizData,
      validationPassed: validationResult.isValid,
 stageAssessment: {
 readyToAdvance: stageAssessment.readyToAdvance,
 confidence: stageAssessment.confidence,
 assessedStage: stageAssessment.assessedStage,
 },
 frustrationLevel,
    },
  };
}
