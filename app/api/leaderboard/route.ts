import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { totalSolved: { gt: 0 } },
        orderBy: [
          { totalSolved: "desc" },
          { currentStreak: "desc" },
        ],
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          totalSolved: true,
          currentStreak: true,
          longestStreak: true,
          interviewReadiness: true,
        },
      }),
      prisma.user.count({ where: { totalSolved: { gt: 0 } } }),
    ]);

    const topThree = users.slice(0, 3).map((u, i) => ({
      rank: i + 1,
      name: u.name || u.username || "Anonymous",
      avatar: u.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=333&color=fff`,
      points: u.totalSolved * 100 + u.currentStreak * 50 + u.interviewReadiness * 10,
      problemsSolved: u.totalSolved,
      streak: u.currentStreak,
      prize: i === 0 ? 100000 : i === 1 ? 50000 : 20000,
      position: i === 0 ? "center" : i === 1 ? "left" : "right",
    }));

    const leaderboard = users.slice(3).map((u, i) => ({
      rank: i + 4,
      name: u.name || u.username || "Anonymous",
      username: u.username ? `@${u.username}` : "@anonymous",
      avatar: u.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=333&color=fff`,
      followers: 0,
      points: u.totalSolved * 100 + u.currentStreak * 50 + u.interviewReadiness * 10,
      reward: Math.max(100, 1000 - i * 100),
      problemsSolved: u.totalSolved,
      streak: u.currentStreak,
      readiness: u.interviewReadiness,
    }));

    return Response.json({
      ok: true,
      topThree,
      leaderboard,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return Response.json({ error: "Failed to load leaderboard" }, { status: 500 });
  }
}
