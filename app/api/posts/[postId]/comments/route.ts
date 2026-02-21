import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/posts/[postId]/comments - Get comments for a post
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return NextResponse.json({
      comments,
      nextCursor: comments.length === limit ? comments[comments.length - 1].id : null,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/[postId]/comments - Add a comment to a post
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
    const body = await req.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

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

    // Create comment and increment counter
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          postId,
          userId: session.user.id,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          }
        }
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } }
      })
    ]);

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
