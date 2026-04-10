/**
 * Response Guardrails — Output Sanitization and Pattern Detection
 *
 * Handles:
 *  1. Detecting explicit solution requests
 *  2. Detecting animation triggers
 *  3. Checking if AI response looks like a full solution
 *  4. Sanitizing code blocks from AI responses when solution isn't allowed
 *  5. Parsing special markers ({{ANIMATION}}, ---MENTOR_MEM---)
 *
 * Pure functions only — no side effects, no DB calls.
 */

import type { TeachingStage } from "@/lib/mentorContext";

// ────────────────────────────────────────────────────────
// SOLUTION REQUEST DETECTION
// ───────────────────────────────────────────────────────────

const SOLUTION_REQUEST_PATTERNS = [
  "give me the solution",
  "give me solution",
  "what is the answer",
  "what's the answer",
  "just tell me the code",
  "show me the full solution",
  "write the code for me",
  "code this for me",
  "show me how to solve",
  "show me the answer",
  "tell me the answer",
  "what should i write",
  "what code should i write",
  "how do i solve this",
  "solve this for me",
  "do this for me",
  "complete the code",
  "finish the code",
  "fill in the blanks",
  "write the full code",
  "give me the full code",
  "paste the solution",
  "drop the solution",
  "show the complete",
  "show me complete",
  "show me the code",
  "show me how to code",
  "show me the full",
  "show me a working",
  "show full code",
  "just write it",
  "just code it",
  "write a solution",
  "give me code",
  "can you code this",
  "code the solution",
  "write me the code",
  "full solution",
  "complete solution",
  "provide the solution",
  "whats the solution",
  "complete code",
  "final code",
  "implement this for me",
  "implement it for me",
  "do it for me",
  "solve it for me",
];

export function isSolutionRequest(userMessage: string): boolean {
  const msg = userMessage.toLowerCase().trim();
  return SOLUTION_REQUEST_PATTERNS.some((pattern) => msg.includes(pattern));
}

// ──────────────────────────────────────────────────────
// SOLUTION VIOLATION DETECTION (AI response analysis)
// ───────────────────────────────────────────────────────────────

export function looksLikeFullSolution(text: string): boolean {
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
  return solutionSignals.some((signal) => lower.includes(signal));
}

function countCodeLines(text: string): number {
  const blocks = text.match(/```[\s\S]*?```/g) ?? [];
  return blocks
    .join("\n")
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
}

export function sanitizeResponse(
  text: string,
  allowFullSolution: boolean,
): { text: string; wasViolation: boolean } {
  if (allowFullSolution) return { text, wasViolation: false };

  // Allow tiny illustrative snippets (≤3 non-empty lines, ≤180 chars inner)
  const sanitized = text.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.replace(/^```[^\n]*\n/, "").replace(/```\s*$/, "");
    const lines = inner.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length <= 3 && inner.length <= 180) return block;
    return "```\n[snippet hidden — let's reason through this together first]\n```";
  });

  const codeLineCount = countCodeLines(sanitized);
  const stillLooksLikeSolution = looksLikeFullSolution(sanitized);

  if (codeLineCount > 5 || stillLooksLikeSolution) {
    // Replace oversized blocks with a placeholder
    const heavilySanitized = sanitized.replace(
      /```[\s\S]*?```/g,
      "[full solution hidden — let me guide you instead]",
    );
    return { text: heavilySanitized, wasViolation: true };
  }

  return { text: sanitized, wasViolation: false };
}

// ────────────────────────────────────────────────────────────────
// FALLBACK RESPONSES (stage-aware, for when AI is unavailable)
// ───────────────────────────────────────────────────────────────

const FALLBACK_RESPONSES: Record<TeachingStage, string> = {
  EXPLORE: `I love that you want to get to the answer — but let's make sure you actually *own* the solution when you get there.\n\nFirst question: **What does this problem actually ask you to do?** Try explaining it to me like I've never seen it before. That step alone will unlock a lot.`,
  STRATEGIZE: `I can see the temptation! But here's the thing — if I give you the code now, you'll solve *this* problem but not the next 10 like it.\n\nYou're actually close. Tell me: **what approach or data structure are you leaning toward, even if you're not sure?** Let's pressure-test your instinct together.`,
  IMPLEMENT: `You've already done the hard thinking — the code is just translating that thinking.\n\nWhich specific part is blocking you right now? The loop logic? The data structure update? Handling edge cases? Point me to the exact line or idea and we'll crack it.`,
  DEBUG: `I won't rewrite it for you — but I *will* help you find the bug yourself, which is 10× more valuable.\n\n**Walk me through what your code does on this test case, step by step:** What's the input? What does each line do? Where does the output diverge from expected? The bug will reveal itself.`,
  STUCK: `I hear you — this one is tough and frustrating. Let's reset.\n\nForget the code completely for a moment. Imagine you had to solve this problem by hand with a pen and paper. What would your process be for a tiny example, say 3-4 elements? Describe the steps out loud. That physical intuition is your algorithm.`,
  REFLECT: `You solved it — now let's make this knowledge permanent.\n\nInstead of just moving on: **can you explain *why* this solution works?** What property of the data does it exploit? What would break if the input were different? Understanding the *why* means you'll recognize this pattern instantly next time.`,
};

