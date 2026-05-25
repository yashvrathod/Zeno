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

import type { LearningRung, TeachingStage } from "@/types/mentor";

// Re-export canonical types from types/mentor.ts to avoid duplication
export type { LearningRung, TeachingStage };

export type ConversationTone =
  | "encouraging"
  | "analytical"
  | "challenging"
  | "empathetic";

/**
 * Complete mentor context including stage, rung, and behavioral flags
 */
export type MentorContext = {
  stage: TeachingStage;
  rung: LearningRung;
  tone: ConversationTone;
  shouldUpdateSummary: boolean;
  allowFullSolution: boolean;
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

/**
 * Detects the student's current Learning Ladder rung (1-6)
 * 
 * RUNG 1 — PATTERN BLINDNESS: Student blanks on problem
 * RUNG 2 — PATTERN RECOGNITION: Student guesses pattern unsurely
 * RUNG 3 — STRATEGY FORMATION: Has pattern, can't build approach
 * RUNG 4 — IMPLEMENTATION: Right idea, buggy code
 * RUNG 5 — OPTIMIZATION: Solves brute force, can't optimize
 * RUNG 6 — MASTERY: Solved it
 * 
 * Uses a multi-signal approach to avoid single-keyword over-sensitivity.
 */
export function detectLearningRung(
  history: HistoryMsg[],
  stats: UserStats,
  userMessage: string,
  userCode?: string,
  previousRung?: number,
): LearningRung {
  const msg = userMessage.toLowerCase();
  const hasCode = !!userCode && userCode.trim().length > 50;
  const hasSubstantialCode = !!userCode && userCode.trim().length > 200;
  const hasSubmitted = stats && stats.submitCount > 0;
  const isAccepted = stats && stats.acceptedCount > 0;
  const hasErrors = stats && (stats.wrongAnswerCount > 0 || stats.runtimeErrorCount > 0);
  
  const lastKnownRung = previousRung ?? 1;

  const userMessageCount = history.filter(h => h.role === "user").length;

  // ── Rung 6: MASTERY ──
  if (isAccepted) {
    const complexityDiscussed = history.some((h) =>
      /time complexity|space complexity|big o|o\(n\)|o\(log n\)|optimization/i.test(h.content)
    );
    return complexityDiscussed ? 6 : 5;
  }

  // ── Rung 5: OPTIMIZATION ──
  if (stats && stats.acceptedCount > 0) return 5;

  // ── Rung 4: IMPLEMENTATION ──
  if (hasSubstantialCode && (hasErrors || hasSubmitted)) return 4;
  if (hasCode && userMessageCount >= 2) return 4;

  // ── Pattern Analysis (used by Rungs 1-3) ──
  const patternKeywords = [
    'two pointer', 'sliding window', 'binary search', 'dynamic programming', 'dp',
    'greedy', 'backtrack', 'dfs', 'bfs', 'hash map', 'hash table', 'heap',
    'stack', 'queue', 'trie', 'union find', 'graph', 'tree',
    'divide and conquer', 'memoization', 'recursion',
  ];

  const mentionsPattern = patternKeywords.some((p) => msg.includes(p));

  const approachVerbs = ['use', 'apply', 'implement', 'iterate', 'traverse', 'compare', 'sort'];
  const mentionsApproach = approachVerbs.some(v => msg.includes(v)) && msg.length > 30;

  const uncertaintyWords = ['think', 'maybe', 'probably', 'might', 'could', 'perhaps', 'not sure', 'guess'];
  const soundsUncertain = uncertaintyWords.some((w) => msg.includes(w));

  const hasConfidence = !soundsUncertain && msg.length > 20;

  // ── Rung 3: STRATEGY FORMATION ──
  const hasStrategySignal = mentionsPattern && mentionsApproach && hasConfidence;
  if (hasStrategySignal && !hasCode) return 3;

  // ── Rung 2: PATTERN RECOGNITION ──
  if (mentionsPattern && hasConfidence) return 2;
  if (mentionsApproach && !mentionsPattern) return 2;
  if (hasCode && !hasSubmitted) return 2;

  // ── Rung 1: PATTERN BLINDNESS ──
  if (userMessageCount < 2 && !hasCode && !mentionsPattern) return 1;

  // ── Default: gradual progression from previous rung ──
  if (hasErrors && lastKnownRung > 2) return Math.max(2, lastKnownRung - 1) as LearningRung;

  return Math.min(lastKnownRung, 3) as LearningRung;
}
