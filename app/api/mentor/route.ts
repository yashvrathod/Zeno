/**
 * DSA Mentor API — Socratic Teaching Engine
 *
 * Philosophy: The AI is a TOUR GUIDE through problem-solving, not a solution vending machine.
 * Every response should move the user ONE step forward in their OWN thinking.
 *
 * Teaching Stages:
 *   EXPLORE  → Help user understand the problem deeply (examples, edge cases, constraints)
 *   STRATEGIZE → Guide them to discover the right algorithm/pattern themselves
 *   IMPLEMENT → Help them translate thinking into code, one piece at a time
 *   DEBUG    → Ask diagnostic questions, never fix code directly
 *   REFLECT  → After success, deepen understanding (complexity, alternatives, patterns)
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
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

// TeachingStage and ConversationTone now imported from mentorContext

// ─────────────────────────────────────────────
// STAGE DETECTION
// ─────────────────────────────────────────────

function detectTeachingStage(
  history: HistoryMsg[],
  stats: UserStats,
  userMessage: string,
): TeachingStage {
  const msg = userMessage.toLowerCase();
  const hasCode = !!stats && (stats.runCount > 0 || stats.submitCount > 0);
  const isAccepted = !!stats && stats.acceptedCount > 0;
  const isStuck =
    !!stats &&
    stats.submitCount >= 4 &&
    stats.acceptedCount === 0 &&
    history.length >= 6;
  const hasErrors =
    !!stats && (stats.wrongAnswerCount > 2 || stats.runtimeErrorCount > 1);
  const hasError = !!stats?.lastError;

  if (isAccepted) return "REFLECT";
  if (isStuck) return "STUCK";
  if (hasErrors || hasError || /error|wrong|fail|crash|exception/i.test(msg))
    return "DEBUG";
  if (hasCode || /my code|my approach|i tried|i wrote|i think we/i.test(msg))
    return "IMPLEMENT";
  if (
    history.length >= 2 ||
    /approach|algorithm|idea|think|solve|strategy|how to/i.test(msg)
  )
    return "STRATEGIZE";
  return "EXPLORE";
}

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

// ─────────────────────────────────────────────
// SOLUTION REQUEST DETECTION (Strict)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// OUTPUT GUARDRAILS
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// FALLBACK RESPONSES (stage-aware)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// ─────────────────────────────────────────────

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
): string {
  const stageInstructions: Record<TeachingStage, string> = {
    EXPLORE: `
## CURRENT STAGE: EXPLORE
The user hasn't deeply understood the problem yet. Your job:
- Ask them to restate the problem in their own words
- Ask them to trace through 1-2 examples by hand
- Help them notice patterns in the examples
- Ask: "What changes between test cases? What stays the same?"
- DO NOT discuss algorithms or code yet — understanding the problem IS the first step
- Ask ONE good question per response, not three`,

    STRATEGIZE: `
## CURRENT STAGE: STRATEGIZE
The user understands the problem and is figuring out approach. Your job:
- Ask them what patterns they notice (sorted? nested? repeated subproblems?)
- Ask: "Have you seen a problem with a similar structure before?"
- Guide them toward the right category (two pointer? sliding window? DP? graph?) through questions
- If they name a wrong approach, ask them to trace it on an example and discover the flaw themselves
- NEVER name the right algorithm — let them arrive at it
- Small Socratic nudges: "What if the array were sorted? What would change?"`,

    IMPLEMENT: `
## CURRENT STAGE: IMPLEMENT
The user has an approach and is coding. Your job:
- Help them translate their thinking into code ONE piece at a time
- If stuck on syntax, give a 1-2 line illustrative snippet for the concept only
- Ask: "What should happen to your pointer/counter/map at each step?"
- Ask: "What's your loop invariant?" or "What does this variable represent?"
- If they have partial code, ask them to explain what each part does
- NEVER write the full function — ask "what should this function return?" instead`,

    DEBUG: `
## CURRENT STAGE: DEBUG
The user has an error or wrong output. Your job:
- Ask them to trace the failing test case through their code manually
- Ask: "What does line X do when input is Y?"
- Ask: "What value do you expect here vs what you get?"
- Ask: "What's the edge case this test is checking?"
- Point to the CATEGORY of bug (off-by-one? not handling empty? wrong condition?) but NOT the fix
- Never modify their code — ask questions until they see the bug themselves`,

    STUCK: `
## CURRENT STAGE: STUCK
The user is genuinely stuck and possibly frustrated. Your job:
- Show empathy FIRST — acknowledge this is hard
- Completely change the angle: use a real-world analogy
- Strip the problem to a tiny 3-element example and work through it together
- Ask ONE very small, answerable question to rebuild momentum
- It's OK to give a slightly bigger hint here — but make them fill in the last piece
- Never show frustration or impatience — every good programmer gets stuck`,

    REFLECT: `
## CURRENT STAGE: REFLECT
The user solved the problem. Your job:
- Celebrate the win genuinely but briefly
- Ask: "What was the key insight that unlocked this?"
- Ask: "What's the time and space complexity?"
- Ask: "Can you think of a case where this approach would fail?"
- Suggest a related problem or pattern to explore next
- Help them NAME the pattern so they recognize it in future problems
- Make this knowledge stick through active recall, not passive reading`,
  };

  const toneInstructions: Record<ConversationTone, string> = {
    encouraging: `Tone: Warm, enthusiastic, celebrate effort. Say things like "Good instinct!", "You're closer than you think", "That's exactly the right question to ask."`,
    analytical: `Tone: Precise, methodical, Sherlock-Holmes style. Walk through logic step by step. "Let's trace this. Input is X. Step 1 does Y. What does that produce?"`,
    challenging: `Tone: Respectful but stretching. Push them further. "Good — but can you do better? What if n was 10^9?" Make them think harder.`,
    empathetic: `Tone: Warm and grounding. Start by acknowledging the struggle. "This one is genuinely tricky." Rebuild confidence before rebuilding logic.`,
  };

  return `${getMentorSystemPrompt()}

═══════════════════════════════════════════
CURRENT SESSION CONTEXT
═══════════════════════════════════════════
**Student's Learning Rung:** ${rung}/6
**Teaching Stage:** ${stage}
**Conversation Tone:** ${tone}

${loopAlert}

═══════════════════════════════════════════
SUGGESTED GUIDE QUESTION
═══════════════════════════════════════════
If you don't have a better question, consider asking:
"${guideQuestion}"

Only use this if it fits naturally. Generate your own question if you have a better one.

═══════════════════════════════════════════
MENTOR IDENTITY
═══════════════════════════════════════════
You are a world-class DSA mentor. Your singular mission is to turn users into
great problem solvers — not to solve problems for them.

Think of yourself as a TOUR GUIDE through the problem-solving process:
- You know the destination (the solution) but you don't carry the user there
- You point out landmarks (key insights) and let them walk
- You ask questions more than you give answers
- You celebrate every step forward, no matter how small

You make users TOURIST in problem solving — they explore, discover, and OWN the journey.

═══════════════════════════════════════════
ABSOLUTE RULES — NEVER BREAK THESE
═══════════════════════════════════════════
1. NEVER write more than 3 lines of code in a single response
2. NEVER write a complete function, class, or algorithm implementation
3. NEVER give the algorithm name without letting them discover it first
4. NEVER answer "how do I solve this?" directly — redirect to a question
5. NEVER fix their code — point toward the bug category, not the fix
6. NEVER write code just because they asked nicely or seem frustrated
7. One response = ONE key insight OR one good question. Not both. Not three.

═══════════════════════════════════════════
WHAT GREAT MENTORING LOOKS LIKE
═══════════════════════════════════════════

❌ BAD: User asks "how do I use two pointers here?"
   You: "Use left=0, right=n-1, then while left < right, check if arr[left]+arr[right]==target..."

✅ GOOD: User asks "how do I use two pointers here?"
   You: "Good instinct! Before writing code — what are the two values you want to compare at each step? And what condition tells you to move the left pointer vs the right one?"

❌ BAD: User is stuck on a loop
   You: "Here's the fixed loop: for(int i=0; i<n-1; i++) { ... }"

✅ GOOD: User is stuck on a loop
   You: "Let's trace it together. If your array is [1,2,3], what does your loop do on the first iteration? What value does i have? What gets compared?"

❌ BAD: User solved it
   You: "Great! Here's an optimized version: [full code]"

✅ GOOD: User solved it
   You: "You got it! Now — can you tell me WHY moving the smaller pointer is correct? What breaks if you always move the left one?"

═══════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════
- Keep it SHORT: 2-5 sentences maximum (unless stage is REFLECT or user is STUCK)
- End with ONE question whenever possible
- Use simple language — no jargon unless they've used it first
- Markdown is OK for emphasis, not for walls of text
- Never use numbered lists of hints — pick the BEST one hint only

═══════════════════════════════════════════
VERBOSITY & STYLE
═══════════════════════════════════════════
Verbosity level: ${verbosity}
Style: ${stylePrompt}

═══════════════════════════════════════════
STAGE-SPECIFIC BEHAVIOR
═══════════════════════════════════════════
${stageInstructions[stage]}

═══════════════════════════════════════════
TONE
═══════════════════════════════════════════
${toneInstructions[tone]}

═══════════════════════════════════════════
ADAPTIVE CONTEXT
═══════════════════════════════════════════
${contextualGuidance}

═══════════════════════════════════════════
PROBLEM CONTEXT
═══════════════════════════════════════════
${problemContext}

${codeContext}

${statsContext}

═══════════════════════════════════════════
CONVERSATION HISTORY
═══════════════════════════════════════════
${conversationHistory}

═══════════════════════════════════════════
FINAL REMINDER
═══════════════════════════════════════════
Before you respond, ask yourself:
  "Does this response make the USER think, or does it think FOR them?"

If you're about to write code — write a question instead.
If you're about to explain an algorithm — ask them to guess it first.
If you're about to give a hint — give half of it and ask them to complete it.

Your success metric: the user closes this chat feeling CAPABLE, not dependent.`;
}

// ─────────────────────────────────────────────
// CONTEXT BUILDERS
// ─────────────────────────────────────────────

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
  // 1) Standard Retry-After header (seconds)
  const retryAfterHeader = response.headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }

  // 2) Groq error message often contains: "Please try again in 10.82s"
  const match = rawBody.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0)
      return Math.ceil(seconds * 1000);
  }

  return null;
}

async function groqFetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: {
    maxRetries?: number;
    baseDelayMs?: number;
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
      // Include body for easier debugging (but avoid leaking secrets)
      throw new Error(
        `Groq API error: ${response.status}${raw ? ` :: ${raw}` : ""}`,
      );
    }

    // Wait before retrying
    const serverSuggested = parseRetryAfterMs(response, raw);
    const expBackoff = baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 200);
    const waitMs = Math.max(serverSuggested ?? 0, expBackoff + jitter);

    lastError = new Error(
      `Groq API retryable error: ${response.status}; waiting ${waitMs}ms`,
    );
    await sleep(waitMs);
  }

  throw lastError ?? new Error("Groq API error: retries exhausted");
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
${body.problemTitle ? `**${body.problemTitle}**\n\n` : ""}${clampText(body.problemStatementMd, 8000)}
</problem>
<constraints>
${clampText(body.problemConstraintsMd, 4000)}
</constraints>
<test_cases>
${buildTestCasesString(testCases)}
</test_cases>
</problem_context>`;
  }

  return `<problem_context>
<problem id="${body.problemId}">${body.problemTitle ? ` — ${body.problemTitle}` : ""}</problem>
<constraints>
${clampText(body.problemConstraintsMd, 3000)}
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
    context += clampText(body.userCode, 8000);
    context += "\n```\n";
  }
  if (body.syntaxError) {
    context += "\n**Error**:\n```\n";
    context += clampText(body.syntaxError, 800);
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

/**
 * Sanitize assistant history before re-feeding it.
 * Strips large code blocks so the model doesn't anchor on prior generated code.
 */
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

  const recentCount = rollingSummaryMd ? 4 : 6;
  const clean = sanitizeHistoryForContext(history).slice(-recentCount);

  if (clean.length > 0) {
    context += `<recent_exchanges>\n`;
    context += clean
      .map((msg) => {
        const role = msg.role === "user" ? "STUDENT" : "MENTOR";
        return `[${role}]\n${clampText(msg.content, 800)}`;
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
  
  // DeepSeek R1 models output reasoning in <think>...</think> tags
  // We need to strip these out to get only the final answer
  if (content.includes("<think>") || content.includes("</think>")) {
    // Remove everything between <think> and </think> tags (including the tags)
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  }
  
  return content;
}

// ─────────────────────────────────────────────
// ROLLING SUMMARY
// ─────────────────────────────────────────────

async function rewriteRollingSummary(params: {
  apiKey: string;
  apiBaseUrl?: string;
  model: string;
  previousSummaryMd: string | null;
  userMessage: string;
  assistantMessage: string;
  stage: TeachingStage;
}): Promise<string> {
  const prev = (params.previousSummaryMd ?? "").trim();

  const system = `You maintain a compact memory for a DSA coding mentor.

Output ONLY Markdown bullet points. Max 900 characters.

Track and update:
- Current teaching stage (EXPLORE/STRATEGIZE/IMPLEMENT/DEBUG/STUCK/REFLECT)
- What the student understands vs is confused about
- Their current approach or algorithm hypothesis
- Key misconceptions (mark clearly)
- What questions led to breakthroughs
- Next logical question to ask them
- Emotional state (frustrated? confident? making progress?)

Return ONLY the updated summary. No preamble.`;

  const user = `Stage: ${params.stage}
Previous summary:\n${prev || "(none)"}

---
New exchange:

[STUDENT]\n${clampText(params.userMessage, 1000)}

[MENTOR]\n${clampText(params.assistantMessage, 1000)}`;

  // Build headers (Ollama doesn't need auth)
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // Only add Authorization for non-Ollama providers
  if (params.apiKey !== "ollama") {
    headers.Authorization = `Bearer ${params.apiKey}`;
  }

  // For Ollama, apiBaseUrl already includes /v1, so just append the endpoint
  const summaryUrl = params.apiBaseUrl
    ? `${params.apiBaseUrl}/chat/completions`
    : "https://api.groq.com/openai/v1/chat/completions";

  const { raw } = await groqFetchWithRetry(
    summaryUrl,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: process.env.GROQ_SUMMARY_MODEL || params.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 350,
        stream: false, // Explicitly disable streaming
      }),
    },
    { maxRetries: 2, baseDelayMs: 1500 }, // Increased delay for summary API call
  );

  const data = raw ? (JSON.parse(raw) as unknown) : null;
  return extractAssistantContent(data);
}

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────

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

    // ── Parallel fetch: Load settings, stats, summary, and persisted messages ──
    const [userAiSettings, stats, existingSummary, persistedMessages] =
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
        prisma.mentorConversationMessage.findMany({
          where: {
            userId,
            problemId,
          },
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        }),
      ]);

    const provider = userAiSettings?.apiProvider || "server";

    console.log("[DEBUG] Provider selected:", provider);
    console.log("[DEBUG] User settings:", {
      hasGroqKey: !!userAiSettings?.groqApiKey,
      hasOpenAIKey: !!userAiSettings?.openaiApiKey,
      hasGoogleKey: !!userAiSettings?.googleApiKey,
      hasOpenRouterKey: !!userAiSettings?.openrouterApiKey,
      hasOllamaConfig: !!(userAiSettings?.ollamaBaseUrl && userAiSettings?.ollamaModel),
    });
    console.log("[DEBUG] Server env:", {
      hasGroqKey: !!process.env.GROQ_API_KEY,
      hasOpenRouterKey: !!process.env.OPENROUTER,
    });

    // Determine which API key to use (user's key takes priority)
    let apiKey: string | undefined;
    let apiBaseUrl: string;
    let model: string;

    if (provider === "groq" && userAiSettings?.groqApiKey) {
      // User's Groq key
      apiKey = userAiSettings.groqApiKey;
      apiBaseUrl = "https://api.groq.com/openai/v1";
      model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    } else if (provider === "openai" && userAiSettings?.openaiApiKey) {
      // User's OpenAI key
      apiKey = userAiSettings.openaiApiKey;
      apiBaseUrl = "https://api.openai.com/v1";
      model = "gpt-4o-mini";
    } else if (provider === "google" && userAiSettings?.googleApiKey) {
      // User's Google AI key
      apiKey = userAiSettings.googleApiKey;
      apiBaseUrl = "https://generativelanguage.googleapis.com/v1beta/openai";
      model = "gemini-1.5-flash";
    } else if (provider === "openrouter" && userAiSettings?.openrouterApiKey) {
      // User's OpenRouter key
      apiKey = userAiSettings.openrouterApiKey;
      apiBaseUrl = "https://openrouter.ai/api/v1";
      model = "deepseek/deepseek-r1-0528:free";
    } else if (
      provider === "ollama" &&
      userAiSettings?.ollamaBaseUrl &&
      userAiSettings?.ollamaModel
    ) {
      // User's local Ollama instance (no API key needed)
      apiKey = "ollama"; // Dummy key, Ollama doesn't need auth
      // Ollama uses /v1 as the base, not /openai/v1
      apiBaseUrl = userAiSettings.ollamaBaseUrl.replace(/\/+$/, "") + "/v1";
      model = userAiSettings.ollamaModel;
    } else if (provider === "server" && process.env.OPENROUTER) {
      // Fall back to server's OpenRouter key if available
      apiKey = process.env.OPENROUTER;
      apiBaseUrl = "https://openrouter.ai/api/v1";
      model = "deepseek/deepseek-r1-0528:free";
    } else {
      // Fall back to server's default Groq key
      apiKey = process.env.GROQ_API_KEY;
      apiBaseUrl =
        process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
      model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    }

    console.log("[DEBUG] Selected API:", {
      provider,
      apiBaseUrl,
      model,
      hasApiKey: !!apiKey,
      apiKeyPrefix: apiKey?.substring(0, 10) + "...",
    });

    if (!apiKey) {
      return Response.json(
        {
          error:
            "No API key configured. Please add your API key in Settings or contact support.",
        },
        { status: 500 },
      );
    }

    // ── Handle verbosity inference and update ──
    const inferred = inferVerbosityFromText(body.userMessage);
    let verbosity: Verbosity =
      (userAiSettings?.verbosity as Verbosity) || "normal";

    if (inferred && inferred !== verbosity) {
      verbosity = inferred;
      // Non-blocking update
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

    // ── Merge frontend history with persisted history ──
    // Use persisted messages as the source of truth, supplement with frontend history if needed
    const persistedHistory = persistedMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // If frontend sent history that's newer than persisted, merge them
    const frontendHistory = Array.isArray(body.history) ? body.history : [];
    const history =
      persistedHistory.length > 0 ? persistedHistory : frontendHistory;

    // ── Detect stage, tone, and learning rung (using persistent data) ──
    const stage = detectTeachingStage(history, stats, body.userMessage);
    const tone = detectTone(history, body.userMessage, stage);

    // Use lastRung from database as starting point, then detect current rung
    const previousRung = existingSummary?.lastRung ?? 1;
    const rung = detectLearningRung(
      history,
      stats,
      body.userMessage,
      body.userCode,
      previousRung,
    );

    // ── Loop detection: Check if student is asking semantically similar questions ──
    let loopDetected = false;
    if (history.length >= 6) {
      const recentUserMessages = history
        .filter((h) => h.role === "user")
        .slice(-3)
        .map((h) => h.content.toLowerCase());

      if (recentUserMessages.length === 3) {
        // Simple keyword overlap detection
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
      // Check if user is trying to get solution indirectly via rephrasing
      const isSuspiciousRequest =
        /just show|just tell|skip|shortcut|cheat|i give up|forget it|just|directly/i.test(
          body.userMessage,
        ) && /code|solution|answer|implement|write/i.test(body.userMessage);

      if (isSuspiciousRequest) {
        return Response.json({
          ok: true,
          message: buildSolutionRequestResponse(stage),
          metadata: { verbosity, stage, tone, model, wasGated: true },
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

    // ── Extract problem context and select guide question ──
    const probContext = extractProblemContext(
      body.userCode,
      body.problemStatementMd,
    );
    const guideQuestion = selectGuideQuestion(rung, stage, probContext);

    // ── Build loop alert if detected ──
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

    // ── Build system prompt ──
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
    );

    // ── Build messages array ──
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: systemMessage }];

    // Add sanitized recent history (last 3 exchanges = 6 msgs)
    const recentTurns = sanitizeHistoryForContext(history).slice(-6);
    for (const msg of recentTurns) {
      messages.push({
        role: msg.role,
        content: clampText(msg.content, 1000),
      });
    }

    // Current user message
    messages.push({ role: "user", content: body.userMessage });

    const temperature = getAdaptiveTemperature(body, stats);
    const maxTokens = verbosityToModelMaxTokens(verbosity);

    // ── Call AI Provider ──
    let raw: string;
    try {
      // Build headers based on provider (Ollama doesn't need auth)
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (provider !== "ollama") {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      // Build request body based on provider
      const requestBody: Record<string, unknown> = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false, // Explicitly disable streaming for all providers
      };

      // Add OpenAI-specific parameters only for compatible providers
      if (provider === "groq" || provider === "openai") {
        requestBody.top_p = 0.95;
        requestBody.frequency_penalty = 0.4;
        requestBody.presence_penalty = 0.3;
      }

      ({ raw } = await groqFetchWithRetry(
        `${apiBaseUrl}/chat/completions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        },
        { maxRetries: 4, baseDelayMs: 2000 }, // Increased delay for rate limits
      ));
    } catch (e) {
      console.error("AI API error:", e);

      // Provide more helpful error messages based on provider
      let errorMessage =
        "AI service is temporarily unavailable. Please try again in a few seconds.";

      if (provider === "ollama") {
        errorMessage =
          "Cannot connect to Ollama. Please ensure:\n1. Ollama is installed and running\n2. The server URL is correct (default: http://localhost:11434)\n3. The model is downloaded (run: ollama pull " +
          model +
          ")";
      } else if (e instanceof Error && e.message.includes("401")) {
        errorMessage =
          "Invalid API key. Please check your API key in Settings.";
      } else if (e instanceof Error && e.message.includes("429")) {
        errorMessage =
          "Rate limit exceeded. Please wait a moment or use your own API key in Settings.";
      }

      return Response.json(
        { error: errorMessage },
        { status: provider === "ollama" ? 503 : 429 },
      );
    }

    const data = raw ? (JSON.parse(raw) as unknown) : null;
    let assistantMessage = extractAssistantContent(data);

    if (!assistantMessage) {
      return Response.json(
        { error: "Received empty response from AI service" },
        { status: 502 },
      );
    }

    // ── Output guardrails (3-layer defense) ──
    const { text: sanitized, wasViolation } = sanitizeAssistantResponse(
      assistantMessage,
      allowFullSolution,
    );
    assistantMessage = sanitized;

    // If model still generated a full solution despite the prompt, use stage-aware fallback
    if (wasViolation && !allowFullSolution) {
      assistantMessage = buildSolutionRequestResponse(stage);
    }

    // ── Persist conversation messages to database (non-blocking) ──
    const conversationMetadata = {
      rung,
      stage,
      tone,
    };

    // Save user message
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

    // Save assistant message
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

    // ── Update rolling summary (non-blocking, server-side message count) ──
    // Update summary every 4 messages based on server-side counter
    const newMessageCount = currentMessageCount + 2; // +2 because we save both user and assistant messages
    const shouldUpdateSummary = newMessageCount % 4 === 0;

    if (shouldUpdateSummary) {
      rewriteRollingSummary({
        apiKey,
        apiBaseUrl,
        model,
        previousSummaryMd: rollingSummaryMd,
        userMessage: body.userMessage,
        assistantMessage,
        stage,
      })
        .then((nextSummary) =>
          prisma.mentorConversationSummary.upsert({
            where: { userId_problemId: { userId, problemId } },
            create: {
              userId,
              problemId,
              status: "ONGOING",
              summaryMd: nextSummary,
              messageCount: newMessageCount,
              lastRung: rung,
            },
            update: {
              status: "ONGOING",
              summaryMd: nextSummary,
              messageCount: newMessageCount,
              lastRung: rung,
            },
          }),
        )
        .catch((e) => console.warn("Failed to update summary:", e));
    } else {
      // Still update message count and rung even if not rewriting summary
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
        model,
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
