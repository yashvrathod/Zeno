/**
 * Mentor Progress Analytics API
 * 
 * Returns learning analytics for the authenticated user:
 * - Problems attempted vs solved
 * - Average rung when solving problems
 * - Mastered patterns (from breakthroughs)
 * - Stuck problems (high submission count, no acceptance)
 * - Recommended next problem based on mastered patterns
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/mentor/progress
 * Returns learning progress analytics for the current user
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user's problem stats and mentor summaries in parallel
    const [problemStats, mentorSummaries, allProblems] = await Promise.all([
      prisma.userProblemStats.findMany({
        where: { userId },
        select: {
          problemId: true,
          submitCount: true,
          acceptedCount: true,
          runCount: true,
        },
      }),
      prisma.mentorConversationSummary.findMany({
        where: { userId },
        select: {
          problemId: true,
          lastRung: true,
          breakthroughs: true,
          status: true,
        },
      }),
      prisma.problem.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          title: true,
          difficulty: true,
          patterns: {
            select: {
              pattern: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Calculate problems attempted and solved
    const problemsAttempted = problemStats.length;
    const problemsSolved = problemStats.filter((s) => s.acceptedCount > 0).length;

    // Calculate average rungs when solving problems
    const averageRungs: Record<string, number> = {};
    for (const summary of mentorSummaries) {
      if (summary.status === "SOLVED" || summary.lastRung >= 5) {
        averageRungs[summary.problemId] = summary.lastRung;
      }
    }

    // Collect all mastered patterns from breakthroughs
    const masteredPatternsSet = new Set<string>();
    for (const summary of mentorSummaries) {
      if (summary.breakthroughs && Array.isArray(summary.breakthroughs)) {
        summary.breakthroughs.forEach((pattern) => masteredPatternsSet.add(pattern));
      }
    }
    const masteredPatterns = Array.from(masteredPatternsSet);

    // Find stuck problems (submitCount > 5, acceptedCount = 0)
    const stuckProblems: string[] = [];
    for (const stat of problemStats) {
      if (stat.submitCount > 5 && stat.acceptedCount === 0) {
        const problem = allProblems.find((p) => p.id === stat.problemId);
        if (problem) {
          stuckProblems.push(problem.title);
        }
      }
    }

    // Recommend next problem based on mastered patterns
    let recommendedNextProblem: string | null = null;

    if (masteredPatterns.length > 0) {
      // Find problems with mastered patterns that user hasn't solved yet
      const solvedProblemIds = new Set(
        problemStats.filter((s) => s.acceptedCount > 0).map((s) => s.problemId)
      );

      const candidateProblems = allProblems.filter((problem) => {
        // Skip if already solved
        if (solvedProblemIds.has(problem.id)) return false;

        // Check if this problem has any mastered patterns
        const problemPatterns = problem.patterns.map((p) => p.pattern.name);
        return problemPatterns.some((pattern) => masteredPatterns.includes(pattern));
      });

      // Prioritize by difficulty: EASY → MEDIUM → HARD
      const difficultyOrder = { EASY: 1, MEDIUM: 2, HARD: 3 };
      candidateProblems.sort((a, b) => {
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      });

      if (candidateProblems.length > 0) {
        recommendedNextProblem = candidateProblems[0].title;
      }
    }

    // If no pattern-based recommendation, suggest an easy unsolved problem
    if (!recommendedNextProblem) {
      const solvedProblemIds = new Set(
        problemStats.filter((s) => s.acceptedCount > 0).map((s) => s.problemId)
      );
      const unsolvedEasy = allProblems.find(
        (p) => p.difficulty === "EASY" && !solvedProblemIds.has(p.id)
      );
      if (unsolvedEasy) {
        recommendedNextProblem = unsolvedEasy.title;
      }
    }

    return Response.json({
      ok: true,
      data: {
        problemsAttempted,
        problemsSolved,
        averageRungs,
        masteredPatterns,
        stuckProblems,
        recommendedNextProblem,
      },
    });
  } catch (error) {
    console.error("Mentor progress API error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
