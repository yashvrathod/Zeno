type UserStats = {
  runCount: number;
  submitCount: number;
  acceptedCount: number;
  wrongAnswerCount: number;
  runtimeErrorCount: number;
  lastStatus: string | null;
  lastError: string | null;
} | null;

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

export function buildContextualGuidance(
  body: MentorRequest,
  stats: UserStats,
  history: HistoryMsg[],
): string {
  const cues: string[] = [];

  // Syntax/compilation error - highest priority
  if (body.syntaxError && body.syntaxError.trim()) {
    cues.push(
      "🔧 SYNTAX ERROR PRESENT: User has a compilation/syntax error. Address this FIRST in simple, friendly terms. Show the minimal fix, then move on. Don't dwell on it.",
    );
  }

  // Multiple failed submissions - likely logic bug
  if (stats && stats.submitCount > 3 && stats.acceptedCount === 0) {
    cues.push(
      "🔍 MULTIPLE FAILURES: User has submitted multiple times without success. They likely have a logic bug, not a conceptual misunderstanding. Focus on test-driven debugging: ask them to trace through their code with a failing test case.",
    );
  }

  // Runtime errors
  if (stats && stats.runtimeErrorCount > 2) {
    cues.push(
      "⚠️ RUNTIME ERRORS: User is hitting runtime errors (likely index out of bounds, null pointer, etc.). Focus on edge cases and boundary conditions.",
    );
  }

  // Wrong answer pattern
  if (stats && stats.wrongAnswerCount > 2 && stats.runtimeErrorCount === 0) {
    cues.push(
      "❌ LOGIC BUG: Code runs but produces wrong answers. The algorithm or implementation has a logical flaw. Help them debug by testing small inputs.",
    );
  }

  // Already solved
  if (stats && stats.acceptedCount > 0) {
    cues.push(
      "✅ ALREADY SOLVED: User has already solved this problem. They may be refining their solution, exploring alternatives, or reviewing. Adapt accordingly.",
    );
  }

  // User explicitly states confusion/frustration
  const msg = body.userMessage.toLowerCase();
  if (
    msg.includes("stuck") ||
    msg.includes("confused") ||
    msg.includes("don't understand") ||
    msg.includes("help") ||
    msg.includes("lost")
  ) {
    cues.push(
      "😓 EXPLICIT FRUSTRATION: User has stated they're stuck or confused. Be more supportive and give stronger, more direct hints. Consider escalating to pseudocode or partial code if they've been stuck a while.",
    );
  }

  // User asks for solution directly
  if (
    msg.includes("give me the solution") ||
    msg.includes("show me the answer") ||
    msg.includes("just tell me") ||
    msg.includes("what's the solution")
  ) {
    cues.push(
      "🎯 SOLUTION REQUESTED: User is explicitly asking for the complete solution. You may provide it with detailed explanation.",
    );
  }

  // User doesn't know a concept
  if (
    msg.includes("don't know") ||
    msg.includes("never learned") ||
    msg.includes("what is") ||
    msg.includes("what's")
  ) {
    const concepts = [
      "recursion",
      "dp",
      "dynamic programming",
      "two pointer",
      "sliding window",
      "binary search",
      "greedy",
      "backtrack",
      "graph",
      "tree",
      "dfs",
      "bfs",
    ];
    const mentionsConcept = concepts.some((c) => msg.includes(c));
    if (mentionsConcept) {
      cues.push(
        "📚 CONCEPT UNKNOWN: User explicitly doesn't know a concept. DO NOT explain it abstractly or theoretically. Drop down to concrete examples. Build understanding from observation: solve small cases manually, identify patterns together.",
      );
    }
  }

  // Code has TODOs or placeholders
  if (body.userCode && /TODO|FIXME|\/\/\s*\?|#\s*\?/.test(body.userCode)) {
    cues.push(
      "📝 CODE HAS TODOs: User has marked sections they're unsure about. Target those specific areas. They know what they don't know.",
    );
  }

  // Repeat question detection
  const recentUserMessages = history.filter((h) => h.role === "user").slice(-3);
  if (recentUserMessages.length >= 2) {
    const lastTwo = recentUserMessages.slice(-2);
    const similarity =
      lastTwo[0].content.slice(0, 100).toLowerCase() ===
      lastTwo[1].content.slice(0, 100).toLowerCase();
    if (similarity) {
      cues.push(
        "🔁 REPEATED QUESTION: User is asking something very similar to before. They didn't understand your previous response. Escalate: be more direct, give stronger hints, or show partial code.",
      );
    }
  }

  // Very short message from user
  if (body.userMessage.trim().length < 50 && !body.userCode) {
    cues.push(
      "💬 BRIEF MESSAGE: User sent a short message. Match their brevity—be concise and direct. Don't over-explain.",
    );
  }

  // User shared detailed code
  if (body.userCode && body.userCode.length > 500) {
    cues.push(
      "📄 DETAILED CODE SHARED: User shared substantial code. Give a thorough review. Point to specific lines. Be detailed in your response.",
    );
  }

  if (cues.length === 0) {
    return "";
  }

  return `
<contextual_guidance>
Based on the current situation, here's what you should prioritize:

${cues.join("\n\n")}

Adapt your response style accordingly. Be natural and conversational while addressing these specific needs.
</contextual_guidance>
`;
}

export function buildConversationContext(history: HistoryMsg[]): string {
  if (history.length === 0) return "";

  const lastAssistant = history
    .filter((h) => h.role === "assistant")
    .slice(-1)[0];
  const lastUser = history.filter((h) => h.role === "user").slice(-1)[0];

  let context = "<conversation_memory>\n";

  if (lastAssistant) {
    const snippet = lastAssistant.content.slice(0, 300);
    context += `You previously said: "${snippet}${snippet.length === 300 ? "..." : ""}"\n\n`;
  }

  if (lastUser) {
    context += `User's last message was: "${lastUser.content.slice(0, 200)}"\n\n`;
  }

  context +=
    "Build on this conversation naturally. Don't repeat yourself. Reference previous discussion when relevant.\n";
  context += "</conversation_memory>\n";

  return context;
}

export function getAdaptiveTemperature(
  body: MentorRequest,
  stats: UserStats,
): number {
  // Lower temperature for precision tasks (debugging, syntax errors)
  if (body.syntaxError) return 0.35;
  if (stats && stats.runtimeErrorCount > 0) return 0.4;

  // Higher temperature for creative problem-solving discussions
  if (!body.userCode) return 0.7;
  if (
    body.userMessage.toLowerCase().includes("approach") ||
    body.userMessage.toLowerCase().includes("how to solve") ||
    body.userMessage.toLowerCase().includes("strategy")
  ) {
    return 0.75;
  }

  // Default balanced temperature
  return 0.6;
}
