import type { TeachingStage } from "@/lib/mentorContext";
import type { Verbosity } from "@/lib/aiPreferences";
import { getMentorSystemPrompt } from "@/lib/mentorSystemPrompt";
import type { HistoryMsg } from "../context/user";
import type { IntentType } from "../intent/patterns";

export type ConversationTone = "encouraging" | "analytical" | "challenging" | "empathetic";

const MAX_SYSTEM_PROMPT_CHARS = 6000;

/**
 * EXECUTION_GUIDANCE — rules for interpreting the EXECUTION CONTEXT
 * section of the system prompt. Injected as a separate priority-0 section
 * (top of the prompt, never trimmed first) so it stays isolated from the
 * base system prompt and the code context. Any change here directly
 * changes how the model reads failure evidence.
 */
const EXECUTION_GUIDANCE = `EXECUTION CONTEXT RULES:
- Never invent or fabricate hidden test inputs. If the input shape is described only as a length (e.g., "opaque input of 100000 bytes"), do not guess specific values. Reference failure summaries verbatim.
- When describing failures, use the failure summaries in the EXECUTION CONTEXT section. Do not invent additional symptoms beyond the evidence.
- A "hint" is an evidence-based suggestion (e.g., off-by-one, null/None reference), not a diagnosis. Treat it as a direction to consider, not a fact.
- If the EXECUTION CONTEXT is marked as stale, the code the student is now looking at may differ from the code that produced the failure. Point this out and ask the student to re-run before drawing conclusions.
- If a problem has an "expected complexity" field, compare the student's apparent approach to it. If their approach cannot meet the target, surface that early.`;

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
  executionContext?: string,
  problemMetadata?: string,
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

  const currentCtx = `CURRENT CONTEXT:
${progressMsg}
Student Level: Rung ${rung}/6
Frustration Level: ${frustrationLevel}
Current Stage: ${stage}`;

  const existingMemSection = existingMemory ? `PREVIOUS SESSION: ${existingMemory}` : "";
  const animSection = animationContext || "";
  const guideSection = `If no clear direction emerges, use: "${guideQuestion}"`;

  // Build ordered sections from lowest to highest priority for trimming
  const sections: { key: string; content: string; priority: number }[] = [
    { key: "animation", content: animSection, priority: 1 },
    { key: "loop_alert", content: loopAlert, priority: 2 },
    { key: "existing_memory", content: existingMemSection, priority: 3 },
    { key: "contextual_guidance", content: contextualGuidance, priority: 4 },
    { key: "stats", content: statsContext, priority: 5 },
    { key: "conversation_history", content: conversationHistory, priority: 6 },
    { key: "guide", content: guideSection, priority: 7 },
    { key: "code", content: codeContext, priority: 8 },
    { key: "problem", content: problemContext, priority: 9 },
    { key: "current_context", content: currentCtx, priority: 10 },
    { key: "base", content: basePrompt, priority: 11 },
    // EXECUTION_GUIDANCE is priority 0 (top of prompt, never trimmed first).
    // Kept separate from base so that changes to execution interpretation
    // don't require editing the long base system prompt.
    { key: "execution_guidance", content: EXECUTION_GUIDANCE, priority: 0 },
    // PR 3: problem metadata + execution context. These are pre-rendered
    // strings produced by `problemMetadata.ts` and `execution.ts`. Placed
    // at the same priority as `problem` so they ride alongside it; the
    // array order means the model sees problem → problem_metadata →
    // execution, with EXECUTION_GUIDANCE rules coming first.
    { key: "problem_metadata", content: problemMetadata || "", priority: 9 },
    { key: "execution", content: executionContext || "", priority: 9 },
  ];

  const separator = "\n\n";
  const full = sections
    .filter(s => s.content.trim())
    .sort((a, b) => a.priority - b.priority)
    .map(s => s.content)
    .join(separator);

  if (full.length <= MAX_SYSTEM_PROMPT_CHARS) return full;

  // Trim low-priority sections first
  const sorted = sections
    .filter(s => s.content.trim())
    .sort((a, b) => a.priority - b.priority);

  for (let i = 0; i < sorted.length; i++) {
    const remaining = sorted.slice(i).map(s => s.content).join(separator);
    if (remaining.length <= MAX_SYSTEM_PROMPT_CHARS) {
      return remaining;
    }
    // Truncate this section as a last resort
    sorted[i].content = trimSection(sorted[i].content, MAX_SYSTEM_PROMPT_CHARS / 2, sorted[i].key);
  }

  return sorted.map(s => s.content).join(separator).slice(0, MAX_SYSTEM_PROMPT_CHARS);
}

function trimSection(text: string, budget: number, key: string): string {
  if (text.length <= budget) return text;
  if (key === "conversation_history") {
    const lines = text.split("\n");
    const half = Math.ceil(lines.length / 2);
    return lines.slice(-half).join("\n") + `\n[...${lines.length - half} earlier turns trimmed]`;
  }
  if (key === "base") {
    return text.slice(0, budget) + `\n[...base prompt trimmed]`;
  }
  if (key === "problem") {
    return text.slice(0, budget) + `\n[...problem details trimmed]`;
  }
  return text.slice(0, Math.floor(budget * 0.7)) + `\n[...trimmed ${text.length - Math.floor(budget * 0.7)} chars]`;
}
