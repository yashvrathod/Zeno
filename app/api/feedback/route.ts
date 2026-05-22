import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { recordFeedback, getStudentProfile, getPromptAdjustments } from "@/lib/feedback";
import type { FeedbackRecord } from "@/lib/feedback/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as FeedbackRecord | null;
    if (!body?.sessionId || !body?.problemId) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await recordFeedback({
      ...body,
      userId: session.user.id,
      timestamp: Date.now(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to record feedback" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getStudentProfile(session.user.id);
    const adjustments = await getPromptAdjustments(session.user.id);

    return Response.json({
      ok: true,
      profile,
      adjustments,
    });
  } catch (error) {
    console.error("Feedback profile error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load profile" },
      { status: 500 },
    );
  }
}
