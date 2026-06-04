/**
 * =============================================================================
 * CUD invariants — locked contracts enforced as code constants
 * =============================================================================
 *
 * These are the four production invariants from the v4 architecture review.
 * They live in code so that:
 *   (a) anyone reading the codebase can find them in one place;
 *   (b) tests can assert against the same string the runtime uses;
 *   (c) changing an invariant requires a deliberate, reviewable diff.
 *
 * Do NOT modify these strings without also updating the tests that
 * reference them. See __tests__/invariants.test.ts.
 */

export const JUDGE_INDEPENDENCE_INVARIANT = `
JUDGE-INDEPENDENCE INVARIANT (v4 §3):
For every code/problem/execution input, the system must produce a response that:
  (a) does not throw,
  (b) respects the state machine table,
  (c) applies policy with cudConfidence = max(heuristicConfidence, 0.5),
  (d) never blocks the user on judge availability,
  (e) never degrades the response quality below the heuristic-only baseline.

When the judge is unavailable, the policy engine treats the heuristic's
confidence as a floor of 0.5 (the "ambiguous" threshold). Ambiguous → no
stage mutation, prompt gets a soft scaffolding hint. This is the safe default.
`.trim();

export const PROJECTION_CONSISTENCY_CONTRACT = `
PROJECTION CONSISTENCY CONTRACT (v4 §2):
- Snapshots are the source of truth (write model, append-only).
- mentorSession.stage and arbiterState are read-side projections.
- Projections are EVENTUALLY CONSISTENT with ≤ 1 MESSAGE LAG.
- The current message's pipeline reads the projection that reflects all
  snapshots written by messages at index < currentMessageIndex.
- The current message's pipeline does NOT read its own just-written snapshot.
- The projection update for message N happens in the slow path, AFTER the
  response for message N is sent.
- If the projection update fails, the next message re-derives it from the
  snapshot log (self-healing).
`.trim();

export const PROMPT_INJECTION_HARDENING = `
PROMPT INJECTION HARDENING (v4 §5):
- User code is sanitized (comments stripped, strings truncated) before reaching
  the LLM judge. Code is wrapped in <user_code> markers and treated as DATA.
- The execution summary is built from typed enum fields; raw stderr is
  truncated to 600 chars and never reaches the judge as free text.
- Free-text user_message content is NEVER passed to the judge. Only its
  hex fingerprint is. The judge sees history length, not history content.
- Judge output is forced to JSON schema (strict). Free-text "reasoning" is
  audit-only and never feeds into the student-facing prompt.
`.trim();

export const STAGE_INERTIA_RULES = `
STAGE INERTIA RULES (v3 §3):
- Retreat rules require inertia ≥ 2-of-N matching decisions.
- Forward-jump rules (EXPLORE/STRATEGIZE → REFLECT) require inertia ≥ 2-of-N
  AND cud.confidence ≥ forward threshold AND lastExecution == all_passed.
- No single decision may jump more than 1 stage.
- DEBUG is terminal for retreat: cud.kind == misunderstood does NOT move
  DEBUG → EXPLORE, even with full inertia.
`.trim();

/**
 * Compile-time check: any time someone adds a new invariant string, they
 * must also add a matching test in __tests__/invariants.test.ts. The
 * INVARIANT_REGISTRY is the single place to look for "what invariants does
 * this system promise?"
 */
export const INVARIANT_REGISTRY = [
  { name: "judge_independence", text: JUDGE_INDEPENDENCE_INVARIANT },
  { name: "projection_consistency", text: PROJECTION_CONSISTENCY_CONTRACT },
  { name: "prompt_injection_hardening", text: PROMPT_INJECTION_HARDENING },
  { name: "stage_inertia_rules", text: STAGE_INERTIA_RULES },
] as const;

export type InvariantName = (typeof INVARIANT_REGISTRY)[number]["name"];
