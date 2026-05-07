/**
 * Stage Engine Unit Tests
 *
 * Tests the core state machine logic:
 * - Transition rule validation   
 * - Context-based allow/block decisions
 * - Edge cases and invalid transitions
 */

import { canTransition, printTransitionRules, type TransitionContext } from "../stageEngine";
import type { TeachingStage } from "@/lib/mentorContext";

// =============================================================================
// TEST HELPERS
// =============================================================================

const ctx = (overrides: Partial<TransitionContext> = {}): TransitionContext => ({
  approachCorrect: false,
  codeCorrect: false,
  isOptimal: false,
  hasErrors: false,
  isFrustrated: false,
  ...overrides,
});

async function expectAllowed(from: TeachingStage, to: TeachingStage, context?: TransitionContext) {
  const result = await canTransition(from, to, context);
  expect(result.allowed).toBe(true);
  return result;
}

async function expectBlocked(from: TeachingStage, to: TeachingStage, context?: TransitionContext, expectedReason?: string) {
  const result = await canTransition(from, to, context);
  expect(result.allowed).toBe(false);
  if (expectedReason) {
    expect(result.reason).toContain(expectedReason);
  }
  return result;
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe("Stage Engine", () => {
  describe("printTransitionRules", () => {
    it("should print all rules without error", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      printTransitionRules();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("TRANSITION RULES"));
      consoleSpy.mockRestore();
    });
  });

  describe("EXPLORE stage transitions", () => {
    it("EXPLORE → STRATEGIZE: allowed (no context required)", async () => {
      await expectAllowed("EXPLORE", "STRATEGIZE", ctx());
    });

    it("EXPLORE → STUCK: allowed when frustrated", async () => {
      await expectAllowed("EXPLORE", "STUCK", ctx({ isFrustrated: true }));
    });

    it("EXPLORE → STUCK: blocked when not frustrated", async () => {
      await expectBlocked("EXPLORE", "STUCK", ctx({ isFrustrated: false }), "Context check failed");
    });

    it("EXPLORE → IMPLEMENT: blocked (invalid transition)", async () => {
      await expectBlocked("EXPLORE", "IMPLEMENT", ctx(), "Invalid transition");
    });

    it("EXPLORE → REFLECT: blocked (invalid transition)", async () => {
      await expectBlocked("EXPLORE", "REFLECT", ctx(), "Invalid transition");
    });

    it("EXPLORE → DEBUG: blocked (invalid transition)", async () => {
      await expectBlocked("EXPLORE", "DEBUG", ctx(), "Invalid transition");
    });
  });

  describe("STRATEGIZE stage transitions", () => {
    it("STRATEGIZE → IMPLEMENT: allowed when approach is correct", async () => {
      await expectAllowed("STRATEGIZE", "IMPLEMENT", ctx({ approachCorrect: true }));
    });

    it("STRATEGIZE → IMPLEMENT: blocked when approach not validated", async () => {
      const result = await expectBlocked("STRATEGIZE", "IMPLEMENT", ctx({ approachCorrect: false }));
      expect(result.reason).toContain("approach must be validated");
    });

    it("STRATEGIZE → STUCK: allowed when frustrated", async () => {
      await expectAllowed("STRATEGIZE", "STUCK", ctx({ isFrustrated: true }));
    });

    it("STRATEGIZE → STUCK: blocked when not frustrated", async () => {
      await expectBlocked("STRATEGIZE", "STUCK", ctx({ isFrustrated: false }), "Context check failed");
    });

    it("STRATEGIZE → REFLECT: blocked (must go through IMPLEMENT)", async () => {
      await expectBlocked("STRATEGIZE", "REFLECT", ctx(), "Invalid transition");
    });
  });

  describe("IMPLEMENT stage transitions", () => {
    it("IMPLEMENT → REFLECT: allowed when code correct AND optimal", async () => {
      await expectAllowed("IMPLEMENT", "REFLECT", ctx({ codeCorrect: true, isOptimal: true }));
    });

    it("IMPLEMENT → REFLECT: blocked when code not optimal", async () => {
      const result = await expectBlocked(
        "IMPLEMENT",
        "REFLECT",
        ctx({ codeCorrect: true, isOptimal: false })
      );
      expect(result.reason).toContain("must be correct AND optimal");
    });

    it("IMPLEMENT → REFLECT: blocked when code has errors", async () => {
      const result = await expectBlocked(
        "IMPLEMENT",
        "REFLECT",
        ctx({ codeCorrect: false, isOptimal: true })
      );
      expect(result.reason).toContain("must be correct AND optimal");
    });

    it("IMPLEMENT → IMPLEMENT (self-loop): allowed when correct but not optimal", async () => {
      await expectAllowed("IMPLEMENT", "IMPLEMENT", ctx({ codeCorrect: true, isOptimal: false }));
    });

    it("IMPLEMENT → IMPLEMENT (self-loop): reason mentions optimization", async () => {
      const result = await canTransition("IMPLEMENT", "IMPLEMENT", ctx({ codeCorrect: true, isOptimal: false }));
      expect(result.reason).toContain("not optimal");
    });

    it("IMPLEMENT → DEBUG: allowed when has errors", async () => {
      await expectAllowed("IMPLEMENT", "DEBUG", ctx({ hasErrors: true }));
    });

    it("IMPLEMENT → DEBUG: blocked when no errors", async () => {
      await expectBlocked("IMPLEMENT", "DEBUG", ctx({ hasErrors: false }), "Context check failed");
    });

    it("IMPLEMENT → STUCK: allowed when frustrated", async () => {
      await expectAllowed("IMPLEMENT", "STUCK", ctx({ isFrustrated: true }));
    });
  });

  describe("DEBUG stage transitions", () => {
    it("DEBUG → IMPLEMENT: allowed when no more errors", async () => {
      await expectAllowed("DEBUG", "IMPLEMENT", ctx({ hasErrors: false }));
    });

    it("DEBUG → IMPLEMENT: blocked when still has errors", async () => {
      await expectBlocked("DEBUG", "IMPLEMENT", ctx({ hasErrors: true }), "Context check failed");
    });

    it("DEBUG → STUCK: allowed when frustrated", async () => {
      await expectAllowed("DEBUG", "STUCK", ctx({ isFrustrated: true }));
    });

    it("DEBUG → STRATEGIZE: blocked (invalid transition)", async () => {
      await expectBlocked("DEBUG", "STRATEGIZE", ctx(), "Invalid transition");
    });
  });

  describe("STUCK stage transitions (recovery)", () => {
    it("STUCK → EXPLORE: allowed when not frustrated", async () => {
      await expectAllowed("STUCK", "EXPLORE", ctx({ isFrustrated: false }));
    });

    it("STUCK → STRATEGIZE: allowed when not frustrated", async () => {
      await expectAllowed("STUCK", "STRATEGIZE", ctx({ isFrustrated: false }));
    });

    it("STUCK → IMPLEMENT: allowed when not frustrated", async () => {
      await expectAllowed("STUCK", "IMPLEMENT", ctx({ isFrustrated: false }));
    });

    it("STUCK → EXPLORE: blocked when still frustrated", async () => {
      await expectBlocked("STUCK", "EXPLORE", ctx({ isFrustrated: true }), "Context check failed");
    });
  });

  describe("REFLECT stage (terminal)", () => {
    it("REFLECT → any: blocked (terminal state)", async () => {
      await expectBlocked("REFLECT", "EXPLORE", ctx(), "Invalid transition");
      await expectBlocked("REFLECT", "STRATEGIZE", ctx(), "Invalid transition");
      await expectBlocked("REFLECT", "IMPLEMENT", ctx(), "Invalid transition");
    });
  });

  describe("Same stage (no-op)", () => {
    it("same stage → same stage: blocked (not a transition)", async () => {
      const result = await canTransition("EXPLORE", "EXPLORE", ctx());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Already at stage");
    });

    it("IMPLEMENT → IMPLEMENT: allowed only for optimization loop", async () => {
      // This is the exception — IMPLEMENT self-loop is valid for optimization
      const result = await canTransition("IMPLEMENT", "IMPLEMENT", ctx({ codeCorrect: true, isOptimal: false }));
      expect(result.allowed).toBe(true);
    });

    it("IMPLEMENT → IMPLEMENT: blocked without optimization context", async () => {
      const result = await canTransition("IMPLEMENT", "IMPLEMENT", ctx());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Already at stage");
    });
  });

  describe("Error messages", () => {
    it("provides helpful reason for invalid transitions", async () => {
      const result = await canTransition("EXPLORE", "REFLECT", ctx());
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("EXPLORE");
      expect(result.reason).toContain("REFLECT");
      expect(result.reason).toContain("Valid transitions from");
    });

    it("lists valid next stages in error message", async () => {
      const result = await canTransition("DEBUG", "REFLECT", ctx());
      expect(result.reason).toContain("IMPLEMENT"); // DEBUG can only go to IMPLEMENT
    });
  });
});
