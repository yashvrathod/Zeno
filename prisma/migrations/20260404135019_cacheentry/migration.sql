/*
  Warnings:

  - You are about to drop the column `userId` on the `CacheEntry` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[problemId,questionMd5]` on the table `CacheEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CacheEntry_userId_problemId_idx";

-- DropIndex
DROP INDEX "CacheEntry_userId_problemId_questionMd5_key";

-- AlterTable
ALTER TABLE "CacheEntry" DROP COLUMN "userId",
ADD COLUMN     "questionText" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "CacheEntry_problemId_idx" ON "CacheEntry"("problemId");

-- CreateIndex
CREATE UNIQUE INDEX "CacheEntry_problemId_questionMd5_key" ON "CacheEntry"("problemId", "questionMd5");

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MentorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
