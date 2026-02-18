/**
 * Mentor Question Arsenal - Contextually-Aware Question Bank
 * 
 * Provides targeted questions based on student's learning rung and problem context.
 * Each question has {placeholder} slots for dynamic substitution.
 */

import { LearningRung, TeachingStage } from "./mentorContext";

export type QuestionCategory =
  | "UNDERSTANDING"
  | "PATTERN_DISCOVERY"
  | "IMPLEMENTATION"
  | "OPTIMIZATION"
  | "REFLECTION";

type QuestionBank = Record<QuestionCategory, string[]>;

/**
 * Curated question bank organized by teaching purpose
 */
const QUESTIONS: QuestionBank = {
  UNDERSTANDING: [
    "Can you explain what this problem is asking in your own words?",
    "What would a valid output look like for the input {input}?",
    "What makes this problem tricky — what could go wrong?",
    "What constraints matter most here? How do they limit our options?",
    "If you had to solve this by hand with 3-4 elements, what would you do?",
    "What edge cases do we need to handle?",
    "What's the difference between this test case and that one?",
    "What patterns do you see in the examples?",
    "What stays the same across all test cases? What changes?",
    "How would you describe this to someone who's never coded before?",
  ],

  PATTERN_DISCOVERY: [
    "What if the array were sorted — would that change anything?",
    "Have you seen a problem with a similar structure before?",
    "Where are we doing redundant work in the brute force approach?",
    "What property of the data can we exploit here?",
    "If we needed O(1) lookup, what data structure comes to mind?",
    "What happens if we process elements left-to-right? Right-to-left?",
    "Can we break this into smaller subproblems?",
    "What would change if duplicates weren't allowed?",
    "Is there a relationship between adjacent elements we can use?",
    "What invariant needs to hold throughout our solution?",
  ],

  IMPLEMENTATION: [
    "What should happen to your {variable} at each iteration?",
    "What's your loop invariant — what's always true before each iteration?",
    "How do you know when to stop the loop?",
    "What does this variable represent in your solution?",
    "What gets updated when you find a match?",
    "How are you handling the case where {edge_case}?",
    "Walk me through what your code does with input {input}.",
    "What should your function return when the input is empty?",
    "Which part of your code handles the main logic vs edge cases?",
    "What's the base case for your recursion?",
  ],

  OPTIMIZATION: [
    "Where's the bottleneck in your current solution?",
    "With n up to {constraint}, is O(n²) fast enough?",
    "What work are we repeating that we could cache?",
    "Can we solve this in a single pass instead of multiple?",
    "What if we preprocessed the data first?",
    "Is there a way to avoid checking every pair?",
    "What would happen if we sorted first?",
    "Can we track less information and still be correct?",
    "What's the theoretical best we could do for this problem?",
    "Could a different data structure make this faster?",
  ],

  REFLECTION: [
    "What was the key insight that unlocked this problem?",
    "What's the time complexity? How do you know?",
    "What's the space complexity? Could we reduce it?",
    "Why does this solution work? What property guarantees correctness?",
    "Where would this approach fail if the constraints were different?",
    "What pattern would you call this? (Two pointer? Sliding window? DP?)",
    "How is this similar to other problems you've solved?",
    "What would you do differently if you saw this problem again?",
    "What's an alternative approach? Would it be better or worse?",
    "What edge case almost tripped you up?",
  ],
};

/**
 * Problem context clues extracted from code and problem statement
 */
export type ProblemContext = {
  hasArray: boolean;
  hasTwoVars: boolean;
  isSorted: boolean;
  hasNestedLoop: boolean;
  isTreeProblem: boolean;
  isGraphProblem: boolean;
  isDPHint: boolean;
};

/**
 * Selects the most contextually relevant guide question based on:
 * - Student's learning rung (1-6)
 * - Teaching stage (EXPLORE, STRATEGIZE, etc.)
 * - Problem characteristics (arrays, trees, graphs, etc.)
 * 
 * Returns a concrete question the mentor can ask if the AI doesn't generate a better one.
 */
export function selectGuideQuestion(
  rung: LearningRung,
  stage: TeachingStage,
  context: ProblemContext,
): string {
  // Map rung to question category
  let category: QuestionCategory;

  if (rung === 1) {
    category = "UNDERSTANDING";
  } else if (rung === 2 || rung === 3) {
    category = stage === "STRATEGIZE" ? "PATTERN_DISCOVERY" : "UNDERSTANDING";
  } else if (rung === 4) {
    category = "IMPLEMENTATION";
  } else if (rung === 5) {
    category = "OPTIMIZATION";
  } else {
    category = "REFLECTION";
  }

  const questions = QUESTIONS[category];

  // Context-aware filtering
  let filtered = questions;

  if (category === "PATTERN_DISCOVERY") {
    if (context.hasArray && context.hasTwoVars) {
      filtered = questions.filter((q) =>
        q.includes("sorted") || q.includes("pointer") || q.includes("invariant")
      );
    }
    if (context.isTreeProblem || context.isGraphProblem) {
      filtered = questions.filter((q) =>
        q.includes("subproblem") || q.includes("relationship")
      );
    }
    if (context.isDPHint) {
      filtered = questions.filter((q) =>
        q.includes("subproblem") || q.includes("repeating") || q.includes("cache")
      );
    }
  }

  if (category === "OPTIMIZATION") {
    if (context.hasNestedLoop) {
      filtered = questions.filter((q) =>
        q.includes("bottleneck") || q.includes("single pass") || q.includes("repeating")
      );
    }
  }

  // Fallback to full list if filtering removed everything
  if (filtered.length === 0) filtered = questions;

  // Return a random question from filtered set
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index];
}

/**
 * Extracts problem context clues from user code and problem data
 */
export function extractProblemContext(
  userCode?: string,
  problemStatement?: string,
): ProblemContext {
  const code = (userCode || "").toLowerCase();
  const statement = (problemStatement || "").toLowerCase();

  return {
    hasArray: /\[\]|array|list/.test(code) || /array|list/.test(statement),
    hasTwoVars: /\b(i|j|left|right|start|end)\b.*\b(i|j|left|right|start|end)\b/.test(code),
    isSorted: /sorted/.test(statement),
    hasNestedLoop: /for.*for|while.*while/.test(code.replace(/\n/g, " ")),
    isTreeProblem: /tree|node|root|binary/.test(statement),
    isGraphProblem: /graph|edge|vertex|node|connected/.test(statement),
    isDPHint: /subproblem|overlap|optimal|maximum|minimum|count.*ways/.test(statement),
  };
}
