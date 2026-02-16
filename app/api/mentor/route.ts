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
} from "@/lib/mentorContext";

export const runtime = "nodejs";

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

function extractAssistantContent(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first = choices[0];
  if (!isRecord(first)) return "";
  const message = first.message;
  if (!isRecord(message)) return "";
  return typeof message.content === "string" ? message.content.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function clampText(input: string | undefined, max: number): string {
  if (!input) return "";
  return input.length > max
    ? input.slice(0, max) + `\n\n[Truncated to ${max} chars]`
    : input;
}

function determineConversationStage(
  history: HistoryMsg[],
  stats: UserStats,
): "initial" | "working" | "debugging" | "stuck" {
  if (history.length <= 2) return "initial";

  if (stats) {
    const isStuck = stats.submitCount > 3 && stats.acceptedCount === 0;
    const hasErrors = stats.wrongAnswerCount > 2 || stats.runtimeErrorCount > 1;

    if (isStuck) return "stuck";
    if (hasErrors || stats.lastError) return "debugging";
  }

  return "working";
}

function buildConversationHistory(
  history: HistoryMsg[],
  rollingSummaryMd: string | null,
): string {
  if (history.length === 0 && !rollingSummaryMd) return "";

  let context = "";

  if (rollingSummaryMd && rollingSummaryMd.trim()) {
    context += `<conversation_summary>\nPrevious conversation:\n${rollingSummaryMd}\n</conversation_summary>\n\n`;
  }

  const recentCount = rollingSummaryMd ? 4 : 6;
  const recentHistory = history.slice(-recentCount);

  if (recentHistory.length > 0) {
    context += `<recent_exchanges>\n`;
    context += recentHistory
      .map((msg) => {
        const role = msg.role === "user" ? "USER" : "ASSISTANT";
        return `[${role}]\n${clampText(msg.content, 800)}`;
      })
      .join("\n\n");
    context += `\n</recent_exchanges>`;
  }

  return context;
}

function buildAdaptiveProblemContext(
  body: MentorRequest,
  stage: "initial" | "working" | "debugging" | "stuck",
): string {
  const testCases = sanitizeTestCases(body.publicTestCases);

  if (stage === "initial") {
    return `
<problem_context>
<problem id="${body.problemId}">
${body.problemTitle ? `**${body.problemTitle}**\n\n` : ""}${clampText(body.problemStatementMd, 8000)}
</problem>

<constraints>
${clampText(body.problemConstraintsMd, 4000)}
</constraints>

<test_cases>
${buildTestCasesString(testCases)}
</test_cases>
</problem_context>`.trim();
  }

  return `
<problem_context>
<problem id="${body.problemId}">${body.problemTitle ? ` - ${body.problemTitle}` : ""}</problem>

<constraints>
${clampText(body.problemConstraintsMd, 3000)}
</constraints>

<test_cases>
${buildTestCasesString(testCases.slice(0, 3))}
</test_cases>
</problem_context>`.trim();
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
      (t) => `**Test #${t.order}**
Input: \`${t.input}\`
Expected: \`${t.expected}\``,
    )
    .join("\n\n");
}

