import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/trending - Get trending topics
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const topics = await prisma.trendingTopic.findMany({
      orderBy: [
        { weekCount: 'desc' },
        { postCount: 'desc' }
      ],
      take: limit,
    });

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Error fetching trending topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    );
  }
}
