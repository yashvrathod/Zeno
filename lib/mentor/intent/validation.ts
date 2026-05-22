import { IntentType } from "./patterns";
import { IntentClassification } from "./core";
import {
  shouldSkipCacheLookup as eligibilityShouldSkip,
  shouldSaveResponseToCache as eligibilityShouldSave,
  isUserSpecificResponse as eligibilityIsUserSpecific,
  isCacheCompatible as eligibilityIsCompatible,
} from "../cache/eligibility";

export {
  eligibilityShouldSkip as shouldSkipCacheLookup,
  eligibilityShouldSave as shouldSaveResponseToCache,
  eligibilityIsUserSpecific as isUserSpecificResponse,
  eligibilityIsCompatible as isCacheCompatible,
};

export const CACHE_SAFETY_CONFIG = {
  understanding: { useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true, reason: "Concept explanations must be stage-appropriate" },
  hint_request: { useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true, reason: "Hints must respect current learning stage" },
  implementation_help: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Implementation help requires strict stage enforcement" },
  debugging: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Debugging is student-specific" },
  solution_request: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Solution requests require strict enforcement" },
  clarification: { useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true, reason: "Clarifications should be stage-aware" },
  progress_check: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Progress checks are context-specific" },
  frustration: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Emotional support is personalized" },
  confirmation: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Validation is context-specific" },
  off_topic: { useCache: false, saveToCache: false, requiresValidation: false, enforceStage: false, reason: "Off-topic doesn't need stage control" },
  code_review: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Code review is user-specific" },
  optimization: { useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true, reason: "Optimization advice should respect stage" },
  test_case_question: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Test cases are specific" },
  approach_validation: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Approach validation is context-specific" },
  edge_case_help: { useCache: false, saveToCache: false, requiresValidation: true, enforceStage: true, reason: "Edge case help is situation-specific" },
  pattern_recognition: { useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true, reason: "Pattern discussion benefits from caching" },
  transfer_learning: { useCache: true, saveToCache: true, requiresValidation: true, enforceStage: true, reason: "Transfer learning discussions are valuable" },
} as const;

export function analyzeResponseForCacheEligibility(
  response: string,
  intent: IntentType
): { shouldCache: boolean; reason: string } {
  const classification: IntentClassification = {
    intent,
    confidence: "medium",
    shouldEnforceStage: true,
    requiresValidation: true,
    reason: "delegated",
    keywords: [],
  };
  const result = eligibilityShouldSave(response, classification);
  return { shouldCache: result.save, reason: result.reason };
}
