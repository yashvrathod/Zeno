/**
 * GET /api/mentor/history?problemId=xxx
 * 
 * Retrieves the complete persisted conversation history for a user+problem.
 * This ensures conversation continuity across page refreshes.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const problemId = searchParams.get("problemId");

    if (!problemId) {
      return Response.json(
        { error: "Missing problemId parameter" },
        { status: 400 }
      );
    }

    // Fetch the Stage Engine session and its messages
    const sessionRecord = await prisma.mentorSession.findUnique({
      where: {
        userId_problemId: {
          userId: session.user.id,
          problemId,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            content: true,
            stage: true,
            createdAt: true,
          },
        },
      },
    });

    // Fetch summary metadata (still useful for message count and lastRung)
    const summary = await prisma.mentorConversationSummary.findUnique({
      where: {
        userId_problemId: {
          userId: session.user.id,
          problemId,
        },
      },
      select: {
        summaryMd: true,
        messageCount: true,
        lastRung: true,
        breakthroughs: true,
        status: true,
      },
    });

    // Transform messages to frontend format — FILTER OUT SYSTEM MESSAGES
    const history = (sessionRecord?.messages ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    return Response.json({
      ok: true,
      history,
      summary: summary
        ? {
            summaryMd: summary.summaryMd,
            messageCount: summary.messageCount,
            lastRung: summary.lastRung,
            breakthroughs: summary.breakthroughs,
            status: summary.status,
          }
        : null,
    });
  } catch (error) {
    console.error("Mentor history fetch error:", error);
    return Response.json(
      { error: "Failed to fetch conversation history" },
      { status: 500 }
    );
  }
}
