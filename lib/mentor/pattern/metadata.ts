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
  "array-index-error",
  "hashmap-miss",
  "string-index-error",
  "math-error",
  "logic-error",
  "memory-leak",
  "stack-overflow",
  "wrong-data-structure",
  "redundant-computation",
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
  "array-index-error": {
    friendlyName: "Array Index Error",
    description: "Accessing an array index that is out of bounds.",
    howToFix: "Verify that the index is within [0, array.length - 1].",
    relatedTags: ["array"],
  },
  "hashmap-miss": {
    friendlyName: "HashMap Key Miss",
    description: "Accessing a key in a hash map that doesn't exist.",
    howToFix: "Check if the key exists using map.has() or equivalent before access.",
    relatedTags: ["hash-map"],
  },
  "string-index-error": {
    friendlyName: "String Index Error",
    description: "Accessing a string index that is out of bounds.",
    howToFix: "Verify that the index is within [0, string.length - 1].",
    relatedTags: ["string"],
  },
  "math-error": {
    friendlyName: "Math Error",
    description: "Error in mathematical calculation (e.g., division by zero).",
    howToFix: "Add checks for divisors and edge cases in math operations.",
    relatedTags: ["math"],
  },
  "logic-error": {
    friendlyName: "Logic Error",
    description: "General error in the logic of the algorithm.",
    howToFix: "Review the algorithm step-by-step with sample inputs.",
    relatedTags: ["logic"],
  },
  "memory-leak": {
    friendlyName: "Memory Leak",
    description: "The solution uses more memory than necessary or fails to release it.",
    howToFix: "Avoid storing unnecessary data or create unnecessary objects in loops.",
    relatedTags: ["memory"],
  },
  "stack-overflow": {
    friendlyName: "Stack Overflow",
    description: "Recursion depth exceeded.",
    howToFix: "Check your base case and ensure progress towards it.",
    relatedTags: ["recursion"],
  },
  "wrong-data-structure": {
    friendlyName: "Wrong Data Structure",
    description: "Using a data structure that is suboptimal for the task.",
    howToFix: "Consider if a different data structure (e.g., Map, Set, Heap) would be better.",
    relatedTags: ["data-structure"],
  },
  "redundant-computation": {
    friendlyName: "Redundant Computation",
    description: "Performing the same calculation multiple times.",
    howToFix: "Store results of expensive calculations or use memoization.",
    relatedTags: ["optimization"],
  },
};
