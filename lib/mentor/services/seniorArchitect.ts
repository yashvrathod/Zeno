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
        select: { summaryMd: true },
      });
      if (summary?.summaryMd) {
        try {
          const parsed = JSON.parse(summary.summaryMd);
          if (parsed.architectReview && parsed.codeHash === codeHash) {
            console.debug("[ARCHITECT_REVIEW] Code unchanged since last review — returning cached result");
            return parsed.architectReview as ArchitectReview;
          }
        } catch {}
      }
    } catch {}
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

    // Parse JSON response
    const review = parseArchitectResponse(response);

    // Persist review with code hash for dedup
    await persistArchitectReview(userId, problemId, review, codeHash);

    return review;
  } catch (error) {
    console.error("Architect review failed:", error);
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

function parseArchitectResponse(response: string): ArchitectReview {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and provide defaults
      return {
        overallScore: parsed.overallScore ?? 75,
        categories: {
          naming: {
            score: parsed.categories?.naming?.score ?? 75,
            feedback:
              parsed.categories?.naming?.feedback ??
              "Variable names are adequate but could be more descriptive.",
          },
          complexity: {
            score: parsed.categories?.complexity?.score ?? 75,
            feedback:
              parsed.categories?.complexity?.feedback ??
              "Complexity is acceptable for this problem.",
            current: parsed.categories?.complexity?.current ?? "O(n)",
            suggested: parsed.categories?.complexity?.suggested ?? "O(n) optimal",
          },
          edgeCases: {
            score: parsed.categories?.edgeCases?.score ?? 75,
            feedback:
              parsed.categories?.edgeCases?.feedback ??
              "Consider additional edge case handling.",
            missing: parsed.categories?.edgeCases?.missing ?? [],
          },
          cleanCode: {
            score: parsed.categories?.cleanCode?.score ?? 75,
            feedback:
              parsed.categories?.cleanCode?.feedback ??
              "Code structure is good. Minor style improvements possible.",
            issues: parsed.categories?.cleanCode?.issues ?? [],
          },
        },
        actionable: parsed.actionable ?? [
          "Review variable naming for clarity",
          "Consider edge case handling",
        ],
        refactoredExample: parsed.refactoredExample,
      };
    }
  } catch {
    // Fallback if JSON parsing fails
  }

  // Default fallback review
  return {
    overallScore: 75,
    categories: {
      naming: {
        score: 75,
        feedback: "Variable names are adequate but could be more descriptive.",
      },
      complexity: {
        score: 75,
        feedback: "Complexity is acceptable for this problem.",
        current: "O(n)",
        suggested: "O(n) - optimal",
      },
      edgeCases: {
        score: 75,
        feedback: "Consider additional edge case handling.",
        missing: [],
      },
      cleanCode: {
        score: 75,
        feedback: "Code structure is good. Minor style improvements possible.",
        issues: [],
      },
    },
    actionable: [
      "Review variable naming for clarity",
      "Consider edge case handling",
    ],
  };
}

async function persistArchitectReview(
  userId: string,
  problemId: string,
  review: ArchitectReview,
  codeHash?: string,
): Promise<void> {
  try {
    const existingSummary = await prisma.mentorConversationSummary.findUnique({
      where: { userId_problemId: { userId, problemId } },
      select: { summaryMd: true },
    });

    let parsed: Record<string, unknown> = {};
    if (existingSummary?.summaryMd) {
      try { parsed = JSON.parse(existingSummary.summaryMd); } catch {}
    }
    parsed.architectReview = review;
    parsed.reviewedAt = new Date().toISOString();
    if (codeHash) parsed.codeHash = codeHash;

    await prisma.mentorConversationSummary.update({
      where: { userId_problemId: { userId, problemId } },
      data: { summaryMd: JSON.stringify(parsed) },
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
