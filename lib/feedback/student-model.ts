import prisma from "@/lib/prisma";
import { FeedbackRecord, StudentProfile, ScoredResponse } from "./types";
import { aggregateScores, generateInsights } from "./response-scorer";

const PROFILE_CACHE_TTL = 5 * 60 * 1000;
const profileCache = new Map<string, { profile: StudentProfile; timestamp: number }>();

export async function recordFeedback(feedback: FeedbackRecord): Promise<void> {
  try {
    await prisma.mentorFeedback.create({
      data: {
        sessionId: feedback.sessionId,
        userId: feedback.userId,
        problemId: feedback.problemId,
        messageId: feedback.messageId,
        studentReaction: feedback.studentReaction,
        helpfulScore: feedback.helpfulScore,
        codeBefore: feedback.studentCodeBefore,
        codeAfter: feedback.studentCodeAfter,
        executionTraceAvailable: feedback.executionTraceAvailable,
      },
    });

    profileCache.delete(feedback.userId);
  } catch {
  }
}

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < PROFILE_CACHE_TTL) {
    return cached.profile;
  }

  try {
    const feedbacks = await prisma.mentorFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (feedbacks.length === 0) return null;

    const scoredResponses: ScoredResponse[] = feedbacks.map(f => ({
      messageId: f.messageId,
      rung: f.rung ?? 0,
      stage: f.stage ?? "",
      helpfulScore: f.helpfulScore,
      studentReaction: f.studentReaction as any,
      timestamp: f.createdAt.getTime(),
    }));

    const userStats = await prisma.userProblemStats.groupBy({
      by: ["userId"],
      where: { userId },
      _count: { problemId: true },
    });

    const solvedCount = await prisma.userProblemStats.count({
      where: { userId, acceptedCount: { gt: 0 } },
    });

    const profile: StudentProfile = {
      userId,
      totalProblems: userStats[0]?._count?.problemId ?? 0,
      solvedProblems: solvedCount,
      avgHelpfulScore: scoredResponses.reduce((a, r) => a + r.helpfulScore, 0) / scoredResponses.length,
      topPatterns: [],
      weakAreas: [],
      preferredVerbosity: inferVerbosity(scoredResponses),
      preferredTone: inferTone(scoredResponses),
      recentResponses: scoredResponses.slice(0, 20),
    };

    profileCache.set(userId, { profile, timestamp: Date.now() });
    return profile;
  } catch {
    return null;
  }
}

export async function getPromptAdjustments(userId: string): Promise<{
  verbosity: string;
  tone: string;
} | null> {
  const profile = await getStudentProfile(userId);
  if (!profile) return null;

  return {
    verbosity: profile.preferredVerbosity,
    tone: profile.preferredTone,
  };
}

function inferVerbosity(responses: ScoredResponse[]): "concise" | "normal" | "detailed" {
  const avg = responses.reduce((a, r) => a + r.helpfulScore, 0) / responses.length;
  if (avg >= 4) return "detailed";
  if (avg >= 3) return "normal";
  return "concise";
}

function inferTone(responses: ScoredResponse[]): "encouraging" | "analytical" | "challenging" | "empathetic" {
  const stuckRate = responses.filter(r => r.studentReaction === "stuck" || r.studentReaction === "gave_up").length / responses.length;
  if (stuckRate > 0.5) return "empathetic";
  if (stuckRate > 0.3) return "encouraging";
  const solvedRate = responses.filter(r => r.studentReaction === "solved").length / responses.length;
  if (solvedRate > 0.5) return "challenging";
  return "analytical";
}

export function invalidateProfileCache(userId: string): void {
  profileCache.delete(userId);
}
