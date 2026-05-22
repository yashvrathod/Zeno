/**
 * Enhanced Intent Classification with Conversation Context
 *
 * Builds upon the base intent classifier by adding:
 * 1. Multi-turn conversation intent tracking
 * 2. Semantic similarity for paraphrased intents
 * 3. Confusion loop detection
 * 4. Context-aware intent weighting
 * 5. Cross-message pattern recognition
 */

import type { IntentClassification, IntentType } from "./intent";
import { classifyIntent as baseClassify } from "./intent";
import { bigramJaccard } from '@/lib/embeddings';

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION INTENT TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export type ConversationIntent = {
  primaryIntent: IntentType;
  secondaryIntents: IntentType[];
  confidence: IntentClassification['confidence']; 
  shouldEnforceStage: boolean;
  requiresValidation: boolean;
  reason: string;
  metadata: IntentClassification['metadata'] & {
    intentHistory: {
      intent: IntentType;
      messageIndex: number;
      similarityToCurrent: number;
    }[];
    isConfusionLoop: boolean;
    isSolutionEscalation: boolean;
    isStuckPattern: boolean;
    repeatingIntent: boolean;
  };
};

/**
 * Intent sequences that indicate specific learning patterns
 */
const INTENT_SEQUENCES = {
  confusion_loop: ['understanding', 'clarification', 'understanding'],
  solution_escalation: ['hint_request', 'implementation_help', 'solution_request'],
  debugging_cycle: ['debugging', 'implementation_help', 'debugging'],
  stuck_pattern: ['frustration', 'hint_request', 'frustration'],
  exploration: ['understanding', 'clarification', 'understanding', 'approach_validation'],
} as const;

type IntentSequenceKey = keyof typeof INTENT_SEQUENCES;

/**
 * Analyzes conversation history to detect intent patterns
 */
export function analyzeIntentPattern(
  messageIntents: IntentClassification[],
  currentIntent: IntentClassification
): {
  matchedSequence: IntentSequenceKey | null;
  isConfusionLoop: boolean;
  isSolutionEscalation: boolean;
  isStuckPattern: boolean;
  repeatingIntent: boolean;
} {
  const intentHistory = messageIntents.map(m => m.intent);
  const recentIntents = intentHistory.slice(-5);
  const current = currentIntent.intent;

  // Check for known sequences
  let matchedSequence: IntentSequenceKey | null = null;

  for (const [key, sequence] of Object.entries(INTENT_SEQUENCES)) {
    if (matchesSequence(recentIntents, sequence as unknown as IntentType[])) {
      matchedSequence = key as IntentSequenceKey;
      break;
    }
  }

  // Check for confusion loop (repeating understanding/clarification)
  const confusionIntents = ['understanding', 'clarification'];
  const confusionCount = recentIntents.filter(i => confusionIntents.includes(i)).length;
  const isConfusionLoop = confusionCount >= 3 && recentIntents.length >= 3;

  // Check for solution escalation (hint → implementation → solution)
  const escalationStart = recentIntents.indexOf('hint_request');
  const isSolutionEscalation =
    escalationStart >= 0 &&
    recentIntents.includes('implementation_help') &&
    current === 'solution_request';

  // Check for stuck pattern (frustration cycle)
  const frustrationCount = recentIntents.filter(i => i === 'frustration').length;
  const isStuckPattern = frustrationCount >= 2 && recentIntents.length >= 3;

  // Check if current intent repeats recent ones (semantic similarity)
  const repeatingIntent = checkRepeatingIntent(messageIntents, currentIntent);

  return {
    matchedSequence,
    isConfusionLoop,
    isSolutionEscalation,
    isStuckPattern,
    repeatingIntent
  };
}

/**
 * Checks if intent sequence matches a known pattern
 */
function matchesSequence(
  history: IntentType[],
  pattern: IntentType[]
): boolean {
  if (history.length < pattern.length) return false;

  const recent = history.slice(-pattern.length);
  return recent.every((intent, i) => intent === pattern[i]);
}

/**
 * Detects if user is repeating semantically similar intents
 */
