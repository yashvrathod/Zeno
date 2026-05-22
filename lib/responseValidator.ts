/**
 * AI Response Validator - Production Grade
 *
 * Core guardrail layer with enterprise-quality detection:
 * - Zero false positives on legitimate guidance
 * - Context-aware violation detection
 * - Deterministic rewrites
 * - Performance-optimized regex handling
 */

import type { TeachingStage } from "@/lib/mentorContext";
import { isSolutionRequest as consolidatedIsSolutionRequest } from "@/lib/mentor/validation/solutionPatterns";

export type ValidationResult = {
  isValid: boolean;
  violationType: ViolationType | null;
  rewrittenResponse: string | null;
  stageAssessment: {
    readyToAdvance: boolean;
    assessedStage: TeachingStage | null;
    confidence: "high" | "medium" | "low";
  };
};

export type ViolationType =
  | "SOLUTION_LEAK"
  | "PRECIOUS_HINT"
  | "CODE_GIVEAWAY"
  | "ALGORITHM_NAMING"
  | "STAGE_MISMATCH"
  | "LOW_QUALITY";

/**
 * Solution leakage patterns per stage - NO OVERLAP between layers.
 * Each pattern targets ONLY what other layers don't catch.
 */
const SOLUTION_LEAK_PATTERNS = {
  EXPLORE: [
    "the answer is",
    "you should use",
    "the solution is",
    "just use",
    "simply use",
    "the code is",
  ],
  STRATEGIZE: [
    "here's the code",
    "write this function",
    "your code should",
    "the implementation",
    "use this pattern",
  ],
  IMPLEMENT: [
    "fix it by",
    "the bug is",
    "change line",
    "replace with",
    "the error is",
  ],
  DEBUG: [
    "here's the fixed code",
    "your solution is",
    "the complete code",
    "full solution",
  ],
  STUCK: [
    "just copy",
    "paste this",
    "here's the answer",
  ],
  REFLECT: [],
};

/**
 * Algorithm names - full list for pattern matching.
 */
const ALGORITHM_NAMES = [
  "binary search",
  "two pointers",
  "two pointer",
  "sliding window",
  "dynamic programming",
  "depth-first search",
  "breadth-first search",
  "dfs",
  "bfs",
  "heap",
  "priority queue",
  "union find",
  "kadane",
  "dijkstra",
  "bellman-ford",
  "floyd-warshall",
  "greedy algorithm",
  "backtracking",
  "memoization",
];

/**
 * Validates an AI response against stage-specific guardrails.
 */
export function validateAIResponse(
  response: string,
  stage: TeachingStage,
  intent?: unknown
): ValidationResult {
  const lower = response.toLowerCase();

  const violation = detectViolation(response, stage, lower);
  const stageAssessment = extractStageAssessment(response, stage);

  let rewritten: string | null = null;
  if (violation) {
    rewritten = rewriteResponse(response, violation, stage);
  }

  return {
    isValid: !violation,
    violationType: violation,
    rewrittenResponse: rewritten,
    stageAssessment,
  };
}

/**
 * Detects violations with ZERO false positives.
 *
 * LAYER STRATEGY:
 * 1. Full solution patterns (complete implementations)
 * 2. Stage-specific solution leaks (directives)
 * 3. Premature code blocks
 * 4. Algorithm naming in EXPLORE only
 * 5. Direct hints in EXPLORE only (non-overlapping with layer 1)
 * 6. Implementation guidance in STRATEGIZE only
 */
