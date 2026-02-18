-- AlterTable
ALTER TABLE "MentorConversationSummary" ADD COLUMN     "breakthroughs" TEXT[],
ADD COLUMN     "lastRung" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserAiSettings" ADD COLUMN     "apiProvider" TEXT DEFAULT 'server',
ADD COLUMN     "googleApiKey" TEXT,
ADD COLUMN     "groqApiKey" TEXT,
ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ollamaBaseUrl" TEXT,
ADD COLUMN     "ollamaModel" TEXT,
ADD COLUMN     "openaiApiKey" TEXT;
