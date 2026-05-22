import prisma from "@/lib/prisma";
import { debug } from "@/lib/debug";
import { TeachingStage } from "@/lib/mentorContext";

export type MessageRole = "user" | "assistant" | "system";

export type MentorSession = {
  id: string;
  userId: string;
  problemId: string;
  stage: TeachingStage;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  stage: TeachingStage;
  createdAt: Date;
};

function debugLog(label: string, ...args: unknown[]): void {
  if (process.env.DEBUG_STAGE === "0") return;
  debug.stage(label, ...args);
}

export async function getOrCreateSession(
  userId: string,
  problemId: string
): Promise<MentorSession & { messages: Message[] }> {
  debugLog("getOrCreateSession:", { userId, problemId });

  const [session, messages] = await prisma.$transaction(async (tx) => {
    const session = await tx.mentorSession.upsert({
      where: {
        userId_problemId: { userId, problemId },
      },
      create: {
        userId,
        problemId,
        stage: "EXPLORE",
        currentRung: 1,
      },
      update: {
        updatedAt: new Date(),
      },
    });

    const messages = await tx.mentorMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" as const },
    });

    return [session, messages];
  });

  return {
    ...session,
    stage: session.stage as TeachingStage,
    messages: messages.map((m) => ({
      ...m,
      role: m.role as MessageRole,
      stage: m.stage as TeachingStage,
    })),
  };
}

export async function saveMessage(
  sessionId: string,
  role: MessageRole,
  content: string,
  stage: TeachingStage
): Promise<Message> {
  debugLog("saveMessage:", { sessionId, role, contentLen: content.length, stage });

  const fiveSecondsAgo = new Date(Date.now() - 5000);

  const existing = await prisma.mentorMessage.findFirst({
    where: {
      sessionId,
      role,
      content,
      createdAt: { gte: fiveSecondsAgo },
    },
    orderBy: { createdAt: "desc" as const },
  });

  if (existing) {
    return {
      ...existing,
      role: existing.role as MessageRole,
      stage: existing.stage as TeachingStage,
    };
  }

  const message = await prisma.mentorMessage.create({
    data: {
      sessionId,
      role,
      content,
      stage,
    },
  });

  return {
    ...message,
    role: message.role as MessageRole,
    stage: message.stage as TeachingStage,
  };
}

export async function getSessionStats(
  userId: string
): Promise<{
  totalAttempted: number;
  totalSolved: number;
  averageHintsPerProblem: number;
  currentStreak: number;
}> {
  const sessions = await prisma.mentorSession.findMany({
    where: { userId },
  });

  const attemptedProblemIds = new Set(sessions.map((s) => s.problemId));
  const totalAttempted = attemptedProblemIds.size;

  const solvedProblemIds = new Set(
    sessions.filter((s) => s.stage === "REFLECT").map((s) => s.problemId)
  );
  const totalSolved = solvedProblemIds.size;

  const messageCounts = await Promise.all(
    sessions.map(async (s) => {
      return prisma.mentorMessage.count({
        where: { sessionId: s.id },
      });
    })
  );

  const totalMessages = messageCounts.reduce((sum, c) => sum + c, 0);
  const averageHintsPerProblem =
    totalAttempted > 0 ? Math.round((totalMessages / totalAttempted) * 100) / 100 : 0;

  const currentStreak = await computeStreak(userId, sessions);

  return {
    totalAttempted,
    totalSolved,
    averageHintsPerProblem,
    currentStreak,
  };
}

async function computeStreak(
  userId: string,
  sessions: { updatedAt: Date }[]
): Promise<number> {
  if (sessions.length === 0) return 0;

  const activeDates = new Set<string>();
  for (const session of sessions) {
    const date = session.updatedAt.toISOString().slice(0, 10);
    activeDates.add(date);
  }

  let streak = 0;
  let checkDate = new Date();

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (activeDates.has(dateStr)) {
      streak++;
    } else {
      break;
    }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}
