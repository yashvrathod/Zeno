/**
 * AI Response Failure Detection Tests
 *
 * These tests are designed to identify where the AI fails:
 * 1. Solution leakage (giving away answers)
 * 2. Stage violations (ignoring learning stages)
 * 3. Poor quality responses (unhelpful guidance)
 * 4. Context failures (not using available information)
 */

import { validateAIResponse } from "@/lib/responseValidator";
import { sanitizeResponse, isSolutionRequest, buildSolutionResponse } from "../services/responseGuardrails";
import type { TeachingStage } from "@/lib/mentorContext";
import type { IntentClassification } from "../intentClassifier";

// =============================================================================
// TEST DATA - Real failure scenarios
// =============================================================================

const SOLUTION_LEAKAGE_PATTERNS = [
  "Here's the complete solution:",
  "The answer is:",
  "You can solve it like this:",
  "function solve() {",
  "const answer =",
  "return [",
  "// Complete code:",
  "This is the full implementation:",
];

const STAGE_VIOLATION_PATTERNS = {
  EXPLORE: ["implement", "code", "function", "algorithm", "write"],
  STRATEGIZE: ["debug", "error", "fix", "syntax"],
  IMPLEMENT: ["understand", "explore", "think about"],
  DEBUG: ["plan", "strategy", "approach"],
};

const POOR_QUALITY_INDICATORS = [
  "yes",
  "no",
  "maybe",
  "I don't know",
  "not sure",
  "could be",
  "try something",
  "good luck",
];

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockIntent(intent: string): IntentClassification {
  return {
    intent: intent as any,
    confidence: "high" as any,
    reasoning: "Test intent",
    detectedKeywords: [],
    shouldEnforceStage: true,
    requiresValidation: false,
    metadata: {},
  };
}

// =============================================================================
// TEST SUITE: Solution Leakage Detection
// =============================================================================

