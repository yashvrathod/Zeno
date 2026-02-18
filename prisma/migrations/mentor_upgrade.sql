-- Migration: Upgrade DSA Mentor AI System
-- This migration adds support for Learning Ladder rung tracking and breakthrough detection

-- Add new columns to MentorConversationSummary table
ALTER TABLE "MentorConversationSummary" ADD COLUMN "messageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MentorConversationSummary" ADD COLUMN "lastRung" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "MentorConversationSummary" ADD COLUMN "breakthroughs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add metadata field to MentorConversationMessage for storing rung/stage info
ALTER TABLE "MentorConversationMessage" ADD COLUMN "metadata" JSONB;

-- Update the status column comment to include 'ONGOING'
COMMENT ON COLUMN "MentorConversationSummary"."status" IS 'SOLVED | FINISHED | ONGOING';

-- Create index for efficient conversation retrieval
CREATE INDEX IF NOT EXISTS "MentorConversationMessage_userId_problemId_idx" ON "MentorConversationMessage"("userId", "problemId");

-- Migration notes:
-- messageCount: Server-side counter for reliable summary update triggers (every 4 messages)
-- lastRung: Tracks which rung (1-6) of the Learning Ladder the student is currently on
-- breakthroughs: Array of pattern names the student has demonstrated mastery of
-- metadata: Stores rung, stage, tone info for each message to track progression over time
