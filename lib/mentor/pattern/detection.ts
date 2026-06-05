import { WeakPatternTag } from "./metadata";

// ─────────────────────────────────────────────────────────────────────────
// STATIC CODE ANALYSIS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Detect weak patterns from code BEFORE calling AI.
 * Uses simple regex/AST-free checks that catch common mistakes.
 *
 * @param code - The user's submitted code
 * @param language - Programming language ("python" | "java" | "cpp")
 * @returns Array of detected weak pattern tags
 *
 * This function performs lightweight static analysis without requiring
 * a full parser. It's designed to catch obvious issues quickly.
 */
export function detectPatternsStatically(
  code: string,
  language: "python" | "java" | "cpp"
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
