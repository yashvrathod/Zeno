import { FeedbackRecord, StudentReaction, ScoredResponse } from "./types";

export function scoreResponse(feedback: FeedbackRecord): number {
  const reactionScore = reactionToScore(feedback.studentReaction);
  const helpfulWeight = (feedback.helpfulScore - 1) / 4;

  return Math.round((reactionScore * 0.6 + helpfulWeight * 0.4) * 100);
}

function reactionToScore(reaction: StudentReaction): number {
  switch (reaction) {
    case "solved": return 1.0;
    case "progressed": return 0.7;
    case "stuck": return 0.3;
    case "gave_up": return 0.0;
    case "irrelevant": return 0.2;
  }
}

export function aggregateScores(responses: ScoredResponse[]): {
  averageScore: number;
  solvedRate: number;
  stuckRate: number;
  gaveUpRate: number;
  trend: "improving" | "declining" | "stable";
} {
  if (responses.length === 0) {
    return { averageScore: 0, solvedRate: 0, stuckRate: 0, gaveUpRate: 0, trend: "stable" };
  }

  const scores = responses.map(r => {
    const reactionScore = reactionToScore(r.studentReaction);
    const helpfulWeight = (r.helpfulScore - 1) / 4;
    return Math.round((reactionScore * 0.6 + helpfulWeight * 0.4) * 100);
  });

  const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const solvedCount = responses.filter(r => r.studentReaction === "solved").length;
  const stuckCount = responses.filter(r => r.studentReaction === "stuck").length;
  const gaveUpCount = responses.filter(r => r.studentReaction === "gave_up").length;

  const half = Math.floor(responses.length / 2);
  const firstHalf = scores.slice(0, half);
  const secondHalf = scores.slice(half);

  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;

  const trend = secondAvg > firstAvg + 5 ? "improving" : secondAvg < firstAvg - 5 ? "declining" : "stable";

  return {
    averageScore,
    solvedRate: solvedCount / responses.length,
    stuckRate: stuckCount / responses.length,
    gaveUpRate: gaveUpCount / responses.length,
    trend,
  };
}

export function generateInsights(responses: ScoredResponse[]): {
  bestRungs: number[];
  worstRungs: number[];
  bestStages: string[];
  worstStages: string[];
} {
  const byRung: Record<number, number[]> = {};
  const byStage: Record<string, number[]> = {};

  for (const r of responses) {
    const score = reactionToScore(r.studentReaction) * 0.6 + ((r.helpfulScore - 1) / 4) * 0.4;
    if (!byRung[r.rung]) byRung[r.rung] = [];
    byRung[r.rung].push(score);
    if (!byStage[r.stage]) byStage[r.stage] = [];
    byStage[r.stage].push(score);
  }

  const avgRung = Object.entries(byRung).map(([rung, scores]) => ({
    rung: Number(rung),
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  const avgStage = Object.entries(byStage).map(([stage, scores]) => ({
    stage,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));

  avgRung.sort((a, b) => b.avg - a.avg);
  avgStage.sort((a, b) => b.avg - a.avg);

  return {
    bestRungs: avgRung.slice(0, 2).map(r => r.rung),
    worstRungs: avgRung.slice(-2).map(r => r.rung),
    bestStages: avgStage.slice(0, 2).map(s => s.stage),
    worstStages: avgStage.slice(-2).map(s => s.stage),
  };
}
