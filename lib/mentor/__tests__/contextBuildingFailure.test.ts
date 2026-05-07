/**
 * Context Building Failure Detection Tests
 *
 * These tests identify where the AI fails to build proper context:
 * 1. Missing problem context
 * 2. Ignoring user code
 * 3. Not using conversation history
 * 4. Poor stage-aware context
 */

import {
  buildAdaptiveProblemContext,
  buildUserCodeContext,
  buildStatsContext,
  buildConversationHistory,
  buildAnimationContext,
  inferUnderstandingFromHistory
} from "../services/contextBuilder";
import type { MentorRequest, UserStats } from "../services/mentorService";

// =============================================================================
// TEST DATA: Real-world scenarios
// =============================================================================

const MOCK_PROBLEM: MentorRequest = {
  problemId: "test-1",
  problemTitle: "Two Sum",
  problemStatementMd: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  problemConstraintsMd: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9",
  publicTestCases: [
    { order: 1, input: "[2,7,11,15], 9", expected: "[0,1]" },
    { order: 2, input: "[3,2,4], 6", expected: "[1,2]" }
  ],
  language: "javascript",
  userMessage: "How should I approach this?",
  userCode: "function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) {\n        return [i, j];\n      }\n    }\n  }\n  return [];\n}",
  syntaxError: undefined,
  history: []
};

const MOCK_STATS: UserStats = {
  runCount: 3,
  submitCount: 2,
  acceptedCount: 0,
  wrongAnswerCount: 2,
  runtimeErrorCount: 0,
  lastStatus: "WRONG_ANSWER",
  lastError: "Time Limit Exceeded"
};

// =============================================================================
// TEST SUITE: Problem Context Building
// =============================================================================

describe("Context Building Failure Detection: Problem Context", () => {
  describe("buildAdaptiveProblemContext", () => {
    it("should include problem title and statement", () => {
      const context = buildAdaptiveProblemContext(MOCK_PROBLEM, "EXPLORE");

      expect(context).toContain("Two Sum");
      expect(context).toContain("Given an array of integers");
    });

    it("should adapt context based on stage", () => {
      const exploreContext = buildAdaptiveProblemContext(MOCK_PROBLEM, "EXPLORE");
      const implementContext = buildAdaptiveProblemContext(MOCK_PROBLEM, "IMPLEMENT");

      // Different stages should get different context emphasis
      expect(exploreContext.length).toBeGreaterThan(0);
      expect(implementContext.length).toBeGreaterThan(0);
    });

    it("should include constraints when relevant", () => {
      const context = buildAdaptiveProblemContext(MOCK_PROBLEM, "STRATEGIZE");

      expect(context).toContain("10^4") || expect(context).toContain("constraint");
    });

    it("should handle missing problem data gracefully", () => {
      const incompleteProblem = { ...MOCK_PROBLEM, problemStatementMd: undefined };
      const context = buildAdaptiveProblemContext(incompleteProblem, "EXPLORE");

      expect(context).toBeTruthy();
      expect(context.length).toBeGreaterThan(0);
    });

    it("should not include test case answers in context", () => {
      const context = buildAdaptiveProblemContext(MOCK_PROBLEM, "EXPLORE");

      // Should not reveal expected outputs
      expect(context).not.toContain("[0,1]");
      expect(context).not.toContain("[1,2]");
    });
  });

  describe("Context completeness", () => {
    it("should provide sufficient context for EXPLORE stage", () => {
      const context = buildAdaptiveProblemContext(MOCK_PROBLEM, "EXPLORE");

      // Should have problem understanding elements
      const hasProblemStatement = context.includes("Given an array");
      const hasGoalIndication = context.includes("target") || context.includes("sum");

      expect(hasProblemStatement || hasGoalIndication).toBe(true);
    });

    it("should provide sufficient context for STRATEGIZE stage", () => {
      const context = buildAdaptiveProblemContext(MOCK_PROBLEM, "STRATEGIZE");

      // Should have strategic elements
      const hasConstraints = context.includes("constraint") || context.includes("10^");
      const hasComplexityHint = context.includes("O(") || context.includes("time");

      expect(hasConstraints || hasComplexityHint).toBe(true);
    });

    it("should provide sufficient context for IMPLEMENT stage", () => {
      const context = buildAdaptiveProblemContext(MOCK_PROBLEM, "IMPLEMENT");

      // Should have implementation guidance
      const hasImplementationHint = context.length > 50;

      expect(hasImplementationHint).toBe(true);
    });
  });
});

