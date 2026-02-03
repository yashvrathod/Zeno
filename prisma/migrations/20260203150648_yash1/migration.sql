-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateTable
CREATE TABLE "Pattern" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "statementMd" TEXT NOT NULL,
    "constraintsMd" TEXT,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "starterCode" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemPattern" (
    "problemId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,

    CONSTRAINT "ProblemPattern_pkey" PRIMARY KEY ("problemId","patternId")
);

-- CreateTable
CREATE TABLE "Hint" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "textMd" TEXT NOT NULL,

    CONSTRAINT "Hint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pattern_name_key" ON "Pattern"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_slug_key" ON "Problem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Hint_problemId_order_key" ON "Hint"("problemId", "order");

-- CreateIndex
CREATE INDEX "TestCase_problemId_idx" ON "TestCase"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_problemId_order_isHidden_key" ON "TestCase"("problemId", "order", "isHidden");

-- AddForeignKey
ALTER TABLE "ProblemPattern" ADD CONSTRAINT "ProblemPattern_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemPattern" ADD CONSTRAINT "ProblemPattern_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "Pattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hint" ADD CONSTRAINT "Hint_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
