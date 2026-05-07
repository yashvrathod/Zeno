/**
 * Intent Classification & Cache Eligibility System
 *
 * INTENT-FIRST ARCHITECTURE: Classification happens BEFORE any stage gating.
 * All decisions must be driven by intent + confidence + current stage.
 *
 * DETERMINES:
 * 1. What the user is asking (intent classification)
 * 2. Whether to route through stage-specific handler
 * 3. Whether response needs validation
 */

import { startTimer, debug } from "@/lib/debug";

// ─────────────────────────────────────────────────────────────────────────────
// INTENT TYPES - Expanded for comprehensive coverage
// ─────────────────────────────────────────────────────────────────────────────

export type IntentType =
  | "understanding"          // "What is binary search?" - conceptual
  | "hint_request"          // "Give me a hint" - guided assistance
  | "implementation_help"   // "How do I code this part?" - implementation guidance
  | "debugging"             // "Why is my code failing?" - debugging help
  | "solution_request"      // "Give me the solution" - requires enforcement
  | "clarification"         // "What does this mean?" - problem clarification
  | "progress_check"        // "Am I on the right track?" - validation seeking
  | "frustration"           // "I'm stuck/frustrated" - emotional + stuck
  | "confirmation"          // "Is this correct?" - validation
  | "off_topic"             // Non-DSA content
  | "code_review"           // "Review my code" - review request
  | "optimization"          // "Can this be faster?" - optimization
  | "test_case_question"    // "What about this input?" - specific case
  | "approach_validation"   // "Is my approach right?" - approach checking
  | "edge_case_help"        // "What about edge cases?" - edge case focus
  | "pattern_recognition"   // "What pattern fits here?" - pattern seeking
  | "transfer_learning";    // "How is this like X?" - transfer seeking

export type IntentConfidence = "high" | "medium" | "low";

