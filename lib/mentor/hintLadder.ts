/**
 * Hint Ladder System for AlgoMentor
 *
 * Provides 4 levels of progressively specific hints for each problem.
 * Each hint level is stored in MentorSession.currentRung (1-4).
 * Max 4 hints per problem per user to prevent over-dependency.
 *
 * HINT PHILOSOPHY:
 * - Level 0: Vague directional — no DS/algo names, just thinking framework
 * - Level 1: Category hint — hints at the type of structure without naming it
 * - Level 2: Specific DS/technique + what to store/track
 * - Level 3: Full algorithmic insight — enough to start coding
 */

import { debug } from "@/lib/debug";

// ─────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────

export const HINT_LEVELS = 4;

export const HINT_METADATA_MAP: Record<
  number,
  {
    label: string;
    description: string;
    warningText: string;
    rungValue: number;
  }
> = {
  0: {
    label: "Subtle hint",
    description: "A gentle nudge in the right direction",
    warningText: "This will log a hint usage",
    rungValue: 1,
  },
  1: {
    label: "Category hint",
    description: "Hints at the type of approach without naming it",
    warningText: "This will log a hint usage",
    rungValue: 2,
  },
  2: {
    label: "Specific hint",
    description: "Names the data structure or technique to use",
    warningText: "This is a strong hint — try to implement it yourself",
    rungValue: 3,
  },
  3: {
    label: "Strong hint",
    description: "Almost the full approach with key insight",
    warningText: "This is your last hint. Try harder first!",
    rungValue: 4,
  },
};

// ─────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────

export type HintLevel = 0 | 1 | 2 | 3;

export type HintMetadata = {
  label: string;
  description: string;
  warningText: string;
};

// ─────────────────────────────────────────────────────────────────────────
// CORE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Check if user has hints remaining.
 *
 * @param currentLevel - Current hint level (0-3, where 3 is max hints given)
 * @returns true if user can request more hints
 *
 * A user has hints remaining if:
 * - They haven't received all 4 hints yet (currentLevel < 3)
 * - Note: currentLevel represents the LAST hint given, so:
 *   - 0 = no hints given yet (can request)
 *   - 1 = received level 0 hint (can request more)
 *   - 2 = received level 1 hint (can request more)
 *   - 3 = received level 2 hint (can request level 3)
 *   - 4 = received all hints (cannot request more)
 */
export function hasHintsRemaining(currentLevel: number): boolean {
  // currentLevel in MentorSession is 1-4 (rungValue)
  // 1 = no hints given, 4 = all hints exhausted
  const hasRemaining = currentLevel < HINT_LEVELS;
  debug.mentor("hasHintsRemaining check", { currentLevel, hasRemaining, maxLevel: HINT_LEVELS });
  return hasRemaining;
}

/**
 * Generate the prompt for a specific hint level.
 *
 * @param problemTitle - Title of the problem
 * @param problemDescription - Full problem statement
 * @param currentApproach - Last thing user said (their current thinking)
 * @param level - Hint level (0-3)
 * @returns Hint prompt string to show to user
 *
 * HINT PROGRESSION:
 * - Level 0: Directional question that reframes the problem
 * - Level 1: Hints at category (time/space tradeoff, lookup structure, etc.)
 * - Level 2: Names specific DS/technique and what to track
 * - Level 3: Walks through the algorithm step-by-step
 */
export function getHintPrompt(
  problemTitle: string,
  problemDescription: string,
  currentApproach: string,
  level: HintLevel
): string {
  const hintConfig = HINT_METADATA_MAP[level];
  debug.mentor("getHintPrompt", { level: level + 1, problemTitle });

  switch (level) {
    case 0:
      // Vague directional — reframe the problem without giving away DS/algo
      debug.stage("Generating level 0 directional hint");
      return `${hintConfig.label}: ${hintConfig.description}\n\n` +
        `Think about what the problem is really asking. When you see "${problemTitle}", ` +
        `what are the key operations you need to perform repeatedly? ` +
        `Consider: are you looking things up, transforming data, or tracking state?\n\n` +
        `Your current approach: "${currentApproach}" — does it handle the core operation efficiently?`;

    case 1:
      // Category hint — hint at the TYPE of structure without naming it
      debug.stage("Generating level 1 category hint");
      return `${hintConfig.label}: ${hintConfig.description}\n\n` +
        `For problems like "${problemTitle}", you often need a way to ` +
        `${getCategoryHint(problemTitle)}.\n\n` +
        `Think about what kind of structure gives you that capability. ` +
        `What trade-offs are you willing to make?`;

    case 2:
      // Specific DS/technique + what to store
      debug.stage("Generating level 2 specific hint");
      return `${hintConfig.label}: ${hintConfig.description}\n\n` +
        `Consider using ${getSpecificStructure(problemDescription)} for this problem.\n\n` +
        `Here's what to track: ${getWhatToStore(problemDescription)}\n\n` +
        `The key insight is how you organize this information for efficient access.`;

    case 3:
      // Full algorithmic insight — enough to start coding
      debug.stage("Generating level 3 strong hint");
      return `${hintConfig.label}: ${hintConfig.description}\n\n` +
        `${getFullAlgorithmicHint(problemTitle, problemDescription)}\n\n` +
        `With this approach, you should be able to implement a solution. ` +
        `Focus on getting it working first, then optimize.`;

    default:
      debug.mentor("Invalid hint level requested", { level });
      return `Hint level ${level} not recognized. Please try a level between 0 and 3.`;
  }
}

