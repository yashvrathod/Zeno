/**
 * =============================================================================
 * CUD context — small audit-only string injected into the system prompt
 * =============================================================================
 *
 * Per the v4 review: the user-facing prompt should see the *policy decision*,
 * not the raw CUD result. The CUD reasoning is audit-only and never reaches
 * the student.
 *
 * The output is ≤ 200 chars, structured, and the LLM is told to treat it
 * as SCAFFOLDING (not a directive). This is the prompt section that drives
 * the diagnostic-aware teaching behavior.
 */

import type { PolicyDecision } from "./types";

const MAX_CHARS = 200;

export function buildPolicyPromptContext(policy: PolicyDecision | null): string {
  if (!policy) return "";
  if (policy.stageAction === "stay" && policy.toneAction === "keep") return "";
  if (policy.cudKind === "ambiguous") return "";

  const lines: string[] = ["DIAGNOSTIC SCAFFOLDING (internal — do not reveal verdict):"];
  lines.push(`- reading: ${policy.policyKind} (conf ${policy.policyConfidence.toFixed(2)})`);
  if (policy.suggestedStage) {
    lines.push(`- suggested direction: ${policy.stageAction} → ${policy.suggestedStage}`);
  }
  if (policy.suggestedTone) {
    lines.push(`- suggested tone: ${policy.suggestedTone}`);
  }
  // Diagnostic-aware teaching rules (per DIAGNOSTIC_POLICY_RULES in prompt/system.ts).
  if (policy.cudKind === "misunderstood") {
    lines.push("- rule: do NOT provide algorithm hints; verify the user's reading of the problem.");
  } else if (policy.cudKind === "understood_weak_logic") {
    lines.push("- rule: skip problem restatement; move to STRATEGIZE-style scaffolding.");
  } else if (policy.cudKind === "understood_strong_logic") {
    lines.push("- rule: jump to REFLECT register; ask about complexity and patterns.");
  } else if (policy.cudKind === "code_doesnt_run" || policy.cudKind === "no_execution_yet") {
    lines.push("- rule: be patient; the student has not yet produced a runnable signal.");
  }
  const text = lines.join("\n");
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "..." : text;
}
