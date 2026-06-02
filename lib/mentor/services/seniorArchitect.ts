/**
 * Senior Architect Code Review Agent
 *
 * A second AI agent that triggers after the REFLECT stage (problem solved).
 * Reviews code for production quality: naming, complexity, edge cases, clean code principles.
 *
 * Why this beats ChatGPT: ChatGPT stops at "it works." This teaches the difference
 * between competitive programming and software engineering.
 */

import { resolveApiConfig, callLlmAndExtract, type ApiConfig } from "../llm";
import prisma from "@/lib/prisma";

export type ArchitectReview = {
  overallScore: number; // 0-100
  categories: {
    naming: { score: number; feedback: string };
    complexity: { score: number; feedback: string; current: string; suggested: string };
    edgeCases: { score: number; feedback: string; missing: string[] };
    cleanCode: { score: number; feedback: string; issues: string[] };
  };
  actionable: string[];
  refactoredExample?: string;
};

const ARCHITECT_SYSTEM_PROMPT = `You are a Senior Software Architect with 20 years of experience at Google.
Your job is to review code that "works" and make it "production-ready."

Review Criteria:
1. NAMING (25 points): Variable names should be descriptive. No single letters except in loops.
2. COMPLEXITY (25 points): Check if time/space complexity can be improved. Point out repeated work.
3. EDGE CASES (25 points): Empty input, single element, max values, null checks.
4. CLEAN CODE (25 points): Comments, function length, DRY principle, early returns.

Scoring:
- 90-100: Production-ready, ship it
- 70-89: Good, minor improvements needed
- 50-69: Works but needs refactoring
- <50: Rewrite needed

IMPORTANT RULES:
- Never say "this is fine" — always find at least 2 improvements
- Provide a concrete refactored example
- Be respectful but critical — this is how engineers grow
- Focus on teachable moments, not just criticism

Output JSON format:
{
  "overallScore": number,
  "categories": {
    "naming": { "score": number, "feedback": string },
    "complexity": { "score": number, "feedback": string, "current": string, "suggested": string },
    "edgeCases": { "score": number, "feedback": string, "missing": string[] },
    "cleanCode": { "score": number, "feedback": string, "issues": string[] }
  },
  "actionable": string[],
  "refactoredExample": string
}`;

/**
 * Trigger Senior Architect review after successful solution.
 * Deduplicates: if the same code hash was already reviewed, returns the cached review.
 */
