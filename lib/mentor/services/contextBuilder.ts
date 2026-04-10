/**
 * Context Builder Service
 *
 * Transforms raw data into structured prompt text for the mentor system.
 * All functions are pure — no side effects, no DB calls.
 */

import type { TeachingStage } from "@/lib/mentorContext";
import type { MentorRequest } from "./mentorService";

export type HistoryMsg = { role: "user" | "assistant"; content: string };

export type UserStats = {
  runCount: number;
  submitCount: number;
  acceptedCount: number;
  wrongAnswerCount: number;
  runtimeErrorCount: number;
  lastStatus: string | null;
  lastError: string | null;
} | null;

// ─────────────────────────────────────────────────────────────────────────────
// TEXT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function clampText(input: string | undefined, max: number): string {
  if (!input) return "";
  return input.length > max ? input.slice(0, max) + `\n\n[Truncated to ${max} chars]` : input;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeTestCases(
  testCases: MentorRequest["publicTestCases"],
): Array<{ order: number; input: string; expected: string }> {
  if (!Array.isArray(testCases)) return [];
  return testCases.slice(0, 8).map((t) => ({
    order: typeof t?.order === "number" ? t.order : 0,
    input: clampText(typeof t?.input === "string" ? t.input : "", 1500),
    expected: clampText(typeof t?.expected === "string" ? t.expected : "", 1500),
  }));
}

export function buildTestCasesString(
  testCases: Array<{ order: number; input: string; expected: string }>,
): string {
  if (testCases.length === 0) return "No test cases provided.";
  return testCases
    .map((t) => `**Test #${t.order}**\nInput: \`${t.input}\`\nExpected: \`${t.expected}\``)
    .join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdaptiveProblemContext(body: MentorRequest, stage: TeachingStage): string {
  const testCases = sanitizeTestCases(body.publicTestCases);
  const isEarly = stage === "EXPLORE" || stage === "STRATEGIZE";

  if (isEarly) {
    return `<problem_context>
<problem id="${body.problemId}">
${body.problemTitle ? `**${body.problemTitle}**\n\n` : ""}${clampText(body.problemStatementMd, 3000)}
</problem>
<constraints>
${clampText(body.problemConstraintsMd, 1500)}
</constraints>
<test_cases>
${buildTestCasesString(testCases)}
</test_cases>
</problem_context>`;
  }

  return `<problem_context>
<problem id="${body.problemId}">${body.problemTitle ? ` — ${body.problemTitle}` : ""}</problem>
<constraints>
${clampText(body.problemConstraintsMd, 1200)}
</constraints>
<test_cases>
${buildTestCasesString(testCases.slice(0, 3))}
</test_cases>
</problem_context>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export function buildUserCodeContext(body: MentorRequest): string {
  if (!body.userCode && !body.syntaxError) return "";
  let ctx = "<current_code>\n";
  ctx += `Language: ${body.language}\n\n`;
  if (body.userCode) {
    ctx += "```" + body.language + "\n";
    ctx += clampText(body.userCode, 3000);
    ctx += "\n```\n";
  }
  if (body.syntaxError) {
    ctx += "\n**Error**:\n```\n";
    ctx += clampText(body.syntaxError, 500);
    ctx += "\n```\n";
  }
  ctx += "</current_code>";
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export function buildStatsContext(stats: UserStats, userMessage: string, stage: TeachingStage): string {
  if (!stats) return "";
  const isErrorRelated = /error|wrong|fail|bug|issue|stuck|help/i.test(userMessage);
  const hasActivity = stats.runCount > 0 || stats.submitCount > 0;
  if (stage === "EXPLORE" && !hasActivity) return "";
  if (!isErrorRelated && stage === "STRATEGIZE") return "";

  let ctx = "<user_progress>\n";
  if (hasActivity) {
    ctx += `Runs: ${stats.runCount} | Submissions: ${stats.submitCount}`;
    if (stats.acceptedCount > 0) ctx += ` | ✓ Accepted: ${stats.acceptedCount}`;
    if (stats.wrongAnswerCount > 0) ctx += ` | ✗ Wrong: ${stats.wrongAnswerCount}`;
    if (stats.runtimeErrorCount > 0) ctx += ` | ⚠ Runtime Errors: ${stats.runtimeErrorCount}`;
    ctx += "\n";
  }
  if (stats.lastStatus && stats.lastStatus !== "ACCEPTED") ctx += `Last Status: ${stats.lastStatus}\n`;
  if (stats.lastError) ctx += `Last Error: ${clampText(stats.lastError, 400)}\n`;
  ctx += "</user_progress>";
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export function buildAnimationContext(
  animationType?: string | null,
  animationData?: string | null,
  shouldTrigger?: boolean,
): string {
  if (!animationType || !animationData || !shouldTrigger) return "";
  return `<animation_available type="${animationType}">
This problem has a step-by-step interactive visualization available.
If the student expresses confusion or asks how the algorithm works,
append exactly "{{ANIMATION}}" at the end of your response. The system will
automatically display the visualization to help them understand.
Do NOT try to recreate the animation data — just respond naturally and end with {{ANIMATION}}.
</animation_available>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION HISTORY
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeHistoryForContext(history: HistoryMsg[]): HistoryMsg[] {
  return history.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const cleaned = msg.content
      .replace(/```[\s\S]*?```/g, "[code discussion omitted]")
      .replace(/`[^`\n]+`/g, "[snippet]");
    return { ...msg, content: cleaned };
  });
}

export function buildConversationHistory(history: HistoryMsg[], rollingSummaryMd: string | null): string {
  if (history.length === 0 && !rollingSummaryMd) return "(No prior conversation)";

  let ctx = "";
  if (rollingSummaryMd?.trim()) {
    ctx += `<conversation_summary>\n${rollingSummaryMd}\n</conversation_summary>\n\n`;
  }

  const recentCount = rollingSummaryMd ? 3 : 4;
  const clean = sanitizeHistoryForContext(history).slice(-recentCount);

  if (clean.length > 0) {
    ctx += `<recent_exchanges>\n`;
    ctx += clean.map((msg) => {
      const role = msg.role === "user" ? "STUDENT" : "MENTOR";
      return `[${role}]\n${clampText(msg.content, 500)}`;
    }).join("\n\n");
    ctx += `\n</recent_exchanges>`;
  }

  return ctx;
}
