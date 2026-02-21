import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/channels/[channelId]/follow - Follow a channel
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { channelId } = await params;

    // Check if already following
    const existingFollow = await prisma.channelFollow.findUnique({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following' },
        { status: 400 }
      );
    }

    // Create follow
    await prisma.channelFollow.create({
      data: {
        userId: session.user.id,
        channelId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error following channel:', error);
    return NextResponse.json(
      { error: 'Failed to follow channel' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/channels/[channelId]/follow - Unfollow a channel
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { channelId } = await params;

    // Check if following
    const existingFollow = await prisma.channelFollow.findUnique({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Not following' },
        { status: 400 }
      );
    }

    // Delete follow
    await prisma.channelFollow.delete({
      where: {
        userId_channelId: {
          userId: session.user.id,
          channelId,
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unfollowing channel:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow channel' },
      { status: 500 }
    );
  }
}
