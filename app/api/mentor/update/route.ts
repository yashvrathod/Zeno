import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { updateAfterExecution, type ProblemContext, type ExecutionStats } from "@/lib/executor/personalizationUpdater";
import { features } from "@/lib/features";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { problemContext, executionStats } = body as {
      problemContext: ProblemContext;
      executionStats: ExecutionStats;
    };

    if (!features.personalization) {
      return Response.json({ ok: true, skipped: true, reason: "Personalization disabled" });
    }

    await updateAfterExecution(
      session.user.id,
      problemContext,
      executionStats
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Personalization update error:", error);
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}