/**
 * Mentor Understand API — Problem Breakdown (Streaming)
 *
 * Provides a structured problem breakdown when user is in EXPLORE stage.
 * Uses interactionRouter for STATIC routing — NEVER calls AI.
 * Returns streaming response word-by-word for alive UI feel.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { routeInteraction } from "@/lib/mentor/interactionRouter";
import { saveMessage } from "@/lib/mentor/stageEngine";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────
// PROBLEM BREAKDOWN GENERATOR
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generates a structured problem breakdown without AI.
 * This is a STATIC response based on problem structure.
 */
function generateProblemBreakdown(params: {
  problemTitle: string;
  problemStatement: string;
  constraints?: string;
}): string {
  const { problemTitle, problemStatement, constraints } = params;

  return `## Understanding the Problem

Let's break down **${problemTitle}** step by step.

### What is the problem asking?

${problemStatement.slice(0, 500)}${problemStatement.length > 500 ? "..." : ""}

### Key Questions to Answer:

1. **What is the input?**
   - What data structure(s) are we given?
   - What are the constraints on size/values?

2. **What is the expected output?**
   - What format should we return?
   - Are there multiple valid answers?

3. **What are the edge cases?**
   - Empty input?
   - Single element?
   - All same values?
   - Minimum/maximum values?

### Let's Trace Through an Example

Before thinking about algorithms, let's manually solve a small example:

**Example:** Walk through the first test case by hand.
- What operation do you perform first?
- What changes after each step?
- When do you stop?

### Constraints Analysis

${constraints || "Check the problem constraints tab for limits on input size."}

${constraints?.includes("10^5") || constraints?.includes("10^4")
  ? "\n**Note:** With n up to 10^4 or 10^5, an O(n²) solution will likely time out. We'll need something closer to O(n) or O(n log n)."
  : ""}

---

**Your turn:** Can you explain the problem back to me in your own words? What are we trying to find or compute?`;
}

// ─────────────────────────────────────────────────────────────────────────
// STREAMING HELPER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Creates a streaming response that sends text word-by-word.
 * This makes the UI feel alive and engaged.
 */
function createWordStream(text: string): ReadableStream<Uint8Array> {
  const words = text.split(/(\s+)/); // Split but keep whitespace
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        // Small delay between words for natural feel
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 30 + 10)
        );
      }
      controller.close();
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = await req.json().catch(() => null);
    if (!body?.problemId || !body?.problemTitle || !body?.problemStatementMd) {
      return Response.json(
        { error: "Missing required fields: problemId, problemTitle, problemStatementMd" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const problemId = body.problemId;

    // Get or create session
    let mentorSession = await prisma.mentorSession.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });

    if (!mentorSession) {
      mentorSession = await prisma.mentorSession.create({
        data: { userId, problemId, stage: "EXPLORE", currentRung: 1 },
      });
    }

    // Create a pseudo-session object for interactionRouter
    const sessionForRouter = {
      id: mentorSession.id,
      userId,
      problemId,
      stage: "EXPLORE" as const,
      messages: [],
    };

    // Create pseudo-problem object
    const problem = {
      id: problemId,
      slug: body.problemSlug || problemId,
      title: body.problemTitle,
      statementMd: body.problemStatementMd,
      constraintsMd: body.problemConstraintsMd,
      meta: {
        difficulty: body.difficulty || "MEDIUM",
        tags: body.tags || [],
        patterns: body.patterns || [],
      },
    };

    // Use interactionRouter — should return STATIC breakdown for EXPLORE stage
    const decision = await routeInteraction(
      "Help me understand this problem",
      sessionForRouter,
      problem
    );

    // For understand route, we ALWAYS return breakdown (STATIC)
    // The router should confirm this is the right handler
    if (decision.type === "STATIC" && decision.handler === "breakdown") {
      // Generate the breakdown
      const breakdown = generateProblemBreakdown({
        problemTitle: body.problemTitle,
        problemStatement: body.problemStatementMd,
        constraints: body.problemConstraintsMd,
      });

      // Save to DB
      await saveMessage(mentorSession.id, "user", "Help me understand this problem", "EXPLORE");
      await saveMessage(mentorSession.id, "assistant", breakdown, "EXPLORE");

      // Return streaming response
      const stream = createWordStream(breakdown);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Breakdown-Complete": "true",
        },
      });
    }

    // Fallback: return breakdown anyway (EXPLORE stage always gets breakdown)
    const breakdown = generateProblemBreakdown({
      problemTitle: body.problemTitle,
      problemStatement: body.problemStatementMd,
      constraints: body.problemConstraintsMd,
    });

    await saveMessage(mentorSession.id, "user", "Help me understand this problem", "EXPLORE");
    await saveMessage(mentorSession.id, "assistant", breakdown, "EXPLORE");

    const stream = createWordStream(breakdown);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Breakdown-Complete": "true",
      },
    });

  } catch (error) {
    console.error("Understand API Error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
