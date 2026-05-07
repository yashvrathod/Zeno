/**
 * Stage Controller - Enforces Learning Stage Progression
 *
 * REPLACES the fragile regex-based SOLUTION_REQUEST_PATTERNS with a robust,
 * stage-aware enforcement mechanism.
 *
 * CORE PRINCIPLE: Never allow full solutions in early stages. Instead, redirect
 * the student's request into appropriate stage-appropriate guidance.
 *
 * The stage controller is the CENTRAL ENFORCEMENT LAYER that all intents
 * pass through before generating a response.
 */

import type { TeachingStage } from "@/lib/mentorContext";
import { IntentClassification } from "./intentClassifier";

// ─────────────────────────────────────────────────────────────────────────────
// STAGE DEFINITIONS AND CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The 5-stage learning progression. Each stage has a specific purpose:
 *
 * UNDERSTANDING → Build mental model of the problem
 * STRATEGIZE    → Devise an approach/algorithm
 * IMPLEMENT     → Translate approach into code
 * DEBUG         → Fix errors and verify correctness
 * REFLECT       → Consolidate learning and extract patterns
 */
export type TeachingStage =
  | "EXPLORE"      // Renamed from UNDERSTANDING (legacy compatibility)
  | "STRATEGIZE"   // Renamed from PLANNING
  | "IMPLEMENT"    // Renamed from CODING
  | "DEBUG"        // Renamed from DEBUGGING
  | "STUCK"        // Student needs help
  | "REFLECT";     // Renamed from QA

/**
 * Stage hierarchy - used to determine allowed transitions and
 * whether a stage is "early" (no full solutions allowed).
 */
const STAGE_ORDER: Record<TeachingStage, number> = {
  "EXPLORE": 1,
  "STRATEGIZE": 2,
  "IMPLEMENT": 3,
  "DEBUG": 4,
  "STUCK": 2,  // Can occur at any point
  "REFLECT": 5,
};

// ─────────────────────────────────────────────────────────────────────────────
// STAGE ENFORCEMENT DECISIONS
// ─────────────────────────────────────────────────────────────────────────────

export type EnforcementAction =
  | { type: "ALLOW"; message: string }
  | { type: "REDIRECT"; targetStage: TeachingStage; guidance: string; suggestion: string }
  | { type: "BLOCK"; message: string; fallbackBehavior: string }
  | { type: "ESCALATE"; reason: string; requiredAction: string };

/**
 * Context for enforcement decisions.
 */
export type EnforcementContext = {
  hasFrustration?: boolean;
  repeatedAttempts?: number;
  codeQuality?: "poor" | "fair" | "good";
};

/**
 * Main stage enforcement function.
 *
 * This is called by the intent handler to determine if a student's request
 * (identified by intent) can be fulfilled given their current learning stage.
 *
 * @param intent - The classified intent from intentClassifier
 * @param currentStage - The student's current teaching stage
 * @param context - Additional context for enforcement decisions
 * @returns An enforcement action dictating how to handle the request
 */
