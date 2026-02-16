-- CreateTable
CREATE TABLE "MentorConversationMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorConversationSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "solvedAt" TIMESTAMP(3),
    "summaryMd" TEXT NOT NULL,
    "approachNotesMd" TEXT,
    "pitfallsMd" TEXT,
    "keyInsightsMd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorConversationMessage_userId_problemId_createdAt_idx" ON "MentorConversationMessage"("userId", "problemId", "createdAt");

-- CreateIndex
CREATE INDEX "MentorConversationMessage_problemId_createdAt_idx" ON "MentorConversationMessage"("problemId", "createdAt");

-- CreateIndex
CREATE INDEX "MentorConversationSummary_problemId_updatedAt_idx" ON "MentorConversationSummary"("problemId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MentorConversationSummary_userId_problemId_key" ON "MentorConversationSummary"("userId", "problemId");
