import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/posts - Fetch feed posts
 * Query params: 
 *   - feed: 'following' | 'featured' | 'rising' | 'all' (default: 'all')
 *   - limit: number (default: 20)
 *   - cursor: string (for pagination)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    
    const feed = searchParams.get('feed') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const cursor = searchParams.get('cursor');

    let posts;
    const userId = session?.user?.id;

    if (feed === 'following' && userId) {
      // Get posts from users that current user follows
      posts = await prisma.post.findMany({
        where: {
          user: {
            followers: {
              some: {
                followerId: userId
              }
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          },
          likes: userId ? {
            where: { userId },
            select: { id: true }
          } : false,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
    } else if (feed === 'featured') {
      // Get featured posts
      posts = await prisma.post.findMany({
        where: { featured: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          },
          likes: userId ? {
            where: { userId },
            select: { id: true }
          } : false,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
    } else if (feed === 'rising') {
      // Get posts with high engagement in last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      posts = await prisma.post.findMany({
        where: {
          createdAt: { gte: oneDayAgo }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          },
          likes: userId ? {
            where: { userId },
            select: { id: true }
          } : false,
        },
        orderBy: [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
    } else {
      // Get all posts
      posts = await prisma.post.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            }
          },
          likes: userId ? {
            where: { userId },
            select: { id: true }
          } : false,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
    }

    return NextResponse.json({ 
      posts: posts.map(post => ({
        ...post,
        isLiked: userId ? post.likes.length > 0 : false,
        likes: undefined, // Remove the likes array, we only needed it for isLiked
      })),
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts - Create a new post
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { content, codeSnippet, language, imageUrl, tags } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Extract hashtags from content if not provided
    const extractedTags = tags || [];
    const hashtagMatches = content.match(/#[\w]+/g);
    if (hashtagMatches) {
      hashtagMatches.forEach((tag: string) => {
        const cleanTag = tag.substring(1); // Remove #
        if (!extractedTags.includes(cleanTag)) {
          extractedTags.push(cleanTag);
        }
      });
    }

    // Create the post
    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        content,
        codeSnippet,
        language,
        imageUrl,
        tags: extractedTags,
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
    });

    // Update trending topics
    if (extractedTags.length > 0) {
      await Promise.all(
        extractedTags.map(async (tag: string) => {
          await prisma.trendingTopic.upsert({
            where: { tag },
            create: { tag, postCount: 1, weekCount: 1 },
            update: { 
              postCount: { increment: 1 },
              weekCount: { increment: 1 },
            }
          });
        })
      );
    }

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
