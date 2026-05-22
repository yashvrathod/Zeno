import prisma from "@/lib/prisma";
import { debug } from "@/lib/debug";
import { TeachingStage } from "@/lib/mentorContext";
import { canTransition, TransitionContext } from "./validation";

export async function tryAdvanceStage(
  sessionId: string,
  to: TeachingStage,
  context: TransitionContext
): Promise<{ success: boolean; newStage: TeachingStage; message?: string }> {
  if (process.env.DEBUG_STAGE !== "0") {
    debug.stage("tryAdvanceStage:", { sessionId, to, context });
  }

  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return {
      success: false,
      newStage: to,
      message: "Session not found",
    };
  }

  const from = session.stage as TeachingStage;
  const validation = await canTransition(from, to, context);

  if (!validation.allowed) {
    return {
      success: false,
      newStage: from,
      message: validation.reason,
    };
  }

  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: { stage: to },
  });

  await prisma.mentorMessage.create({
    data: {
      sessionId,
      role: "system",
      content: `Stage advanced: ${from} → ${to}`,
      stage: to,
    },
  });

  return { success: true, newStage: to };
}