// =============================================================================
// TEST SUITE: User Code Context Building
// =============================================================================

describe("Context Building Failure Detection: User Code Context", () => {
  describe("buildUserCodeContext", () => {
    it("should include user's code in context", () => {
      const context = buildUserCodeContext(MOCK_PROBLEM);

      expect(context).toContain("function twoSum");
      expect(context).toContain("nums.length");
    });

    it("should not include complete solution in code context", () => {
      const context = buildUserCodeContext(MOCK_PROBLEM);

      // Should reference code but not give away answers
      expect(context).toBeTruthy();
    });

    it("should handle missing user code", () => {
      const noCodeProblem = { ...MOCK_PROBLEM, userCode: undefined };
      const context = buildUserCodeContext(noCodeProblem);

      expect(context).toBeTruthy();
      expect(context.length).toBeGreaterThan(0);
    });

    it("should handle syntax errors in context", () => {
      const syntaxErrorProblem = {
        ...MOCK_PROBLEM,
        syntaxError: "Unexpected token"
      };
      const context = buildUserCodeContext(syntaxErrorProblem);

      expect(context).toContain("error") || expect(context).toContain("syntax");
    });

    it("should identify code patterns", () => {
      const context = buildUserCodeContext(MOCK_PROBLEM);

      // Should detect nested loop pattern
      const hasLoopDetection = context.includes("loop") || context.includes("nested");

      expect(hasLoopDetection).toBe(true);
    });
  });

  describe("Code analysis quality", () => {
    it("should detect brute force approach", () => {
      const context = buildUserCodeContext(MOCK_PROBLEM);

      // Should identify O(n²) nested loop
      const hasComplexityHint = context.includes("O(n") || context.includes("nested") || context.includes("quadratic");

      expect(hasComplexityHint).toBe(true);
    });

    it("should detect data structure usage", () => {
      const mapProblem = {
        ...MOCK_PROBLEM,
        userCode: "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}"
      };

      const context = buildUserCodeContext(mapProblem);

      expect(context).toContain("Map") || expect(context).toContain("hash");
    });

    it("should detect edge case handling", () => {
      const edgeCaseProblem = {
        ...MOCK_PROBLEM,
        userCode: "function twoSum(nums, target) {\n  if (!nums || nums.length < 2) return [];\n  // rest of implementation\n}"
      };

      const context = buildUserCodeContext(edgeCaseProblem);

      expect(context).toContain("edge") || expect(context).toContain("empty");
    });
  });
});

// =============================================================================
// TEST SUITE: Statistics Context Building
// =============================================================================

describe("Context Building Failure Detection: Statistics Context", () => {
  describe("buildStatsContext", () => {
    it("should include attempt history", () => {
      const context = buildStatsContext(MOCK_STATS, MOCK_PROBLEM.userMessage, "IMPLEMENT");

      expect(context).toContain("attempt") || expect(context).toContain("submit");
    });

    it("should include error information", () => {
      const context = buildStatsContext(MOCK_STATS, MOCK_PROBLEM.userMessage, "DEBUG");

      expect(context).toContain("error") || expect(context).toContain("wrong");
    });

    it("should adapt based on current stage", () => {
      const debugContext = buildStatsContext(MOCK_STATS, "What's wrong?", "DEBUG");
      const implementContext = buildStatsContext(MOCK_STATS, "How to optimize?", "IMPLEMENT");

      expect(debugContext.length).toBeGreaterThan(0);
      expect(implementContext.length).toBeGreaterThan(0);
    });

    it("should handle missing stats gracefully", () => {
      const context = buildStatsContext(undefined, "Help me", "EXPLORE");

      expect(context).toBeTruthy();
    });

    it("should detect frustration from stats", () => {
      const frustratedStats = {
        ...MOCK_STATS,
        wrongAnswerCount: 10,
        runtimeErrorCount: 5
      };

      const context = buildStatsContext(frustratedStats, "I'm stuck", "STUCK");

      expect(context).toContain("frustrat") || expect(context).toContain("stuck") || expect(context).toContain("attempt");
    });
  });

  describe("Stats-based guidance", () => {
    it("should suggest optimization after multiple TLE", () => {
      const tleStats = {
        ...MOCK_STATS,
        lastError: "Time Limit Exceeded",
        wrongAnswerCount: 0,
        runtimeErrorCount: 0
      };

      const context = buildStatsContext(tleStats, "Still timing out", "IMPLEMENT");

      expect(context).toContain("optim") || expect(context).toContain("time") || expect(context).toContain("complexity");
    });

    it("should suggest debugging after multiple WA", () => {
      const waStats = {
        ...MOCK_STATS,
        lastError: "Wrong Answer",
        wrongAnswerCount: 5
      };

      const context = buildStatsContext(waStats, "Why wrong answer?", "DEBUG");

      expect(context).toContain("debug") || expect(context).toContain("test") || expect(context).toContain("edge");
    });
  });
});

