import type { TeachingStage } from "@/lib/mentorContext";
import type { MentorRequest } from "../services/mentorService";

// ─────────────────────────────────────────────────────────────────────────────
// TEXT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function clampText(input: string | undefined, max: number): string {
  if (!input) return "";
  return input.length > max ? input.slice(0, max) + `\n\n[Truncated to ${max} chars]` : input;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

export function sanitizeTestCases(
  testCases: MentorRequest["publicTestCases"],
): Array<{ order: number; input: string; expected: string }> {
  if (!Array.isArray(testCases)) return [];
  return testCases.slice(0, 8).map((t) => ({
    order: typeof t?.order === "number" ? t.order : 0,
    input: clampText(typeof t?.input === "string" ? t.input : "", 1500),
    expected: clampText(typeof t?.expected === "string" ? t.expected : "", 1500),
  }));
}

export function buildTestCasesString(
  testCases: Array<{ order: number; input: string; expected: string }>,
): string {
  if (testCases.length === 0) return "No test cases provided.";
  return testCases
    .map((t) => `**Test #${t.order}**\nInput: \`${t.input}\`\nExpected: \`${t.expected}\``)
    .join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export function buildAdaptiveProblemContext(body: MentorRequest, stage: TeachingStage): string {
  const testCases = sanitizeTestCases(body.publicTestCases);
  const isEarly = stage === "EXPLORE" || stage === "STRATEGIZE";

  if (isEarly) {
    return `<problem_context>
<problem id="${body.problemId}">
${body.problemTitle ? `**${body.problemTitle}**\n\n` : ""}${clampText(body.problemStatementMd, 3000)}
</problem>
<constraints>
${clampText(body.problemConstraintsMd, 1500)}
</constraints>
<test_cases>
${buildTestCasesString(testCases)}
</test_cases>
</problem_context>`;
  }

  return `<problem_context>
<problem id="${body.problemId}">${body.problemTitle ? ` — ${body.problemTitle}` : ""}</problem>
<constraints>
${clampText(body.problemConstraintsMd, 1200)}
</constraints>
<test_cases>
${buildTestCasesString(testCases.slice(0, 3))}
</test_cases>
</problem_context>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

export function buildAnimationContext(
  animationType?: string | null,
  animationData?: string | null,
  shouldTrigger?: boolean,
): string {
  if (!animationType || !animationData || !shouldTrigger) return "";
  return `<animation_available type="${animationType}">
This problem has a step-by-step interactive visualization available.
If the student expresses confusion or asks how the algorithm works,
append exactly "{{ANIMATION}}" at the end of your response. The system will
automatically display the visualization to help them understand.
Do NOT try to recreate the animation data — just respond naturally and end with {{ANIMATION}}.
</animation_available>`;
}