/**
 * Helper: Generate category-level hint based on problem title patterns.
 * Returns hints about the TYPE of operation needed.
 */
function getCategoryHint(problemTitle: string): string {
  const title = problemTitle.toLowerCase();

  if (title.includes("sum") || title.includes("subarray") || title.includes("window")) {
    return "quickly compute or update running totals as you iterate through data";
  }
  if (title.includes("two") || title.includes("pair") || title.includes("sum")) {
    return "find pairs of elements that satisfy a condition efficiently";
  }
  if (title.includes("duplicate") || title.includes("unique") || title.includes("frequency")) {
    return "track what you've seen before and check for repeats";
  }
  if (title.includes("min") || title.includes("max") || title.includes("kth")) {
    return "maintain an ordered collection and access extremes efficiently";
  }
  if (title.includes("path") || title.includes("distance") || title.includes("shortest")) {
    return "explore possibilities systematically and track the best option";
  }
  if (title.includes("valid") || title.includes("balanced") || title.includes("parenthesis")) {
    return "track nested or sequential relationships as you process elements";
  }
  if (title.includes("merge") || title.includes("interval") || title.includes("overlap")) {
    return "combine overlapping ranges and maintain sorted order";
  }
  if (title.includes("rotate") || title.includes("shift") || title.includes("reverse")) {
    return "manipulate positions using index arithmetic or in-place swaps";
  }

  // Generic fallback
  return "organize data for efficient lookup or transformation";
}

/**
 * Helper: Get specific data structure/technique suggestion.
 */
function getSpecificStructure(problemDescription: string): string {
  const desc = problemDescription.toLowerCase();

  if (desc.includes("two sum") || desc.includes("pair") || desc.includes("complement")) {
    return "a hash map (object/Map) to store values you've seen and their indices";
  }
  if (desc.includes("subarray") || desc.includes("contiguous") || desc.includes("window")) {
    return "the sliding window technique with two pointers";
  }
  if (desc.includes("duplicate") || desc.includes("frequency") || desc.includes("count")) {
    return "a hash map or frequency counter";
  }
  if (desc.includes("min") || desc.includes("max") || desc.includes("kth largest") || desc.includes("kth smallest")) {
    return "a heap (priority queue) or sorted structure";
  }
  if (desc.includes("valid parentheses") || desc.includes("balanced") || desc.includes("nested")) {
    return "a stack to track opening brackets";
  }
  if (desc.includes("merge interval") || desc.includes("overlap")) {
    return "sorting followed by a single pass to merge";
  }
  if (desc.includes("binary search") || desc.includes("sorted") || desc.includes("find target")) {
    return "binary search to halve the search space each iteration";
  }
  if (desc.includes("linked list") || desc.includes("cycle") || desc.includes("middle")) {
    return "the fast and slow pointer technique";
  }
  if (desc.includes("tree") || desc.includes("depth") || desc.includes("height")) {
    return "recursive depth-first search (DFS)";
  }
  if (desc.includes("bfs") || desc.includes("level") || desc.includes("shortest path")) {
    return "breadth-first search (BFS) with a queue";
  }
  if (desc.includes("dynamic programming") || desc.includes("optimal") || desc.includes("maximum")) {
    return "dynamic programming with memoization or a DP table";
  }

  return "an appropriate data structure based on the problem constraints";
}

/**
 * Helper: Get what specific values to store/track.
 */