function buildUserCodeContext(body: MentorRequest): string {
  if (!body.userCode && !body.syntaxError) return "";

  let context = "\n<current_code>\n";
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

function buildRelevantStats(
  stats: UserStats,
  userMessage: string,
  stage: "initial" | "working" | "debugging" | "stuck",
): string {
  if (!stats) return "";

  const isErrorRelated = /error|wrong|fail|bug|issue|stuck|help/i.test(
    userMessage,
  );
  const hasActivity = stats.runCount > 0 || stats.submitCount > 0;

  if (stage === "initial" && !hasActivity) return "";
  if (!isErrorRelated && stage === "working") return "";

  let context = "\n<user_progress>\n";

  if (stats.runCount > 0 || stats.submitCount > 0) {
    context += `Runs: ${stats.runCount} | Submissions: ${stats.submitCount}`;

    if (stats.acceptedCount > 0) {
      context += ` | ✓ Accepted: ${stats.acceptedCount}`;
    }

    if (stats.wrongAnswerCount > 0) {
      context += ` | Wrong: ${stats.wrongAnswerCount}`;
    }

    if (stats.runtimeErrorCount > 0) {
      context += ` | Runtime Errors: ${stats.runtimeErrorCount}`;
    }

    context += "\n";
  }

  if (stats.lastStatus && stats.lastStatus !== "ACCEPTED") {
    context += `Last Status: ${stats.lastStatus}\n`;
  }

  if (stats.lastError) {
    context += `Last Error: ${clampText(stats.lastError, 400)}\n`;
  }

  context += "</user_progress>";
  return context;
}

async function rewriteRollingSummary(params: {
  apiKey: string;
  model: string;
  previousSummaryMd: string | null;
  userMessage: string;
  assistantMessage: string;
}): Promise<string> {
  const prev = (params.previousSummaryMd ?? "").trim();

  const system = `You are maintaining a compact memory for a coding mentor chatbot.

Rules:
- Output ONLY Markdown
- Max 1000 characters
- Focus on: user's understanding, confusion points, current approach, decisions made, next steps
- Record misconceptions clearly
- Note what user claims to understand
- Use bullet points
- NO long transcripts

Return ONLY the updated summary.`;

  const user = `Previous:\n${prev || "(none)"}\n\n---\nNew exchange:\n\n[USER]\n${clampText(params.userMessage, 1000)}\n\n[ASSISTANT]\n${clampText(params.assistantMessage, 1000)}`;

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_SUMMARY_MODEL || params.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.2,
        max_tokens: 350,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Summary API error: ${response.status}`);
  }

  const data = await response.json();
  return getStringOrEmpty(data?.choices?.[0]?.message?.content);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as MentorRequest | null;
    if (!body?.problemId || !body.language || !body.userMessage) {
      return Response.json(
        { error: "Missing required fields: problemId, language, userMessage" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const problemId = body.problemId;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "GROQ_API_KEY not configured" },
        { status: 500 },
      );
    }

    const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

    // Load preferences
    const dbSettings = await prisma.userAiSettings.findUnique({
      where: { userId },
      select: { verbosity: true },
    });

    const inferred = inferVerbosityFromText(body.userMessage);
    let verbosity: Verbosity = (dbSettings?.verbosity as Verbosity) || "normal";

    if (inferred && inferred !== verbosity) {
      verbosity = inferred;
      await prisma.userAiSettings.upsert({
        where: { userId },
        create: { userId, verbosity },
        update: { verbosity },
      });
    }

    // Load stats
    const stats = await prisma.userProblemStats.findUnique({
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
    });

    // Load rolling summary
    const existingSummary = await prisma.mentorConversationSummary.findUnique({
      where: { userId_problemId: { userId, problemId } },
      select: { summaryMd: true },
    });
    const rollingSummaryMd = existingSummary?.summaryMd ?? null;

    const history = Array.isArray(body.history) ? body.history : [];
    const stage = determineConversationStage(history, stats);

    // Build context
    const mentorSystemPrompt = getMentorSystemPrompt();
    const stylePrompt = verbosityToStylePrompt(verbosity);
    const contextualGuidance = buildContextualGuidance(body, stats, history);
    const conversationHistory = buildConversationHistory(
      history,
      rollingSummaryMd,
    );
    const problemContext = buildAdaptiveProblemContext(body, stage);
    const codeContext = buildUserCodeContext(body);
    const statsContext = buildRelevantStats(stats, body.userMessage, stage);

    // Enhanced system message with stricter guidance rules
    const systemMessage = `${mentorSystemPrompt}

---

## SETTINGS
Verbosity: ${verbosity}
Style: ${stylePrompt}

---

## CRITICAL MENTORING RULES

You are a Socratic coding mentor. Your role is to GUIDE, not SOLVE.

**NEVER do these:**
❌ Write complete solutions or full implementations
❌ Give direct answers to "how do I solve this" questions
❌ Provide ready-to-copy code blocks with the full solution
❌ Fix their code directly by rewriting it
❌ Tell them exactly what algorithm to use without letting them discover it

**ALWAYS do these:**
✅ Ask probing questions that reveal the path forward
✅ Guide them to discover patterns and approaches themselves
✅ Point out what's working and what needs rethinking
✅ Use analogies and simplified examples to build intuition
✅ Encourage them to trace through their logic step-by-step
✅ Celebrate small breakthroughs and understanding
✅ If they're completely stuck, give a tiny nudge toward the next step only

**Response Guidelines:**
- Keep responses conversational and concise (2-4 sentences usually)
- Use questions more than statements
- When showing code, show only small snippets (1-3 lines) to illustrate a concept, never full solutions
- If they ask "can you write the code", redirect: "Let's work through this together - what part are you stuck on?"
- Match their energy and frustration level with empathy

**Handling Copied Solutions:**
If they admit copying or show a solution they don't understand:
- Don't judge, appreciate their honesty
- Focus on building understanding of what the code does
- Ask them to explain it back to you
- Help them discover the "why" behind each decision

---

${contextualGuidance}

---

## CONTEXT

${problemContext}

${codeContext}

${statsContext}

${conversationHistory}

---

Remember: Your goal is to make them a better problem solver, not to solve problems for them. Guide, don't give. Ask, don't tell.`;

    // Build messages array - include recent history + current message
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [{ role: "system", content: systemMessage }];

    // Add recent conversation turns (last 3 exchanges = 6 messages)
    const recentTurns = history.slice(-6);
    for (const msg of recentTurns) {
      messages.push({
        role: msg.role,
        content: clampText(msg.content, 1000),
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: body.userMessage,
    });

    const temperature = getAdaptiveTemperature(body, stats);
    const maxTokens = verbosityToModelMaxTokens(verbosity);

    // Call Groq API
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          frequency_penalty: 0.3,
          presence_penalty: 0.2,
        }),
      },
    );

    const raw = await response.text();
    if (!response.ok) {
      console.error("Groq API error:", raw);
      return Response.json(
        { error: "AI service temporarily unavailable" },
        { status: 502 },
      );
    }

    const data = raw ? (JSON.parse(raw) as unknown) : null;
    const assistantMessage = extractAssistantContent(data);

    if (!assistantMessage) {
      return Response.json(
        { error: "Received empty response from AI service" },
        { status: 502 },
      );
    }

    // Update rolling summary (non-blocking)
    rewriteRollingSummary({
      apiKey,
      model,
      previousSummaryMd: rollingSummaryMd,
      userMessage: body.userMessage,
      assistantMessage,
    })
      .then((nextSummary) =>
        prisma.mentorConversationSummary.upsert({
          where: { userId_problemId: { userId, problemId } },
          create: {
            userId,
            problemId,
            status: "ONGOING",
            summaryMd: nextSummary,
          },
          update: { status: "ONGOING", summaryMd: nextSummary },
        }),
      )
      .catch((e) => console.warn("Failed to update summary:", e));

    return Response.json({
      ok: true,
      message: assistantMessage,
      metadata: { verbosity, temperature, model },
    });
  } catch (error) {
    console.error("Mentor API Error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
