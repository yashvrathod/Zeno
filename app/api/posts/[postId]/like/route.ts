import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * POST /api/posts/[postId]/like - Like a post
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: session.user.id
        }
      }
    });

    if (existingLike) {
      return NextResponse.json(
        { error: 'Already liked' },
        { status: 400 }
      );
    }

    // Create like and increment counter
    await prisma.$transaction([
      prisma.postLike.create({
        data: {
          postId,
          userId: session.user.id
        }
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error liking post:', error);
    return NextResponse.json(
      { error: 'Failed to like post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[postId]/like - Unlike a post
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;

    // Check if like exists
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: session.user.id
        }
      }
    });

    if (!existingLike) {
      return NextResponse.json(
        { error: 'Not liked yet' },
        { status: 400 }
      );
    }

    // Delete like and decrement counter
    await prisma.$transaction([
      prisma.postLike.delete({
        where: {
          postId_userId: {
            postId,
            userId: session.user.id
          }
        }
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unliking post:', error);
    return NextResponse.json(
      { error: 'Failed to unlike post' },
      { status: 500 }
    );
  }
}