function getWhatToStore(problemDescription: string): string {
  const desc = problemDescription.toLowerCase();

  if (desc.includes("two sum") || desc.includes("index")) {
    return "Store each number as key with its index as value. For each new number, check if (target - current) exists in your map.";
  }
  if (desc.includes("subarray") || desc.includes("sum")) {
    return "Track the running sum and store prefix sums in a map. If (currentSum - target) exists in the map, you found a valid subarray.";
  }
  if (desc.includes("duplicate")) {
    return "Store each element in a set as you iterate. If you encounter an element already in the set, you found a duplicate.";
  }
  if (desc.includes("frequency") || desc.includes("count")) {
    return "Use a map where keys are elements and values are their counts. Iterate once to build the map, then query as needed.";
  }
  if (desc.includes("min") || desc.includes("max")) {
    return "Maintain a running min/max variable, or use a heap if you need the kth element.";
  }
  if (desc.includes("interval") || desc.includes("merge")) {
    return "Sort intervals by start time. Track the current merged interval and extend it if the next interval overlaps.";
  }
  if (desc.includes("parenthesis") || desc.includes("bracket")) {
    return "Push opening brackets onto the stack. When you see a closing bracket, pop and verify it matches the top.";
  }

  return "Identify the key values that need to be tracked and choose a structure that supports your required operations.";
}

/**
 * Helper: Generate full algorithmic hint with step-by-step approach.
 */
function getFullAlgorithmicHint(problemTitle: string, problemDescription: string): string {
  const title = problemTitle.toLowerCase();
  const desc = problemDescription.toLowerCase();

  if (title.includes("two sum")) {
    return `**Two Sum Approach:**
1. Create an empty hash map to store {number: index}
2. Iterate through the array once
3. For each number at index i:
   - Calculate complement = target - number
   - If complement exists in map, return [map[complement], i]
   - Otherwise, store {number: i} in the map
4. Time: O(n), Space: O(n)`;
  }

  if (title.includes("valid parentheses") || title.includes("valid parenthesis")) {
    return `**Valid Parentheses Approach:**
1. Create an empty stack
2. Define a mapping: ')' → '(', '}' → '{', ']' → '['
3. Iterate through each character:
   - If it's an opening bracket, push to stack
   - If it's a closing bracket:
     - If stack is empty or top doesn't match, return false
     - Otherwise, pop from stack
4. Return true if stack is empty at the end
5. Time: O(n), Space: O(n)`;
  }

  if (title.includes("merge interval")) {
    return `**Merge Intervals Approach:**
1. Sort intervals by start time
2. Initialize result array with first interval
3. For each remaining interval:
   - If current.start <= last.end (overlaps):
     - Merge: last.end = max(last.end, current.end)
   - Else: push current interval to result
4. Return the merged array
5. Time: O(n log n) for sorting, Space: O(1) excluding output`;
  }

  if (title.includes("binary search")) {
    return `**Binary Search Approach:**
1. Initialize left = 0, right = array.length - 1
2. While left <= right:
   - mid = left + Math.floor((right - left) / 2)
   - If array[mid] === target, return mid
   - If array[mid] < target, left = mid + 1
   - If array[mid] > target, right = mid - 1
3. Return -1 if not found
4. Time: O(log n), Space: O(1)`;
  }

  if (desc.includes("subarray sum")) {
    return `**Subarray Sum Equals K Approach:**
1. Create a map with {prefixSum: count}, initialize {0: 1}
2. Initialize runningSum = 0, count = 0
3. For each number:
   - runningSum += number
   - If (runningSum - k) exists in map, add map[runningSum - k] to count
   - Increment map[runningSum] by 1
4. Return count
5. Time: O(n), Space: O(n)`;
  }

  if (desc.includes("sliding window") || desc.includes("subarray")) {
    return `**Sliding Window Approach:**
1. Initialize left = 0, right = 0
2. Expand window by moving right pointer
3. While window is invalid (doesn't meet condition):
   - Shrink from left by moving left pointer
4. Track the answer (max/min length, count, etc.) at each valid window
5. Continue until right reaches end
6. Time: O(n) - each element visited at most twice`;
  }

  // Generic fallback for unknown problem types
  return `**General Problem-Solving Approach:**
1. Understand the input/output requirements clearly
2. Identify the core operation that needs to be efficient
3. Choose a data structure that supports that operation well
4. Implement a brute-force solution first if stuck
5. Then optimize by identifying repeated work or lookups
6. Test with edge cases: empty input, single element, duplicates`;
}