export function buildSolutionResponse(stage: TeachingStage): string {
  return FALLBACK_RESPONSES[stage];
}

const AI_UNAVAILABLE_FALLBACKS: Record<TeachingStage, string> = {
  EXPLORE: `Mentors are busy right now! While you wait, try this: explain the problem to yourself in plain English. Pretend you're a rubber duck — read through the problem statement out loud and trace each example. This alone often unlocks the first insight.`,
  STRATEGIZE: `Mentors are busy — take a step back. Look at the test cases. What pattern do you see in the examples? Try solving them by hand. What steps did you follow? That's your algorithm.`,
  IMPLEMENT: `Mentors are a bit backed up right now — great time to keep coding! Which specific part is blocking you? Try tracing your code with a failing test case input step by step. Often the bug reveals itself that way.`,
  DEBUG: `Mentors are busy — keep debugging! Try running your code with the smallest possible input (1-2 elements). What happens? What did you expect? Compare those two — the difference is your bug.`,
  STUCK: `Mentors are busy so I can't chat right now, but I can give you a hint: forget the code completely. How would you solve this with a pen and paper using 3-4 elements? Write those steps down — that physical procedure is exactly what your algorithm needs to implement.`,
  REFLECT: `Great job solving! While mentors are busy right now, here's something to think about: why does your approach work? What property of the data are you exploiting? Can you explain it in one sentence? That sentence is the pattern name.`,
};

export function buildAiUnavailableFallback(stage: TeachingStage): string {
  return AI_UNAVAILABLE_FALLBACKS[stage] ?? "Mentors are busy right now — please try again in a moment.";
}

// ─────────────────────────────────────────────────────────────────
// ANIMATION TRIGGER DETECTION
// ─────────────────────────────────────────────────────────────────

const ANIMATION_TRIGGER_PHRASES = [
  "how does this work",
  "how does it work",
  "how it works",
  "visualize",
  "show me how",
  "show me visual",
  "brute force",
  "bruteforce",
  "time complexity",
  "space complexity",
  "why is this slow",
  "why is this o(",
  "tc is high",
  "step by step",
  "step-by-step",
  "explain it",
  "explain this",
  "how it internally",
  "how internally",
  "how things work",
  "i can't write code",
  "i cant write",
  "help me write",
  "explain time complexity",
  "explain space complexity",
  "explain the algorithm",
  "walk me through",
];

export function shouldTriggerAnimation(userMessage: string): boolean {
  const msg = userMessage.toLowerCase().trim();
  return ANIMATION_TRIGGER_PHRASES.some((phrase) => msg.includes(phrase));
}

// ─────────────────────────────────────────────────────────────
// MARKER PARSING (animation, mentor memory)
// ─────────────────────────────────────────────────────────────

const ANIM_MARKER = "{{ANIMATION}}";

export function parseAnimationMarker(text: string): { text: string; wantsAnimation: boolean } {
  const idx = text.indexOf(ANIM_MARKER);
  if (idx === -1) return { text, wantsAnimation: false };
  return { text: text.replace(ANIM_MARKER, "").trim(), wantsAnimation: true };
}

const MEM_MARKER = "\n---MENTOR_MEM---\n";

export function parseMentorMemory(text: string): { text: string; memoryJson: string | null } {
  let idx = text.lastIndexOf(MEM_MARKER);

  // Fallback 1: LLM sometimes wraps JSON in ```json blocks
  if (idx === -1) {
    const jsonCodeBlock = text.match(/```\s*json\s*\n([\s\S]*?)```/);
    if (jsonCodeBlock) {
      const jsonContent = jsonCodeBlock[1].trim();
      try { JSON.parse(jsonContent); } catch { return { text, memoryJson: null }; }
      return { text: text.replace(jsonCodeBlock[0], "").trim(), memoryJson: jsonContent };
    }
  }

  // Fallback 2: try to find JSON object near the end
  if (idx === -1) {
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace !== -1) {
      const openBrace = text.lastIndexOf("{", lastBrace);
      if (openBrace !== -1 && lastBrace - openBrace > 10) {
        const jsonCandidate = text.slice(openBrace, lastBrace + 1);
        try { JSON.parse(jsonCandidate); } catch { return { text, memoryJson: null }; }
        const parsed = jsonCandidate as string;
        const hasKeys = ["s", "stage", "w", "d"].some((k) => parsed.includes(k));
        if (hasKeys) {
          return { text: text.slice(0, openBrace).trim(), memoryJson: jsonCandidate };
        }
      }
    }
  }

  if (idx === -1) return { text, memoryJson: null };
  const memoryBlock = text.slice(idx + MEM_MARKER.length).trim();
  return { text: text.slice(0, idx), memoryJson: memoryBlock };
}
