import { IntentType } from "../intent/patterns";
import { IntentClassification } from "../intent/core";

export const CACHE_SAFETY_CONFIG: Record<IntentType, {
  useCache: boolean;
  saveToCache: boolean;
  requiresValidation: boolean;
  enforceStage: boolean;
  reason: string;
}> = {
  understanding: {
    useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true,
    reason: "Concept explanations must be stage-appropriate"
  },
  hint_request: {
    useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true,
    reason: "Hints must respect current learning stage"
  },
  implementation_help: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Implementation help requires strict stage enforcement"
  },
  debugging: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Debugging is student-specific"
  },
  solution_request: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Solution requests require strict enforcement"
  },
  clarification: {
    useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true,
    reason: "Clarifications should be stage-aware"
  },
  progress_check: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Progress checks are context-specific"
  },
  frustration: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Emotional support is personalized"
  },
  confirmation: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Validation is context-specific"
  },
  off_topic: {
    useCache: false, saveToCache: false, requiresValidation: false, enforceStage: false,
    reason: "Off-topic doesn't need stage control"
  },
  code_review: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Code review is user-specific"
  },
  optimization: {
    useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true,
    reason: "Optimization advice should respect stage"
  },
  test_case_question: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Test cases are specific"
  },
  approach_validation: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Approach validation is context-specific"
  },
  edge_case_help: {
    useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true,
    reason: "Edge case help is situation-specific"
  },
  pattern_recognition: {
    useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true,
    reason: "Pattern discussion benefits from caching"
  },
  transfer_learning: {
    useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true,
    reason: "Transfer learning discussions are valuable"
  },
};

const USER_SPECIFIC_PATTERNS = [
  "your code", "your solution", "you wrote", "your approach",
  "your function", "your variable", "your loop", "your if statement",
  "the code you provided", "your bug", "your error",
  "debug your", "fix your", "your implementation",
];

const EMOTIONAL_PATTERNS = [
  "i understand you're", "i can see that", "don't worry",
  "you're doing great", "hang in there", "i'm here to help you",
];

export function isUserSpecificResponse(response: string): boolean {
  const lower = response.toLowerCase();
  const hasUserRef = USER_SPECIFIC_PATTERNS.some(p => lower.includes(p));
  const hasErrorContent = /error at line|exception in|stack trace|syntax error in your|your bug/i.test(lower);
  return hasUserRef || hasErrorContent;
}

export function shouldSkipCacheLookup(
  input: string,
  classification: IntentClassification
): { skip: boolean; reason: string } {
  if (!classification.shouldEnforceStage) {
    return { skip: true, reason: `Intent "${classification.intent}" does not require stage enforcement` };
  }

  const neverCacheIntents: IntentType[] = [
    "debugging", "code_review", "frustration", "progress_check",
    "confirmation", "solution_request", "implementation_help", "test_case_question"
  ];

  if (neverCacheIntents.includes(classification.intent)) {
    return { skip: true, reason: `Intent "${classification.intent}" is user-specific and not cacheable` };
  }

  if (input.split(/\s+/).length < 3) {
    return { skip: true, reason: "Input too short for meaningful cache lookup" };
  }

  const lower = input.toLowerCase();
  const hasStrongPersonal = /\b(my|i'm|i am|i've|i have|me)\b/.test(lower);
  if (hasStrongPersonal && !['understanding', 'clarification', 'hint_request'].includes(classification.intent)) {
    return { skip: true, reason: "Input contains personal pronouns - likely user-specific context" };
  }

  return { skip: false, reason: "Cache lookup recommended" };
}

export interface CacheEligibilityResult {
  save: boolean;
  reason: string;
}

export function shouldSaveResponseToCache(
  response: string,
  classification: IntentClassification
): CacheEligibilityResult {
  const intentConfig = CACHE_SAFETY_CONFIG[classification.intent];
  if (!intentConfig?.saveToCache) {
    return { save: false, reason: `Intent "${classification.intent}" is not cacheable` };
  }

  return analyzeResponseForCacheEligibility(response, classification.intent);
}

function analyzeResponseForCacheEligibility(
  response: string,
  intent: IntentType
): CacheEligibilityResult {
  const lower = response.toLowerCase();

  if (response.length < 50) {
    return { save: false, reason: "Response too short to cache" };
  }

  if (isUserSpecificResponse(response)) {
    return { save: false, reason: "Response contains user-specific references" };
  }

  const hasErrorContent = /error:|exception:|stack trace|line \d+|at \w+\(/.test(lower);
  if (hasErrorContent && (intent === "debugging" || intent === "code_review")) {
    return { save: false, reason: "Response contains error-specific content" };
  }

  const hasEmotionalContent = EMOTIONAL_PATTERNS.some(p => {
    const escaped = p.replace(/['']/g, "['']?");
    return new RegExp(escaped, "i").test(lower);
  });
  if (hasEmotionalContent && intent === "frustration") {
    return { save: false, reason: "Response is personalized emotional support" };
  }

  const hasCodeBlock = /```[\s\S]*?```/.test(response);
  if (hasCodeBlock && intent !== "understanding" && intent !== "clarification") {
    const codeBlockLength = (response.match(/```[\s\S]*?```/g) || [])
      .reduce((sum, block) => sum + block.length, 0);
    if (codeBlockLength > 200) {
      return { save: false, reason: "Response contains substantial code blocks" };
    }
  }

  return { save: true, reason: "Response is generic and cacheable" };
}

export function isCacheCompatible(
  cacheStage: string,
  cacheRung: number,
  currentStage: string,
  currentRung: number,
): boolean {
  const stageOrder = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "REFLECT", "STUCK"];
  const cacheStageIdx = stageOrder.indexOf(cacheStage);
  const currentStageIdx = stageOrder.indexOf(currentStage);

  if (cacheStageIdx === -1 || currentStageIdx === -1) return false;

  const stageDiff = currentStageIdx - cacheStageIdx;

  if (stageDiff > 1) return false;

  if (cacheStage === "STUCK" && currentStage !== "STUCK") return false;

  const rungDiff = Math.abs(cacheRung - currentRung);
  if (rungDiff > 2) return false;

  if (cacheRung === 0 && currentRung > 2) return false;

  return true;
}
