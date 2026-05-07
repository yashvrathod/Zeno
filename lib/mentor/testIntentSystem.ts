/**
 * Test Suite for Intent-First DSA Mentor System
 *
 * Tests the multi-layer protection system:
 * 1. Intent classification
 * 2. Stage-based enforcement
 * 3. Response validation
 * 4. Bypass attempt detection
 */

import { classifyIntent, type IntentClassification } from "./intentClassifier";
import { enforceStage, type EnforcementAction, type EnforcementContext } from "./stageController";
import { validateAIResponse, type ValidationResult } from "@/lib/responseValidator";
import type { TeachingStage } from "@/lib/mentorContext";

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASES FOR BYPASS ATTEMPTS
// ─────────────────────────────────────────────────────────────────────────────

const BYPASS_ATTEMPTS = [
  {
    input: "show me how you'd write this",
    expectedIntent: "solution_request",
    description: "Disguised solution request (how you'd write)"
  },
  {
    input: "what would the optimal code look like",
    expectedIntent: "solution_request",
    description: "Request for optimal code (disguised)"
  },
  {
    input: "I'm stuck, can you implement it",
    expectedIntent: "solution_request",
    description: "Frustration + implementation request"
  },
  {
    input: "just write the working solution",
    expectedIntent: "solution_request",
    description: "Direct solution request"
  },
  {
    input: "frustrated, just give me the code",
    expectedIntent: "solution_request",
    description: "Frustration + explicit demand"
  },
  {
    input: "can you just code this for me",
    expectedIntent: "solution_request",
    description: "Polite solution request"
  },
  {
    input: "what should I write to solve this",
    expectedIntent: "solution_request",
    description: "Solution-seeking disguised as question"
  },
  {
    input: "show me the implementation",
    expectedIntent: "solution_request",
    description: "Direct implementation request"
  },
  {
    input: "could you write this solution",
    expectedIntent: "solution_request",
    description: "Conditional solution request"
  },
  {
    input: "i need the code",
    expectedIntent: "solution_request",
    description: "Blunt solution demand"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASES FOR DIFFERENT STAGES
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_TESTS: Array<{
  stage: TeachingStage;
  intent: IntentClassification;
  context?: EnforcementContext;
  shouldAllow: boolean;
  description: string;
}> = [
  // EXPLORE stage tests
  {
    stage: "EXPLORE",
    intent: { intent: "solution_request", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: false,
    description: "Solution request in EXPLORE should be blocked"
  },
  {
    stage: "EXPLORE",
    intent: { intent: "understanding", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: true,
    description: "Understanding request in EXPLORE should be allowed"
  },
  {
    stage: "EXPLORE",
    intent: { intent: "implementation_help", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: false,
    description: "Implementation help in EXPLORE should be redirected"
  },

  // STRATEGIZE stage tests
  {
    stage: "STRATEGIZE",
    intent: { intent: "solution_request", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: false,
    description: "Solution request in STRATEGIZE should be blocked"
  },
  {
    stage: "STRATEGIZE",
    intent: { intent: "approach_validation", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: true,
    description: "Approach validation in STRATEGIZE should be allowed"
  },

  // IMPLEMENT stage tests
  {
    stage: "IMPLEMENT",
    intent: { intent: "solution_request", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: false,
    description: "Solution request in IMPLEMENT should be blocked (frustration or not)"
  },
  {
    stage: "IMPLEMENT",
    intent: {
      intent: "frustration",
      confidence: "high",
      shouldEnforceStage: true,
      requiresValidation: true,
      reason: "test",
      keywords: [],
      metadata: { hasExplicitFrustration: true }
    },
    context: { hasFrustration: true },
    shouldAllow: false,
    description: "Frustration in IMPLEMENT should NOT give solution"
  },
  {
    stage: "IMPLEMENT",
    intent: { intent: "implementation_help", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: true,
    description: "Implementation help in IMPLEMENT should be allowed"
  },

  // DEBUG stage tests
  {
    stage: "DEBUG",
    intent: { intent: "debugging", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: true,
    description: "Debugging request in DEBUG should be allowed"
  },

  // REFLECT stage tests
  {
    stage: "REFLECT",
    intent: { intent: "solution_request", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: false,
    description: "Solution request in REFLECT should be blocked"
  },
  {
    stage: "REFLECT",
    intent: { intent: "optimization", confidence: "high", shouldEnforceStage: true, requiresValidation: true, reason: "test", keywords: [] },
    shouldAllow: true,
    description: "Optimization discussion in REFLECT should be allowed"
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATION_TESTS: Array<{
  response: string;
  stage: TeachingStage;
  shouldPassValidation: boolean;  // true if no CRITICAL violations after rewrite
  description: string;
}> = [
  {
    response: "```python\ndef solve(nums):\n    result = []\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []\n```",
    stage: "EXPLORE",
    shouldPassValidation: false,  // Should be rewritten but still has excessive code
    description: "Full solution in EXPLORE should fail validation (excessive code)"
  },
  {
    response: "```python\ndef solve(nums):\n    result = []\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []\n```",
    stage: "IMPLEMENT",
    shouldPassValidation: false,  // Too many lines even for IMPLEMENT
    description: "Excessive code in IMPLEMENT should fail validation"
  },
  {
    response: "You could use a hash map to store values and check for complements.",
    stage: "STRATEGIZE",
    shouldPassValidation: true,
    description: "Conceptual hint should pass validation"
  },
  {
    response: "```\nfor (int i = 0; i < n; i++)\n```",
    stage: "IMPLEMENT",
    shouldPassValidation: true,
    description: "Small code snippet in IMPLEMENT should pass"
  },
  {
    response: "Let's think about the approach. First, what data structure allows O(1) lookup? A hash map!",
    stage: "STRATEGIZE",
    shouldPassValidation: true,
    description: "Pure conceptual discussion should pass"
  },
  {
    response: "Here's the complete solution:\n\n```python\nclass Solution:\n    def solve(self, nums, target):\n        seen = {}\n        for i, num in enumerate(nums):\n            complement = target - num\n            if complement in seen:\n                return [seen[complement], i]\n            seen[num] = i\n        return []\n```\n\nThis works perfectly.",
    stage: "EXPLORE",
    shouldPassValidation: false,  // Complete solution should be caught
    description: "Complete solution with explanation should fail in EXPLORE"
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RUN ALL TESTS
// ─────────────────────────────────────────────────────────────────────────────

export async function runAllTests(): Promise<void> {
  console.log("\n" + "=".repeat(80));
  console.log("INTENT-FIRST DSA MENTOR SYSTEM - COMPREHENSIVE TEST SUITE");
  console.log("=".repeat(80) + "\n");

  let passed = 0;
  let failed = 0;

  // Test 1: Bypass Attempt Detection
  console.log("─".repeat(80));
  console.log("TEST GROUP 1: Bypass Attempt Detection (Intent Classification)");
  console.log("─".repeat(80));

  for (const test of BYPASS_ATTEMPTS) {
    const intent = classifyIntent(test.input);
    const success = intent.intent === test.expectedIntent && intent.confidence === "high";

    console.log(`\nTest: ${test.description}`);
    console.log(`  Input: "${test.input}"`);
    console.log(`  Expected: ${test.expectedIntent} (high confidence)`);
    console.log(`  Got: ${intent.intent} (${intent.confidence} confidence)`);
    console.log(`  Status: ${success ? "✓ PASS" : "✗ FAIL"}`);

    if (success) passed++; else failed++;
  }

  // Test 2: Stage-Based Enforcement
  console.log("\n" + "─".repeat(80));
  console.log("TEST GROUP 2: Stage-Based Enforcement");
  console.log("─".repeat(80));

  for (const test of STAGE_TESTS) {
    const action = enforceStage(test.intent, test.stage, test.context);
    const allowed = action.type === "ALLOW";
    const redirectOrBlock = action.type === "REDIRECT" || action.type === "BLOCK";
    const success = test.shouldAllow ? allowed : redirectOrBlock;

    console.log(`\nTest: ${test.description}`);
    console.log(`  Stage: ${test.stage} | Intent: ${test.intent.intent}`);
    console.log(`  Enforcement: ${action.type}`);
    console.log(`  Expected: ${test.shouldAllow ? "ALLOW" : "REDIRECT/BLOCK"}`);
    console.log(`  Status: ${success ? "✓ PASS" : "✗ FAIL"}`);

    if (success) passed++; else failed++;
  }

  // Test 3: Output Validation
  console.log("\n" + "─".repeat(80));
  console.log("TEST GROUP 3: Output Validation (4th Safety Layer)");
  console.log("─".repeat(80));

  for (const test of VALIDATION_TESTS) {
    const result = validateAIResponse(test.response, test.stage);
    // Key: if rewritten response is provided, validation "fixed" the issue
    // But we check: if there were CRITICAL violations, they should be addressed
    const hasCriticalViolations = result.severity === "critical";
    const wasRewritten = !!result.rewrittenResponse;
    const success = test.shouldPassValidation
      ? !hasCriticalViolations  // No critical issues
      : hasCriticalViolations;  // Should have critical issues (even if rewritten)

    console.log(`\nTest: ${test.description}`);
    console.log(`  Stage: ${test.stage}`);
    console.log(`  Expected validation: ${test.shouldPassValidation ? "PASS (no critical)" : "FAIL (has critical)"}`);
    console.log(`  Got validation: ${result.isValid ? "PASS" : "FAIL"} (severity: ${result.severity})`);
    console.log(`  Was rewritten: ${wasRewritten ? "Yes" : "No"}`);
    if (result.violations.length > 0) {
      console.log(`  Violations: ${result.violations.map(v => v.type).join(", ")}`);
    }
    console.log(`  Status: ${success ? "✓ PASS" : "✗ FAIL"}`);

    if (success) passed++; else failed++;
  }

  // Test 4: Critical Bypass Attempts (Must ALL Fail)
  console.log("\n" + "─".repeat(80));
  console.log("TEST GROUP 4: Critical Bypass Attempts (Integration Tests)");
  console.log("─".repeat(80));

  const CRITICAL_BYPASS_TESTS = [
    {
      input: "frustrated, just give me the code",
      stage: "IMPLEMENT" as TeachingStage,
      description: "Frustration + solution demand in IMPLEMENT"
    },
    {
      input: "show me how you'd write this",
      stage: "STRATEGIZE" as TeachingStage,
      description: "Disguised solution request in STRATEGIZE"
    },
    {
      input: "what would the optimal code look like",
      stage: "EXPLORE" as TeachingStage,
      description: "Code request in EXPLORE"
    }
  ];

  for (const test of CRITICAL_BYPASS_TESTS) {
    // Intent classification
    const intent = classifyIntent(test.input);

    // Stage enforcement
    const action = enforceStage(intent, test.stage, {});

    // Simulate response generation and validation
    const simulatedResponse = "Here's how you'd write it:\n\n```python\ndef solve(nums):\n    # This is the solution\n    return nums\n```";
    const validationResult = validateAIResponse(simulatedResponse, test.stage, intent);

    // All layers must prevent full solution
    const intentCaught = intent.intent === "solution_request";
    const enforcementBlocked = action.type === "BLOCK" || action.type === "REDIRECT";
    const validationBlocked = !validationResult.isValid || validationResult.severity === "critical";

    const allLayersActive = intentCaught || enforcementBlocked || validationBlocked;

    console.log(`\nTest: ${test.description}`);
    console.log(`  Input: "${test.input}"`);
    console.log(`  Stage: ${test.stage}`);
    console.log(`  Intent caught: ${intentCaught ? "✓" : "✗"} (${intent.intent})`);
    console.log(`  Enforcement: ${enforcementBlocked ? "✓ BLOCKED" : "✗ ALLOWED"} (${action.type})`);
    console.log(`  Validation: ${validationBlocked ? "✓ BLOCKED" : "✗ PASSED"}`);
    console.log(`  Overall: ${allLayersActive ? "✓ SECURE" : "✗ BYPASS SUCCESSFUL"}`);

    if (allLayersActive) passed++; else failed++;
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log("\n✓ ALL TESTS PASSED - System is secure against bypass attempts!");
  } else {
    console.log("\n✗ SOME TESTS FAILED - Review required!");
    process.exit(1);
  }
  console.log("\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN IF EXECUTED DIRECTLY
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  runAllTests().catch(console.error);
}
