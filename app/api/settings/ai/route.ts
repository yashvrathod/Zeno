import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// GET /api/settings/ai - Load user's AI settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.userAiSettings.findUnique({
      where: { userId: session.user.id },
      select: {
        groqApiKey: true,
        openaiApiKey: true,
        googleApiKey: true,
        openrouterApiKey: true,
        ollamaBaseUrl: true,
        ollamaModel: true,
        apiProvider: true,
        verbosity: true,
        hasCompletedOnboarding: true,
      },
    });

    // Don't expose full keys, just indicate if they exist
    return Response.json({
      groqApiKey: settings?.groqApiKey ? '••••••••' : null,
      openaiApiKey: settings?.openaiApiKey ? '••••••••' : null,
      googleApiKey: settings?.googleApiKey ? '••••••••' : null,
      openrouterApiKey: settings?.openrouterApiKey ? '••••••••' : null,
      ollamaBaseUrl: settings?.ollamaBaseUrl || null,
      ollamaModel: settings?.ollamaModel || null,
      apiProvider: settings?.apiProvider || 'server',
      verbosity: settings?.verbosity || 'normal',
      hasCompletedOnboarding: settings?.hasCompletedOnboarding || false,
    });
  } catch (error) {
    console.error('Failed to load AI settings:', error);
    return Response.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/ai - Update user's AI settings
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { groqApiKey, openaiApiKey, googleApiKey, openrouterApiKey, ollamaBaseUrl, ollamaModel, apiProvider, verbosity, hasCompletedOnboarding } = body;

    // Validate API provider
    const validProviders = ['server', 'groq', 'openai', 'google', 'openrouter', 'ollama'];
    if (apiProvider && !validProviders.includes(apiProvider)) {
      return Response.json(
        { error: 'Invalid API provider' },
        { status: 400 }
      );
    }

    // Upsert settings
    const updated = await prisma.userAiSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        groqApiKey: groqApiKey || null,
        openaiApiKey: openaiApiKey || null,
        googleApiKey: googleApiKey || null,
        openrouterApiKey: openrouterApiKey || null,
        ollamaBaseUrl: ollamaBaseUrl || null,
        ollamaModel: ollamaModel || null,
        apiProvider: apiProvider || 'server',
        verbosity: verbosity || 'normal',
        hasCompletedOnboarding: hasCompletedOnboarding ?? false,
      },
      update: {
        ...(groqApiKey !== undefined && { groqApiKey: groqApiKey || null }),
        ...(openaiApiKey !== undefined && { openaiApiKey: openaiApiKey || null }),
        ...(googleApiKey !== undefined && { googleApiKey: googleApiKey || null }),
        ...(openrouterApiKey !== undefined && { openrouterApiKey: openrouterApiKey || null }),
        ...(ollamaBaseUrl !== undefined && { ollamaBaseUrl: ollamaBaseUrl || null }),
        ...(ollamaModel !== undefined && { ollamaModel: ollamaModel || null }),
        ...(apiProvider && { apiProvider }),
        ...(verbosity && { verbosity }),
        ...(hasCompletedOnboarding !== undefined && { hasCompletedOnboarding }),
      },
    });

    return Response.json({
      success: true,
      apiProvider: updated.apiProvider,
    });
  } catch (error) {
    console.error('Failed to update AI settings:', error);
    return Response.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
