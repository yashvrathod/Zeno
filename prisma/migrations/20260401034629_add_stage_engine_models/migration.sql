-- CreateTable
CREATE TABLE "CacheEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "questionMd5" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "response" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "rung" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "similarity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'EXPLORE',
    "currentRung" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CacheEntry_userId_problemId_idx" ON "CacheEntry"("userId", "problemId");

-- CreateIndex
CREATE INDEX "CacheEntry_usedCount_idx" ON "CacheEntry"("usedCount");

-- CreateIndex
CREATE UNIQUE INDEX "CacheEntry_userId_problemId_questionMd5_key" ON "CacheEntry"("userId", "problemId", "questionMd5");

-- CreateIndex
CREATE INDEX "MentorSession_userId_idx" ON "MentorSession"("userId");

-- CreateIndex
CREATE INDEX "MentorSession_updatedAt_idx" ON "MentorSession"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MentorSession_userId_problemId_key" ON "MentorSession"("userId", "problemId");

-- CreateIndex
CREATE INDEX "MentorMessage_sessionId_createdAt_idx" ON "MentorMessage"("sessionId", "createdAt");
