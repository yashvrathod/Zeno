import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getWeakPatternReport } from "@/lib/mentor/patternTracker";
import { getStudentKnowledgeGraph, getDueConcepts } from "@/lib/mentor/personalizationEngine";
import type { DashboardData, ConceptMasteryItem, WeakArea, ActivityItem, ReviewItem, LearningVelocityPoint } from "@/lib/dashboard/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, problemStats, mentorSummaries, weakPatternReport] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, longestStreak: true, totalSolved: true, interviewReadiness: true },
      }),
      prisma.userProblemStats.findMany({ where: { userId } }),
      prisma.mentorConversationSummary.findMany({
        where: { userId },
        select: { problemId: true, lastRung: true, breakthroughs: true, status: true },
      }),
      getWeakPatternReport(userId).catch(() => []),
    ]);

    const problemsAttempted = problemStats.length;
    const problemsSolved = problemStats.filter(s => s.acceptedCount > 0).length;
    const totalRunCount = problemStats.reduce((sum, s) => sum + s.runCount, 0);
    const totalSubmitCount = problemStats.reduce((sum, s) => sum + s.submitCount, 0);

    const knowledgeGraph = await getStudentKnowledgeGraph(userId);
    const conceptMastery: ConceptMasteryItem[] = [];
    if (knowledgeGraph) {
      for (const [conceptId, cm] of knowledgeGraph.concepts) {
        let status: ConceptMasteryItem['status'] = 'not_started';
        if (cm.mastery >= 80) status = 'mastered';
        else if (cm.practiceCount > 0) status = 'learning';

        const prereqs = (cm.prerequisites || []);
        if (status !== 'mastered' && prereqs.length > 0) {
          const hasUnmetPrereqs = prereqs.some(p => {
            const pMastery = knowledgeGraph.concepts.get(p);
            return !pMastery || pMastery.mastery < 70;
          });
          if (hasUnmetPrereqs) status = 'blocked';
        }

        conceptMastery.push({
          concept: conceptId,
          mastery: cm.mastery,
          practiceCount: cm.practiceCount,
          successRate: cm.successRate,
          lastPracticed: cm.lastPracticed?.toISOString() || null,
          status,
        });
      }
    }

    const weakAreas: WeakArea[] = weakPatternReport.map(p => ({
      tag: p.tag,
      friendlyName: p.friendlyName,
      count: p.count,
      percentOfSessions: p.percentOfSessions,
      description: p.description,
    }));

    const masteredPatternsSet = new Set<string>();
    for (const summary of mentorSummaries) {
      if (summary.breakthroughs && Array.isArray(summary.breakthroughs)) {
        summary.breakthroughs.forEach(p => masteredPatternsSet.add(p));
      }
    }

    const stuckProblems: string[] = [];
    for (const stat of problemStats) {
      if (stat.submitCount > 5 && stat.acceptedCount === 0) {
        stuckProblems.push(stat.problemId);
      }
    }

    const reviewQueue: ReviewItem[] = [];
    if (knowledgeGraph) {
      const due = getDueConcepts(knowledgeGraph, 5);
      for (const cm of due) {
        reviewQueue.push({
          concept: cm.concept,
          nextReviewDue: cm.nextReviewDue?.toISOString() || new Date().toISOString(),
          interval: Math.ceil((new Date(cm.nextReviewDue?.getTime() || Date.now()).getTime() - Date.now()) / 86400000),
          priority: cm.mastery < 40 ? 'high' : cm.mastery < 70 ? 'medium' : 'low',
          mastery: cm.mastery,
        });
      }
    }

    const recentMessages = await prisma.mentorConversationMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, problemId: true, role: true, content: true, createdAt: true },
    });

    const recentActivity: ActivityItem[] = [];
    const seenProblems = new Set<string>();
    for (const msg of recentMessages) {
      if (seenProblems.has(msg.problemId)) continue;
      seenProblems.add(msg.problemId);
      recentActivity.push({
        id: msg.id,
        type: msg.role === 'assistant' ? 'review' : 'attempted',
        problemTitle: msg.problemId,
        problemSlug: msg.problemId,
        timestamp: msg.createdAt.toISOString(),
        detail: msg.content.slice(0, 120),
      });
    }

    const trajectory = knowledgeGraph?.learningTrajectory || [];
    const learningVelocity: LearningVelocityPoint[] = trajectory.length > 0
      ? trajectory.map((t: any) => ({
          date: new Date(t.date).toISOString().split('T')[0],
          overallMastery: t.overallMastery || 0,
          conceptsMastered: t.conceptsMastered || 0,
          problemsSolved: t.problemsSolved || 0,
        }))
      : generateMockTrajectory(problemsSolved, problemsAttempted, conceptMastery);

    const recommendedNext = null;

    const data: DashboardData = {
      overallStats: {
        problemsAttempted,
        problemsSolved,
        successRate: problemsAttempted > 0 ? Math.round((problemsSolved / problemsAttempted) * 100) : 0,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
        totalRunCount,
        totalSubmitCount,
        interviewReadiness: user?.interviewReadiness || 0,
      },
      conceptMastery,
      learningVelocity,
      reviewQueue,
      recentActivity,
      weakAreas,
      masteredPatterns: Array.from(masteredPatternsSet),
      stuckProblems,
      recommendedNext: null,
    };

    return Response.json({ ok: true, data });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return Response.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}

function generateMockTrajectory(solved: number, attempted: number, concepts: ConceptMasteryItem[]): LearningVelocityPoint[] {
  const points: LearningVelocityPoint[] = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    points.push({
      date: d.toISOString().split('T')[0],
      overallMastery: Math.min(100, Math.round((30 - i) * 2.3 + Math.random() * 5)),
      conceptsMastered: Math.min(concepts.length, Math.round((30 - i) * 0.3)),
      problemsSolved: Math.max(0, Math.round(solved * ((30 - i) / 30))),
    });
  }
  return points;
}
