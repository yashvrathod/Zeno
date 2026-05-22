/**
 * Simple AI Quota Guard
 * - Daily message limit per user
 * - Monthly budget cap
 * - Prevents runaway costs
 */

import prisma from '../prisma';

const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || "50");
const MONTHLY_BUDGET = parseFloat(process.env.AI_MONTHLY_BUDGET || "20");

export async function checkAIQuota(userId: string): Promise<{ allowed: boolean; reason?: string; remaining: number }> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get today's usage
  const todayMsgs = await prisma.mentorConversationMessage.count({
    where: {
      userId,
      createdAt: { gte: today },
    },
  });

  // Get monthly spend (estimate: $0.01 per message)
  const monthlyMsgs = await prisma.mentorConversationMessage.count({
    where: {
      userId,
      createdAt: { gte: monthStart },
    },
  });
  const monthlySpend = monthlyMsgs * 0.01;

  // Check limits
  if (todayMsgs >= DAILY_LIMIT) {
    return { allowed: false, reason: 'Daily AI message limit reached', remaining: 0 };
  }

  if (monthlySpend >= MONTHLY_BUDGET) {
    return { allowed: false, reason: 'Monthly AI budget reached', remaining: 0 };
  }

  return { allowed: true, remaining: DAILY_LIMIT - todayMsgs };
}

export async function estimateAICost(tokens: number): Promise<number> {
  // Haiku: $0.25 per 1M tokens = $0.00000025 per token
  return Math.round(tokens * 0.00000025 * 1000) / 1000;
}