/**
 * After giving a hint, check if user's next message shows they understood.
 *
 * @param hintGiven - The hint text that was provided
 * @param userResponse - User's next message after receiving the hint
 * @param level - The hint level that was given
 * @returns true if user appears to understand and is making progress
 *
 * DETECTION LOGIC:
 * - If user mentions the DS/technique from the hint → they understood
 * - If user describes a correct approach → they understood
 * - If user asks a follow-up that builds on the hint → they understood
 * - If user repeats the same wrong approach → they did NOT understand
 */
export function didUserUnderstandHint(
  hintGiven: string,
  userResponse: string,
  level: number
): boolean {
  const hint = hintGiven.toLowerCase();
  const response = userResponse.toLowerCase();

  debug.mentor("didUserUnderstandHint", { level, hintLength: hint.length, responseLength: response.length });

  // Extract key terms from the hint
  const understoodKeywords: string[] = [];

  // Level-specific understanding indicators
  if (level <= 1) {
    // For vague/category hints, look for any DS/technique mention
    const dsKeywords = [
      "map", "hash", "object", "set", "array", "list", "stack", "queue",
      "heap", "priority", "tree", "graph", "pointer", "index",
      "loop", "iterate", "recursion", "dfs", "bfs", "search",
      "sort", "swap", "merge", "split", "window", "slide",
      "dynamic", "memo", "cache", "dp",
    ];
    understoodKeywords.push(...dsKeywords);
  }

  if (level >= 2) {
    // For specific hints, look for the specific structure mentioned
    if (hint.includes("hash map") || hint.includes("hashmap") || hint.includes("object") || hint.includes("map")) {
      understoodKeywords.push("map", "hash", "object", "key", "value", "lookup");
    }
    if (hint.includes("stack")) {
      understoodKeywords.push("stack", "push", "pop", "top", "lifo");
    }
    if (hint.includes("queue")) {
      understoodKeywords.push("queue", "fifo", "enqueue", "dequeue");
    }
    if (hint.includes("heap") || hint.includes("priority")) {
      understoodKeywords.push("heap", "priority", "min-heap", "max-heap");
    }
    if (hint.includes("sliding window")) {
      understoodKeywords.push("window", "slide", "left", "right", "expand", "shrink");
    }
    if (hint.includes("two pointer")) {
      understoodKeywords.push("pointer", "left", "right", "meet", "converge");
    }
    if (hint.includes("binary search")) {
      understoodKeywords.push("binary", "mid", "half", "middle", "divide");
    }
    if (hint.includes("dynamic") || hint.includes("dp") || hint.includes("memo")) {
      understoodKeywords.push("dp", "dynamic", "memo", "cache", "table", "state", "transition");
    }
  }

  // Check if user response contains understanding indicators
  const showsUnderstanding = understoodKeywords.some((keyword) =>
    response.includes(keyword)
  );

  // Check if user is repeating the same wrong approach
  // (simplified: if response is very similar to pre-hint approach)
  const repeatedWrongApproach =
    response.includes("i still don't know") ||
    response.includes("i'm still stuck") ||
    response.includes("same problem") ||
    response.includes("doesn't work") ||
    response.includes("not sure");

  // User understands if they show understanding keywords and aren't stuck
  const understood = showsUnderstanding && !repeatedWrongApproach;
  debug.mentor("Understanding check result", { understood, showsUnderstanding, repeatedWrongApproach });
  return understood;
}

/**
 * Build hint UI metadata for a specific level.
 *
 * @param level - Hint level (0-3)
 * @returns Metadata object for rendering hint UI
 */
export function getHintMetadata(level: number): HintMetadata {
  const config = HINT_METADATA_MAP[level];
  if (!config) {
    return {
      label: "Unknown hint",
      description: "Invalid hint level",
      warningText: "This hint level does not exist",
    };
  }
  return {
    label: config.label,
    description: config.description,
    warningText: config.warningText,
  };
}

/**
 * Get the next hint level to give based on current session rung.
 *
 * @param currentRung - Current rung in MentorSession (1-4)
 * @returns Next hint level (0-3) or null if no hints remain
 */
export function getNextHintLevel(currentRung: number): HintLevel | null {
  if (!hasHintsRemaining(currentRung)) {
    return null;
  }
  // Rung 1 = level 0, Rung 2 = level 1, etc.
  return Math.min(currentRung - 1, 3) as HintLevel;
}
