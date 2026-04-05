/**
 * DSA Mentor API — Socratic Teaching Engine
 *
 * Architecture (4-layer defense against rate limits):
 * 1. Per-user rate limiting — prevent one user from consuming all quota
 * 2. Global cache — reuse answers across ALL users
 * 3. Request coalescing — deduplicate concurrent identical requests
 * 4. API key pool — round-robin rotation with per-key cooldown
 *
 * Philosophy: The AI is a TOUR GUIDE through problem-solving, not a solution vending machine.
 * Every response should move the user ONE step forward in their OWN thinking.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getOrCreateSession,
  saveMessage,
  tryAdvanceStage,
  type TransitionContext,
  canTransition,
} from "@/lib/mentor/stageEngine";
import {
  routeInteraction,
  saveToCache,
  type RouteDecision,
} from "@/lib/mentor/interactionRouter";
import {
  inferVerbosityFromText,
  verbosityToModelMaxTokens,
  verbosityToStylePrompt,
  type Verbosity,
} from "@/lib/aiPreferences";
import { getMentorSystemPrompt } from "@/lib/mentorSystemPrompt";
import {
  buildContextualGuidance,
  getAdaptiveTemperature,
  detectLearningRung,
  type LearningRung,
  type TeachingStage,
  type ConversationTone,
} from "@/lib/mentorContext";
import {
  selectGuideQuestion,
  extractProblemContext,
} from "@/lib/mentorQuestions";
import { getKeyFromPool, reportKeyFailure } from "@/lib/api-key-pool";
import { checkRateLimit } from "@/lib/rateLimit";
import crypto from "crypto";

// ─────────────────────────────────────────────
// DEBUG LOG — POST to /api/debug/mentor-log
// ─────────────────────────────────────────────
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
  // Fire and forget — don't block the response
  fetch(new URL("/api/debug/mentor-log", process.env.NEXTAUTH_URL || "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

export const runtime = "nodejs";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type HistoryMsg = { role: "user" | "assistant"; content: string };

type MentorRequest = {
  problemId: string;
  problemTitle?: string;
  problemStatementMd?: string;
  problemConstraintsMd?: string;
  publicTestCases?: Array<{ order: number; input: string; expected: string }>;
  language: string;
  userMessage: string;
  userCode?: string;
  syntaxError?: string;
  history?: HistoryMsg[];
};

type UserStats = {
  runCount: number;
  submitCount: number;
  acceptedCount: number;
  wrongAnswerCount: number;
  runtimeErrorCount: number;
  lastStatus: string | null;
  lastError: string | null;
} | null;

/**
 * Result from resolveApiConfig with rate-limit retry built in.
 */
type ApiConfig = {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  provider: string; // actual provider used for this call
  isServerKey: boolean; // true if using server pool (so we report failures)
};

/**
 * Resolve API config with key pool support.
 * Priority: user key > server key pool (Groq round-robin → OpenRouter pool)
 *
 * The retry loop is inside this function so that if one Groq key returns 429,
 * it automatically tries the next key in the pool.
 */
