/**
 * Temporary endpoint to fix user's preferred model
 * Call this once: GET http://localhost:3000/api/fix-model
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.userAiSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        preferredFreeModel: 'deepseek/deepseek-chat-v3-0324:free',
        apiProvider: 'server',
      },
      update: {
        preferredFreeModel: 'deepseek/deepseek-chat-v3-0324:free',
      },
    });

    return Response.json({
      ok: true,
      message: 'Successfully updated to free model!',
      model: result.preferredFreeModel,
    });
  } catch (error) {
    console.error('Fix model error:', error);
    return Response.json({ error: 'Failed to update' }, { status: 500 });
  }
}