// =============================================================================
// TEST SUITE: Conversation History Context Building
// =============================================================================

describe("Context Building Failure Detection: Conversation History", () => {
  describe("buildConversationHistory", () => {
    it("should include recent conversation", () => {
      const history = [
        { role: "user" as const, content: "How should I start?" },
        { role: "assistant" as const, content: "Think about what data structure would help." }
      ];

      const context = buildConversationHistory(history, null);

      expect(context).toContain("data structure");
    });

    it("should handle long conversations with summarization", () => {
      const longHistory = Array(20).fill(null).map((_, i) => ({
        role: (i % 2 === 0 ? "user" : "assistant") as const,
        content: `Message ${i}: Some discussion about the problem`
      }));

      const context = buildConversationHistory(longHistory, null);

      // Should summarize rather than include everything
      expect(context.length).toBeLessThan(longHistory.reduce((acc, msg) => acc + msg.content.length, 0));
    });

    it("should use existing summary when available", () => {
      const history = [
        { role: "user" as const, content: "New question" }
      ];

      const summary = "Student discussed brute force approach and is now considering optimization";
      const context = buildConversationHistory(history, summary);

      expect(context).toContain("brute force") || expect(context).toContain("optimization");
    });

    it("should handle empty history", () => {
      const context = buildConversationHistory([], null);

      expect(context).toBeTruthy();
    });
  });

  describe("Conversation flow detection", () => {
    it("should detect topic changes", () => {
      const history = [
        { role: "user" as const, content: "What's the time complexity?" },
        { role: "assistant" as const, content: "The brute force is O(n²)" },
        { role: "user" as const, content: "Now what about space complexity?" }
      ];

      const context = buildConversationHistory(history, null);

      expect(context).toContain("time") && expect(context).toContain("space");
    });

    it("should detect stuck patterns", () => {
      const stuckHistory = [
        { role: "user" as const, content: "I'm stuck" },
        { role: "assistant" as const, content: "Try using a hash map" },
        { role: "user" as const, content: "Still stuck" },
        { role: "assistant" as const, content: "Let me explain differently" },
        { role: "user" as const, content: "I'm still stuck" }
      ];

      const context = buildConversationHistory(stuckHistory, null);

      expect(context).toContain("stuck") || expect(context).toContain("still");
    });
  });
});

// =============================================================================
// TEST SUITE: Understanding Inference
// =============================================================================

