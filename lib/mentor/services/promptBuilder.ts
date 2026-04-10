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
): string {
  const stageInstructions: Record<TeachingStage, string> = {
    EXPLORE: "Ask user to restate the problem, trace examples by hand. No code yet.",
    STRATEGIZE: "Guide toward the right pattern through questions. Don't name the algorithm.",
    IMPLEMENT: "Translate approach to code one piece at a time. Max 3 lines of example code.",
    DEBUG: "Ask them to trace the failing test case through their code.",
    STUCK: "Show empathy. Shrink to a 2-3 element concrete example from the problem itself. Ask one small, answerable question to rebuild momentum.",
    REFLECT: "Ask why it works. Check complexity understanding. Name the pattern.",
  };

  const toneInstructions: Record<ConversationTone, string> = {
    encouraging: "Warm and enthusiastic — 'Good instinct!', 'You're close!'",
    analytical: "Precise and methodical — trace logic step by step.",
    challenging: "Respectful but stretching — push harder.",
    empathetic: "Warm and grounding — acknowledge the struggle first.",
  };

  const basePrompt = getMentorSystemPrompt();
  const memoryLine = existingMemory
    ? `PREVIOUS MEMORY (build on this, update as needed): ${existingMemory}\n\n`
    : "";

  return `${basePrompt}

CURRENT SESSION:
Stage: ${stage} — ${stageInstructions[stage]}
Tone: ${toneInstructions[tone]}
Rung: ${rung}/6
Response style: ${verbosity} (${stylePrompt})

${loopAlert}

${contextualGuidance}

${memoryLine}${problemContext}

${codeContext}

${statsContext}

${conversationHistory}

${animationContext ? animationContext + "\n" : ""}If a natural question fits, use this fallback: "${guideQuestion}"`;
}
