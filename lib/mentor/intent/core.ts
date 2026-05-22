import { startTimer } from "@/lib/debug";
import { IntentType, INTENT_PATTERNS } from "./patterns";
import { isHardSolutionRequest } from "../validation/solutionPatterns";

export type IntentConfidence = "high" | "medium" | "low";

export type IntentClassification = {
  intent: IntentType;
  confidence: IntentConfidence;
  shouldEnforceStage: boolean;
  requiresValidation: boolean;
  reason: string;
  keywords: string[];
  metadata?: {
    hasCodeReference?: boolean;
    hasExplicitFrustration?: boolean;
    hasSolutionDemand?: boolean;
    hasPatternMention?: boolean;
  };
};

export function classifyIntent(input: string): IntentClassification {
  const timer = startTimer("classifyIntent");
  const lowerInput = input.toLowerCase().trim();

  const explicitFrustration = checkExplicitFrustration(lowerInput);

  const scores: Record<IntentType, number> = {} as Record<IntentType, number>;
  const matchedKeywords: Record<IntentType, string[]> = {} as Record<IntentType, string[]>;
  const patternMatches: Record<IntentType, string[]> = {} as Record<IntentType, string[]>;

  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    const keywords: string[] = [];
    const patterns: string[] = [];

    for (const keyword of config.keywords) {
      if (lowerInput.includes(keyword)) {
        score += config.weight;
        keywords.push(keyword);
      }
    }

    for (const pattern of config.patterns) {
      if (pattern.test(lowerInput)) {
        score += config.weight * 1.5;
        patterns.push(pattern.toString());
      }
    }

    scores[intent as IntentType] = score;
    matchedKeywords[intent as IntentType] = keywords;
    patternMatches[intent as IntentType] = patterns;
  }

  if (explicitFrustration.isFrustration && scores.frustration < 1.0) {
    scores.frustration = 1.0;
    matchedKeywords.frustration.push(explicitFrustration.matchedPhrase || "frustration");
  }

  if (isHardSolutionRequest(lowerInput)) {
    scores.solution_request = Math.max(scores.solution_request, 2.0);
  }

  let bestIntent: IntentType = "hint_request";
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent as IntentType;
    }
  }

  let confidence: IntentConfidence;
  if (bestScore >= 2.0) {
    confidence = "high";
  } else if (bestScore >= 1.0) {
    confidence = "medium";
  } else if (bestScore >= 0.5) {
    confidence = "low";
  } else {
    confidence = "low";
    bestIntent = "hint_request";
  }

  const metadata = extractMetadata(lowerInput, bestIntent);
  const allMatched = [...matchedKeywords[bestIntent], ...patternMatches[bestIntent]];

  const shouldEnforce = bestIntent !== "off_topic";
  const requiresVal = bestIntent !== "off_topic";

  timer();

  return {
    intent: bestIntent,
    confidence,
    shouldEnforceStage: shouldEnforce,
    requiresValidation: requiresVal,
    reason: `confidence: ${confidence}, score: ${bestScore.toFixed(2)}`,
    keywords: allMatched,
    metadata,
  };
}

function checkExplicitFrustration(input: string): { isFrustration: boolean; matchedPhrase?: string } {
  const frustrationPhrases = [
    /i'm (so|very|really|extremely) (frustrated|stuck|confused)/i,
    /(frustrated|stuck|confused) and (can't|cannot)/i,
    /i (can't|cannot) (figure|get|understand) this/i,
    /this is (frustrating|impossible|pointless)/i,
    /i've (tried|been) (for|\d+) (hours?|days?)/i,
  ];

  for (const phrase of frustrationPhrases) {
    const match = input.match(phrase);
    if (match) {
      return { isFrustration: true, matchedPhrase: match[0] };
    }
  }

  return { isFrustration: false };
}

function extractMetadata(input: string, intent: IntentType): IntentClassification["metadata"] {
  const meta: IntentClassification["metadata"] = {};
  if (/```|[a-zA-Z_]+\s*\(|function\s+\w+|def\s+\w+|class\s+\w+/.test(input)) {
    meta.hasCodeReference = true;
  }
  if (intent === "frustration" || checkExplicitFrustration(input).isFrustration) {
    meta.hasExplicitFrustration = true;
  }
  if (intent === "solution_request") {
    meta.hasSolutionDemand = true;
  }
  return meta;
}
