import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/discussions/top - Get top discussions of the week
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5');

    // Get posts from last 7 days with most comments
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const topDiscussions = await prisma.post.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        commentCount: { gt: 0 }
      },
      select: {
        id: true,
        content: true,
        commentCount: true,
        createdAt: true,
      },
      orderBy: {
        commentCount: 'desc'
      },
      take: limit,
    });

    return NextResponse.json({ discussions: topDiscussions });
  } catch (error) {
    console.error('Error fetching top discussions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top discussions' },
      { status: 500 }
    );
  }
}