async function resolveApiConfig(
  userAiSettings: {
    apiProvider?: string | null;
    groqApiKey?: string | null;
    openaiApiKey?: string | null;
    googleApiKey?: string | null;
    openrouterApiKey?: string | null;
    ollamaBaseUrl?: string | null;
    ollamaModel?: string | null;
    preferredFreeModel?: string | null;
  } | null
): Promise<ApiConfig> {
  const provider = userAiSettings?.apiProvider || "server";

  // ── USER'S KEY (BYOK) — always takes priority ──
  if (provider === "openrouter" && userAiSettings?.openrouterApiKey) {
    return {
      apiKey: userAiSettings.openrouterApiKey!,
      apiBaseUrl: "https://openrouter.ai/api/v1",
      model: userAiSettings.preferredFreeModel || "deepseek/deepseek-chat-v3-0324:free",
      provider: "openrouter",
      isServerKey: false,
    };
  }
  if (provider === "groq" && userAiSettings?.groqApiKey) {
    return {
      apiKey: userAiSettings.groqApiKey!,
      apiBaseUrl: "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      provider: "groq",
      isServerKey: false,
    };
  }
  if (provider === "openai" && userAiSettings?.openaiApiKey) {
    return {
      apiKey: userAiSettings.openaiApiKey!,
      apiBaseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      provider: "openai",
      isServerKey: false,
    };
  }
  if (provider === "google" && userAiSettings?.googleApiKey) {
    return {
      apiKey: userAiSettings.googleApiKey!,
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-1.5-flash",
      provider: "google",
      isServerKey: false,
    };
  }
  if (
    provider === "ollama" &&
    userAiSettings?.ollamaBaseUrl &&
    userAiSettings?.ollamaModel
  ) {
    return {
      apiKey: "ollama",
      apiBaseUrl: userAiSettings.ollamaBaseUrl!.replace(/\/+$/, "") + "/v1",
      model: userAiSettings.ollamaModel!,
      provider: "ollama",
      isServerKey: false,
    };
  }

  // ── SERVER KEY POOL with round-robin + retry ──
  // Try Groq pool first (with automatic key rotation on 429), then OpenRouter
  const maxKeyRetries = 3;

  for (let attempt = 0; attempt < maxKeyRetries; attempt++) {
    // Try Groq pool
    let groqKey: string | null = null;
    if (process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_1) {
      groqKey = getKeyFromPool("groq");
    }

    // Then OpenRouter pool
    let orKey: string | null = null;
    if (process.env.OPENROUTER || process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_1) {
      orKey = getKeyFromPool("openrouter");
    }

    if (groqKey) {
      return {
        apiKey: groqKey,
        apiBaseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        provider: "groq",
        isServerKey: true,
      };
    }

    if (orKey) {
      return {
        apiKey: orKey,
        apiBaseUrl: "https://openrouter.ai/api/v1",
        model: "deepseek/deepseek-chat-v3-0324:free",
        provider: "openrouter",
        isServerKey: true,
      };
    }

    // No keys available yet — wait briefly for cooldown recovery
    if (attempt < maxKeyRetries - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  // Absolute last resort — try single env var (legacy)
  if (process.env.OPENROUTER || process.env.OPENROUTER_API_KEY) {
    return {
      apiKey: process.env.OPENROUTER || process.env.OPENROUTER_API_KEY!,
      apiBaseUrl: "https://openrouter.ai/api/v1",
      model: "deepseek/deepseek-chat-v3-0324:free",
      provider: "openrouter",
      isServerKey: true,
    };
  }

  if (process.env.GROQ_API_KEY) {
    return {
      apiKey: process.env.GROQ_API_KEY!,
      apiBaseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      provider: "groq",
      isServerKey: true,
    };
  }

  throw new Error("No AI provider available. Configure GROQ_API_KEY_1-N or OPENROUTER_API_KEY_1-N.");
}

// ─────────────────────────────────────────────────────────────────────────
// SOLUTION REQUEST DETECTION (Strict) → uses existing patterns
// ─────────────────────────────────────────────────────────────────────────

// TeachingStage and ConversationTone now imported from mentorContext

function detectTone(
  history: HistoryMsg[],
  userMessage: string,
  stage: TeachingStage,
): ConversationTone {
  const msg = userMessage.toLowerCase();
  const frustrated =
    /don't get|dont get|confused|lost|hate|stupid|dumb|ugh|wtf|why isn't|why is this|i give up|no idea/i.test(
      msg,
    );
  const progressing =
    /oh i see|got it|that makes sense|i think i understand/i.test(msg);

  if (frustrated || stage === "STUCK") return "empathetic";
  if (progressing) return "encouraging";
  if (stage === "DEBUG") return "analytical";
  if (stage === "REFLECT") return "challenging";
  return "encouraging";
}

// ─────────────────────────────────────────────────────────────────────────
// SOLUTION REQUEST DETECTION
// ─────────────────────────────────────────────────────────────────────────

const EXPLICIT_SOLUTION_PHRASES = [
  "give me the solution",
  "give me solution",
  "show me the answer",
  "what's the solution",
  "whats the solution",
  "full solution",
  "complete solution",
  "provide the solution",
  "write the full code",
  "give full code",
  "complete code",
  "final code",
  "just write it",
  "just code it",
  "write the code for me",
  "code this for me",
  "implement this for me",
  "implement it for me",
  "do it for me",
  "solve it for me",
  "write a solution",
  "give me code",
  "can you code this",
  "code the solution",
  "write me the code",
  "show me the code",
  "show me how to code",
  "show me the full",
  "show me a working",
  "show full code",
  "paste the solution",
];

function isExplicitSolutionRequest(userMessage: string): boolean {
  const msg = userMessage.toLowerCase().trim();
  return EXPLICIT_SOLUTION_PHRASES.some((phrase) => msg.includes(phrase));
}

// ─────────────────────────────────────────────────────────────────────────
// OUTPUT GUARDRAILS
// ─────────────────────────────────────────────────────────────────────────

function countCodeLines(text: string): number {
  const blocks = text.match(/```[\s\S]*?```/g) ?? [];
  return blocks
    .join("\n")
    .split("\n")
    .filter((l) => l.trim().length > 0).length;
}

function looksLikeFullSolution(text: string): boolean {
  const blocks = text.match(/```[\s\S]*?```/g) ?? [];
  const totalChars = blocks.reduce((s, b) => s + b.length, 0);

  if (totalChars > 600) return true;
  if (blocks.length >= 2) return true;

  const lower = text.toLowerCase();
  const solutionSignals = [
    "class solution",
    "public static void main",
    "def solve(",
    "if __name__",
    "here's the complete",
    "here is the complete",
    "full implementation",
    "complete implementation",
    "here's the full code",
    "here is the full code",
    "complete code",
    "the answer is",
  ];
  return solutionSignals.some((s) => lower.includes(s));
}

function sanitizeAssistantResponse(
  text: string,
  allowFullSolution: boolean,
): { text: string; wasViolation: boolean } {
  if (allowFullSolution) return { text, wasViolation: false };

  // Allow tiny illustrative snippets (≤3 non-empty lines, ≤180 chars inner)
  const sanitized = text.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.replace(/^```[^\n]*\n/, "").replace(/```\s*$/, "");
    const lines = inner.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length <= 3 && inner.length <= 180) return block;
    return "```\n[snippet hidden — let's reason through this together first]\n```";
  });

  const codeLineCount = countCodeLines(sanitized);
  const stillLooksLikeSolution = looksLikeFullSolution(sanitized);

  if (codeLineCount > 5 || stillLooksLikeSolution) {
    return { text: sanitized, wasViolation: true };
  }

  return { text: sanitized, wasViolation: false };
}

