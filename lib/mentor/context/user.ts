import type { TeachingStage } from "@/lib/mentorContext";
import type { MentorRequest } from "../services/mentorService";
import { clampText } from "./problem";

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

// ─────────────────────────────────────────────────────────────────────────────
// UNDERSTANDING INFERENCE (heuristic-based)
// ─────────────────────────────────────────────────────────────────────────────

export type InferredUnderstanding = {
  demonstrated: string[];
  gaps: string[];
  suggestedFocus: string;
};

export function inferUnderstandingFromHistory(
  history: HistoryMsg[],
  stage: TeachingStage,
): InferredUnderstanding {
  const userMessages = history.filter((m) => m.role === "user").map((m) => m.content.toLowerCase());
  const demonstrated: string[] = [];
  const gaps: string[] = [];

  // EXPLORE stage indicators
  if (stage === "EXPLORE") {
    const explainedProblem = userMessages.some((m) =>
      /explain|break.*down|what.*asking|restat/.test(m),
    );
    const tracedExample = userMessages.some((m) =>
      /trace|walk.*through|step.*by|example|if.*then/.test(m),
    );

    if (explainedProblem) demonstrated.push("Can restate problem");
    else gaps.push("Has not restated problem in own words");

    if (tracedExample) demonstrated.push("Can trace examples manually");
    else gaps.push("Has not demonstrated manual tracing");
  }

  // STRATEGIZE stage indicators
  if (stage === "STRATEGIZE") {
    const mentionedPattern = userMessages.some((m) =>
      /pattern|approach|algorithm|strategy|technique/.test(m),
    );
    const explainedWhy = userMessages.some((m) =>
      /because|reason|why|fit|works.*here/.test(m),
    );

    if (mentionedPattern) demonstrated.push("Identified pattern/approach");
    else gaps.push("Has not identified approach");

    if (explainedWhy) demonstrated.push("Explained why approach fits");
    else gaps.push("Has not explained rationale");
  }

  // IMPLEMENT stage indicators
  if (stage === "IMPLEMENT") {
    const hasCodeStructure = userMessages.some((m) =>
      /function|def|class|var|let|const/.test(m),
    );
    const explainedLogic = userMessages.some((m) =>
      /loop|iterate|compare|update|increment/.test(m),
    );

    if (hasCodeStructure) demonstrated.push("Started code structure");
    else gaps.push("No code attempt yet");

    if (explainedLogic) demonstrated.push("Explained implementation logic");
    else gaps.push("Has not explained implementation approach");
  }

  // DEBUG stage indicators
  if (stage === "DEBUG") {
    const identifiedFailing = userMessages.some((m) =>
      /fails?|wrong|error|bug|doesn.t work|test.*case/.test(m),
    );
    const tracedCode = userMessages.some((m) =>
      /line|trace|value|variable.*is|at.*point/.test(m),
    );

    if (identifiedFailing) demonstrated.push("Identified failing case");
    else gaps.push("Has not identified what's failing");

    if (tracedCode) demonstrated.push("Can trace code execution");
    else gaps.push("Has not demonstrated code tracing");
  }

  // REFLECT stage indicators
  if (stage === "REFLECT") {
    const mentionedComplexity = userMessages.some((m) =>
      /o\(|time|space|complexity|big o/.test(m),
    );
    const namedPattern = userMessages.some((m) =>
      /sliding window|two pointer|hash map|dp|recursion|greedy/.test(m),
    );

    if (mentionedComplexity) demonstrated.push("Understands complexity");
    else gaps.push("Has not discussed complexity");

    if (namedPattern) demonstrated.push("Named the pattern");
    else gaps.push("Has not named/identified pattern");
  }

  // Build suggested focus
  let suggestedFocus = "";
  if (gaps.length > 0) {
    suggestedFocus = `PRIORITY: Verify ${gaps[0]}`;
  } else if (demonstrated.length > 0) {
    suggestedFocus = `Student has demonstrated: ${demonstrated.join(", ")}. Ready to advance.`;
  } else {
    suggestedFocus = "INSUFFICIENT DATA: Ask specific verification question";
  }

  return { demonstrated, gaps, suggestedFocus };
}
