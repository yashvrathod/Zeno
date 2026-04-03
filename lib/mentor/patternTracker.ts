/**
 * Weak Pattern Tracker for AlgoMentor
 *
 * Tracks recurring mistakes and weak areas across user sessions.
 * Detects patterns statically from code (no AI needed) and persists
 * them for personalized feedback and targeted practice recommendations.
 */

import prisma from "../prisma";

// ─────────────────────────────────────────────────────────────────────────
// TYPES AND CONSTANTS
// ─────────────────────────────────────────────────────────────────────────

export const WEAK_PATTERN_TAGS = [
  "missed-edge-case",
  "null-check-missing",
  "off-by-one",
  "wrong-complexity",
  "suboptimal-approach",
  "infinite-loop-risk",
  "wrong-base-case",
  "index-out-of-bounds",
] as const;

export type WeakPatternTag = typeof WEAK_PATTERN_TAGS[number];

export interface PatternMetadata {
  friendlyName: string;
  description: string;
  howToFix: string;
  relatedTags: string[];
}

/**
 * Complete metadata for each weak pattern tag.
 * Used to generate helpful feedback when a pattern is detected.
 */
export const PATTERN_METADATA: Record<WeakPatternTag, PatternMetadata> = {
  "missed-edge-case": {
    friendlyName: "Missed Edge Case",
    description:
      "Your solution doesn't handle boundary conditions like empty input, single elements, or extreme values.",
    howToFix:
      "Before coding, list edge cases: empty array, single element, all same values, min/max values. Add explicit checks or ensure your algorithm handles them naturally.",
    relatedTags: ["array", "string", "recursion", "dynamic-programming"],
  },
  "null-check-missing": {
    friendlyName: "Missing Null Check",
    description:
      "You're accessing properties or calling methods on potentially null/undefined values without checking first.",
    howToFix:
      "Add null/undefined checks at the start of functions that accept nullable parameters. Use optional chaining (?.) and nullish coalescing (??) where appropriate.",
    relatedTags: ["linked-list", "tree", "graph", "pointer"],
  },
  "off-by-one": {
    friendlyName: "Off-by-One Error",
    description:
      "Your loop bounds or index calculations are off by one, causing incorrect results or out-of-bounds access.",
    howToFix:
      "Use consistent conventions: for loops typically use i < length (not <=). When in doubt, trace through with a small example step-by-step.",
    relatedTags: ["array", "string", "sliding-window", "two-pointers"],
  },
  "wrong-complexity": {
    friendlyName: "Wrong Time Complexity",
    description:
      "Your solution has worse time complexity than optimal (e.g., O(n²) when O(n) is possible).",
    howToFix:
      "Identify repeated work or nested loops. Consider: can you use a hash map for O(1) lookup? Can you sort first? Can you use two pointers instead of nested iteration?",
    relatedTags: ["array", "hash-map", "optimization"],
  },
  "suboptimal-approach": {
    friendlyName: "Suboptimal Approach",
    description:
      "Your solution works but uses a more complex or less efficient approach than necessary.",
    howToFix:
      "After getting a working solution, ask: Can I eliminate nested loops? Can I avoid sorting? Is there a simpler data structure that works?",
    relatedTags: ["array", "string", "greedy", "dynamic-programming"],
  },
  "infinite-loop-risk": {
    friendlyName: "Infinite Loop Risk",
    description:
      "Your loop doesn't have a clear termination condition or the condition may never be met.",
    howToFix:
      "Ensure every loop has: (1) a clear exit condition, (2) progress toward that condition each iteration. For while loops, explicitly track what changes.",
    relatedTags: ["linked-list", "cycle-detection", "two-pointers"],
  },
  "wrong-base-case": {
    friendlyName: "Wrong Base Case",
    description:
      "Your recursive function has an incorrect or missing base case, causing stack overflow or wrong results.",
    howToFix:
      "Identify the simplest possible input (empty, single element, null). Write the base case FIRST before the recursive logic. Test base cases independently.",
    relatedTags: ["recursion", "dynamic-programming", "tree", "divide-and-conquer"],
  },
  "index-out-of-bounds": {
    friendlyName: "Index Out of Bounds",
    description:
      "You're accessing array indices without verifying they're within valid range [0, length-1].",
    howToFix:
      "Before accessing array[i], check: 0 <= i < array.length. Be especially careful with i-1, i+1, and loop termination conditions.",
    relatedTags: ["array", "string", "sliding-window", "two-pointers"],
  },
};