describe("AI Failure Detection: Solution Leakage", () => {
  describe("validateAIResponse - Solution Blocking", () => {
    it("should block complete code solutions", () => {
      const maliciousResponse = "Here's the complete solution:\n\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}";

      const result = validateAIResponse(maliciousResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("solution_leakage");
    });

    it("should block direct answer giving", () => {
      const maliciousResponse = "The answer is [0, 1]. You just need to return the indices.";

      const result = validateAIResponse(maliciousResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("solution_leakage");
    });

    it("should block step-by-step solution walkthrough", () => {
      const maliciousResponse = "Step 1: Create a hash map. Step 2: Iterate through the array. Step 3: For each element, check if target - element exists in the map. Step 4: If yes, return the indices. Step 5: Otherwise, add the element to the map.";

      const result = validateAIResponse(maliciousResponse, "EXPLORE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
    });

    it("should allow conceptual explanations", () => {
      const goodResponse = "This problem can be solved using a hash map to store previously seen numbers. The key insight is that for each number, you can check if its complement (target - current number) has already been seen.";

      const result = validateAIResponse(goodResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
    });

    it("should allow solution when explicitly requested", () => {
      const solutionResponse = "Here's the solution:\nfunction solve() { return 42; }";
      const solutionIntent = createMockIntent("solution");

      const result = validateAIResponse(solutionResponse, "IMPLEMENT", solutionIntent);

      expect(result.isValid).toBe(true);
    });
  });

  describe("sanitizeResponse - Legacy Solution Blocking", () => {
    it("should remove code blocks from responses", () => {
      const responseWithCode = "You should use a hash map. Here's an example:\n```\nconst map = new Map();\n```\nThis will help you track seen numbers.";

      const { text, wasViolation } = sanitizeResponse(responseWithCode, false);

      expect(wasViolation).toBe(true);
      expect(text).not.toContain("const map = new Map()");
    });

    it("should remove function signatures", () => {
      const responseWithFunction = "Consider using function twoSum(nums, target) { ... } to solve this.";

      const { text, wasViolation } = sanitizeResponse(responseWithFunction, false);

      expect(wasViolation).toBe(true);
      expect(text).not.toContain("function twoSum");
    });

    it("should preserve non-code content", () => {
      const educationalResponse = "Think about using a data structure that allows O(1) lookups. This will help you find pairs efficiently.";

      const { text, wasViolation } = sanitizeResponse(educationalResponse, false);

      expect(wasViolation).toBe(false);
      expect(text).toBe(educationalResponse);
    });
  });

  describe("isSolutionRequest - Intent Detection", () => {
    it("should detect direct solution requests", () => {
      expect(isSolutionRequest("Just give me the solution")).toBe(true);
      expect(isSolutionRequest("Show me the code")).toBe(true);
      expect(isSolutionRequest("I need the answer")).toBe(true);
    });

    it("should detect subtle solution requests", () => {
      expect(isSolutionRequest("Can you just write it for me?")).toBe(true);
      expect(isSolutionRequest("What's the exact implementation?")).toBe(true);
    });

    it("should not flag legitimate learning requests", () => {
      expect(isSolutionRequest("How should I approach this?")).toBe(false);
      expect(isSolutionRequest("Can you give me a hint?")).toBe(false);
      expect(isSolutionRequest("What's the time complexity?")).toBe(false);
    });
  });
});

// =============================================================================
// TEST SUITE: Stage Violation Detection
// =============================================================================

describe("AI Failure Detection: Stage Violations", () => {
  describe("EXPLORE stage violations", () => {
    it("should detect implementation details in EXPLORE stage", () => {
      const prematureCode = "You should implement this using a for loop with a hash map. Start by declaring your variables.";

      const result = validateAIResponse(prematureCode, "EXPLORE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("stage_violation");
    });

    it("should allow conceptual discussion in EXPLORE stage", () => {
      const conceptualResponse = "This problem involves finding pairs that sum to a target. What data structures do you know that can help with lookups?";

      const result = validateAIResponse(conceptualResponse, "EXPLORE", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
    });
  });

  describe("STRATEGIZE stage violations", () => {
    it("should detect debugging advice in STRATEGIZE stage", () => {
      const debuggingInStrategy = "Your approach is good, but you have a bug in line 5. Fix the off-by-one error.";

      const result = validateAIResponse(debuggingInStrategy, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("stage_violation");
    });

    it("should allow strategic guidance in STRATEGIZE stage", () => {
      const strategicResponse = "Consider using a hash map to store complements. This will give you O(n) time complexity.";

      const result = validateAIResponse(strategicResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
    });
  });

  describe("IMPLEMENT stage violations", () => {
    it("should detect going back to exploration in IMPLEMENT stage", () => {
      const backtrackingResponse = "Let's step back and think about what this problem is really asking...";

      const result = validateAIResponse(backtrackingResponse, "IMPLEMENT", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("stage_violation");
    });

    it("should allow implementation guidance in IMPLEMENT stage", () => {
      const implementationResponse = "You're on the right track! Make sure you're handling the edge case where no solution exists.";

      const result = validateAIResponse(implementationResponse, "IMPLEMENT", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
    });
  });
});

// =============================================================================
// TEST SUITE: Response Quality Detection
// =============================================================================

describe("AI Failure Detection: Response Quality", () => {
  describe("Low quality responses", () => {
    it("should detect too-brief responses", () => {
      const briefResponse = "Yes, that's correct.";

      const result = validateAIResponse(briefResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("low_quality");
    });

    it("should detect non-committal responses", () => {
      const vagueResponse = "Maybe try using a hash map? Or perhaps an array? Not sure which is better.";

      const result = validateAIResponse(vagueResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("low_quality");
    });

    it("should detect unhelpful responses", () => {
      const unhelpfulResponse = "Good luck with this one! You'll figure it out.";

      const result = validateAIResponse(unhelpfulResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(false);
      expect(result.violationType).toBe("low_quality");
    });
  });

  describe("Good quality responses", () => {
    it("should recognize detailed, helpful responses", () => {
      const helpfulResponse = "Great question! A hash map would be ideal here because it provides O(1) lookups. You can store each number as you iterate and check if its complement exists in the map. This approach avoids the O(n²) brute force solution.";

      const result = validateAIResponse(helpfulResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
    });

    it("should recognize pedagogically sound responses", () => {
      const pedagogicalResponse = "Let's think about this step by step. First, what's the brute force approach? Now, how can we optimize it? What data structure would help us avoid checking every pair?";

      const result = validateAIResponse(pedagogicalResponse, "EXPLORE", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
    });
  });
});

// =============================================================================
// TEST SUITE: Context Failure Detection
// =============================================================================

describe("AI Failure Detection: Context Usage", () => {
  describe("Missing context indicators", () => {
    it("should detect when AI ignores user code", () => {
      const contextIgnoringResponse = "You should use a hash map to solve this problem.";

      // This response doesn't acknowledge the user's existing code
      const result = validateAIResponse(contextIgnoringResponse, "IMPLEMENT", createMockIntent("hint"));

      // The response might be valid but shows poor context awareness
      expect(result.isValid).toBe(true);
      expect(result.stageAssessment).toBeDefined();
    });

    it("should detect when AI ignores error messages", () => {
      const errorIgnoringResponse = "Your approach looks good. Keep working on it.";

      const result = validateAIResponse(errorIgnoringResponse, "DEBUG", createMockIntent("debug"));

      expect(result.isValid).toBe(true);
      expect(result.stageAssessment).toBeDefined();
    });
  });

  describe("Good context usage", () => {
    it("should recognize when AI acknowledges user code", () => {
      const contextAwareResponse = "I can see you're using a nested loop approach. While this works, have you considered the time complexity implications?";

      const result = validateAIResponse(contextAwareResponse, "IMPLEMENT", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
      expect(result.stageAssessment).toBeDefined();
    });

    it("should recognize when AI addresses errors", () => {
      const errorAddressingResponse = "I see you're getting a runtime error. This is likely because you're trying to access an array index that doesn't exist. Check your loop bounds.";

      const result = validateAIResponse(errorAddressingResponse, "DEBUG", createMockIntent("debug"));

      expect(result.isValid).toBe(true);
      expect(result.stageAssessment).toBeDefined();
    });
  });
});

// =============================================================================
// TEST SUITE: Edge Cases
// =============================================================================

describe("AI Failure Detection: Edge Cases", () => {
  it("should handle empty responses", () => {
    const result = validateAIResponse("", "STRATEGIZE", createMockIntent("hint"));

    expect(result.isValid).toBe(false);
    });

  it("should handle very long responses", () => {
    const longResponse = "A".repeat(10000);

    const result = validateAIResponse(longResponse, "STRATEGIZE", createMockIntent("hint"));

    expect(result.isValid).toBe(false);
    expect(result.violationType).toBe("low_quality");
  });

  it("should handle responses with special characters", () => {
    const specialResponse = "Use @#$%^&*() symbols? No, just use standard data structures like Map<> or {}.";

    const result = validateAIResponse(specialResponse, "STRATEGIZE", createMockIntent("hint"));

    expect(result.isValid).toBe(true);
  });

  it("should handle responses with code-like but non-code content", () => {
    const codeLikeResponse = "Think about O(n) vs O(n²) complexity. The former is much better for large inputs.";

    const result = validateAIResponse(codeLikeResponse, "STRATEGIZE", createMockIntent("hint"));

    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// TEST SUITE: Integration Scenarios
// =============================================================================

describe("AI Failure Detection: Integration Scenarios", () => {
  describe("Complete learning journey", () => {
    it("should handle EXPLORE → STRATEGIZE → IMPLEMENT progression", () => {
      const exploreResponse = "This problem asks you to find two numbers that add up to a target. What comes to mind?";
      const strategizeResponse = "A hash map would be perfect here for O(1) lookups. Can you outline the steps?";
      const implementResponse = "Great! Now implement the hash map approach. Remember to handle the case where no solution exists.";

      const exploreResult = validateAIResponse(exploreResponse, "EXPLORE", createMockIntent("hint"));
      const strategizeResult = validateAIResponse(strategizeResponse, "STRATEGIZE", createMockIntent("hint"));
      const implementResult = validateAIResponse(implementResponse, "IMPLEMENT", createMockIntent("hint"));

      expect(exploreResult.isValid).toBe(true);
      expect(strategizeResult.isValid).toBe(true);
      expect(implementResult.isValid).toBe(true);
    });
  });

  describe("Frustration handling", () => {
    it("should provide empathetic responses to frustrated users", () => {
      const frustratedResponse = "I can see this is frustrating. Let's take a step back and break it down differently. What if we start with a simpler example?";

      const result = validateAIResponse(frustratedResponse, "STUCK", createMockIntent("help"));

      expect(result.isValid).toBe(true);
    });
  });

  describe("Multiple solution attempts", () => {
    it("should recognize when user is trying multiple approaches", () => {
      const guidanceResponse = "I see you've tried a few different approaches. Let's focus on why the hash map method is most suitable here. The key insight is...";

      const result = validateAIResponse(guidanceResponse, "STRATEGIZE", createMockIntent("hint"));

      expect(result.isValid).toBe(true);
    });
  });
});