/**
 * Mentor Approach API — Approach Validation
 *
 * Validates user's proposed approach using interactionRouter.
 * Flow: STATIC → CACHE → AI
 * Tracks weak patterns and advances stage if approach is correct.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveApiConfig } from "@/lib/mentor/llm";
import { routeInteraction, saveToCache } from "@/lib/mentor/routing";
import { saveMessage, tryAdvanceStage } from "@/lib/mentor/stageEngine";
import { detectPatternsStatically, trackWeakPatterns } from "@/lib/mentor/patternTracker";
import { checkRateLimit } from "@/lib/rateLimit";
import { getEmbedding } from "@/lib/embeddings";
import { callLlm } from "@/lib/clients/llmClient";

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────

type ApproachRequest = {
  problemId: string;
  problemTitle: string;
  problemStatementMd: string;
  problemSlug?: string;
  constraintsMd?: string;
  userApproach: string; // User's proposed approach
};

type ApproachResponse = {
  message: string;
  approachCorrect: boolean;
  fromCache: boolean;
  stage: string;
  weakPatterns?: Array<{ tag: string; count: number }>;
};

// ─────────────────────────────────────────────────────────────────────────
// AI COMPLETION (Non-streaming, JSON output)
// ─────────────────────────────────────────────────────────────────────────

async function callApproachAI(params: {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  provider: string;
  problemTitle: string;
  problemStatement: string;
  userApproach: string;
}): Promise<{ approachCorrect: boolean; message: string; reasoning: string }> {
  const { apiKey, apiBaseUrl, model, provider, problemTitle, problemStatement, userApproach } = params;

  const systemPrompt = `You are a DSA mentor validating a student's approach.

Your task:
1. Determine if their approach is CORRECT (will lead to optimal solution)
2. If correct, confirm and encourage them to code
3. If incorrect, guide them to discover the flaw themselves — DO NOT give the answer

Output JSON:
{
  "approachCorrect": boolean,
  "message": string (your response to student),
  "reasoning": string (internal reasoning, not shown to student)
}

Rules:
- Never name the algorithm directly if approach is wrong
- Ask them to trace their approach on a small example
- If approach is correct, say so clearly and tell them to start coding`;

  const userPrompt = `Problem: ${problemTitle}

${problemStatement.slice(0, 2000)}

Student's proposed approach:
"${userApproach}"

Evaluate their approach.`;

  const content = await callLlmAndParse({
    apiKey,
    apiBaseUrl,
    model,
    provider: provider as Parameters<typeof callLlm>[0]["provider"],
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 500,
  });

  // Parse JSON from response
  try {
    // Handle potential markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonString);
  } catch {
    // Fallback if not valid JSON
    return {
      approachCorrect: content.toLowerCase().includes("correct") || content.toLowerCase().includes("good approach"),
      message: content,
      reasoning: "",
    };
  }
}

async function callLlmAndParse(params: Parameters<typeof callLlm>[0]): Promise<string> {
  try {
    const { content } = await callLlm(params);
    return content;
  } catch (error) {
    throw new Error(`AI API error: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse body
    const body = (await req.json().catch(() => null)) as ApproachRequest | null;
    if (!body?.problemId || !body?.userApproach) {
      return Response.json(
        { error: "Missing required fields: problemId, userApproach" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const problemId = body.problemId;
    const userApproach = body.userApproach;

    // ── RATE LIMIT CHECK (before any expensive operations) ──
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return Response.json(
        { error: rateLimitResult.message },
        { status: 429 }
      );
    }

    // Get or create session
    let mentorSession = await prisma.mentorSession.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });

    if (!mentorSession) {
      mentorSession = await prisma.mentorSession.create({
        data: { userId, problemId, stage: "STRATEGIZE", currentRung: 1 },
      });
    }

    // Create session object for router
    const sessionForRouter = {
      id: mentorSession.id,
      userId,
      problemId,
      stage: mentorSession.stage as any,
      createdAt: mentorSession.createdAt || new Date(),
      updatedAt: mentorSession.updatedAt || new Date(),
      messages: [],
    };

    // Create problem object
    const problem = {
      id: problemId,
      slug: body.problemSlug || problemId,
      title: body.problemTitle || "Unknown Problem",
      statementMd: body.problemStatementMd || "",
      constraintsMd: body.constraintsMd,
      meta: {
        difficulty: "MEDIUM",
        tags: [],
        patterns: [],
      },
    };

    // ── STEP 1: Use interactionRouter ──
    const decision = await routeInteraction(userApproach, sessionForRouter, problem);

    // ── STEP 2: Handle STATIC responses ──
    if (decision.type === "STATIC") {
      if (decision.handler === "stage_gate") {
        // User tried to skip stages
        return Response.json({
          message: "I appreciate your enthusiasm! But let's make sure you understand the problem first. Can you walk me through what the problem is asking in your own words?",
          approachCorrect: false,
          fromCache: false,
          stage: mentorSession.stage,
        } as ApproachResponse);
      }

      if (decision.handler === "breakdown") {
        // Shouldn't happen in APPROACH stage, but handle gracefully
        return Response.json({
          message: "Let's first make sure you understand the problem. What approach are you thinking of trying?",
          approachCorrect: false,
          fromCache: false,
          stage: mentorSession.stage,
        } as ApproachResponse);
      }
    }

    // ── STEP 3: Handle CACHE_HIT ──
    if (decision.type === "CACHE_HIT") {
      // Increment hit count
      await prisma.cacheEntry.update({
        where: { id: decision.entry.id },
        data: { usedCount: decision.entry.usedCount + 1 },
      }).catch(console.warn);

      // Save message
      await saveMessage(mentorSession.id, "user", userApproach, mentorSession.stage as any);
      await saveMessage(mentorSession.id, "assistant", decision.entry.response, mentorSession.stage as any);

      // Parse cached response to extract approachCorrect
      let approachCorrect = false;
      try {
        const cachedData = JSON.parse(decision.entry.response);
        approachCorrect = cachedData.approachCorrect;
      } catch {
        approachCorrect = decision.entry.response.toLowerCase().includes("correct") ||
                         decision.entry.response.toLowerCase().includes("good approach");
      }

      // Advance stage if approach is correct
      if (approachCorrect) {
        await tryAdvanceStage(mentorSession.id, "IMPLEMENT", { approachCorrect: true });
      }

      return Response.json({
        message: typeof decision.entry.response === "string"
          ? decision.entry.response
          : "Your approach looks good! Let's start coding.",
        approachCorrect,
        fromCache: true,
        stage: approachCorrect ? "CODE" : mentorSession.stage,
      } as ApproachResponse);
    }

    // ── STEP 4: AI_NEEDED — Call AI ──
    // Get API configuration
    const userAiSettings = await prisma.userAiSettings.findUnique({
      where: { userId },
    });

    const apiConfig = await resolveApiConfig(userAiSettings);

    // Call AI
    const aiResult = await callApproachAI({
      apiKey: apiConfig.apiKey,
      apiBaseUrl: apiConfig.apiBaseUrl,
      model: apiConfig.model,
      provider: apiConfig.provider,
      problemTitle: body.problemTitle || "Unknown",
      problemStatement: body.problemStatementMd || "",
      userApproach,
    });

    // ── STEP 5: Detect weak patterns from approach text ──
    const staticPatterns = detectPatternsStatically(userApproach, "javascript");

    if (staticPatterns.length > 0) {
      await trackWeakPatterns(userId, staticPatterns);
    }

    // ── STEP 6: Save to cache (GLOBAL — reusable by ALL users) ──
    const embedding = await getEmbedding(userApproach);
    await saveToCache({
      problemId,
      question: userApproach,
      response: JSON.stringify(aiResult),
      stage: mentorSession.stage as any,
      rung: 1,
      embedding,
    }).catch(console.warn);

    // ── STEP 7: Save messages ──
    await saveMessage(mentorSession.id, "user", userApproach, mentorSession.stage as any);
    await saveMessage(mentorSession.id, "assistant", aiResult.message, mentorSession.stage as any);

    // ── STEP 8: Advance stage if approach is correct ──
    let newStage = mentorSession.stage;
    if (aiResult.approachCorrect) {
      const advanceResult = await tryAdvanceStage(mentorSession.id, "IMPLEMENT", { approachCorrect: true });
      if (advanceResult.success) {
        newStage = "IMPLEMENT";
      }
    }

    // ── STEP 9: Return response ──
    return Response.json({
      message: aiResult.message,
      approachCorrect: aiResult.approachCorrect,
      fromCache: false,
      stage: newStage,
      weakPatterns: staticPatterns.map(tag => ({ tag, count: 1 })),
    } as ApproachResponse);

  } catch (error) {
    console.error("Approach API Error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
