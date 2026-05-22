/**
 * Guardrails - Fallback Responses
 */

import { TeachingStage } from "@/lib/mentorContext";

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
