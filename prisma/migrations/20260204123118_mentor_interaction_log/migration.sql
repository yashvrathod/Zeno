-- CreateTable
CREATE TABLE "MentorInteractionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "mentorQuestion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorInteractionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MentorInteractionLog_userId_problemId_createdAt_idx" ON "MentorInteractionLog"("userId", "problemId", "createdAt");

-- CreateIndex
CREATE INDEX "MentorInteractionLog_problemId_createdAt_idx" ON "MentorInteractionLog"("problemId", "createdAt");