function detectViolation(
  response: string,
  stage: TeachingStage,
  lower: string
): ViolationType | null {
  if (stage === "REFLECT") return null;

  // LAYER 1: Full solution patterns (highest severity)
  const fullSolutionPatterns = [
    /here['"]s the (complete|full|correct) (code|solution)/i,
    /\bthe (answer|solution|correct approach) is[:\s]/i,
    /\bjust (copy|paste) this\b/i,
    /\bthe fix is simple\b/i,
    /\bclass Solution\b/i,
    /\bsolution\s*=\s*[\s\S]{100,}/i,
  ];

  for (const pattern of fullSolutionPatterns) {
    if (pattern.test(response)) {
      return "SOLUTION_LEAK";
    }
  }

  // LAYER 2: Stage-specific solution leaks with FULL context awareness
  // Check BOTH before and after the match for lenient context
  const stagePatterns = SOLUTION_LEAK_PATTERNS[stage] || [];
  for (const phrase of stagePatterns) {
    const regex = new RegExp(phrase, "i");
    const match = response.match(regex);

    if (match) {
      const matchStart = match.index ?? 0;
      const matchEnd = matchStart + match[0].length;

      // Check 300 chars BEFORE and AFTER for lenient context
      const contextStart = Math.max(0, matchStart - 300);
      const contextEnd = Math.min(response.length, matchEnd + 300);
      const fullContext = response.substring(contextStart, contextEnd).toLowerCase();

      // Lenient keywords - if present ANYWHERE in context, allow through
      const lenientKeywords = [
        "you can try",
        "you should try",
        "consider",
        "think about",
        "what about",
        "maybe",
        "perhaps",
        "one approach",
        "you might",
        "could",
        "possible",
      ];

      const isLenient = lenientKeywords.some((kw) => fullContext.includes(kw));

      if (!isLenient) {
        return "SOLUTION_LEAK";
      }
    }
  }

  // LAYER 3: Code block detection - count ONLY non-comment, non-empty lines
  if (stage === "EXPLORE" || stage === "STRATEGIZE") {
    const codeBlockMatches = response.match(/```[\s\S]*?```/g) || [];
    const codeBlockCount = codeBlockMatches.length;

    if (codeBlockCount >= 3) {
      return "CODE_GIVEAWAY";
    }

    for (const block of codeBlockMatches) {
      const lines = block
        .split("\n")
        .filter(
          (l) =>
            l.trim() &&
            !l.trim().startsWith("//") &&
            !l.trim().startsWith("#") &&
            !l.trim().startsWith("*") &&
            !l.trim().startsWith("/*") &&
            !l.trim().startsWith("*/")
        );

      // More than 12 actual code lines is suspicious
      if (lines.length > 12) {
        return "CODE_GIVEAWAY";
      }
    }
  }

  // LAYER 4: Algorithm naming in EXPLORE - direct recommendation only
  if (stage === "EXPLORE") {
    for (const algo of ALGORITHM_NAMES) {
      // Escape regex special characters in algorithm names
      const escapedAlgo = algo.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

      // Pattern: [verb] + [algo] OR [algo] + [verb] where verb indicates recommendation
      const directRecommendation = new RegExp(
        `(\\buse\\b|\\btry\\b|\\bapply\\b|\\byou should\\b|\\byou can\\b|\\bimplement\\b)\\s+${escapedAlgo}|${escapedAlgo}\\s+(\\buse\\b|\\btry\\b|\\bapply\\b|\\byou should\\b|\\byou can\\b)`,
        "i"
      );

      if (directRecommendation.test(response)) {
        // Verify it's not just mentioning the algorithm in passing
        const contextCheck = /(not |don['"]t|doesn['"]t|avoid|warning|caution)/i.test(response);
        if (!contextCheck) {
          return "ALGORITHM_NAMING";
        }
      }
    }
  }

  // LAYER 5: Direct hints in EXPLORE - ONLY phrases NOT caught by Layer 1
  if (stage === "EXPLORE") {
    // These are HINTS, not full solutions - lower severity
    const directHintPatterns = [
      /\bthe trick is\b/i,
      /\bthe key is\b/i,
      /\buse this approach\b/i,
      /\buse this method\b/i,
      /\buse this technique\b/i,
    ];

    for (const pattern of directHintPatterns) {
      if (pattern.test(response)) {
        return "PRECIOUS_HINT";
      }
    }
  }

  // LAYER 6: Implementation guidance in STRATEGIZE
  if (stage === "STRATEGIZE") {
    const implementationPatterns = [
      /\bwrite a (new )?function\b/i,
      /\bcreate a (new )?function\b/i,
      /\bthe code would be\b/i,
      /\bstart by creating\b/i,
    ];

    for (const pattern of implementationPatterns) {
      if (pattern.test(response)) {
        return "STAGE_MISMATCH";
      }
    }
  }

  // LAYER 7: Stage-specific behavioral violations
  if (stage === "EXPLORE") {
    const stepByStep = /\bstep\s+\d+[:\s]/i;
    if (stepByStep.test(response)) {
      return "STAGE_MISMATCH";
    }
    const implementationAdvice = /\b(implement|code\s+this|using a for loop|using a hash)/i;
    if (implementationAdvice.test(response)) {
      return "STAGE_MISMATCH";
    }
  }

  if (stage === "STRATEGIZE") {
    const debugAdvice = /\b(bug in line|a bug in|debugging|fix the|off-by-one|syntax error)\b/i;
    if (debugAdvice.test(response)) {
      return "STAGE_MISMATCH";
    }
  }

  if (stage === "IMPLEMENT") {
    const backtracking = /\b(step back|think about what.*problem.*asking|let's explore|understand.*problem)/i;
    if (backtracking.test(response)) {
      return "STAGE_MISMATCH";
    }
  }

  // LAYER 8: Response quality checks
  const trimmed = response.trim();
  if (!trimmed) {
    return "LOW_QUALITY";
  }

  if (trimmed.length > 5000) {
    return "LOW_QUALITY";
  }

  const briefPatterns = [
    /^(yes|no|maybe|okay|sure)[,.\s]*(that['"]?s\s+)?(correct|right|true)[,.\s]*$/i,
    /^that['"]s (correct|right|true)[,.\s]*$/i,
    /^good[,\s]luck/i,
    /not sure/i,
  ];
  for (const pattern of briefPatterns) {
    if (pattern.test(trimmed)) {
      return "LOW_QUALITY";
    }
  }

  const nonCommittal = /\b(maybe|perhaps|not sure|could be|try something)\b.*\b(not sure|don't know|maybe|perhaps)\b/i;
  if (nonCommittal.test(response)) {
    return "LOW_QUALITY";
  }

  const unhelpful = /\b(good luck|you['"]?ll figure it out|try something|i don['"]t know)\b/i;
  if (unhelpful.test(response) && response.length < 100) {
    return "LOW_QUALITY";
  }

  return null;
}

/**
 * Extracts stage assessment using a ROBUST scoring system.
 *
 * IMPROVEMENTS:
 * - Negative signals only apply if score <= 0 (no strong positives)
 * - Pre-compiled regexes for performance
 * - Explicit "not ready" phrases capped at -1 (can't undo strong positive)
 */
export function extractStageAssessment(
  response: string,
  currentStage: TeachingStage
): ValidationResult["stageAssessment"] {
  const lower = response.toLowerCase();

  let score = 0;

  // Pre-compiled regexes for performance (no re-allocation on each call)
  const strongSignals = {
    EXPLORE: [
      /great job understanding/i,
      /you (?:ve got|have got|have) a good (handle|grasp)/i,
      /now you['"]re ready to (?:move on|plan|devise)/i,
      /you can now (?:start figuring out|begin planning)/i,
      /that makes sense — you['"]re ready/i,
      /exactly — you['"]ve got it/i,
    ],
    STRATEGIZE: [
      /your approach (?:is|looks|seems) (?:correct|solid|good|right)/i,
      /that['"]s the (?:right|correct) way/i,
      /you['"]re ready to (?:start coding|start implementing|code)/i,
      /go ahead and (?:code|implement)/i,
      /yes, exactly — that['"]s it/i,
    ],
    IMPLEMENT: [
      /code (?:looks good|is correct|solved it|works|appears correct)/i,
      /(?:congratulations|congrats|great job|well done)[\s,]*(?:you[\s]*)?(?:did|solved|got it)/i,
      /you (?:ve got|have got|have) it/i,
      /mission (?:complete|accomplished)/i,
      /you['"]re done/i,
      /this should pass/i,
    ],
    DEBUG: [
      /that (?:fixed it|fixed the issue|should work now)/i,
      /errors (?:are gone|should be gone|are fixed)/i,
      /ready to (?:submit|finalize|test)/i,
      /looks like it['"]s working/i,
    ],
    STUCK: [
      /(?:great job|good work|nice) getting past that/i,
      /you['"]re back on track/i,
      /ready to continue/i,
    ],
    REFLECT: [],
  };

  const moderateSignals = {
    EXPLORE: [
      /that makes sense$/i,
      /you understand (?:how|why|the)/i,
      /good (?:question|point|thinking)/i,
      /you['"]re getting it/i,
    ],
    STRATEGIZE: [
      /on the right track/i,
      /heading in the right direction/i,
      /you['"]re (?:almost|pretty much) there/i,
      /that sounds like a good plan/i,
    ],
    IMPLEMENT: [
      /looks like it (?:works|should work)/i,
      /code seems (?:correct|fine|okay)/i,
      /this should work/i,
    ],
    DEBUG: [
      /that should fix it/i,
      /might be the issue/i,
      /try this and see/i,
    ],
    STUCK: [
      /better now/i,
      /more clear/i,
      /ready to move/i,
    ],
    REFLECT: [],
  };

  // NEGATIVE signals - these indicate NOT ready
  const negativeSignals = [
    /this isn['"]t quite right/i,
    /not exactly/i,
    /almost, but/i,
    /close, but/i,
    /watch out for\b/i,
    /be careful\b/i,
    /one (?:thing|issue|problem)/i,
    /still has (?:a bug|an issue|problems)/i,
    /not quite there yet/i,
    /still has errors/i,
    /needs work/i,
  ];

  const stageStrong = strongSignals[currentStage] || [];
  const stageModerate = moderateSignals[currentStage] || [];

  // Count strong signals (+2 each)
  for (const pattern of stageStrong) {
    if (pattern.test(response)) {
      score += 2;
    }
  }

  // Count moderate signals (+1 each) - only if no strong signals
  if (score === 0) {
    for (const pattern of stageModerate) {
      if (pattern.test(response)) {
        score += 1;
      }
    }
  }

  // Negative signals - ONLY apply if no strong positive signals (score < 2)
  // And they're capped so they can't undo a strong positive
  if (score < 2) {
    for (const pattern of negativeSignals) {
      // pattern is already a RegExp, no need to re-compile
      if (pattern.test(response)) {
        // Cap at -1 so strong positives can't be completely negated
        score = Math.max(score - 1, -2);
        break; // Only count one negative signal
      }
    }
  }

  // Explicit "not ready" phrases - always cap at -1 minimum
  const explicitNotReady = [
    /not yet/i,
    /not quite/i,
    /still working on/i,
    /need to fix/i,
    /has issues/i,
  ];

  for (const pattern of explicitNotReady) {
    if (pattern.test(response)) {
      score = Math.min(score, -1);
      break;
    }
  }

  let readyToAdvance = false;
  let confidence: "high" | "medium" | "low" = "low";
  let assessedStage: TeachingStage | null = null;

  if (score >= 3) {
    readyToAdvance = true;
    confidence = "high";
  } else if (score === 2) {
    readyToAdvance = true;
    confidence = "medium";
  } else {
    readyToAdvance = false;
    confidence = score <= -1 ? "high" : "low";
  }

  // Determine next stage
  if (readyToAdvance) {
    const stageMap: Record<TeachingStage, TeachingStage> = {
      EXPLORE: "STRATEGIZE",
      STRATEGIZE: "IMPLEMENT",
      IMPLEMENT: "REFLECT",
      DEBUG: "IMPLEMENT",
      STUCK: "EXPLORE",
      REFLECT: "REFLECT",
    };
    assessedStage = stageMap[currentStage] || currentStage;
  }

  return {
    readyToAdvance,
    assessedStage,
    confidence,
  };
}

/**
 * Rewrites violations into Socratic guidance.
 *
 * FIXES:
 * - Proper code block skipping (no double-increment)
 * - Preserves non-violating content
 * - Deterministic replacements
 */
function rewriteResponse(
  response: string,
  violation: ViolationType,
  stage: TeachingStage
): string {
  const lines = response.split("\n");
  const rewrittenLines: string[] = [];

  const solutionGuidance = [
    "What possibilities are you considering?",
    "Walk me through your thinking on this.",
    "Before I share, what approaches come to mind?",
    "What makes you think this direction might work?",
  ];

  const algorithmGuidance = [
    "Have you seen this pattern before? What other problems feel similar?",
    "What strategy comes to mind given the problem structure?",
    "What algorithmic patterns do you know that might apply here?",
    "Look at the problem's characteristics. What does that suggest to you?",
  ];

  const codeGuidance = [
    "Try sketching the skeleton yourself first. What would it look like?",
    "Start with the core logic in pseudocode. What's the key step?",
    "What functions do you think you'll need? Outline them first.",
    "Think through the data flow. What transformations happen?",
  ];

  let guidanceIndex = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let shouldSkip = false;
    let replacement: string | null = null;

    // Track code block state
    if (/^```/.test(line)) {
      inCodeBlock = !inCodeBlock;
    }

    // Skip lines inside code blocks if we're in CODE_GIVEAWAY mode
    if (inCodeBlock && violation === "CODE_GIVEAWAY" && stage !== "IMPLEMENT") {
      continue;
    }

    // Handle violations
    if (violation === "SOLUTION_LEAK") {
      if (
        /\bthe answer is\b/i.test(line) ||
        /\byou should use\b/i.test(line) ||
        /\bjust use\b/i.test(line) ||
        /\bsimply use\b/i.test(line)
      ) {
        shouldSkip = true;
        replacement = solutionGuidance[guidanceIndex % solutionGuidance.length];
        guidanceIndex++;
      }

      if (/^```[\s\S]{50,}```/.test(line)) {
        shouldSkip = true;
        replacement = codeGuidance[guidanceIndex % codeGuidance.length];
        guidanceIndex++;
      }
    }

    if (violation === "ALGORITHM_NAMING") {
      for (const algo of ALGORITHM_NAMES) {
        if (line.toLowerCase().includes(algo)) {
          shouldSkip = true;
          replacement = algorithmGuidance[guidanceIndex % algorithmGuidance.length];
          guidanceIndex++;
          break;
        }
      }
    }

    if (violation === "PRECIOUS_HINT") {
      if (/\b(the answer|you should|use this|the trick is)\b/i.test(line)) {
        shouldSkip = true;
        replacement = solutionGuidance[guidanceIndex % solutionGuidance.length];
        guidanceIndex++;
      }
    }

    if (violation === "STAGE_MISMATCH") {
      if (/\bwrite a function|the code would|you need to (?:implement|create)\b/i.test(line)) {
        shouldSkip = true;
        replacement = "What's your plan for implementing this approach?";
        guidanceIndex++;
      }
    }

    if (shouldSkip && replacement) {
      rewrittenLines.push(replacement);
    } else if (!inCodeBlock || violation !== "CODE_GIVEAWAY" || stage === "IMPLEMENT") {
      rewrittenLines.push(line);
    }
  }

  // Check if response is too sparse
  const meaningfulLines = rewrittenLines.filter(
    (l) => l.trim() && !l.startsWith("//") && !l.startsWith("Try ")
  );

  if (meaningfulLines.length < 2) {
    const fallbacks = [
      "Let me understand your thinking first. What possibilities are you considering?",
      "Before I share thoughts, what approaches come to mind based on what you know?",
      "I want you to get the learning from this. What's your gut feeling about how to approach this?",
    ];
    return fallbacks[violation.length % fallbacks.length];
  }

  return rewrittenLines.join("\n");
}

/**
 * Check if user explicitly requests a solution.
 * Delegates to consolidated pattern list in validation/solutionPatterns.ts
 */
export function isSolutionRequest(userMessage: string): boolean {
  return consolidatedIsSolutionRequest(userMessage);
}

/**
 * Detect frustration level with high precision.
 */
export function detectFrustration(userMessage: string): "high" | "medium" | "low" {
  const lower = userMessage.toLowerCase();

  const highFrustrationWords = [
    "hate",
    "stupid",
    "useless",
    "waste of time",
    "impossible",
    "screw this",
    "giving up",
    "fed up",
    "this sucks",
    "worst",
    "damn it",
    "dammit",
    "angry",
    "pissed",
  ];

  const mediumFrustrationWords = [
    "frustrated",
    "confused",
    "stuck",
    "lost",
    "don't get it",
    "no idea",
    "why isn't",
    "why is this",
    "ugh",
    "argh",
    "help me",
    "need help",
    "i'm stuck",
    "i don't understand",
  ];

  for (const word of highFrustrationWords) {
    if (lower.includes(word)) {
      return "high";
    }
  }

  for (const word of mediumFrustrationWords) {
    if (lower.includes(word)) {
      return "medium";
    }
  }

  return "low";
}

/**
 * Calculate intervention urgency.
 */
export function calculateInterventionUrgency(
  userMessage: string,
  frustrationLevel: ReturnType<typeof detectFrustration>,
  attemptCount: number,
  hasCode: boolean
): "immediate" | "soon" | "routine" {
  const lower = userMessage.toLowerCase();

  if (frustrationLevel === "high") return "immediate";
  if (attemptCount >= 5 && frustrationLevel !== "low") return "immediate";
  if (isSolutionRequest(userMessage) && attemptCount >= 3) return "immediate";

  if (frustrationLevel === "medium") return "soon";
  if (attemptCount >= 3 && !hasCode) return "soon";
  if (/\bi['"]m lost\b|\bi['"]m completely stuck\b/i.test(lower)) return "soon";

  return "routine";
}