function checkRepeatingIntent(
  previousIntents: IntentClassification[],
  currentIntent: IntentClassification
): boolean {
  if (previousIntents.length === 0) return false;

  const recent = previousIntents.slice(-3);
  const matchingCount = recent.filter(prev => prev.intent === currentIntent.intent).length;

  return matchingCount >= 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT-AWARE INTENT CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export type ClassificationContext = {
  stage?: string;
  previousIntents?: IntentClassification[];
  problemType?: string;
  userFrustrationLevel?: number;
  attemptCount?: number;
};

/**
 * Enhanced intent classification with conversation context awareness
 */
export function classifyIntentWithContext(
  input: string,
  context?: ClassificationContext
): ConversationIntent {
  // Get base classification
  const base = baseClassify(input);

  // Analyze context
  const contextAnalysis = analyzeContext(input, base, context);

  // Adjust confidence based on context
  const adjustedConfidence = adjustConfidence(base.confidence, contextAnalysis);

  // Build conversation intent
  return {
    primaryIntent: base.intent,
    secondaryIntents: contextAnalysis.secondaryIntents,
    confidence: adjustedConfidence,
    shouldEnforceStage: base.shouldEnforceStage,
    requiresValidation: base.requiresValidation,
    reason: base.reason,
    metadata: {
      ...base.metadata,
      intentHistory: contextAnalysis.intentHistory,
      isConfusionLoop: contextAnalysis.isConfusionLoop,
      isSolutionEscalation: contextAnalysis.isSolutionEscalation,
      isStuckPattern: contextAnalysis.isStuckPattern,
      repeatingIntent: contextAnalysis.repeatingIntent
    }
  };
}

/**
 * Analyzes classification context for additional insights
 */
function analyzeContext(
  input: string,
  baseIntent: IntentClassification,
  context?: ClassificationContext
): {
  secondaryIntents: IntentType[];
  intentHistory: ConversationIntent['metadata']['intentHistory'];
  isConfusionLoop: boolean;
  isSolutionEscalation: boolean;
  isStuckPattern: boolean;
  repeatingIntent: boolean;
} {
  const secondaryIntents: IntentType[] = [];
  const inputLower = input.toLowerCase();

  // Detect secondary intents
  if (baseIntent.intent === 'understanding' && /how.*implement/.test(inputLower)) {
    secondaryIntents.push('implementation_help');
  }

  if (baseIntent.intent === 'debugging' && /why.*wrong/.test(inputLower)) {
    secondaryIntents.push('understanding');
  }

  // Build intent history from context
  const intentHistory: ConversationIntent['metadata']['intentHistory'] = [];
  if (context?.previousIntents) {
    context.previousIntents.forEach((prev, index) => {
      const similarity = bigramJaccard(
        prev.reason + ' ' + prev.keywords.join(' '),
        baseIntent.reason + ' ' + baseIntent.keywords.join(' ')
      );

      intentHistory.push({
        intent: prev.intent,
        messageIndex: index,
        similarityToCurrent: similarity
      });
    });
  }

  // Context-specific adjustments
  if (context?.userFrustrationLevel && context.userFrustrationLevel > 0.7) {
    if (!secondaryIntents.includes('frustration')) {
      secondaryIntents.unshift('frustration');
    }
  }

  if (context?.attemptCount && context.attemptCount > 3) {
    secondaryIntents.push('frustration');
  }

  const patternAnalysis = context?.previousIntents
    ? analyzeIntentPattern(context.previousIntents, baseIntent)
    : null;

  const isStuckPattern = (patternAnalysis?.isStuckPattern ?? false) ||
    (context?.attemptCount && context.attemptCount > 3) ||
    (context?.userFrustrationLevel && context.userFrustrationLevel > 0.7);

  return {
    secondaryIntents,
    intentHistory,
    isConfusionLoop: patternAnalysis?.isConfusionLoop ?? false,
    isSolutionEscalation: patternAnalysis?.isSolutionEscalation ?? false,
    isStuckPattern,
    repeatingIntent: patternAnalysis?.repeatingIntent ?? false,
  };
}

/**
 * Adjusts confidence based on contextual factors
 */
function adjustConfidence(
  baseConfidence: IntentClassification['confidence'],
  contextAnalysis: ReturnType<typeof analyzeContext>
): IntentClassification['confidence'] {
  let confidenceValue = {
    high: 3,
    medium: 2,
    low: 1
  }[baseConfidence];

  // Increase confidence with multiple signals
  if (contextAnalysis.secondaryIntents.length > 0) {
    confidenceValue = Math.min(3, confidenceValue + 1);
  }

  // Decrease confidence for confusion patterns (uncertain)
  if (contextAnalysis.isConfusionLoop) {
    confidenceValue = Math.max(1, confidenceValue - 1);
  }

  const confidenceMap: Record<number, 'high' | 'medium' | 'low'> = {
    3: 'high',
    2: 'medium',
    1: 'low'
  };

  return confidenceMap[confidenceValue];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROACTIVE INTERVENTION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export type InterventionSignal = {
  type: 'confusion' | 'frustration' | 'stuck' | 'escalation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedAction: string;
};

/**
 * Detects when proactive intervention might be helpful
 */
export function detectInterventionNeed(
  conversationIntent: ConversationIntent,
  recentIntents: IntentClassification[],
  userContext?: {
    frustrationLevel?: number;
    attemptCount?: number;
    timeStalled?: number; // seconds
  }
): InterventionSignal | null {
  const { metadata } = conversationIntent;

  // Confusion loop detection
  if (metadata.isConfusionLoop) {
    return {
      type: 'confusion',
      severity: 'high',
      description: 'User appears stuck in understanding/clarification loop',
      suggestedAction: 'Offer concrete example or alternative explanation approach'
    };
  }

  // Frustration escalation
  if (metadata.isStuckPattern || (userContext?.frustrationLevel || 0) > 0.8) {
    return {
      type: 'frustration',
      severity: 'high',
      description: 'User showing signs of frustration',
      suggestedAction: 'Empathize and offer more direct guidance than usual'
    };
  }

  // Solution escalation pattern
  if (metadata.isSolutionEscalation) {
    return {
      type: 'escalation',
      severity: 'medium',
      description: 'User escalating toward solution request after hints',
      suggestedAction: 'Acknowledge frustration, offer minimal targeted help'
    };
  }

  // Stalled for too long
  if (userContext?.timeStalled && userContext.timeStalled > 300) { // 5 minutes
    return {
      type: 'stuck',
      severity: 'medium',
      description: 'User stalled without progress for extended time',
      suggestedAction: 'Offer gentle check-in and targeted hint'
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT-AWARE ROUTING DECISIONS
// ─────────────────────────────────────────────────────────────────────────────

export type RoutingDecision = {
  shouldUseCache: boolean;
  skipCacheReason?: string;
  requiresValidation: boolean;
  stageEnforcement: 'strict' | 'lenient' | 'adaptive';
  priority: 'high' | 'normal' | 'low';
  suggestedResponseType: 'direct' | 'guided' | 'interactive' | 'empathetic';
};

/**
 * Makes routing decisions based on enhanced intent classification
 */
export function makeRoutingDecision(
  conversationIntent: ConversationIntent,
  context?: ClassificationContext
): RoutingDecision {
  const { primaryIntent, metadata, confidence } = conversationIntent;

  // Cache decisions
  let shouldUseCache = true;
  let skipCacheReason: string | undefined;

  if (metadata.isSolutionEscalation || metadata.isStuckPattern) {
    shouldUseCache = false;
    skipCacheReason = 'Pattern indicates need for personalized response';
  } else if (confidence === 'low') {
    shouldUseCache = false;
    skipCacheReason = 'Low confidence classification';
  }

  // Validation requirements
  const requiresValidation =
    conversationIntent.requiresValidation ||
    metadata.isConfusionLoop ||
    primaryIntent === 'solution_request';

  // Stage enforcement strictness
  let stageEnforcement: 'strict' | 'lenient' | 'adaptive' = 'strict';
  if (metadata.isConfusionLoop || (context?.userFrustrationLevel || 0) > 0.7) {
    stageEnforcement = 'lenient';
  } else if (metadata.isSolutionEscalation) {
    stageEnforcement = 'strict';
  } else {
    stageEnforcement = 'adaptive';
  }

  // Priority
  let priority: 'high' | 'normal' | 'low' = 'normal';
  if (metadata.isConfusionLoop || metadata.isStuckPattern) {
    priority = 'high';
  } else if (primaryIntent === 'hint_request' || primaryIntent === 'frustration') {
    priority = 'high';
  }

  // Response type
  let suggestedResponseType: 'direct' | 'guided' | 'interactive' | 'empathetic' = 'guided';
  if (metadata.isConfusionLoop || (context?.userFrustrationLevel || 0) > 0.6) {
    suggestedResponseType = 'empathetic';
  } else if (primaryIntent === 'debugging' || primaryIntent === 'implementation_help') {
    suggestedResponseType = 'interactive';
  } else if (primaryIntent === 'understanding' || primaryIntent === 'clarification') {
    suggestedResponseType = 'guided';
  } else {
    suggestedResponseType = 'direct';
  }

  return {
    shouldUseCache,
    skipCacheReason,
    requiresValidation,
    stageEnforcement,
    priority,
    suggestedResponseType
  };
}