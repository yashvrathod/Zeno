/**
 * Prompt Builder Service
 *
 * Builds the complete system prompt for the mentor AI.
 * Combines base SAGE prompt with dynamic context (stage, tone, rung, etc.)
 */

import type { TeachingStage } from "@/lib/mentorContext";
import type { Verbosity } from "@/lib/aiPreferences";
import { getMentorSystemPrompt } from "@/lib/mentorSystemPrompt";
import type { HistoryMsg } from "./contextBuilder";
import type { IntentType } from "@/lib/mentor/intentClassifier";

export type ConversationTone = "encouraging" | "analytical" | "challenging" | "empathetic";

// ─────────────────────────────────────────────────────────────────────────────
// TONE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export function detectTone(
  history: HistoryMsg[],
  userMessage: string,
  stage: TeachingStage,
): ConversationTone {
  const msg = userMessage.toLowerCase();
  const frustrated =
    /don't get|dont get|confused|lost|hate|stupid|dumb|ugh|wtf|why isn't|why is this|i give up|no idea/i.test(msg);
  const progressing =
    /oh i see|got it|that makes sense|i think i understand/i.test(msg);

  if (frustrated || stage === "STUCK") return "empathetic";
  if (progressing) return "encouraging";
  if (stage === "DEBUG") return "analytical";
  if (stage === "REFLECT") return "challenging";
  return "encouraging";
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export function buildMentorSystemPrompt(
  stage: TeachingStage,
  rung: number,
  tone: ConversationTone,
  verbosity: Verbosity,
  stylePrompt: string,
  contextualGuidance: string,
  problemContext: string,
  codeContext: string,
  statsContext: string,
  conversationHistory: string,
  guideQuestion: string,
  loopAlert: string,
  existingMemory: string | null,
  animationContext?: string,
  intent?: IntentType,
  messageCount?: number,
): string {
  const basePrompt = getMentorSystemPrompt();

  // Build progress indicator
  const stageNumber = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "REFLECT"].indexOf(stage) + 1;
  const totalStages = 5;
  const progressMsg = messageCount && messageCount > 0
    ? `Progress: Step ${stageNumber}/${totalStages} (${stage}) - You've had ${messageCount} messages on this problem.`
    : `Progress: Step ${stageNumber}/${totalStages} (${stage}) - Starting fresh!`;

  // Detect student frustration for adaptive teaching
  const frustrationLevel = tone === "empathetic" ? "HIGH" : tone === "challenging" ? "LOW" : "NORMAL";

  return `${basePrompt}

CURRENT CONTEXT:
${progressMsg}
Student Level: Rung ${rung}/6
Frustration Level: ${frustrationLevel}
Current Stage: ${stage}

${loopAlert}

PROBLEM DETAILS:
${problemContext}

${codeContext}

${statsContext}

${contextualGuidance}

CONVERSATION HISTORY:
${conversationHistory}

${existingMemory ? `PREVIOUS SESSION: ${existingMemory}` : ""}

${animationContext || ""}

If no clear direction emerges, use: "${guideQuestion}"`;
}
