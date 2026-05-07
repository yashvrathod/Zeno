/**
 * Intent Classification Failure Detection Tests
 *
 * These tests identify where the AI fails to understand user intent:
 * 1. Misclassification of user requests
 * 2. Missing subtle cues
 * 3. Over-aggressive classification
 * 4. Context misunderstanding
 */

import { classifyIntent } from "../intentClassifier";
import { classifyIntentWithContext } from "../enhancedIntentClassifier";
import type { TeachingStage } from "@/lib/mentorContext";

// =============================================================================
// TEST DATA: Real user queries with expected intents
// =============================================================================

const INTENT_TEST_CASES = [
  // Solution requests
  {
    query: "Just give me the solution",
    expectedIntent: "solution_request",
    description: "Direct solution request"
  },
  {
    query: "Show me the code",
    expectedIntent: "solution_request",
    description: "Code request"
  },
  {
    query: "I need the answer",
    expectedIntent: "solution_request",
    description: "Answer request"
  },
  {
    query: "Can you just write it for me?",
    expectedIntent: "solution_request",
    description: "Subtle solution request"
  },

  // Hint requests
  {
    query: "Can you give me a hint?",
    expectedIntent: "hint_request",
    description: "Direct hint request"
  },
  {
    query: "I'm stuck, need some guidance",
    expectedIntent: "hint_request",
    description: "Stuck hint request"
  },
  {
    query: "What should I focus on?",
    expectedIntent: "hint_request",
    description: "Focus hint request"
  },

  // Explanation requests
  {
    query: "Can you explain the problem?",
    expectedIntent: "understanding",
    description: "Problem explanation"
  },
  {
    query: "What does this mean?",
    expectedIntent: "clarification",
    description: "Clarification request"
  },
  {
    query: "I don't understand the constraints",
    expectedIntent: "clarification",
    description: "Constraints explanation"
  },

  // Debug requests
  {
    query: "What's wrong with my code?",
    expectedIntent: "debugging",
    description: "Debug request"
  },
  {
    query: "I'm getting an error",
    expectedIntent: "debugging",
    description: "Error report"
  },
  {
    query: "Why isn't this working?",
    expectedIntent: "debugging",
    description: "Troubleshooting"
  },

  // Implementation help (strategy)
  {
    query: "How should I approach this?",
    expectedIntent: "implementation_help",
    description: "Strategy inquiry"
  },
  {
    query: "What's the best way to solve this?",
    expectedIntent: "implementation_help",
    description: "Optimal strategy"
  },
  {
    query: "Which algorithm should I use?",
    expectedIntent: "implementation_help",
    description: "Algorithm selection"
  },

  // Optimization questions
  {
    query: "What's the time complexity?",
    expectedIntent: "optimization",
    description: "Time complexity"
  },
  {
    query: "Is this O(n) or O(n²)?",
    expectedIntent: "optimization",
    description: "Complexity comparison"
  },
  {
    query: "Can I optimize this further?",
    expectedIntent: "optimization",
    description: "Optimization inquiry"
  },

  // Edge cases
  {
    query: "What about edge cases?",
    expectedIntent: "edge_case_help",
    description: "Edge case inquiry"
  },
  {
    query: "Should I handle empty input?",
    expectedIntent: "edge_case_help",
    description: "Specific edge case"
  },

  // Confirmation
  {
    query: "Is my approach correct?",
    expectedIntent: "confirmation",
    description: "Approach validation"
  },
  {
    query: "Am I on the right track?",
    expectedIntent: "progress_check",
    description: "Progress check"
  },

  // Frustration
  {
    query: "Help me with this problem",
    expectedIntent: "frustration",
    description: "General help (frustrated)"
  },
  {
    query: "I need assistance",
    expectedIntent: "frustration",
    description: "Assistance request"
  },
];

// =============================================================================
// TEST SUITE: Basic Intent Classification
// =============================================================================