export async function triggerArchitectReview(params: {
  userId: string;
  problemId: string;
  code: string;
  language: string;
  problemTitle?: string;
  codeHash?: string;
}): Promise<ArchitectReview | null> {
  const { userId, problemId, code, language, problemTitle, codeHash } = params;

  // Dedup: if code hash matches a previous review, return the cached result
  if (codeHash) {
    try {
      const summary = await prisma.mentorConversationSummary.findUnique({
        where: { userId_problemId: { userId, problemId } },
        select: { summaryMd: true, approachNotesMd: true },
      });
      const architectJson = summary?.approachNotesMd || (summary?.summaryMd?.startsWith('{') ? summary.summaryMd : null);
      if (architectJson) {
        try {
          const parsed = JSON.parse(architectJson);
          if (parsed.architectReview && parsed.codeHash === codeHash) {
            console.debug("[ARCHITECT_REVIEW] Code unchanged since last review — returning cached result");
            return parsed.architectReview as ArchitectReview;
          }
        } catch {}
      }
    } catch (e) {
      console.warn("Architect cache lookup failed:", e);
    }
  }

  // Resolve AI provider
  const userAiSettings = await prisma.userAiSettings.findUnique({
    where: { userId },
    select: {
      apiProvider: true,
      groqApiKey: true,
      openaiApiKey: true,
      googleApiKey: true,
      openrouterApiKey: true,
      preferredFreeModel: true,
    },
  });

  let apiConfig: ApiConfig;
  try {
    apiConfig = await resolveApiConfig(userAiSettings);
  } catch {
    console.warn("No AI provider available for architect review");
    return null;
  }

  // Build review prompt
  const reviewPrompt = buildArchitectPrompt(code, language, problemTitle);

  try {
    const response = await callLlmAndExtract({
      messages: [
        { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
        { role: "user", content: reviewPrompt },
      ],
      temperature: 0.3, // Lower temperature for consistent evaluation
      maxTokens: 2000,
      apiConfig,
    });

    // Parse JSON response. parseArchitectResponse throws ArchitectParseError
    // on any malformed input — caught below so the user gets the existing
    // "AI service unavailable" path instead of a fake 75/100 review.
    const review = parseArchitectResponse(response);

    // Persist review with code hash for dedup
    await persistArchitectReview(userId, problemId, review, codeHash);

    return review;
  } catch (error) {
    if (error instanceof ArchitectParseError) {
      console.error(
        `[ARCHITECT_REVIEW] Parse failed (${error.reason}); returning null instead of fake review.`,
      );
    } else {
      console.error("Architect review failed:", error);
    }
    return null;
  }
}

function buildArchitectPrompt(
  code: string,
  language: string,
  problemTitle?: string
): string {
  return `Please review this solution${problemTitle ? ` for "${problemTitle}"` : ""}.

Language: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide a detailed code review scoring each category (naming, complexity, edge cases, clean code).
Include a refactored example showing production-quality code.

Remember: This code "works" but may not be production-ready. Find at least 2 concrete improvements.`;
}

/**
 * Thrown by `parseArchitectResponse` when the LLM output is malformed or
 * missing required fields. Callers should treat this as "review unavailable"
 * (return null / surface 503) rather than inventing a fake review.
 */
export class ArchitectParseError extends Error {
  constructor(public reason: string) {
    super(`ArchitectParseError: ${reason}`);
    this.name = "ArchitectParseError";
  }
}

function isFiniteNumberInRange(n: unknown, min: number, max: number): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.length > 0;
}

function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every((x) => typeof x === "string");
}

function validateCategory(
  raw: unknown,
  name: string,
): { score: number; feedback: string; [k: string]: unknown } {
  if (typeof raw !== "object" || raw === null) {
    throw new ArchitectParseError(`missing field: categories.${name}`);
  }
  const c = raw as Record<string, unknown>;
  if (!isFiniteNumberInRange(c.score, 0, 25)) {
    throw new ArchitectParseError(
      `invalid field: categories.${name}.score (expected number in [0, 25], got ${JSON.stringify(c.score)})`,
    );
  }
  if (!isNonEmptyString(c.feedback)) {
    throw new ArchitectParseError(
      `invalid field: categories.${name}.feedback (expected non-empty string, got ${JSON.stringify(c.feedback)})`,
    );
  }
  return c as { score: number; feedback: string };
}

