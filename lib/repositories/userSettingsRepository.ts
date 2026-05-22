import prisma from '@/lib/prisma';

const settingsSelect = {
  apiProvider: true, groqApiKey: true, openaiApiKey: true, googleApiKey: true,
  openrouterApiKey: true, ollamaBaseUrl: true, ollamaModel: true,
  preferredFreeModel: true, verbosity: true,
} as const;

export async function findUserSettings(userId: string) {
  return prisma.userAiSettings.findUnique({
    where: { userId },
    select: settingsSelect,
  });
}

export async function upsertUserApiProvider(
  userId: string,
  provider: string,
) {
  return prisma.userAiSettings.upsert({
    where: { userId },
    create: { userId, apiProvider: provider },
    update: { apiProvider: provider },
  });
}

export type UserSettingsResult = Awaited<ReturnType<typeof findUserSettings>>;
