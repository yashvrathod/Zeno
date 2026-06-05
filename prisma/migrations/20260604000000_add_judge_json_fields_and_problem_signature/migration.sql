-- AddLeetCodeStyleJudgeFields
-- Adds nullable `args` (JSONB) and `expectedJson` (JSONB) columns to TestCase
-- for the new per-test judge pipeline. Legacy `input`/`expected` columns are
-- retained and will be dropped in a follow-up migration once the runner is
-- fully cut over in PR 2.
ALTER TABLE "TestCase" ADD COLUMN "args" JSONB;
ALTER TABLE "TestCase" ADD COLUMN "expectedJson" JSONB;

-- CreateTable
CREATE TABLE "ProblemSignature" (
    "problemId" TEXT NOT NULL,
    "className" TEXT,
    "methodName" TEXT NOT NULL,
    "paramTypes" JSONB NOT NULL,
    "returnType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemSignature_pkey" PRIMARY KEY ("problemId")
);

-- AddForeignKey
ALTER TABLE "ProblemSignature" ADD CONSTRAINT "ProblemSignature_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