export function enforceStage(
  intent: IntentClassification,
  currentStage: TeachingStage,
  context: EnforcementContext = {}
): EnforcementAction {
  const { hasFrustration, repeatedAttempts, codeQuality } = context;

  // Special handling for frustration - never escalate, always support
  if (intent.intent === "frustration") {
    return handleFrustration(currentStage, intent);
  }

  // Determine if this is an early stage (no full solutions)
  const isEarlyStage = STAGE_ORDER[currentStage] <= STAGE_ORDER["IMPLEMENT"];
  const isSolutionRequest = intent.intent === "solution_request";

  // Layer 1: Solution request handling (most restrictive)
  if (isSolutionRequest) {
    return handleSolutionRequest(currentStage, intent, context);
  }

  // Layer 2: Implementation help in early stages
  if (intent.intent === "implementation_help" && isEarlyStage) {
    return handleImplementationHelp(currentStage, intent);
  }

  // Layer 3: Debugging requests before implementation
  if (intent.intent === "debugging" && STAGE_ORDER[currentStage] < STAGE_ORDER["IMPLEMENT"]) {
    return {
      type: "REDIRECT",
      targetStage: "EXPLORE",
      guidance: "Let's understand the problem before debugging code.",
      suggestion: "Can you explain what this problem is asking you to do?"
    };
  }

  // Layer 4: Stage-appropriate allowance
  if (isStageAppropriate(intent.intent, currentStage)) {
    return {
      type: "ALLOW",
      message: `Request is appropriate for ${currentStage} stage`
    };
  }

  // Layer 5: Redirect to appropriate stage
  const redirect = calculateRedirect(intent.intent, currentStage);
  if (redirect) {
    return redirect;
  }

  // Default: Allow through (conservative but safe)
  return {
    type: "ALLOW",
    message: "No restriction applies"
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLUTION REQUEST HANDLER (CORE ENFORCEMENT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles solution requests with stage-appropriate enforcement.
 *
 * This is the PRIMARY DEFENSE against full solution leakage.
 * It NEVER allows full solutions in early stages, regardless of
 * how insistent the student is.
 */
function handleSolutionRequest(
  stage: TeachingStage,
  intent: IntentClassification,
  context: EnforcementContext
): EnforcementAction {
  const hasFrustration = context.hasFrustration || intent.metadata?.hasExplicitFrustration;

  switch (stage) {
    case "EXPLORE":
      return {
        type: "BLOCK",
        message: "Cannot provide solution during problem understanding phase",
        fallbackBehavior: generateExploreGuidance(hasFrustration)
      };

    case "STRATEGIZE":
      return {
        type: "BLOCK",
        message: "Cannot provide solution before developing approach",
        fallbackBehavior: generateStrategyGuidance(hasFrustration)
      };

    case "IMPLEMENT":
      if (hasFrustration) {
        return {
          type: "BLOCK",
          message: "Cannot provide full solution",
          fallbackBehavior: "I can see you're frustrated. Let's focus on one small part. " +
            "What's the specific line or logic that's giving you trouble? I'll help you work through it step by step."
        };
      }
      return {
        type: "BLOCK",
        message: "Cannot provide full solution during implementation phase",
        fallbackBehavior: generateImplementationGuidance(false)
      };

    case "DEBUG":
      return {
        type: "BLOCK",
        message: "Cannot replace your code with a full solution",
        fallbackBehavior: "Let's debug your code together instead of replacing it. " +
          "What test case is failing? Let me help you find the bug in YOUR implementation."
      };

    case "STUCK":
      return {
        type: "ESCALATE",
        reason: "Student is stuck and requesting full solution",
        requiredAction: hasFrustration
          ? "Acknowledge frustration, provide minimal guidance, offer alternative approach explanation"
          : "Guide through systematic debugging, suggest breaking into smaller parts"
      };

    case "REFLECT":
      return {
        type: "BLOCK",
        message: "Solution request in reflection phase suggests incomplete understanding",
        fallbackBehavior: "Let's review your solution and identify what you'd do differently. " +
          "What parts are you unsure about?"
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMPLEMENTATION HELP HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleImplementationHelp(
  stage: TeachingStage,
  intent: IntentClassification
): EnforcementAction {
  switch (stage) {
    case "EXPLORE":
      return {
        type: "REDIRECT",
        targetStage: "EXPLORE",
        guidance: "Let's understand the problem before implementing.",
        suggestion: "Can you walk me through what the problem is asking? What would be the inputs and outputs?"
      };

    case "STRATEGIZE":
      return {
        type: "REDIRECT",
        targetStage: "STRATEGIZE",
        guidance: "Let's solidify the approach before coding.",
        suggestion: "What algorithm or data structure would you use? Can you explain the key steps in plain English?"
      };

    case "IMPLEMENT":
      return {
        type: "ALLOW",
        message: "Implementation help is appropriate for this stage"
      };

    default:
      return {
        type: "ALLOW",
        message: "Implementation help allowed"
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FRUSTRATION HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function handleFrustration(
  stage: TeachingStage,
  intent: IntentClassification
): EnforcementAction {
  const baseGuidance = "I can see you're feeling frustrated. That's completely normal when learning challenging concepts. Let's work through this together. ";

  switch (stage) {
    case "EXPLORE":
      return {
        type: "BLOCK",
        message: "Student is frustrated in early stage",
        fallbackBehavior: baseGuidance +
          "Let's take a step back. Can you tell me in your own words what this problem is asking you to do? " +
          "Sometimes explaining it out loud helps clarify things."
      };

    case "STRATEGIZE":
      return {
        type: "BLOCK",
        message: "Student is frustrated during strategy phase",
        fallbackBehavior: baseGuidance +
          "Let's break this down into smaller pieces. What's the first thing you need to figure out? " +
          "What approaches have you considered so far?"
      };

    case "IMPLEMENT":
      return {
        type: "BLOCK",
        message: "Student is frustrated during implementation",
        fallbackBehavior: baseGuidance +
          "Coding can be tough! Let's focus on one small part at a time. " +
          "What's the specific thing that's not working? Can you show me where you're stuck? " +
          "I'm here to help you figure it out, not to write the code for you."
      };

    case "DEBUG":
      return {
        type: "BLOCK",
        message: "Student is frustrated during debugging",
        fallbackBehavior: baseGuidance +
          "Bugs can be maddening, but you're so close! Let's approach this systematically. " +
          "What's the simplest test case that's failing? Can we trace through it step by step together?"
      };

    case "STUCK":
      return {
        type: "ESCALATE",
        reason: "Student is frustrated and stuck",
        requiredAction: "Provide maximum support without giving solutions: suggest breaks, alternative perspectives, small achievable steps"
      };

    case "REFLECT":
      return {
        type: "BLOCK",
        message: "Student is frustrated after solving",
        fallbackBehavior: baseGuidance +
          "You actually solved this! I know it might not feel like it, but you got through it. " +
          "Let's look at what you accomplished and what you learned. What was the hardest part?"
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE APPROPRIATENESS CHECK
// ─────────────────────────────────────────────────────────────────────────────

function isStageAppropriate(intent: string, stage: TeachingStage): boolean {
  const appropriateness: Record<TeachingStage, string[]> = {
    "EXPLORE": ["understanding", "clarification", "hint_request", "frustration", "confirmation"],
    "STRATEGIZE": ["understanding", "approach_validation", "hint_request", "pattern_recognition", "frustration", "progress_check"],
    "IMPLEMENT": ["implementation_help", "debugging", "hint_request", "frustration", "progress_check", "edge_case_help"],
    "DEBUG": ["debugging", "hint_request", "frustration", "progress_check", "test_case_question"],
    "STUCK": ["frustration", "hint_request", "understanding", "confirmation"],
    "REFLECT": ["understanding", "confirmation", "optimization", "pattern_recognition", "transfer_learning", "approach_validation"]
  };

  return appropriateness[stage]?.includes(intent) || false;
}

// ─────────────────────────────────────────────────────────────────────────────
// REDIRECT CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

function calculateRedirect(
  intent: string,
  currentStage: TeachingStage
): EnforcementAction | null {
  const currentOrder = STAGE_ORDER[currentStage];

  if (currentOrder < STAGE_ORDER["IMPLEMENT"]) {
    return {
      type: "REDIRECT",
      targetStage: currentStage,
      guidance: `Let's focus on the ${currentStage} phase first.`,
      suggestion: getStageSpecificQuestion(currentStage, intent)
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK GUIDANCE GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

function generateExploreGuidance(isFrustrated: boolean): string {
  if (isFrustrated) {
    return "I hear you're frustrated, and that's okay. Let's take a breath and start simpler. Can you tell me what this problem is asking you to do in your own words? What are the inputs, and what should the outputs be? We'll go step by step.";
  }
  return "Let's build our understanding step by step. Can you explain what this problem is asking you to do? What would be a valid output for a given input? What makes this problem tricky or interesting?";
}

function generateStrategyGuidance(isFrustrated: boolean): string {
  if (isFrustrated) {
    return "I know it's tough right now. Let's forget about the perfect solution for a moment. What's the simplest, most obvious approach you could try, even if it's slow? Just describe it in plain English - no code needed yet.";
  }
  return "Let's figure out the approach together. What patterns or techniques do you see that might apply here? Have you seen similar problems before? What would be the first step in solving this? Describe your thinking in plain English.";
}

function generateImplementationGuidance(isFrustrated: boolean): string {
  if (isFrustrated) {
    return "I can see this is really challenging right now. Let's focus on just one piece. What's the smallest part you can tackle? Can you write just the setup, or just one loop? Tell me what you think should happen at each step, and I'll help you translate that into code.";
  }
  return "Let's work through the implementation systematically. What's the core logic you need to code? Can you break it down into 2-3 key steps? For each step, what needs to happen to your variables or data structures?";
}

function getStageSpecificQuestion(stage: TeachingStage, intent: string): string {
  const questions: Record<TeachingStage, string> = {
    "EXPLORE": "What does this problem ask you to do? Can you explain it in your own words?",
    "STRATEGIZE": "What approach are you considering? Can you describe it without code?",
    "IMPLEMENT": "What's the next small piece of code you need to write?",
    "DEBUG": "What's the simplest test case that's failing? Can you trace through it?",
    "STUCK": "What's the specific thing you don't understand? Let's break it down.",
    "REFLECT": "What did you learn from solving this? What pattern does it follow?"
  };
  return questions[stage] || "Can you tell me more about what you're thinking?";
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function getStageFromNumber(stageNum: number): TeachingStage {
  const stages: TeachingStage[] = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "REFLECT"];
  return stages[stageNum - 1] || "EXPLORE";
}

export function isEarlyStage(stage: TeachingStage): boolean {
  return STAGE_ORDER[stage] <= STAGE_ORDER["IMPLEMENT"];
}

export function canAdvanceStage(from: TeachingStage, to: TeachingStage): boolean {
  const fromOrder = STAGE_ORDER[from];
  const toOrder = STAGE_ORDER[to];

  // Allow advancing to next stage
  if (toOrder === fromOrder + 1) return true;

  // Allow staying in same stage
  if (toOrder === fromOrder) return true;

  // Allow moving to STUCK from any stage
  if (to === "STUCK") return true;

  // Allow returning to earlier stage (regression)
  if (toOrder < fromOrder) return true;

  return false;
}
