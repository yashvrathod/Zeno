import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/users/[userId]/follow - Follow a user
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId: followingId } = await params;

    // Can't follow yourself
    if (session.user.id === followingId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToFollow = await prisma.user.findUnique({
      where: { id: followingId }
    });

    if (!userToFollow) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId,
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
    await prisma.follow.create({
      data: {
        followerId: session.user.id,
        followingId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json(
      { error: 'Failed to follow user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[userId]/follow - Unfollow a user
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId: followingId } = await params;

    // Check if following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId,
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
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId,
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    );
  }
}