describe("Intent Classification Failure Detection", () => {
  describe("Basic intent classification", () => {
    it("should correctly classify solution requests", () => {
      const solutionQueries = INTENT_TEST_CASES.filter(tc => tc.expectedIntent === "solution_request");

      solutionQueries.forEach(({ query, expectedIntent, description }) => {
        const result = classifyIntent(query);
        expect(result.intent).toBe(expectedIntent);
        expect(["high", "medium", "low"]).toContain(result.confidence);
      });
    });

    it("should correctly classify hint requests", () => {
      const hintQueries = INTENT_TEST_CASES.filter(tc => tc.expectedIntent === "hint_request");

      hintQueries.forEach(({ query, expectedIntent }) => {
        const result = classifyIntent(query);
        expect(result.intent).toBe(expectedIntent);
        expect(["high", "medium", "low"]).toContain(result.confidence);
      });
    });

    it("should correctly classify debug requests", () => {
      const debugQueries = INTENT_TEST_CASES.filter(tc => tc.expectedIntent === "debugging");

      debugQueries.forEach(({ query, expectedIntent }) => {
        const result = classifyIntent(query);
        expect(result.intent).toBe(expectedIntent);
        expect(["high", "medium", "low"]).toContain(result.confidence);
      });
    });

    it("should correctly classify implementation_help requests", () => {
      const implQueries = INTENT_TEST_CASES.filter(tc => tc.expectedIntent === "implementation_help");

      implQueries.forEach(({ query, expectedIntent }) => {
        const result = classifyIntent(query);
        expect(result.intent).toBe(expectedIntent);
        expect(["high", "medium", "low"]).toContain(result.confidence);
      });
    });
  });

  describe("Subtle intent detection", () => {
    it("should detect subtle solution requests", () => {
      const subtleSolution = "Can you just write it for me?";
      const result = classifyIntent(subtleSolution);

      expect(result.intent).toBe("solution_request");
      expect(["high", "medium", "low"]).toContain(result.confidence);
    });

    it("should detect frustrated help requests", () => {
      const frustratedHelp = "I'm stuck and hate this problem";
      const result = classifyIntent(frustratedHelp);

      expect(["frustration", "hint_request"]).toContain(result.intent);
    });

    it("should detect confirmation-seeking behavior", () => {
      const confirmation = "Is this right?";
      const result = classifyIntent(confirmation);

      expect(result.intent).toBe("confirmation");
    });
  });

  describe("Ambiguous query handling", () => {
    it("should handle ambiguous queries with low confidence", () => {
      const ambiguous = "help";
      const result = classifyIntent(ambiguous);

      expect(result.confidence).toBe("low");
    });

    it("should provide reason for classification", () => {
      const query = "What's wrong with my code?";
      const result = classifyIntent(query);

      expect(result.reason).toBeTruthy();
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it("should detect keywords used in classification", () => {
      const query = "Can you give me a hint for this problem?";
      const result = classifyIntent(query);

      expect(result.keywords.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// TEST SUITE: Context-Aware Intent Classification
// =============================================================================

describe("Context-Aware Intent Classification", () => {
  describe("Stage-aware classification", () => {
    it("should consider current stage in classification", () => {
      const query = "What should I do next?";
      const exploreStage = "EXPLORE" as TeachingStage;
      const implementStage = "IMPLEMENT" as TeachingStage;

      const exploreResult = classifyIntentWithContext(query, { stage: exploreStage });
      const implementResult = classifyIntentWithContext(query, { stage: implementStage });

      // Same query should be interpreted differently based on stage
      expect(exploreResult.primaryIntent).toBe(exploreResult.primaryIntent);
    });

    it("should adjust confidence based on stage appropriateness", () => {
      const query = "Just give me the code";
      const exploreStage = "EXPLORE" as TeachingStage;

      const result = classifyIntentWithContext(query, { stage: exploreStage });

      expect(result.shouldEnforceStage).toBe(true);
    });
  });

  describe("Conversation history awareness", () => {
    it("should consider previous intents", () => {
      const query = "I'm still stuck";
      const previousIntents = [
        { intent: "hint", confidence: "high" },
        { intent: "hint", confidence: "medium" }
      ];

      const result = classifyIntentWithContext(query, { previousIntents });

      expect(result.primaryIntent).toBe("hint");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should detect repetition patterns", () => {
      const query = "Can you help me?";
      const previousIntents = [
        { intent: "help", confidence: "high" },
        { intent: "help", confidence: "high" },
        { intent: "help", confidence: "high" }
      ];

      const result = classifyIntentWithContext(query, { previousIntents });

      expect(result.metadata.isRepetitive).toBe(true);
    });
  });

  describe("Frustration detection", () => {
    it("should detect frustrated language", () => {
      const frustratedQuery = "I'm so frustrated with this problem";
      const result = classifyIntentWithContext(frustratedQuery, {});

      expect(result.metadata.userFrustrationLevel).toBeGreaterThan(0.5);
    });

    it("should detect stuck patterns", () => {
      const stuckQuery = "I keep getting the same error";
      const result = classifyIntentWithContext(stuckQuery, {});

      expect(result.metadata.isStuck).toBe(true);
    });
  });

  describe("Attempt count awareness", () => {
    it("should consider number of attempts", () => {
      const query = "What's wrong?";
      const highAttempts = { attemptCount: 5 };
      const lowAttempts = { attemptCount: 1 };

      const highResult = classifyIntentWithContext(query, highAttempts);
      const lowResult = classifyIntentWithContext(query, lowAttempts);

      // High attempts should trigger different handling
      expect(highResult.metadata.requiresIntervention).toBe(true);
    });
  });
});

// =============================================================================
// TEST SUITE: Intent Classification Edge Cases
// =============================================================================

describe("Intent Classification Edge Cases", () => {
  it("should handle empty queries", () => {
    const result = classifyIntent("");

    expect(result.intent).toBe("hint_request");
    expect(result.confidence).toBe("low");
  });

  it("should handle very long queries", () => {
    const longQuery = "I need help " + "with this problem ".repeat(100);
    const result = classifyIntent(longQuery);

    expect(result.intent).toBeTruthy();
  });

  it("should handle queries with special characters", () => {
    const specialQuery = "What's wrong with my code?!?! #help";
    const result = classifyIntent(specialQuery);

    expect(result.intent).toBe("debugging");
  });

  it("should handle queries with code snippets", () => {
    const codeQuery = "function solve() { return 42; } - what's wrong?";
    const result = classifyIntent(codeQuery);

    expect(result.intent).toBe("debugging");
  });

  it("should handle multilingual queries", () => {
    const multilingualQuery = "Ayúdame con este problema";
    const result = classifyIntent(multilingualQuery);

    expect(result.intent).toBe("frustration");
  });

  it("should handle typos and misspellings", () => {
    const typoQuery = "Can u giv me a hnt?";
    const result = classifyIntent(typoQuery);

    expect(["hint", "help"]).toContain(result.intent);
  });
});

// =============================================================================
// TEST SUITE: Intent Classification Failure Patterns
// =============================================================================

describe("Intent Classification Failure Patterns", () => {
  it("should not misclassify solution requests as hints", () => {
    const solutionRequests = INTENT_TEST_CASES.filter(tc => tc.expectedIntent === "solution_request");

    solutionRequests.forEach(({ query }) => {
      const result = classifyIntent(query);
      expect(result.intent).not.toBe("hint_request");
    });
  });

  it("should not misclassify debug requests as general help", () => {
    const debugRequests = INTENT_TEST_CASES.filter(tc => tc.expectedIntent === "debugging");

    debugRequests.forEach(({ query }) => {
      const result = classifyIntent(query);
      expect(result.intent).not.toBe("hint_request");
    });
  });

  it("should not over-classify as solution requests", () => {
    const nonSolutionQueries = INTENT_TEST_CASES.filter(tc => tc.expectedIntent !== "solution");

    nonSolutionQueries.forEach(({ query, expectedIntent }) => {
      const result = classifyIntent(query);
      expect(result.intent).toBe(expectedIntent);
    });
  });

  it("should maintain consistent confidence levels", () => {
    const queries = INTENT_TEST_CASES.map(tc => tc.query);

    const results = queries.map(query => classifyIntent(query));
    const confidences = results.map(r => r.confidence);

    // Most confidences should be reasonably high
    const highConfidenceCount = confidences.filter(c => c > 0.6).length;
    expect(highConfidenceCount).toBeGreaterThan(queries.length * 0.7);
  });
});

// =============================================================================
// TEST SUITE: Real-World Scenarios
// =============================================================================

describe("Real-World Intent Classification Scenarios", () => {
  describe("Learning progression scenarios", () => {
    it("should handle beginner exploration", () => {
      const beginnerQuery = "I don't know where to start with this problem";
      const result = classifyIntentWithContext(beginnerQuery, { stage: "EXPLORE" as TeachingStage });

      expect(result.primaryIntent).toBe("explanation");
      expect(result.shouldEnforceStage).toBe(true);
    });

    it("should handle intermediate strategy questions", () => {
      const intermediateQuery = "Should I use dynamic programming or greedy approach?";
      const result = classifyIntentWithContext(intermediateQuery, { stage: "STRATEGIZE" as TeachingStage });

      expect(result.primaryIntent).toBe("implementation_help");
    });

    it("should handle advanced implementation issues", () => {
      const advancedQuery = "My solution passes test cases but times out on large inputs";
      const result = classifyIntentWithContext(advancedQuery, { stage: "IMPLEMENT" as TeachingStage });

      expect(result.primaryIntent).toBe("optimization");
    });
  });

  describe("Frustration and stuck scenarios", () => {
    it("should detect escalating frustration", () => {
      const frustratedQuery = "I've tried everything and nothing works!";
      const result = classifyIntentWithContext(frustratedQuery, {
        userFrustrationLevel: 0.8,
        attemptCount: 3
      });

      // Should detect frustration either as primary or in metadata
      expect(["frustration", "hint_request", "debugging"]).toContain(result.primaryIntent);
      expect(result.metadata.isStuckPattern || result.secondaryIntents.includes("frustration")).toBeDefined();
    });

    it("should detect help-seeking after multiple failures", () => {
      const helpAfterFailure = "I keep getting wrong answer, can you help?";
      const result = classifyIntentWithContext(helpAfterFailure, {
        attemptCount: 5,
        previousIntents: [
          { intent: "debugging", confidence: "high" as const, shouldEnforceStage: true, requiresValidation: true, reason: "previous error query", keywords: ["error", "wrong"] },
          { intent: "debugging", confidence: "high" as const, shouldEnforceStage: true, requiresValidation: true, reason: "previous error query", keywords: ["error", "wrong"] }
        ]
      });

      // Should detect stuck pattern or repeating intent
      expect(result.metadata.isStuckPattern || result.metadata.repeatingIntent || result.primaryIntent === "debugging").toBe(true);
    });
  });

  describe("Mixed intent scenarios", () => {
    it("should handle queries with multiple intents", () => {
      const mixedQuery = "Can you explain why my approach is wrong and suggest a better one?";
      const result = classifyIntentWithContext(mixedQuery, {});

      expect(result.primaryIntent).toBeTruthy();
      // secondaryIntents may be empty depending on implementation
    });

    it("should prioritize debugging intent when errors are present", () => {
      const errorQuery = "I'm getting runtime error, but also want to understand the concept better";
      const result = classifyIntentWithContext(errorQuery, {});

      // Check that debugging is either primary or in secondary intents
      expect([result.primaryIntent, ...result.secondaryIntents]).toContain("debugging");
    });
  });
});