export function parseArchitectResponse(response: string): ArchitectReview {
  // Try to extract JSON from the response.
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ArchitectParseError("no JSON object found in LLM response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new ArchitectParseError(
      `JSON.parse failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new ArchitectParseError("response is not a JSON object");
  }
  const p = parsed as Record<string, unknown>;

  if (!isFiniteNumberInRange(p.overallScore, 0, 100)) {
    throw new ArchitectParseError(
      `invalid field: overallScore (expected number in [0, 100], got ${JSON.stringify(p.overallScore)})`,
    );
  }

  if (typeof p.categories !== "object" || p.categories === null) {
    throw new ArchitectParseError("missing field: categories");
  }
  const cats = p.categories as Record<string, unknown>;

  const naming = validateCategory(cats.naming, "naming");
  const complexityRaw = validateCategory(cats.complexity, "complexity");
  if (!isNonEmptyString(complexityRaw.current)) {
    throw new ArchitectParseError("invalid field: categories.complexity.current");
  }
  if (!isNonEmptyString(complexityRaw.suggested)) {
    throw new ArchitectParseError("invalid field: categories.complexity.suggested");
  }
  const edgeCasesRaw = validateCategory(cats.edgeCases, "edgeCases");
  if (!isStringArray(edgeCasesRaw.missing)) {
    throw new ArchitectParseError("invalid field: categories.edgeCases.missing");
  }
  const cleanCodeRaw = validateCategory(cats.cleanCode, "cleanCode");
  if (!isStringArray(cleanCodeRaw.issues)) {
    throw new ArchitectParseError("invalid field: categories.cleanCode.issues");
  }

  if (!isStringArray(p.actionable) || p.actionable.length === 0) {
    throw new ArchitectParseError("invalid field: actionable (expected non-empty string[])");
  }

  if (
    p.refactoredExample !== undefined &&
    typeof p.refactoredExample !== "string"
  ) {
    throw new ArchitectParseError("invalid field: refactoredExample (expected string)");
  }

  return {
    overallScore: p.overallScore,
    categories: {
      naming: { score: naming.score, feedback: naming.feedback },
      complexity: {
        score: complexityRaw.score,
        feedback: complexityRaw.feedback,
        current: complexityRaw.current,
        suggested: complexityRaw.suggested,
      },
      edgeCases: {
        score: edgeCasesRaw.score,
        feedback: edgeCasesRaw.feedback,
        missing: edgeCasesRaw.missing,
      },
      cleanCode: {
        score: cleanCodeRaw.score,
        feedback: cleanCodeRaw.feedback,
        issues: cleanCodeRaw.issues,
      },
    },
    actionable: p.actionable,
    refactoredExample:
      typeof p.refactoredExample === "string" ? p.refactoredExample : undefined,
  };
}

async function persistArchitectReview(
  userId: string,
  problemId: string,
  review: ArchitectReview,
  codeHash?: string,
): Promise<void> {
  try {
    const reviewData = { architectReview: review, reviewedAt: new Date().toISOString(), codeHash };
    await prisma.mentorConversationSummary.update({
      where: { userId_problemId: { userId, problemId } },
      data: { approachNotesMd: JSON.stringify(reviewData) },
    });
  } catch {
    // Non-critical: don't fail if persistence fails
  }
}

/**
 * Generate user-friendly architect review message.
 */
export function formatArchitectFeedback(review: ArchitectReview): string {
  const { overallScore, categories, actionable, refactoredExample } = review;

  let message = `## Senior Architect Review: ${overallScore}/100\n\n`;

  if (overallScore >= 90) {
    message += "✨ **Excellent work!** This is production-ready code.\n\n";
  } else if (overallScore >= 70) {
    message += "👍 **Good solution!** A few improvements to make it production-grade:\n\n";
  } else {
    message += "💡 **Works, but needs refactoring.** Here's how to improve:\n\n";
  }

  // Category breakdown
  message += `**Naming** (${categories.naming.score}/25): ${categories.naming.feedback}\n\n`;
  message += `**Complexity** (${categories.complexity.score}/25): ${categories.complexity.feedback}\n`;
  message += `- Current: ${categories.complexity.current} | Can achieve: ${categories.complexity.suggested}\n\n`;

  if (categories.edgeCases.missing.length > 0) {
    message += `**Edge Cases** (${categories.edgeCases.score}/25): Missing: ${categories.edgeCases.missing.join(", ")}\n\n`;
  } else {
    message += `**Edge Cases** (${categories.edgeCases.score}/25): ${categories.edgeCases.feedback}\n\n`;
  }

  if (categories.cleanCode.issues.length > 0) {
    message += `**Clean Code** (${categories.cleanCode.score}/25): Issues: ${categories.cleanCode.issues.join(", ")}\n\n`;
  } else {
    message += `**Clean Code** (${categories.cleanCode.score}/25): ${categories.cleanCode.feedback}\n\n`;
  }

  // Actionable items
  message += "**Actionable Improvements:**\n";
  actionable.forEach((item, i) => {
    message += `${i + 1}. ${item}\n`;
  });

  // Refactored example
  if (refactoredExample) {
    message += `\n**Refactored Example:**\n\`\`\`\n${refactoredExample}\n\`\`\`\n`;
  }

  return message;
}
