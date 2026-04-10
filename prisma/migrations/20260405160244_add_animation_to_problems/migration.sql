-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "animationData" TEXT,
ADD COLUMN     "animationType" TEXT;

-- AlterTable
ALTER TABLE "UserAiSettings" ALTER COLUMN "preferredFreeModel" SET DEFAULT 'deepseek/deepseek-chat-v3-0324:free';