export type IntentClassification = {
  intent: IntentType;
  confidence: IntentConfidence;
  shouldEnforceStage: boolean;      // True for ALL intents - all go through stage control
  requiresValidation: boolean;       // Response MUST be validated
  reason: string;
  keywords: string[];
  metadata?: {
    hasCodeReference?: boolean;
    hasExplicitFrustration?: boolean;
    hasSolutionDemand?: boolean;
    hasPatternMention?: boolean;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// INTENT DETECTION PATTERNS - Comprehensive coverage
// ─────────────────────────────────────────────────────────────────────────────

const INTENT_PATTERNS: Record<IntentType, { keywords: string[]; weight: number; patterns: RegExp[] }> = {
  understanding: {
    keywords: [
      "what is", "what are", "explain", "how does", "meaning of",
      "difference between", "compare", "vs", "versus", "definition",
      "why do we", "why use", "purpose of", "concept of",
      "how would you describe", "what does this mean"
    ],
    weight: 1.0,
    patterns: [
      /^\s*explain\b/i,
      /^\s*what (is|are)\b/i,
      /^\s*meaning of\b/i,
    ]
  },
  hint_request: {
    keywords: [
      "hint", "clue", "tip", "suggestion", "guide me", "nudge",
      "point me", "direction", "where to look", "what to consider",
      "help me get started", "next step", "gentle push"
    ],
    weight: 0.95,
    patterns: []
  },
  implementation_help: {
    keywords: [
      "how do I code", "how to implement", "code for this part",
      "write the function", "implement this section",
      "how should I write", "coding this", "translate to code",
      "how would the code look", "syntax for this"
    ],
    weight: 0.9,
    patterns: []
  },
  debugging: {
    keywords: [
      "why is my code", "why does my code", "my code is", "my solution",
      "my code fails", "not working", "wrong answer", "runtime error",
      "output is wrong", "expected output", "actual output",
      "test case fails", "error in my", "bug in my",
      "failing test", "wrong result"
    ],
    weight: 1.0,
    patterns: [
      /my code (is|does|fails)/i,
      /why is (this|it) (not working|wrong)/i,
    ]
  },
  solution_request: {
    keywords: [
      "give me the solution", "show me the code", "write the code",
      "complete solution", "full implementation", "answer please",
      "just tell me", "what's the answer", "final code",
      "paste the solution", "drop the solution",
      "show me how to solve completely",
      "just write it", "just code it",
      "the working solution", "optimal code",
      "show me the implementation",
      "could you write this",
      "i need the code",
      "write the complete",
      "full working code",
      "show me a working",
      "what should i write",
      "what code should i write",
      "how do i solve this",
      "show me how you'd write",
      "how would you write",
      "what would the code look like",
      "optimal code",
      "working solution",
      "complete code",
      "implementation of this",
      "code for this",
      "write this code",
      "show me the complete",
      "show me full",
      "just give me",
      "can you write this",
      "can you code this",
      "implement this for me",
      "write the function",
      "code this",
      "show me exactly",
      "what's the implementation"
    ],
    weight: 1.0,
    patterns: [
      /^(just|simply|please)\s+(write|show|give)\s+(me|the|this|it)/i,
      /^(show|give|write)\s+(me|us|the)\s+(solution|code|implementation)/i,
      /^(how|what)\s+(would|should|could)\s+(you|we|i)\s+(write|code|implement)/i,
      /^(what|how)\s+(would|should)\s+(the|a)\s+(code|implementation|solution)\s+(look|be)/i,
      /^(can\s+you\s+)?(just\s+)?(write|show|give|code|implement)\b.*?(for\s+me|please|$)/i,
      /\b(need|want)\s+(the\s+)?(code|solution|implementation)\b/i,
      /^(show|give)\s+(me|us|the)\s+how\s+(you\s+)?(?:would\s+)?(?:write|code|implement)\b/i,
      /^(how\s+)?(?:would|could|should)\s+you\s+(?:write|implement|code)\s+this\b/i,
      /^(what|how)\s+(?:is|would\s+be|to)\s+(?:the\s+)?(?:code|implementation|solution)\b/i
    ]
  },
  clarification: {
    keywords: [
      "what does this mean", "clarify", "confused by", "not sure about",
      "does this mean", "is this saying", "problem statement",
      "explain again", "what exactly", "elaborate"
    ],
    weight: 0.85,
    patterns: []
  },
  progress_check: {
    keywords: [
      "am i right", "am i correct", "is this correct", "on the right track",
      "does this work", "will this pass", "is my approach right",
      "checking if", "verify my", "is this the right way"
    ],
    weight: 0.9,
    patterns: []
  },
  frustration: {
    keywords: [
      "frustrated", "stuck", "can't figure", "giving up", "too hard",
      "impossible", "don't understand", "help me please", "discouraged",
      "overwhelmed", "confused", "lost", "need help badly",
      "i give up", "screw this", "what the hell",
      "tired of this", "fed up", "not getting this"
    ],
    weight: 0.9,
    patterns: [
      /i['’]m (so|very|really) (frustrated|stuck|confused)/i,
      /(giving up|fed up)\s+(with|on)/i,
    ]
  },
  off_topic: {
    keywords: [
      "favorite", "weather", "joke", "movie", "music", "game",
      "chatgpt", "gpt", "ai model", "who are you", "how old",
      "created you", "your opinion", "think about", "unrelated"
    ],
    weight: 0.9,
    patterns: []
  },
  code_review: {
    keywords: [
      "review my code", "feedback on code", "improve my code",
      "refactor", "clean up", "optimize this", "better way to write",
      "code quality", "style issue", "can you review",
      "critique my"
    ],
    weight: 0.95,
    patterns: []
  },
  optimization: {
    keywords: [
      "time complexity", "space complexity", "big o", "O(n)",
      "faster", "more efficient", "optimize", "performance",
      "memory usage", "reduce time", "better complexity",
      "can we make this", "improve the speed"
    ],
    weight: 0.85,
    patterns: []
  },
  test_case_question: {
    keywords: [
      "test case", "input", "output for", "what about", "edge case",
      "boundary", "example with", "try this", "handle when",
      "what if the input is", "corner case"
    ],
    weight: 0.85,
    patterns: []
  },
  approach_validation: {
    keywords: [
      "is my approach", "is this approach", "is the strategy",
      "am i on the right path", "is this the right way",
      "is this correct", "does this make sense",
      "is this a valid"
    ],
    weight: 0.9,
    patterns: []
  },
  edge_case_help: {
    keywords: [
      "edge case", "corner case", "boundary", "empty array",
      "single element", "null", "undefined", "what about when",
      "handle the case", "special case"
    ],
    weight: 0.85,
    patterns: []
  },
  pattern_recognition: {
    keywords: [
      "what pattern", "which pattern", "sliding window",
      "two pointer", "binary search", "dynamic programming",
      "backtracking", "greedy", "hash map", "recursion",
      "graph", "tree", "matches", "similar to",
      "reminds me of", "same as"
    ],
    weight: 0.9,
    patterns: []
  },
  transfer_learning: {
    keywords: [
      "how is this like", "similar to", "same as",
      "like the previous", "compared to", "just like",
      "similar problem", "transfer this", "apply here"
    ],
    weight: 0.8,
    patterns: []
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CACHE & SAFETY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const CACHE_SAFETY_CONFIG: Record<IntentType, {
  useCache: boolean;
  saveToCache: boolean;
  requiresValidation: boolean;
  enforceStage: boolean;
  reason: string;
}> = {
  understanding: {
    useCache: true,
    saveToCache: true,
    requiresValidation: true,
    enforceStage: true,
    reason: "Concept explanations must be stage-appropriate"
  },
  hint_request: {
    useCache: true,
    saveToCache: true,
    requiresValidation: true,
    enforceStage: true,
    reason: "Hints must respect current learning stage"
  },
  implementation_help: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Implementation help requires strict stage enforcement"
  },
  debugging: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Debugging is student-specific"
  },
  solution_request: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Solution requests require strict enforcement"
  },
  clarification: {
    useCache: true,
    saveToCache: true,
    requiresValidation: true,
    enforceStage: true,
    reason: "Clarifications should be stage-aware"
  },
  progress_check: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Progress checks are context-specific"
  },
  frustration: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Emotional support is personalized"
  },
  confirmation: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Validation is context-specific"
  },
  off_topic: {
    useCache: false,
    saveToCache: false,
    requiresValidation: false,
    enforceStage: false,
    reason: "Off-topic doesn't need stage control"
  },
  code_review: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Code review is user-specific"
  },
  optimization: {
    useCache: true,
    saveToCache: true,
    requiresValidation: true,
    enforceStage: true,
    reason: "Optimization advice should respect stage"
  },
  test_case_question: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Test cases are specific"
  },
  approach_validation: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Approach validation is context-specific"
  },
  edge_case_help: {
    useCache: false,
    saveToCache: false,
    requiresValidation: true,
    enforceStage: true,
    reason: "Edge case help is situation-specific"
  },
  pattern_recognition: {
    useCache: true,
    saveToCache: true,
    requiresValidation: true,
    enforceStage: true,
    reason: "Pattern discussion benefits from caching"
  },
  transfer_learning: {
    useCache: true,
    saveToCache: true,
    requiresValidation: true,
    enforceStage: true,
    reason: "Transfer learning discussions are valuable"
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CLASSIFICATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classifies user intent with comprehensive pattern matching.
 * INTENT-FIRST: This runs BEFORE any stage-based gating.
 */
export function classifyIntent(input: string): IntentClassification {
  const timer = startTimer("classifyIntent");
  const lowerInput = input.toLowerCase().trim();

  // Check for explicit frustration FIRST (overrides other patterns)
  const explicitFrustration = checkExplicitFrustration(lowerInput);

  // Score all intents
  const scores: Record<IntentType, number> = {} as Record<IntentType, number>;
  const matchedKeywords: Record<IntentType, string[]> = {} as Record<IntentType, string[]>;
  const patternMatches: Record<IntentType, string[]> = {} as Record<IntentType, string[]>;

  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    const keywords: string[] = [];
    const patterns: string[] = [];

    // Keyword matching
    for (const keyword of config.keywords) {
      if (lowerInput.includes(keyword)) {
        score += config.weight;
        keywords.push(keyword);
      }
    }

    // Regex pattern matching (higher precision)
    for (const pattern of config.patterns) {
      if (pattern.test(lowerInput)) {
        score += config.weight * 1.5; // Patterns get bonus
        patterns.push(pattern.toString());
      }
    }

    scores[intent as IntentType] = score;
    matchedKeywords[intent as IntentType] = keywords;
    patternMatches[intent as IntentType] = patterns;
  }

  // Special handling: frustration check overrides
  if (explicitFrustration.isFrustration && scores.frustration < 1.0) {
    scores.frustration = 1.0;
    matchedKeywords.frustration.push(explicitFrustration.matchedPhrase || "frustration");
  }

  // Special handling: solution request patterns (hard to miss)
  if (isHardSolutionRequest(lowerInput)) {
    scores.solution_request = Math.max(scores.solution_request, 2.0);
  }

  // Find highest scoring intent
  let bestIntent: IntentType = "hint_request";
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as IntentType;
    }
  }

  // Determine confidence
  let confidence: IntentConfidence;
  if (bestScore >= 2.0) {
    confidence = "high";
  } else if (bestScore >= 1.0) {
    confidence = "medium";
  } else if (bestScore >= 0.5) {
    confidence = "low";
  } else {
    confidence = "low";
    bestIntent = "hint_request"; // Default fallback
  }

  // Extract metadata
  const metadata = extractMetadata(lowerInput, bestIntent);

  const allMatched = [
    ...matchedKeywords[bestIntent],
    ...patternMatches[bestIntent]
  ];

  const config = CACHE_SAFETY_CONFIG[bestIntent];

  timer();

  return {
    intent: bestIntent,
    confidence,
    shouldEnforceStage: config.enforceStage,
    requiresValidation: config.requiresValidation,
    reason: `${config.reason} (confidence: ${confidence}, score: ${bestScore})`,
    keywords: allMatched,
    metadata,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function checkExplicitFrustration(input: string): { isFrustration: boolean; matchedPhrase?: string } {
  const frustrationPhrases = [
    /i['’]m (so|very|really|extremely) (frustrated|stuck|confused)/i,
    /(frustrated|stuck|confused) and (can't|cannot)/i,
    /i (can't|cannot) (figure|get|understand) this/i,
    /this is (frustrating|impossible|pointless)/i,
    /i['’]ve (tried|been) (for|\d+) (hours?|days?)/i,
  ];

  for (const phrase of frustrationPhrases) {
    const match = input.match(phrase);
    if (match) {
      return { isFrustration: true, matchedPhrase: match[0] };
    }
  }

  return { isFrustration: false };
}

function isHardSolutionRequest(input: string): boolean {
  // Phrases that are almost always solution requests
  const hardPatterns = [
    /^(show|give|write|paste|drop)\s+me\s+(the\s+)?(code|solution|implementation)/i,
    /^(just|simply|please)\s+(write|code|implement|give)\s+.*?(for\s+me|me|this)/i,
    /^(i\s+)?need\s+(the\s+)?(full\s+)?(code|solution)/i,
    /^(complete|full|working)\s+(code|solution|implementation)/i,
    /how\s+(would|should)\s+(you|the|code)\s+(look|be|work)/i,
    /^(can\s+you\s+)?(just\s+)?(write|show|give)\s+.*?(for\s+me|please)/i,
    /^give\s+(it\s+)?to\s+me/i,
    // Frustration + implementation request patterns
    /(stuck|frustrated|can't\s+figure)\s+.*?\b(implement|code|write|give)\b/i,
    /\b(implement|code|write|give)\b.*?\b(stuck|frustrated)\b/i,
    /i['’]m\s+(stuck|frustrated).*?\b(implement|code|write|give)\b/i,
    /\b(just|please)\s+(implement|code|write|give)\b/i,
    // Give me patterns with modifiers
    /^(just|really|please|simply),?\s*(give|show|write|code)\b/i,
  ];

  return hardPatterns.some(p => p.test(input));
}

function extractMetadata(input: string, intent: IntentType): IntentClassification["metadata"] {
  const meta: IntentClassification["metadata"] = {};

  // Check for code references
  if (/```|[a-zA-Z_]+\s*\(|function\s+\w+|def\s+\w+|class\s+\w+/.test(input)) {
    meta.hasCodeReference = true;
  }

  // Check for explicit frustration
  if (intent === "frustration" || checkExplicitFrustration(input).isFrustration) {
    meta.hasExplicitFrustration = true;
  }

  // Check for solution demand
  if (isHardSolutionRequest(input) || intent === "solution_request") {
    meta.hasSolutionDemand = true;
  }

  // Check for pattern mentions
  const patternKeywords = [
    "sliding window", "two pointer", "binary search", "dynamic programming",
    "dp", "recursion", "backtrack", "greedy", "hash map", "tree", "graph",
    "stack", "queue", "heap", "trie", "dfs", "bfs"
  ];
  if (patternKeywords.some(k => input.includes(k))) {
    meta.hasPatternMention = true;
  }

  return meta;
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH CLASSIFICATION & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

export type IntentStats = {
  intent: IntentType;
  count: number;
  cacheHitRate: number;
  avgResponseTime: number;
};

/**
 * Analyzes AI response content to determine if it should be cached.
 * Even if intent suggests caching, content analysis is the final gate.
 */
export function analyzeResponseForCacheEligibility(
  response: string,
  intent: IntentType
): { shouldCache: boolean; reason: string } {
  const lowerResponse = response.toLowerCase();

  // Check 1: Contains user-specific references
  const userSpecificPatterns = [
    "your code", "your solution", "you wrote", "your approach",
    "in your function", "your variable", "your loop", "your if statement",
    "your bug", "your error", "your implementation"
  ];
  const hasUserSpecificRef = userSpecificPatterns.some(p => lowerResponse.includes(p));

  // Check 2: Contains actual code blocks (likely user-specific)
  const hasCodeBlock = /```[\s\S]*?```/.test(response);
  const hasInlineCode = /`[^`]+`/.test(response);

  // Check 3: Very short responses (not worth caching)
  if (response.length < 50) {
    return { shouldCache: false, reason: "Response too short to cache" };
  }

  // Check 4: Contains error messages or stack traces
  const hasErrorContent = /error:|exception:|stack trace|line \d+|at \w+\(/.test(lowerResponse);

  // Check 5: Personalized/emotional tone
  const emotionalPatterns = [
    "i understand you['’]re", "i can see that", "don['’]t worry",
    "you['’]re doing great", "hang in there", "i['’]m here to help you",
    "i know how you feel"
  ];
  const hasEmotionalContent = emotionalPatterns.some(p => lowerResponse.includes(p));

  // Decision logic
  if (hasUserSpecificRef) {
    return { shouldCache: false, reason: "Response contains user-specific references" };
  }

  if (hasErrorContent && (intent === "debugging" || intent === "code_review")) {
    return { shouldCache: false, reason: "Response contains error-specific content" };
  }

  if (hasEmotionalContent && intent === "frustration") {
    return { shouldCache: false, reason: "Response is personalized emotional support" };
  }

  // For implementation_help and solution_request, code blocks are expected but
  // we still shouldn't cache them (too user-specific)
  if ((intent === "implementation_help" || intent === "solution_request" || intent === "debugging") &&
      (hasCodeBlock || hasInlineCode)) {
    return { shouldCache: false, reason: "Implementation/debug code is user-specific" };
  }

  // Large code blocks in responses are not cacheable (except concept_explanation)
  const codeBlockLength = (response.match(/```[\s\S]*?```/g) || [])
    .reduce((sum, block) => sum + block.length, 0);
  if (codeBlockLength > 200 && intent !== "understanding") {
    return { shouldCache: false, reason: "Response contains substantial code blocks" };
  }

  return { shouldCache: true, reason: "Response is generic and cacheable" };
}

/**
 * After AI generates a response, analyzes it to determine if it should
 * actually be saved to cache. This is the SECOND safety layer.
 */
export function shouldSaveResponseToCache(
  response: string,
  classification: IntentClassification
): { save: boolean; reason: string } {
  // First check: Is the intent cacheable?
  if (!classification.shouldEnforceStage || !CACHE_SAFETY_CONFIG[classification.intent].saveToCache) {
    return {
      save: false,
      reason: `Intent "${classification.intent}" is not cacheable (enforceStage: ${classification.shouldEnforceStage})`
    };
  }

  // Second check: Analyze actual response content
  const contentAnalysis = analyzeResponseForCacheEligibility(response, classification.intent);

  if (!contentAnalysis.shouldCache) {
    return { save: false, reason: contentAnalysis.reason };
  }

  return { save: true, reason: "Intent and content both indicate cacheable" };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING OPTIMIZATION - Early cache skip detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quick check to determine if we should even attempt cache lookup.
 * Called EARLY in the routing process to save embedding compute.
 * This is the FIRST layer of the intent-first pipeline.
 */
export function shouldSkipCacheLookup(input: string, classification: IntentClassification): {
  skip: boolean;
  reason: string
} {
  // If intent classification says don't use cache, skip immediately
  if (!classification.shouldEnforceStage) {
    return {
      skip: true,
      reason: `Intent "${classification.intent}" does not require stage enforcement`
    };
  }

  // Certain intents should never hit cache (user-specific by nature)
  const neverCacheIntents: IntentType[] = [
    "debugging",
    "code_review",
    "frustration",
    "progress_check",
    "confirmation",
    "solution_request",
    "implementation_help",
    "test_case_question"
  ];

  if (neverCacheIntents.includes(classification.intent)) {
    return {
      skip: true,
      reason: `Intent "${classification.intent}" is user-specific and not cacheable`
    };
  }

  // Very short inputs aren't worth cache lookup
  const wordCount = input.split(/\s+/).length;
  if (wordCount < 3) {
    return { skip: true, reason: "Input too short for meaningful cache lookup" };
  }

  // Contains strong personal pronouns (except for understanding/clarification)
  const lowerInput = input.toLowerCase();
  const hasStrongPersonal = /\b(my|i['’]m|i am|i['’]ve|i have|me)\b/.test(lowerInput);
  if (hasStrongPersonal &&
      !['understanding', 'clarification', 'hint_request'].includes(classification.intent)) {
    return {
      skip: true,
      reason: "Input contains personal pronouns - likely user-specific context"
    };
  }

  return { skip: false, reason: "Cache lookup recommended" };
}