// ─────────────────────────────────────────────────────────────────────────
// FALLBACK RESPONSES (stage-aware)
// ─────────────────────────────────────────────────────────────────────────

function buildSolutionRequestResponse(stage: TeachingStage): string {
  const responses: Record<TeachingStage, string> = {
    EXPLORE: `I love that you want to get to the answer — but let's make sure you actually *own* the solution when you get there.\n\nFirst question: **What does this problem actually ask you to do?** Try explaining it to me like I've never seen it before. That step alone will unlock a lot.`,

    STRATEGIZE: `I can see the temptation! But here's the thing — if I give you the code now, you'll solve *this* problem but not the next 10 like it.\n\nYou're actually close. Tell me: **what approach or data structure are you leaning toward, even if you're not sure?** Let's pressure-test your instinct together.`,

    IMPLEMENT: `You've already done the hard thinking — the approach is there! The code is just translating that thinking.\n\nWhich specific part is blocking you right now? The loop logic? The data structure update? Handling edge cases? Point me to the exact line or idea and we'll crack it.`,

    DEBUG: `I won't rewrite it for you — but I *will* help you find the bug yourself, which is 10× more valuable.\n\n**Walk me through what your code does on this test case, step by step:** What's the input? What does each line do? Where does the output diverge from expected? The bug will reveal itself.`,

    STUCK: `I hear you — this one is tough and frustrating. Let's reset.\n\nForget the code completely for a moment. Imagine you had to solve this problem by hand with a pen and paper. What would your process be for a tiny example, say 3-4 elements? Describe the steps out loud. That physical intuition is your algorithm.`,

    REFLECT: `You solved it — now let's make this knowledge permanent.\n\nInstead of just moving on: **can you explain *why* this solution works?** What property of the data does it exploit? What would break if the input were different? Understanding the *why* means you'll recognize this pattern instantly next time.`,
  };

  return responses[stage];
}

// ─────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────

function buildMentorSystemPrompt(
  stage: TeachingStage,
  rung: LearningRung,
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

If a natural question fits, use this fallback: "${guideQuestion}"`;
}

// ─────────────────────────────────────────────────────────────────────────
// CONTEXT BUILDERS
// ─────────────────────────────────────────────────────────────────────────

function clampText(input: string | undefined, max: number): string {
  if (!input) return "";
  return input.length > max
    ? input.slice(0, max) + `\n\n[Truncated to ${max} chars]`
    : input;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response: Response, rawBody: string): number | null {
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }

  const match = rawBody.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0)
      return Math.ceil(seconds * 1000);
  }

  return null;
}

async function llmFetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: {
    maxRetries?: number;
    baseDelayMs?: number;
    apiKey?: string;
    apiProvider?: string;
  },
): Promise<{ response: Response; raw: string }> {
  const maxRetries = opts?.maxRetries ?? 3;
  const baseDelayMs = opts?.baseDelayMs ?? 800;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, init);
    const raw = await response.text();

    if (response.ok) return { response, raw };

    const shouldRetry = response.status === 429 || response.status >= 500;
    if (!shouldRetry || attempt === maxRetries) {
      // Report failure to key pool if using server keys
      if (opts?.apiKey && opts?.apiProvider) {
        reportKeyFailure(opts.apiProvider, response.status, opts.apiKey);
      }
      throw new Error(
        `LLM API error: ${response.status}${raw ? ` :: ${raw}` : ""}`,
      );
    }

    // Wait before retrying
    const serverSuggested = parseRetryAfterMs(response, raw);
    const expBackoff = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 200);
    const waitMs = Math.max(serverSuggested ?? 0, expBackoff + jitter);

    lastError = new Error(
      `LLM API retryable error: ${response.status}; waiting ${waitMs}ms`,
    );
    await sleep(waitMs);
  }

  throw lastError ?? new Error("LLM API error: retries exhausted");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeTestCases(
  testCases: MentorRequest["publicTestCases"],
): Array<{ order: number; input: string; expected: string }> {
  if (!Array.isArray(testCases)) return [];
  return testCases.slice(0, 8).map((t) => ({
    order: typeof t?.order === "number" ? t.order : 0,
    input: clampText(typeof t?.input === "string" ? t.input : "", 1500),
    expected: clampText(
      typeof t?.expected === "string" ? t.expected : "",
      1500,
    ),
  }));
}

function buildTestCasesString(
  testCases: Array<{ order: number; input: string; expected: string }>,
): string {
  if (testCases.length === 0) return "No test cases provided.";
  return testCases
    .map(
      (t) =>
        `**Test #${t.order}**\nInput: \`${t.input}\`\nExpected: \`${t.expected}\``,
    )
    .join("\n\n");
}

