-- Migration: Add Social Feed Features
-- This migration adds posts, comments, likes, following, and trending topics

-- Create Post table
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "codeSnippet" TEXT,
    "language" TEXT,
    "imageUrl" TEXT,
    "tags" TEXT[],
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- Create PostLike table
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- Create Comment table
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- Create Follow table
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- Create ChannelFollow table
CREATE TABLE "ChannelFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelFollow_pkey" PRIMARY KEY ("id")
);

-- Create TrendingTopic table
CREATE TABLE "TrendingTopic" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "postCount" INTEGER NOT NULL DEFAULT 1,
    "weekCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendingTopic_pkey" PRIMARY KEY ("id")
);

-- Create indexes for Post
CREATE INDEX "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt");
CREATE INDEX "Post_featured_createdAt_idx" ON "Post"("featured", "createdAt");
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- Create indexes and unique constraints for PostLike
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- Create indexes for Comment
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- Create indexes and unique constraints for Follow
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- Create indexes and unique constraints for ChannelFollow
CREATE INDEX "ChannelFollow_userId_idx" ON "ChannelFollow"("userId");
CREATE INDEX "ChannelFollow_channelId_idx" ON "ChannelFollow"("channelId");
CREATE UNIQUE INDEX "ChannelFollow_userId_channelId_key" ON "ChannelFollow"("userId", "channelId");

-- Create indexes and unique constraint for TrendingTopic
CREATE UNIQUE INDEX "TrendingTopic_tag_key" ON "TrendingTopic"("tag");
CREATE INDEX "TrendingTopic_postCount_idx" ON "TrendingTopic"("postCount");
CREATE INDEX "TrendingTopic_weekCount_idx" ON "TrendingTopic"("weekCount");

-- Add foreign key constraints
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChannelFollow" ADD CONSTRAINT "ChannelFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