// ─────────────────────────────────────────────────────────────────────────
// DATABASE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Upsert weak patterns for a user — increment count if pattern exists, create if new.
 *
 * @param userId - User ID to track patterns for
 * @param tags - Array of weak pattern tags detected
 *
 * This function is idempotent — calling it multiple times with the same tags
 * will increment the count each time, allowing tracking of recurring issues.
 */
export async function trackWeakPatterns(
  userId: string,
  tags: WeakPatternTag[]
): Promise<void> {
  if (tags.length === 0) return;

  // Get or create user's StudentProfile
  let profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    await prisma.$executeRaw`
      INSERT INTO "StudentProfile" ("userId", "weakPatterns", "strongPatterns", "createdAt", "updatedAt")
      VALUES (${userId}, '[]'::jsonb, '[]'::jsonb, NOW(), NOW())
      ON CONFLICT ("userId") DO NOTHING
    `;
    profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!profile) return;
  }

  // Get current weak patterns (stored as JSON)
  const currentPatterns = (profile.weakPatterns as Record<string, number>) || {};

  // Increment counts for each detected tag
  for (const tag of tags) {
    currentPatterns[tag] = (currentPatterns[tag] || 0) + 1;
  }

  // Update the profile with new counts
  await prisma.studentProfile.update({
    where: { userId },
    data: {
      weakPatterns: currentPatterns as unknown as object,
    },
  });
}

/**
 * Get user's top weak patterns with full metadata and statistics.
 *
 * @param userId - User ID to get report for
 * @returns Array of patterns sorted by frequency, with metadata and percentages
 *
 * The percentOfSessions field shows what percentage of solved sessions
 * this pattern appeared in, giving context to the raw count.
 */
export async function getWeakPatternReport(
  userId: string
): Promise<
  Array<{
    tag: WeakPatternTag;
    count: number;
    friendlyName: string;
    description: string;
    howToFix: string;
    percentOfSessions: number;
  }>
> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!profile || !profile.weakPatterns) {
    return [];
  }

  const patterns = profile.weakPatterns as Record<string, number>;
  const totalSolvedSessions = await getTotalSolvedSessions(userId);

  // Build report with metadata
  const report = Object.entries(patterns)
    .filter(([tag]) => WEAK_PATTERN_TAGS.includes(tag as WeakPatternTag))
    .map(([tag, count]) => ({
      tag: tag as WeakPatternTag,
      count,
      friendlyName: PATTERN_METADATA[tag as WeakPatternTag].friendlyName,
      description: PATTERN_METADATA[tag as WeakPatternTag].description,
      howToFix: PATTERN_METADATA[tag as WeakPatternTag].howToFix,
      percentOfSessions:
        totalSolvedSessions > 0
          ? Math.round((count / totalSolvedSessions) * 10000) / 100 // 2 decimal places
          : 0,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return report;
}

/**
 * Get total number of solved sessions for a user.
 * Used to calculate pattern percentages.
 */
async function getTotalSolvedSessions(userId: string): Promise<number> {
  const count = await prisma.mentorSession.count({
    where: {
      userId,
      stage: "REFLECT",
    },
  });
  return count;
}

// ─────────────────────────────────────────────────────────────────────────
// STATIC CODE ANALYSIS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Detect weak patterns from code BEFORE calling AI.
 * Uses simple regex/AST-free checks that catch common mistakes.
 *
 * @param code - The user's submitted code
 * @param language - Programming language ("python" | "javascript" | "java" | "cpp")
 * @returns Array of detected weak pattern tags
 *
 * This function performs lightweight static analysis without requiring
 * a full parser. It's designed to catch obvious issues quickly.
 */
export function detectPatternsStatically(
  code: string,
  language: "python" | "javascript" | "java" | "cpp"
): WeakPatternTag[] {
  const detectedPatterns = new Set<WeakPatternTag>();

  // Normalize code for analysis
  const lines = code.split("\n");

  // Run all pattern detectors
  if (detectNullCheckMissing(code, language, lines)) {
    detectedPatterns.add("null-check-missing");
  }

  if (detectIndexOutOfBounds(code, language, lines)) {
    detectedPatterns.add("index-out-of-bounds");
  }

  if (detectWrongBaseCase(code, language, lines)) {
    detectedPatterns.add("wrong-base-case");
  }

  if (detectInfiniteLoopRisk(code, language, lines)) {
    detectedPatterns.add("infinite-loop-risk");
  }

  if (detectOffByOne(code, language, lines)) {
    detectedPatterns.add("off-by-one");
  }

  if (detectMissedEdgeCase(code, language, lines)) {
    detectedPatterns.add("missed-edge-case");
  }

  if (detectWrongComplexity(code, language, lines)) {
    detectedPatterns.add("wrong-complexity");
  }

  if (detectSuboptimalApproach(code, language, lines)) {
    detectedPatterns.add("suboptimal-approach");
  }

  return Array.from(detectedPatterns);
}

/**
 * Detect missing null checks for functions that take nullable parameters.
 */
function detectNullCheckMissing(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Check if function takes a node/pointer/list parameter
  const nullableParamPatterns: Record<string, RegExp> = {
    python: /def\s+\w+\s*\([^)]*(node|head|tail|root|ptr|pointer|list|ListNode|TreeNode)/i,
    javascript: /function\s+\w+\s*\([^)]*(node|head|tail|root|ptr|pointer|list)/i,
    java: /\(.*?(Node|ListNode|TreeNode|List|head|tail|root)/i,
    cpp: /\(.*?(Node|ListNode|TreeNode|node|head|tail|root|ptr|pointer)/i,
  };

  const pattern = nullableParamPatterns[language];
  if (!pattern || !pattern.test(code)) {
    return false; // Function doesn't take nullable params
  }

  // Check for null/None/nullptr checks at the start
  const nullCheckPatterns: Record<string, RegExp> = {
    python: /if\s+(node|head|tail|root|ptr)\s+is\s+None/i,
    javascript: /if\s*\(\s*(node|head|tail|root|ptr)\s*===?\s*null/i,
    java: /if\s*\(\s*(node|head|tail|root|ptr)\s*==\s*null\s*\)/i,
    cpp: /if\s*\(\s*(node|head|tail|root|ptr|ptr)\s*==\s*nullptr\s*\)/i,
  };

  const nullCheck = nullCheckPatterns[language];
  if (nullCheck && nullCheck.test(code)) {
    return false; // Has null check
  }

  // Also check for early return pattern
  const earlyReturnPatterns: Record<string, RegExp> = {
    python: /if\s+not\s+(node|head|tail|root|ptr)\s*:/i,
    javascript: /if\s*\(\s*!\s*(node|head|tail|root|ptr)\s*\)/i,
    java: /if\s*\(\s*(node|head|tail|root|ptr)\s*==\s*null\s*\)\s*\{\s*return/i,
    cpp: /if\s*\(\s*!\s*(node|head|tail|root|ptr)\s*\)/i,
  };

  const earlyReturn = earlyReturnPatterns[language];
  if (earlyReturn && earlyReturn.test(code)) {
    return false; // Has early return null check
  }

  // No null check found — likely a problem
  return true;
}

/**
 * Detect array access without bounds checking.
 */
function detectIndexOutOfBounds(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Look for array access patterns
  const arrayAccessPatterns: Record<string, RegExp> = {
    python: /\[([a-zA-Z_]\w*|\d+)\]/g,
    javascript: /\[([a-zA-Z_]\w*|\d+)\]/g,
    java: /\[([a-zA-Z_]\w*|\d+)\]/g,
    cpp: /\[([a-zA-Z_]\w*|\d+)\]/g,
  };

  const pattern = arrayAccessPatterns[language];
  if (!pattern) return false;

  const matches = code.match(pattern);
  if (!matches) return false;

  // Check if there's a length/size check before access
  const hasLengthCheck =
    /if.*length/i.test(code) ||
    /if.*size/i.test(code) ||
    /if.*count/i.test(code) ||
    /\.length/gi.test(code) && /if/gi.test(code);

  // Check for dangerous patterns: accessing with i+1, i-1 without bounds check
  const dangerousAccess = /[a-zA-Z_]\w*\[([a-zA-Z_]\w*[\+\-]\d*)\]/g;
  if (dangerousAccess.test(code) && !hasLengthCheck) {
    return true;
  }

  // Check for access without any guard
  // This is a heuristic — look for array[i] where i comes from a loop
  // but there's no i < arr.length check
  const loopWithoutBounds =
    /for\s*\(.*;\s*[a-zA-Z_]\w*\s*</.test(code) &&
    !/if\s*\(.*[a-zA-Z_]\w*\.length/.test(code);

  if (loopWithoutBounds && matches.length > 2) {
    return true;
  }

  return false;
}

/**
 * Detect recursive functions with wrong or missing base cases.
 */
function detectWrongBaseCase(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Check if code contains a recursive function
  const recursivePatterns: Record<string, RegExp> = {
    python: /def\s+(\w+)\s*\([^)]*\)[\s\S]*?\1\s*\(/,
    javascript: /function\s+(\w+)\s*\([^)]*\)[\s\S]*?\1\s*\(/,
    java: /(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\1\s*\(/,
    cpp: /(\w+)\s*\([^)]*\)\s*\{[\s\S]*?\1\s*\(/,
  };

  const recursivePattern = recursivePatterns[language];
  if (!recursivePattern || !recursivePattern.test(code)) {
    return false; // Not a recursive function
  }

  // Check for base case patterns
  const baseCasePatterns: Record<string, RegExp[]> = {
    python: [
      /if\s+.*\s+is\s+None\s*:/i,
      /if\s+not\s+\w+\s*:/i,
      /if\s+\w+\s*==\s*(None|0|''|\[\])\s*:/i,
      /if\s+len\s*\(\s*\w+\s*\)\s*==\s*0/i,
    ],
    javascript: [
      /if\s*\(\s*!\w+\s*\)/i,
      /if\s*\(\s*\w+\s*===?\s*null\s*\)/i,
      /if\s*\(\s*\w+\s*===?\s*undefined\s*\)/i,
      /if\s*\(\s*\w+\s*===?\s*0\s*\)/i,
      /if\s*\(\s*\w+\.length\s*===?\s*0\s*\)/i,
    ],
    java: [
      /if\s*\(\s*\w+\s*==\s*null\s*\)/i,
      /if\s*\(\s*\w+\s*==\s*0\s*\)/i,
      /if\s*\(\s*\w+\.length\s*==\s*0\s*\)/i,
      /if\s*\(\s*\w+\.isEmpty\s*\(\)\s*\)/i,
    ],
    cpp: [
      /if\s*\(\s*!\w+\s*\)/i,
      /if\s*\(\s*\w+\s*==\s*nullptr\s*\)/i,
      /if\s*\(\s*\w+\s*==\s*0\s*\)/i,
      /if\s*\(\s*\w+\.empty\s*\(\)\s*\)/i,
    ],
  };

  const patterns = baseCasePatterns[language];
  if (!patterns) return false;

  // Check if any base case pattern matches
  const hasBaseCase = patterns.some((p) => p.test(code));

  if (!hasBaseCase) {
    return true; // Recursive function without apparent base case
  }

  return false;
}

/**
 * Detect while loops without clear termination conditions.
 */
function detectInfiniteLoopRisk(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Find while loops
  const whilePattern = /while\s*\(([^)]+)\)/g;
  const whileLoops = Array.from(code.matchAll(whilePattern));

  if (whileLoops.length === 0) return false;

  for (const match of whileLoops) {
    const condition = match[1];
    const loopStart = match.index ?? 0;

    // Find the body of this while loop (next ~10 lines)
    const loopBody = code.slice(loopStart, loopStart + 500);

    // Check for progress toward termination
    const hasProgress =
      /\+\+/.test(loopBody) ||
      /--/.test(loopBody) ||
      /\+=/.test(loopBody) ||
      /-=/.test(loopBody) ||
      /=\s*\w+\.next/.test(loopBody) ||
      /=\s*\w+\.next/.test(loopBody) ||
      /break/.test(loopBody) ||
      /return/.test(loopBody);

    // Check for True/true condition (potential infinite loop)
    const isAlwaysTrue =
      /^\s*true\s*$/.test(condition.trim()) ||
      /^\s*True\s*$/.test(condition.trim()) ||
      /^\s*1\s*$/.test(condition.trim());

    if (isAlwaysTrue && !hasProgress) {
      return true; // while(true) without break/return
    }

    // Check if condition variable is modified in the loop
    const conditionVar = condition.match(/[a-zA-Z_]\w*/)?.[0];
    if (conditionVar && !hasProgress) {
      return true; // While loop condition variable not modified
    }
  }

  return false;
}

/**
 * Detect off-by-one errors in loop bounds and index calculations.
 */
function detectOffByOne(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Look for common off-by-one patterns

  // Pattern 1: for loop with <= instead of < for array iteration
  const offByOneForLoop =
    /for\s*\([^;]+;\s*[a-zA-Z_]\w*\s*<=\s*[a-zA-Z_]\w*\.length\s*;/.test(
      code
    );

  if (offByOneForLoop) return true;

  // Pattern 2: accessing i-1 or i+1 at loop boundaries
  const boundaryAccess =
    /for\s*\([^;]*;\s*[a-zA-Z_]\w*\s*=\s*0/.test(code) &&
    /\[\s*[a-zA-Z_]\w*\s*-\s*1\s*\]/.test(code);

  if (boundaryAccess) return true;

  // Pattern 3: mid calculation without proper handling
  // (mid = (left + right) / 2 can overflow, but more importantly,
  // missing +1 or -1 in binary search updates)
  const binarySearchWithoutOffset =
    /left\s*=\s*mid/.test(code) &&
    /right\s*=\s*mid/.test(code) &&
    !/left\s*=\s*mid\s*\+\s*1/.test(code) &&
    !/right\s*=\s*mid\s*-\s*1/.test(code);

  if (binarySearchWithoutOffset) return true;

  // Pattern 4: slice/subarray with wrong end index
  const sliceOffByOne =
    /\.(slice|substring)\s*\([^,]+,\s*[a-zA-Z_]\w*\s*-\s*1\s*\)/.test(code) ||
    /\.(slice|substring)\s*\([^,]+,\s*[a-zA-Z_]\w*\s*\+\s*1\s*\)/.test(code);

  if (sliceOffByOne) return true;

  return false;
}

/**
 * Detect missing edge case handling.
 */
function detectMissedEdgeCase(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Check for edge case guards at the start of function
  const edgeCasePatterns = [
    /if\s*\(.*length\s*===?\s*0/i,
    /if\s*\(.*length\s*==\s*0/i,
    /if\s*\(.*is\s+empty/i,
    /if\s*\(.*isEmpty/i,
    /if\s*\(.*===?\s*null/i,
    /if\s*\(.*==\s*null/i,
    /if\s*\(.*===?\s*undefined/i,
    /if\s*\(!\s*\w+\s*\)/,
    /if\s*\(not\s+\w+\s*:/i,
  ];

  const hasEdgeCaseCheck = edgeCasePatterns.some((p) => p.test(code));

  // If no edge case checks, check if the problem likely needs them
  // (functions that take arrays/strings/lists usually need edge case handling)
  const takesCollectionParam =
    /\[\s*\]/.test(code) ||
    /Array</.test(code) ||
    /List</.test(code) ||
    /vector</.test(code) ||
    /string\s+\w+/.test(code);

  if (takesCollectionParam && !hasEdgeCaseCheck) {
    return true;
  }

  return false;
}

/**
 * Detect potentially wrong time complexity (nested loops, redundant iterations).
 */
function detectWrongComplexity(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Count nested loop patterns
  const nestedLoopPattern =
    /for\s*\([^)]+\)\s*\{[\s\S]*for\s*\([^)]+\)/;

  if (nestedLoopPattern.test(code)) {
    // Check if it's a known O(n²) pattern that could be O(n) with a hash map
    const couldUseHashMap =
      /for.*for/.test(code) &&
      (/includes/.test(code) ||
        /indexOf/.test(code) ||
        /find/.test(code) ||
        /some/.test(code) ||
        /\.get\s*\(/.test(code));

    if (couldUseHashMap) {
      return true; // O(n²) that could be O(n) with hash map
    }
  }

  // Check for redundant iterations (multiple passes over same data)
  const multiplePassPattern =
    /for\s*\([^)]+\)[\s\S]*\}\s*for\s*\([^)]+\)/;

  if (multiplePassPattern.test(code)) {
    // If there are 2+ separate for loops over the same collection
    return true;
  }

  return false;
}

/**
 * Detect suboptimal approach patterns.
 */
function detectSuboptimalApproach(
  code: string,
  language: string,
  lines: string[]
): boolean {
  // Pattern 1: Sorting when not needed (O(n log n) when O(n) possible)
  const sortWhenUnneeded =
    /(\.sort\(|sorted\(|Arrays\.sort)/.test(code) &&
    !/k.*largest|k.*smallest|top.*k|nth/.test(code.toLowerCase());

  if (sortWhenUnneeded) {
    // If the problem doesn't require sorted output, sorting might be suboptimal
    return true;
  }

  // Pattern 2: Using extra space when two pointers would work
  const extraSpacePattern =
    /(new\s+Map|new\s+Set|\{\}|\[\]|\.\.\.spread)/.test(code) &&
    /for.*for/.test(code); // Combined with nested iteration

  if (extraSpacePattern) {
    return true;
  }

  // Pattern 3: Brute force enumeration when DP/greedy applies
  const bruteForcePattern =
    /for.*for.*for/.test(code) || // Triple nested loop
    (/recursion|recursive/.test(code.toLowerCase()) &&
      !/memo|cache|dp|dynamic/.test(code.toLowerCase()));

  if (bruteForcePattern) {
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get a human-readable summary of detected patterns.
 * Useful for displaying feedback to the user.
 */
export function summarizeDetectedPatterns(patterns: WeakPatternTag[]): string {
  if (patterns.length === 0) {
    return "No common issues detected. Good job!";
  }

  const summaries = patterns.map((tag) => {
    const meta = PATTERN_METADATA[tag];
    return `- ${meta.friendlyName}: ${meta.description}`;
  });

  return `Potential issues detected:\n${summaries.join("\n")}`;
}

/**
 * Get targeted advice for fixing detected patterns.
 */
export function getFixAdvice(patterns: WeakPatternTag[]): string[] {
  return patterns.map((tag) => {
    const meta = PATTERN_METADATA[tag];
    return `${meta.friendlyName}: ${meta.howToFix}`;
  });
}
