-- AlterTable
ALTER TABLE "CacheEntry" ADD COLUMN     "embeddingVector" BYTEA;

-- CreateTable
CREATE TABLE "UserKnowledgeGraph" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learningStyle" JSONB NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "learningTrajectory" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKnowledgeGraph_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConceptMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "mastery" DOUBLE PRECISION NOT NULL,
    "lastPracticed" TIMESTAMP(3),
    "practiceCount" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "averageTimeToSolve" DOUBLE PRECISION,
    "commonErrors" JSONB NOT NULL,
    "prerequisites" TEXT[],
    "dependents" TEXT[],
    "nextReviewDue" TIMESTAMP(3),
    "difficultyRating" INTEGER NOT NULL,
    "confidenceRating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningPattern" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patternType" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "successRate" DOUBLE PRECISION NOT NULL,
    "preferredContext" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "problemSlug" TEXT NOT NULL,
    "concepts" TEXT[],
    "patterns" TEXT[],
    "attempts" INTEGER NOT NULL,
    "solved" BOOLEAN NOT NULL,
    "timeSpent" INTEGER NOT NULL,
    "firstAttemptSuccess" BOOLEAN NOT NULL,
    "hintCount" INTEGER NOT NULL,
    "stageReached" TEXT NOT NULL,
    "rungReached" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "errors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Misconception" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detectedDate" TIMESTAMP(3) NOT NULL,
    "corrected" BOOLEAN NOT NULL DEFAULT false,
    "correctionDate" TIMESTAMP(3),
    "relatedProblems" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Misconception_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserKnowledgeGraph_userId_key" ON "UserKnowledgeGraph"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptMastery_userId_conceptId_key" ON "ConceptMastery"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "CacheEntry_embeddingVector_idx" ON "CacheEntry"("embeddingVector");

-- AddForeignKey
ALTER TABLE "ConceptMastery" ADD CONSTRAINT "ConceptMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserKnowledgeGraph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningPattern" ADD CONSTRAINT "LearningPattern_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserKnowledgeGraph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemAttempt" ADD CONSTRAINT "ProblemAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserKnowledgeGraph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Misconception" ADD CONSTRAINT "Misconception_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserKnowledgeGraph"("id") ON DELETE CASCADE ON UPDATE CASCADE;
