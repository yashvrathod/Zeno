/**
 * Senior Architect Review API
 *
 * POST /api/mentor/architect-review
 *
 * Triggers a Senior Architect code review after successful solution.
 * Returns detailed scoring across naming, complexity, edge cases, and clean code.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  triggerArchitectReview,
  formatArchitectFeedback,
  type ArchitectReview,
} from "@/lib/mentor/services/seniorArchitect";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.code || !body?.language || !body?.problemId) {
      return Response.json(
        { error: "Missing required fields: code, language, problemId" },
        { status: 400 }
      );
    }

    const { code, language, problemId, problemTitle } = body;

    // Trigger architect review
    const review = await triggerArchitectReview({
      userId: session.user.id,
      problemId,
      code,
      language,
      problemTitle,
    });

    if (!review) {
      return Response.json(
        {
          ok: false,
          error: "AI service unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    // Format the feedback for display
    const feedback = formatArchitectFeedback(review);

    return Response.json({
      ok: true,
      review,
      feedback,
      summary: {
        score: review.overallScore,
        grade:
          review.overallScore >= 90
            ? "A"
            : review.overallScore >= 80
            ? "B"
            : review.overallScore >= 70
            ? "C"
            : review.overallScore >= 60
            ? "D"
            : "F",
        productionReady: review.overallScore >= 80,
      },
    });
  } catch (error) {
    console.error("Architect Review API Error:", error);
    return Response.json(
      { error: "Failed to generate architect review" },
      { status: 500 }
    );
  }
}