function buildAdaptiveProblemContext(
  body: MentorRequest,
  stage: TeachingStage,
): string {
  const testCases = sanitizeTestCases(body.publicTestCases);
  const isEarlyStage = stage === "EXPLORE" || stage === "STRATEGIZE";

  if (isEarlyStage) {
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

function buildUserCodeContext(body: MentorRequest): string {
  if (!body.userCode && !body.syntaxError) return "";
  let context = "<current_code>\n";
  context += `Language: ${body.language}\n\n`;
  if (body.userCode) {
    context += "```" + body.language + "\n";
    context += clampText(body.userCode, 3000);
    context += "\n```\n";
  }
  if (body.syntaxError) {
    context += "\n**Error**:\n```\n";
    context += clampText(body.syntaxError, 500);
    context += "\n```\n";
  }
  context += "</current_code>";
  return context;
}

function buildStatsContext(
  stats: UserStats,
  userMessage: string,
  stage: TeachingStage,
): string {
  if (!stats) return "";
  const isErrorRelated = /error|wrong|fail|bug|issue|stuck|help/i.test(
    userMessage,
  );
  const hasActivity = stats.runCount > 0 || stats.submitCount > 0;
  if (stage === "EXPLORE" && !hasActivity) return "";
  if (!isErrorRelated && stage === "STRATEGIZE") return "";

  let context = "<user_progress>\n";
  if (hasActivity) {
    context += `Runs: ${stats.runCount} | Submissions: ${stats.submitCount}`;
    if (stats.acceptedCount > 0)
      context += ` | ✓ Accepted: ${stats.acceptedCount}`;
    if (stats.wrongAnswerCount > 0)
      context += ` | ✗ Wrong: ${stats.wrongAnswerCount}`;
    if (stats.runtimeErrorCount > 0)
      context += ` | ⚠ Runtime Errors: ${stats.runtimeErrorCount}`;
    context += "\n";
  }
  if (stats.lastStatus && stats.lastStatus !== "ACCEPTED")
    context += `Last Status: ${stats.lastStatus}\n`;
  if (stats.lastError)
    context += `Last Error: ${clampText(stats.lastError, 400)}\n`;
  context += "</user_progress>";
  return context;
}

function sanitizeHistoryForContext(history: HistoryMsg[]): HistoryMsg[] {
  return history.map((msg) => {
    if (msg.role !== "assistant") return msg;
    const cleaned = msg.content
      .replace(/```[\s\S]*?```/g, "[code discussion omitted]")
      .replace(/`[^`\n]+`/g, "[snippet]");
    return { ...msg, content: cleaned };
  });
}

function buildConversationHistory(
  history: HistoryMsg[],
  rollingSummaryMd: string | null,
): string {
  if (history.length === 0 && !rollingSummaryMd)
    return "(No prior conversation)";

  let context = "";
  if (rollingSummaryMd?.trim()) {
    context += `<conversation_summary>\n${rollingSummaryMd}\n</conversation_summary>\n\n`;
  }

  const recentCount = rollingSummaryMd ? 3 : 4;
  const clean = sanitizeHistoryForContext(history).slice(-recentCount);

  if (clean.length > 0) {
    context += `<recent_exchanges>\n`;
    context += clean
      .map((msg) => {
        const role = msg.role === "user" ? "STUDENT" : "MENTOR";
        return `[${role}]\n${clampText(msg.content, 500)}`;
      })
      .join("\n\n");
    context += `\n</recent_exchanges>`;
  }

  return context;
}

function extractAssistantContent(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first = choices[0];
  if (!isRecord(first)) return "";
  const message = first.message;
  if (!isRecord(message)) return "";

  let content = typeof message.content === "string" ? message.content.trim() : "";

  if (content.includes("<think>") || content.includes("</think>")) {
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  }

  return content;
}

// ─────────────────────────────────────────────────────────────────────────
// INLINE MEMORY PARSING — replaces rewriteRollingSummary AI call
// ─────────────────────────────────────────────────────────────────────────

const MEM_MARKER = "\n---MENTOR_MEM---\n";

/**
 * Strips the memory block from the AI response, returns { cleanText, memoryJson }.
 * The AI is instructed to append JSON at the end. We parse it out here.
 */
function parseMentorMemory(text: string): { text: string; memoryJson: string | null } {
  // Try the exact marker first
  let idx = text.lastIndexOf(MEM_MARKER);

  // Fallback: LLM sometimes wraps it in ```json or ``` blocks
  if (idx === -1) {
    const jsonCodeBlock = text.match(/```\s*json\s*\n([\s\S]*?)```/);
    if (jsonCodeBlock) {
      const jsonContent = jsonCodeBlock[1].trim();
      try { JSON.parse(jsonContent); } catch { return { text, memoryJson: null }; }
      // Remove the code block from visible text
      return { text: text.replace(jsonCodeBlock[0], "").trim(), memoryJson: jsonContent };
    }
  }

  // Fallback: try to find a JSON object near the end
  if (idx === -1) {
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace !== -1) {
      const openBrace = text.lastIndexOf("{", lastBrace);
      if (openBrace !== -1 && lastBrace - openBrace > 10) {
        const jsonCandidate = text.slice(openBrace, lastBrace + 1);
        try { JSON.parse(jsonCandidate); } catch { return { text, memoryJson: null }; }
        // Only accept if JSON has expected keys
        const parsed = JSON.parse(jsonCandidate);
        const hasKeys = ["s", "stage", "w", "d"].some(k => k in parsed);
        if (hasKeys) {
          return { text: text.slice(0, openBrace).trim(), memoryJson: jsonCandidate };
        }
      }
    }
  }

  if (idx === -1) {
    return { text, memoryJson: null };
  }
  const memoryBlock = text.slice(idx + MEM_MARKER.length).trim();
  return { text: text.slice(0, idx), memoryJson: memoryBlock };
}

// ─────────────────────────────────────────────────────────────────────────
// AI CALL HELPER — uses key pool with automatic retry on wrong key
// ─────────────────────────────────────────────────────────────────────────

/**
 * Make the actual LLM call. If the key returns 429, try the next key
 * from the pool automatically.
 */
async function callAIWithKeyRotation(
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number,
  apiConfig: ApiConfig,
): Promise<string> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (apiConfig.provider !== "ollama") {
    headers.Authorization = `Bearer ${apiConfig.apiKey}`;
  }

  const requestBody: Record<string, unknown> = {
    model: apiConfig.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  if (apiConfig.provider === "groq" || apiConfig.provider === "openai") {
    requestBody.top_p = 0.95;
    requestBody.frequency_penalty = 0.4;
    requestBody.presence_penalty = 0.3;
  }

  // Try current key first
  try {
    const { raw } = await llmFetchWithRetry(
      `${apiConfig.apiBaseUrl}/chat/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      },
      {
        maxRetries: 4,
        baseDelayMs: 2000,
        apiKey: apiConfig.apiKey,
        apiProvider: apiConfig.isServerKey ? apiConfig.provider : undefined,
      },
    );
    const data = raw ? (JSON.parse(raw) as unknown) : null;
    return extractAssistantContent(data);
  } catch (e) {
    // If using server key pool and got 429, try next key
    if (!apiConfig.isServerKey) throw e;

    const nextKey = getKeyFromPool(apiConfig.provider);
    if (!nextKey) throw e;

    console.warn(`[KEY_POOL] Switching to next key after 429`);
    const nextConfig = { ...apiConfig, apiKey: nextKey };

    const { raw } = await llmFetchWithRetry(
      `${nextConfig.apiBaseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${nextConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      },
      {
        maxRetries: 4,
        baseDelayMs: 2000,
        apiKey: nextConfig.apiKey,
        apiProvider: apiConfig.provider,
      },
    );
    const data = raw ? (JSON.parse(raw) as unknown) : null;
    return extractAssistantContent(data);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = (await req.json().catch(() => null)) as MentorRequest | null;
    if (!body?.problemId || !body.language || !body.userMessage) {
      return Response.json(
        { error: "Missing required fields: problemId, language, userMessage" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const problemId = body.problemId;

    // ── 1. RATE LIMIT CHECK (before any expensive operations) ──
    const rateLimit = await checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return Response.json(
        { error: rateLimit.message },
        { status: 429 },
      );
    }

    // ── 2. INITIALIZE STAGE ENGINE SESSION ──
    const mentorSession = await getOrCreateSession(userId, problemId);

    // Save user message to session
    await saveMessage(mentorSession.id, "user", body.userMessage, mentorSession.stage as TeachingStage);

    // ── 3. FETCH PROBLEM METADATA ──
    const problemRecord = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        patterns: { include: { pattern: true } },
      },
    });

    if (!problemRecord) {
      return Response.json({ error: "Problem not found" }, { status: 404 });
    }

    const problemForRouter = {
      id: problemRecord.id,
      slug: problemRecord.slug,
      title: problemRecord.title,
      statementMd: problemRecord.statementMd,
      constraintsMd: problemRecord.constraintsMd || undefined,
      meta: {
        difficulty: problemRecord.difficulty,
        tags: (problemRecord.tags as string[]) || [],
        patterns: problemRecord.patterns.map((p) => p.pattern.name),
      },
    };

    // ── 4. Parallel fetch: settings, stats, summary ──
    const [userAiSettings, stats, existingSummary] =
      await Promise.all([
        prisma.userAiSettings.findUnique({
          where: { userId },
          select: {
            apiProvider: true,
            groqApiKey: true,
            openaiApiKey: true,
            googleApiKey: true,
            openrouterApiKey: true,
            ollamaBaseUrl: true,
            ollamaModel: true,
            preferredFreeModel: true,
            verbosity: true,
          },
        }),
        prisma.userProblemStats.findUnique({
          where: { userId_problemId: { userId, problemId } },
          select: {
            runCount: true,
            submitCount: true,
            acceptedCount: true,
            wrongAnswerCount: true,
            runtimeErrorCount: true,
            lastStatus: true,
            lastError: true,
          },
        }),
        prisma.mentorConversationSummary.findUnique({
          where: { userId_problemId: { userId, problemId } },
          select: { summaryMd: true, messageCount: true, lastRung: true },
        }),
      ]);

    const history = mentorSession.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // ── 5. ROUTE INTERACTION (Static Rules + Global Cache) ──
    const decision = await routeInteraction(
      body.userMessage,
      mentorSession,
      problemForRouter
    );

    if (decision.type === "STATIC") {
      let message = "I'm here to help you learn. Let's focus on the current step.";
      if (decision.handler === "breakdown") {
        message = `Let's break down "${problemRecord.title}" together. What part of the problem statement is most confusing to you right now?`;
      } else if (decision.handler === "stage_gate") {
        message = buildSolutionRequestResponse(mentorSession.stage as TeachingStage);
      }

      await saveMessage(mentorSession.id, "assistant", message, mentorSession.stage as TeachingStage);

      // Debug log
      logInteraction({
        userId,
        problemId,
        userMessage: body.userMessage,
        decisionType: "STATIC",
        responseData: message,
        stage: mentorSession.stage as string,
        rung: 1,
      });

      return Response.json({
        ok: true,
        message,
        metadata: { stage: mentorSession.stage, type: "static", handler: decision.handler },
      });
    }

    if (decision.type === "CACHE_HIT" && decision.quality === "HARD") {
      await saveMessage(mentorSession.id, "assistant", decision.entry.response, mentorSession.stage as TeachingStage);

      prisma.cacheEntry.update({
        where: { id: decision.entry.id },
        data: { usedCount: { increment: 1 } },
      }).catch(console.warn);

      logInteraction({
        userId,
        problemId,
        userMessage: body.userMessage,
        decisionType: "CACHE_HIT",
        responseData: decision.entry.response,
        stage: mentorSession.stage as string,
        rung: 1,
        cacheHitData: {
          similarity: decision.similarity?.toFixed(4) ?? "0",
          cacheEntryId: decision.entry.id,
        },
      });

      return Response.json({
        ok: true,
        message: decision.entry.response,
        metadata: {
          stage: mentorSession.stage,
          type: "cache_hit_hard",
          similarity: decision.similarity,
        },
      });
    }

    // ── 5b. CACHE HIT — SOFT — refine the best cached answer via AI ──
    // The cached response looked similar (cosine + bigram), but not enough
    // to reuse verbatim. Send it to the AI as context so it can adapt it.
    if (decision.type === "CACHE_HIT" && decision.quality === "SOFT") {
      // ── resolve API config ──
      let apiConfig: ApiConfig;
      try {
        apiConfig = await resolveApiConfig(userAiSettings);
      } catch {
        return Response.json(
          { error: "No AI provider available. Please configure your API key in Settings or contact support." },
          { status: 503 },
        );
      }

      const verb = inferVerbosityFromText(body.userMessage);
      const verbosity: Verbosity = (userAiSettings?.verbosity as Verbosity) || "normal";

      const currentRung = existingSummary?.lastRung ?? 1;
      const refinementRung = detectLearningRung(history, stats, body.userMessage, body.userCode, currentRung);

      const refinedSystemPrompt = `You are a helpful Socratic mentor for DSA.
A student just asked: "${body.userMessage}"

Someone previously asked a very similar question. Their question was: "${(decision.entry as any).questionText || decision.similarity.toFixed(2)} similar"
The answer we gave was:

${decision.entry.response.slice(0, 1200)}

Do NOT repeat that answer verbatim. Instead:
1. Give a fresh, tailored response to the student's exact wording
2. Keep it Socratic — ask guiding questions, don't give code
3. Adapt to the current teaching stage: ${mentorSession.stage as string}
4. Be concise and conversational`;

      const refinementMessages = [
        { role: "system" as const, content: refinedSystemPrompt },
        { role: "assistant" as const, content: clampText(
          history.filter(h => h.role === "assistant").slice(-2).map(h => h.content).join("\n"), 800
        )},
        { role: "user" as const, content: body.userMessage },
      ];

      let refinedMessage: string;
      try {
        refinedMessage = await callAIWithKeyRotation(
          refinementMessages,
          getAdaptiveTemperature(body, stats),
          verbosityToModelMaxTokens(verbosity),
          apiConfig,
        );
      } catch {
        return Response.json(
          { error: "AI service unavailable — try again in a moment." },
          { status: 503 },
        );
      }

      if (!refinedMessage) {
        return Response.json({ error: "Empty response from AI service" }, { status: 502 });
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
          similarity: decision.similarity?.toFixed(4) ?? "0",
          cacheEntryId: decision.entry.id,
        },
      });

      return Response.json({
        ok: true,
        message: refinedMessage,
        metadata: {
          stage: mentorSession.stage,
          type: "cache_hit_soft",
          similarity: decision.similarity,
        },
      });
    }

    // ── 6. AI_NEEDED — Resolve API config & make call ──
    let apiConfig: ApiConfig;
    try {
      apiConfig = await resolveApiConfig(userAiSettings);
    } catch (e) {
      return Response.json(
        { error: "No AI provider available. Please configure your API key in Settings or contact support." },
        { status: 503 },
      );
    }

    // ── Handle verbosity ──
    const inferred = inferVerbosityFromText(body.userMessage);
    let verbosity: Verbosity =
      (userAiSettings?.verbosity as Verbosity) || "normal";

    if (inferred && inferred !== verbosity) {
      verbosity = inferred;
      prisma.userAiSettings
        .upsert({
          where: { userId },
          create: { userId, verbosity },
          update: { verbosity },
        })
        .catch((e) => console.warn("Failed to update verbosity:", e));
    }

    const rollingSummaryMd = existingSummary?.summaryMd ?? null;
    const currentMessageCount = existingSummary?.messageCount ?? 0;

    const stage = mentorSession.stage as TeachingStage;
    const tone = detectTone(history, body.userMessage, stage);

    const previousRung = existingSummary?.lastRung ?? 1;
    const rung = detectLearningRung(
      history,
      stats,
      body.userMessage,
      body.userCode,
      previousRung,
    );

    // ── Loop detection ──
    let loopDetected = false;
    if (history.length >= 6) {
      const recentUserMessages = history
        .filter((h) => h.role === "user")
        .slice(-3)
        .map((h) => h.content.toLowerCase());

      if (recentUserMessages.length === 3) {
        const [msg1, msg2, msg3] = recentUserMessages;
        const words1 = new Set(msg1.split(/\s+/).filter((w) => w.length > 3));
        const words2 = new Set(msg2.split(/\s+/).filter((w) => w.length > 3));
        const words3 = new Set(msg3.split(/\s+/).filter((w) => w.length > 3));

        const overlap12 = [...words1].filter((w) => words2.has(w)).length;
        const overlap23 = [...words2].filter((w) => words3.has(w)).length;
        const overlap13 = [...words1].filter((w) => words3.has(w)).length;

        const avgOverlap = (overlap12 + overlap23 + overlap13) / 3;
        const avgSize = (words1.size + words2.size + words3.size) / 3;

        loopDetected = avgSize > 0 && avgOverlap / avgSize > 0.6;
      }
    }

    // ── GATE: Explicit solution request ──
    const allowFullSolution = isExplicitSolutionRequest(body.userMessage);
    if (!allowFullSolution && stage !== "REFLECT") {
      const isSuspiciousRequest =
        /just show|just tell|skip|shortcut|cheat|i give up|forget it|just|directly/i.test(
          body.userMessage,
        ) && /code|solution|answer|implement|write/i.test(body.userMessage);

      if (isSuspiciousRequest) {
        return Response.json({
          ok: true,
          message: buildSolutionRequestResponse(stage),
          metadata: { verbosity, stage, tone, wasGated: true },
        });
      }
    }

    // ── Build context ──
    const stylePrompt = verbosityToStylePrompt(verbosity);
    const contextualGuidance = buildContextualGuidance(body, stats, history);
    const conversationHistory = buildConversationHistory(
      history,
      rollingSummaryMd,
    );
    const problemContext = buildAdaptiveProblemContext(body, stage);
    const codeContext = buildUserCodeContext(body);
    const statsContext = buildStatsContext(stats, body.userMessage, stage);

    const probContext = extractProblemContext(
      body.userCode,
      body.problemStatementMd,
    );
    const guideQuestion = selectGuideQuestion(rung, stage, probContext);

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
    );

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: systemMessage }];

    const recentTurns = sanitizeHistoryForContext(history).slice(-4);
    for (const msg of recentTurns) {
      messages.push({
        role: msg.role,
        content: clampText(msg.content, 600),
      });
    }

    messages.push({ role: "user", content: body.userMessage });

    const temperature = getAdaptiveTemperature(body, stats);
    const maxTokens = verbosityToModelMaxTokens(verbosity);

    // ── 7. CALL AI (with key rotation on 429) ──
    let assistantMessage: string;
    try {
      assistantMessage = await callAIWithKeyRotation(
        messages,
        temperature,
        maxTokens,
        apiConfig,
      );
    } catch (e) {
      console.error("AI API error:", e);

      // Graceful degradation — give a contextual fallback instead of an error
      const stageTeaching: Record<TeachingStage, string> = {
        EXPLORE: `Mentors are busy right now! While you wait, try this: explain the problem to yourself in plain English. Pretend you're a rubber duck — read through the problem statement out loud and trace each example. This alone often unlocks the first insight.`,
        STRATEGIZE: `Mentors are busy — take a step back. Look at the test cases. What pattern do you see in the examples? Try solving them by hand. What steps did you follow? That's your algorithm.`,
        IMPLEMENT: `Mentors are a bit backed up right now — great time to keep coding! Which specific part is blocking you? Try tracing your code with a failing test case input step by step. Often the bug reveals itself that way.`,
        DEBUG: `Mentors are busy — keep debugging! Try running your code with the smallest possible input (1-2 elements). What happens? What did you expect? Compare those two — the difference is your bug.`,
        STUCK: `Mentors are busy so I can't chat right now, but I can give you a hint: forget the code completely. How would you solve this with a pen and paper using 3-4 elements? Write those steps down — that physical procedure is exactly what your algorithm needs to implement.`,
        REFLECT: `Great job solving! While mentors are busy right now, here's something to think about: why does your approach work? What property of the data are you exploiting? Can you explain it in one sentence? That sentence is the pattern name.`,
      };

      const fallbackMessage = stageTeaching[stage] || `Mentors are busy right now — please try again in a moment.`;

      await saveMessage(mentorSession.id, "assistant", fallbackMessage, mentorSession.stage as TeachingStage);

      logInteraction({
        userId,
        problemId,
        userMessage: body.userMessage,
        decisionType: "STATIC",
        responseData: fallbackMessage,
        stage: mentorSession.stage as string,
        rung,
        error: e instanceof Error ? e.message.slice(0, 200) : String(e),
      });

      return Response.json({
        ok: true,
        message: fallbackMessage,
        metadata: { stage, runGated: true, reason: "ai_unavailable" },
      });
    }

    if (!assistantMessage) {
      return Response.json(
        { error: "Received empty response from AI service" },
        { status: 502 },
      );
    }

    // ── 8. Output guardrails ──
    const { text: sanitized, wasViolation } = sanitizeAssistantResponse(
      assistantMessage,
      allowFullSolution,
    );
    assistantMessage = sanitized;

    if (wasViolation && !allowFullSolution) {
      assistantMessage = buildSolutionRequestResponse(stage);
    }

    // ── 9. STAGE ENGINE PERSISTENCE ──
    await saveMessage(mentorSession.id, "assistant", assistantMessage, mentorSession.stage as TeachingStage);

    // ── 10. SAVE TO GLOBAL CACHE (reliable, not awaited) ──
    // We don't await this to avoid blocking the response.
    // Cache is looked up via the cache lookup path on next similar question.
    const questionToCache = body.userMessage;
    const responseToCache = assistantMessage;
    const stageToCache = mentorSession.stage as TeachingStage;
    const problemIdToCache = problemId;
    const rungToCache = rung;

    saveToCache({
      problemId: problemIdToCache,
      question: questionToCache,
      response: responseToCache,
      stage: stageToCache,
      rung: rungToCache,
    }).then(() => {
      console.log(`[CACHE] Saved Q&A for reuse: "${questionToCache.slice(0, 50)}..."`);
    }).catch(e => console.warn("[CACHE] Failed to save:", e));

    // ── 11. STAGE ADVANCEMENT ──
    const lowerResponse = assistantMessage.toLowerCase();
    const transitionCtx: TransitionContext = {
      approachCorrect: lowerResponse.includes("approach is correct") || lowerResponse.includes("great strategy") || (stage === "STRATEGIZE" && lowerResponse.includes("exactly")),
      codeCorrect: lowerResponse.includes("code looks good") || lowerResponse.includes("solved it") || (stage === "IMPLEMENT" && stats?.acceptedCount && stats.acceptedCount > 0),
      isOptimal: lowerResponse.includes("optimal") || lowerResponse.includes("most efficient"),
      hasErrors: !!body.syntaxError || (stats?.wrongAnswerCount && stats.wrongAnswerCount > 0),
      isFrustrated: /frustrat|give up|don't understand/i.test(body.userMessage.toLowerCase())
    };

    if (mentorSession.stage === "EXPLORE") {
      await tryAdvanceStage(mentorSession.id, "STRATEGIZE", transitionCtx);
    } else if (mentorSession.stage === "STRATEGIZE" && transitionCtx.approachCorrect) {
      await tryAdvanceStage(mentorSession.id, "IMPLEMENT", transitionCtx);
    } else if (mentorSession.stage === "IMPLEMENT" && transitionCtx.codeCorrect) {
      await tryAdvanceStage(mentorSession.id, "REFLECT", transitionCtx);
    } else if (mentorSession.stage === "IMPLEMENT" && transitionCtx.hasErrors) {
      await tryAdvanceStage(mentorSession.id, "DEBUG", transitionCtx);
    } else if (mentorSession.stage === "DEBUG" && !transitionCtx.hasErrors) {
      await tryAdvanceStage(mentorSession.id, "IMPLEMENT", transitionCtx);
    }

    // ── 12. Legacy Persistence (background, for compatibility) ──
    const conversationMetadata = { rung, stage, tone };

    prisma.mentorConversationMessage
      .create({
        data: {
          userId,
          problemId,
          role: "user",
          content: body.userMessage,
          metadata: conversationMetadata,
        },
      })
      .catch((e) => console.warn("Failed to save user message:", e));

    prisma.mentorConversationMessage
      .create({
        data: {
          userId,
          problemId,
          role: "assistant",
          content: assistantMessage,
          metadata: conversationMetadata,
        },
      })
      .catch((e) => console.warn("Failed to save assistant message:", e));

    // ── 13. Parse inline memory from AI response ──
    const { text: cleanText, memoryJson } = parseMentorMemory(assistantMessage);
    assistantMessage = cleanText; // strip memory from visible response

    const newMessageCount = currentMessageCount + 2;

    // Save memory — every turn, zero extra AI calls
    if (memoryJson) {
      prisma.mentorConversationSummary
        .upsert({
          where: { userId_problemId: { userId, problemId } },
          create: {
            userId,
            problemId,
            status: "ONGOING",
            summaryMd: memoryJson,
            messageCount: newMessageCount,
            lastRung: rung,
          },
          update: {
            summaryMd: memoryJson,
            messageCount: newMessageCount,
            lastRung: rung,
          },
        })
        .catch((e) => console.warn("Failed to save memory:", e));
    } else {
      prisma.mentorConversationSummary
        .upsert({
          where: { userId_problemId: { userId, problemId } },
          create: {
            userId,
            problemId,
            status: "ONGOING",
            summaryMd: rollingSummaryMd || "",
            messageCount: newMessageCount,
            lastRung: rung,
          },
          update: {
            messageCount: newMessageCount,
            lastRung: rung,
          },
        })
        .catch((e) => console.warn("Failed to update message count:", e));
    }

    return Response.json({
      ok: true,
      message: assistantMessage,
      metadata: {
        verbosity,
        temperature,
        model: apiConfig.model,
        stage,
        rung,
        tone,
        wasViolation,
      },
    });
  } catch (error) {
    console.error("Mentor API Error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
