/**
 * Invariants as code — test that the locked contracts are present and
 * contain the required text. Catches accidental edits.
 */
import {
  INVARIANT_REGISTRY,
  JUDGE_INDEPENDENCE_INVARIANT,
  PROJECTION_CONSISTENCY_CONTRACT,
  PROMPT_INJECTION_HARDENING,
  STAGE_INERTIA_RULES,
} from "../invariants";

describe("CUD invariants", () => {
  it("registry has all 4 invariants", () => {
    expect(INVARIANT_REGISTRY.length).toBe(4);
    const names = INVARIANT_REGISTRY.map((i) => i.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "judge_independence",
        "projection_consistency",
        "prompt_injection_hardening",
        "stage_inertia_rules",
      ]),
    );
  });

  it("judge_independence mentions the confidence floor of 0.5", () => {
    expect(JUDGE_INDEPENDENCE_INVARIANT).toContain("0.5");
    expect(JUDGE_INDEPENDENCE_INVARIANT).toContain("never blocks");
  });

  it("projection_consistency mentions the 1-message lag", () => {
    expect(PROJECTION_CONSISTENCY_CONTRACT).toContain("≤ 1 MESSAGE LAG");
  });

  it("prompt_injection_hardening mentions sanitization", () => {
    expect(PROMPT_INJECTION_HARDENING).toContain("sanitized");
  });

  it("stage_inertia_rules mentions DEBUG terminal", () => {
    expect(STAGE_INERTIA_RULES).toContain("DEBUG is terminal for retreat");
  });
});