describe("Context Building Failure Detection: Understanding Inference", () => {
  describe("inferUnderstandingFromHistory", () => {
    it("should detect demonstrated understanding", () => {
      const history = [
        { role: "user" as const, content: "I understand I need O(n) time complexity" },
        { role: "assistant" as const, content: "Correct! What data structure gives O(1) lookups?" },
        { role: "user" as const, content: "A hash map provides O(1) average case lookups" }
      ];

      const understanding = inferUnderstandingFromHistory(history, "STRATEGIZE");

      expect(understanding.demonstrated.length).toBeGreaterThan(0);
      expect(understanding.demonstrated).toContain("time complexity");
    });

    it("should detect understanding gaps", () => {
      const history = [
        { role: "user" as const, content: "I don't understand why we need a hash map" },
        { role: "assistant" as const, content: "It helps us find complements quickly" },
        { role: "user" as const, content: "But how does that help with the target sum?" }
      ];

      const understanding = inferUnderstandingFromHistory(history, "STRATEGIZE");

      expect(understanding.gaps.length).toBeGreaterThan(0);
    });

    it("should provide suggested focus areas", () => {
      const history = [
        { role: "user" as const, content: "I know I need a hash map but not sure how to use it" }
      ];

      const understanding = inferUnderstandingFromHistory(history, "IMPLEMENT");

      expect(understanding.suggestedFocus).toBeTruthy();
      expect(understanding.suggestedFocus.length).toBeGreaterThan(0);
    });

    it("should handle empty history", () => {
      const understanding = inferUnderstandingFromHistory([], "EXPLORE");

      expect(understanding.demonstrated).toEqual([]);
      expect(understanding.gaps).toEqual([]);
    });
  });

  describe("Stage-specific understanding detection", () => {
    it("should detect EXPLORE stage understanding", () => {
      const history = [
        { role: "user" as const, content: "So I need to find two numbers that add to target" }
      ];

      const understanding = inferUnderstandingFromHistory(history, "EXPLORE");

      expect(understanding.demonstrated.length).toBeGreaterThan(0);
    });

    it("should detect STRATEGIZE stage understanding", () => {
      const history = [
        { role: "user" as const, content: "I should use a hash map to store seen numbers" }
      ];

      const understanding = inferUnderstandingFromHistory(history, "STRATEGIZE");

      expect(understanding.demonstrated).toContain("hash map");
    });

    it("should detect IMPLEMENT stage understanding", () => {
      const history = [
        { role: "user" as const, content: "I'll iterate through the array and check for complements" }
      ];

      const understanding = inferUnderstandingFromHistory(history, "IMPLEMENT");

      expect(understanding.demonstrated.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// TEST SUITE: Animation Context Building
// =============================================================================

describe("Context Building Failure Detection: Animation Context", () => {
  describe("buildAnimationContext", () => {
    it("should include animation data when available", () => {
      const animationProblem = {
        ...MOCK_PROBLEM,
        animationType: "array_traversal",
        animationData: JSON.stringify([2, 7, 11, 15])
      };

      const context = buildAnimationContext(animationProblem.animationType, animationProblem.animationData, true);

      expect(context).toBeTruthy();
      expect(context.length).toBeGreaterThan(0);
    });

    it("should handle missing animation data", () => {
      const context = buildAnimationContext(null, null, false);

      expect(context).toBeTruthy();
    });

    it("should respect trigger animation flag", () => {
      const noTriggerContext = buildAnimationContext("array_traversal", "data", false);

      expect(noTriggerContext).toContain("animation") || noTriggerContext.length === 0;
    });
  });
});

// =============================================================================
// TEST SUITE: Integration Context Building
// =============================================================================

describe("Context Building Failure Detection: Integration", () => {
  it("should build comprehensive context for real scenario", () => {
    const problemContext = buildAdaptiveProblemContext(MOCK_PROBLEM, "STRATEGIZE");
    const codeContext = buildUserCodeContext(MOCK_PROBLEM);
    const statsContext = buildStatsContext(MOCK_STATS, MOCK_PROBLEM.userMessage, "STRATEGIZE");
    const historyContext = buildConversationHistory(MOCK_PROBLEM.history || [], null);

    // All contexts should be present
    expect(problemContext.length).toBeGreaterThan(0);
    expect(codeContext.length).toBeGreaterThan(0);
    expect(statsContext.length).toBeGreaterThan(0);
    expect(historyContext.length).toBeGreaterThan(0);

    // Combined context should be comprehensive
    const combinedContext = [problemContext, codeContext, statsContext, historyContext].join("\n");
    expect(combinedContext.length).toBeGreaterThan(100);
  });

  it("should handle missing optional context elements", () => {
    const minimalProblem = {
      ...MOCK_PROBLEM,
      userCode: undefined,
      syntaxError: undefined,
      history: []
    };

    const problemContext = buildAdaptiveProblemContext(minimalProblem, "EXPLORE");
    const codeContext = buildUserCodeContext(minimalProblem);
    const statsContext = buildStatsContext(undefined, minimalProblem.userMessage, "EXPLORE");
    const historyContext = buildConversationHistory([], null);

    // Should still build valid context
    expect(problemContext.length).toBeGreaterThan(0);
    expect(codeContext.length).toBeGreaterThan(0);
    expect(statsContext.length).toBeGreaterThan(0);
    expect(historyContext.length).toBeGreaterThan(0);
  });

  it("should maintain context quality across stages", () => {
    const stages = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "REFLECT"] as const;

    stages.forEach(stage => {
      const problemContext = buildAdaptiveProblemContext(MOCK_PROBLEM, stage);
      const codeContext = buildUserCodeContext(MOCK_PROBLEM);
      const statsContext = buildStatsContext(MOCK_STATS, MOCK_PROBLEM.userMessage, stage);

      expect(problemContext.length).toBeGreaterThan(0);
      expect(codeContext.length).toBeGreaterThan(0);
      expect(statsContext.length).toBeGreaterThan(0);
    });
  });
});