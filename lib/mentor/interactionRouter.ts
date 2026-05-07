/**
 * Intelligent Interaction Router for AlgoMentor - INTENT-FIRST ARCHITECTURE
 *
 * Routes user questions through a decision tree that prioritizes:
 * 1. Intent classification FIRST
 * 2. Stage-aware enforcement SECOND
 * 3. Cache lookups (when appropriate) THIRD
 * 4. AI generation LAST
 *
 * PHILOSOPHY: Intent-driven structure, not regex-based pattern matching.
 * Every decision flows from: intent + confidence + current stage
 */

import prisma from "@/lib/prisma";
import { TeachingStage } from "@/lib/mentorContext";
import { LearningRung } from "@/types/mentor";
import { debug, startTimer } from "@/lib/debug";
import { getEmbedding, cosineSimilarity } from "@/lib/embeddings";
import { searchSimilarCachedResponses, isPgvectorAvailable, saveCacheEntryWithVector } from "@/lib/pgvector";
import { classifyIntent, type IntentClassification, shouldSkipCacheLookup } from "./intentClassifier";
import { handleIntent, type HandlerResponse } from "./intentHandler";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type RouteDecision =
  | {
      type: "STATIC";
      handler: "breakdown" | "already_answered" | "stage_gate";
      reason?: string;
    }
  | {
      type: "CACHE_HIT";
      entry: CacheEntry;
      similarity: number;
    }
  | {
      type: "AI_NEEDED";
      reason: string;
      intent?: IntentClassification;
    };

export type MentorSession = {
  id: string;
  userId: string;
  problemId: string;
  stage: TeachingStage;
  createdAt: Date;
  updatedAt: Date;
};

export type Problem = {
  id: string;
  slug: string;
  title: string;
  statementMd: string;
  constraintsMd?: string;
};

export type ProblemMeta = {
  difficulty: string;
  tags?: string[];
  patterns?: string[];
};

export type CacheEntry = {
  id: string;
  problemId: string;
  questionMd5: string;
  questionText?: string;
  embedding: any;
  response: string;
  stage: string;
  rung: number;
  usedCount: number;
  similarity?: number;
  createdAt: Date;
  updatedAt: Date;
};

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const CACHE_HIT_THRESHOLD_DB = 0.6;

// ─────────────────────────────────────────────
// MAIN ROUTING FUNCTION - INTENT-FIRST PIPELINE
// ─────────────────────────────────────────────

export async function routeInteraction(
  input: string,
  session: MentorSession & { messages: Array<{ role: string; content: string }> },
  problem: Problem & { meta: ProblemMeta }
): Promise<RouteDecision> {
  const timer = startTimer("routeInteraction");
  debug.mentor("routeInteraction called", { stage: session.stage, userId: session.userId.slice(0, 8) + "..." });

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: INTENT CLASSIFICATION (FIRST LAYER)
  // ═══════════════════════════════════════════════════════════════
  const intentClassification = classifyIntent(input);
  debug.mentor("Intent classified", {
    intent: intentClassification.intent,
    confidence: intentClassification.confidence,
  });

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: STATIC CHECKS - Teaching Stage
  // ═══════════════════════════════════════════════════════════════
  if (session.stage === "EXPLORE" && session.messages.length === 0) {
    debug.stage("EXPLORE stage, no messages yet — returning breakdown handler");
    timer();
    return {
      type: "STATIC",
      handler: "breakdown",
      reason: "User is in EXPLORE stage with no prior conversation — provide problem breakdown"
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: DUPLICATE QUESTION DETECTION
  // ═══════════════════════════════════════════════════════════════
  const userMessages = session.messages.filter((m) => m.role === "user");
  for (const prevMsg of userMessages) {
    if (isNearDuplicate(input, prevMsg.content)) {
      debug.mentor("Duplicate question detected", { inputLength: input.length });
      timer();
      return {
        type: "STATIC",
        handler: "already_answered",
        reason: "User has already asked this question in this session"
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: INTENT-BASED CACHE DECISION
  // ═══════════════════════════════════════════════════════════════
  const cacheSkipCheck = shouldSkipCacheLookup(input, intentClassification);

  if (cacheSkipCheck.skip) {
    debug.mentor("Cache lookup skipped by intent classification", {
      intent: intentClassification.intent,
      reason: cacheSkipCheck.reason
    });

    return {
      type: "AI_NEEDED",
      reason: cacheSkipCheck.reason,
      intent: intentClassification,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: CACHE PREPARATION - Compute Embedding
  // ═══════════════════════════════════════════════════════════════
  let embedding: number[] | null = null;
  try {
    debug.embed("Computing embedding for input", { inputLength: input.length });
    const embedEnd = startTimer("embedding");
    embedding = await getEmbedding(input);
    embedEnd();
  } catch (e) {
    console.warn("[ROUTER] Embedding failed, skipping cache:", (e as Error).message);
  }

  const questionMd5 = await computeMd5Hash(input);

  if (!embedding) {
    debug.ai("AI_NEEDED — embedding generation failed");
    timer();
    return {
      type: "AI_NEEDED",
      reason: "No static rule or cache hit applied — AI generation required"
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: CACHE LOOKUP - Database Search
  // ═══════════════════════════════════════════════════════════════
  try {
    // Check for exact MD5 match
    const exactMatch = await prisma.cacheEntry.findFirst({
      where: {
        problemId: session.problemId,
        questionMd5: questionMd5,
      },
    });

    if (exactMatch) {
      if (isUserSpecificResponse(exactMatch.response)) {
        debug.cache("CACHE SKIP — exact match is user-specific");
      } else {
        debug.cache("CACHE HIT — exact MD5 match");
        prisma.cacheEntry.update({
          where: { id: exactMatch.id },
          data: { usedCount: { increment: 1 } },
        }).catch(console.warn);
        timer();
        return {
          type: "CACHE_HIT",
          entry: exactMatch as unknown as CacheEntry,
          similarity: 1.0,
        };
      }
    }

    // Try pgvector similarity search
    const pgvectorAvailable = await isPgvectorAvailable();

    if (pgvectorAvailable) {
      const vectorResults = await searchSimilarCachedResponses(
        session.problemId,
        embedding,
        CACHE_HIT_THRESHOLD_DB,
        5
      );

      if (vectorResults.length > 0) {
        const bestMatch = vectorResults[0]!;

        if (isUserSpecificResponse(bestMatch.response)) {
          debug.cache("CACHE SKIP — semantic match is user-specific");
        } else {
          debug.cache("CACHE HIT — pgvector semantic", { score: bestMatch.similarity.toFixed(4) });

          prisma.cacheEntry.update({
            where: { id: bestMatch.id },
            data: { usedCount: { increment: 1 }, similarity: bestMatch.similarity },
          }).catch(console.warn);

          timer();
          return {
            type: "CACHE_HIT",
            entry: {
              id: bestMatch.id,
              problemId: session.problemId,
              questionMd5: "",
              questionText: bestMatch.questionText,
              embedding: [],
              response: bestMatch.response,
              stage: bestMatch.stage,
              rung: bestMatch.rung,
              usedCount: bestMatch.usedCount,
              similarity: bestMatch.similarity,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as unknown as CacheEntry,
            similarity: bestMatch.similarity,
          };
        }
      }
    } else {
      // Fallback: In-memory similarity
      debug.cache("pgvector not available, using in-memory similarity");

      const cachedEntries = await prisma.cacheEntry.findMany({
        where: { problemId: session.problemId },
        orderBy: { usedCount: "desc" },
        take: 50,
      });

      let bestMatch: { entry: typeof cachedEntries[0]; similarity: number } | null = null;

      for (const entry of cachedEntries) {
        const cachedEmbedding = Array.isArray(entry.embedding)
          ? entry.embedding.map(Number)
          : [];
        if (cachedEmbedding.length === 0) continue;

        const similarity = cosineSimilarity(embedding, cachedEmbedding);

        if (similarity > CACHE_HIT_THRESHOLD_DB) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { entry, similarity };
          }
        }
      }

      if (bestMatch && bestMatch.similarity >= CACHE_HIT_THRESHOLD_DB) {
        if (isUserSpecificResponse(bestMatch.entry.response)) {
          debug.cache("CACHE SKIP — in-memory match is user-specific");
        } else {
          prisma.cacheEntry.update({
            where: { id: bestMatch.entry.id },
            data: { usedCount: { increment: 1 }, similarity: bestMatch.similarity },
          }).catch(console.warn);

          debug.cache("CACHE HIT — semantic (in-memory)", { score: bestMatch.similarity.toFixed(4) });
          timer();
          return {
            type: "CACHE_HIT",
            entry: bestMatch.entry as unknown as CacheEntry,
            similarity: bestMatch.similarity,
          };
        }
      }
    }
  } catch (error) {
    console.warn("Cache lookup failed:", error);
  }

  // ── KEYWORD FALLBACK ──
  const inputWords = new Set(
    input.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  );
  if (inputWords.size > 0) {
    const cachedEntries = await prisma.cacheEntry.findMany({
      where: { problemId: session.problemId },
      take: 50,
    });

    let bestKeyword: { entry: typeof cachedEntries[0]; score: number } | null = null;

    for (const entry of cachedEntries) {
      const responseWords = new Set(
        entry.response.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      );
      const overlap = [...inputWords].filter(w => responseWords.has(w)).length;
      const score = overlap / Math.max(inputWords.size, 1);

      if (score >= 0.4 && (!bestKeyword || score > bestKeyword.score)) {
        bestKeyword = { entry, score };
      }
    }

    if (bestKeyword) {
      if (isUserSpecificResponse(bestKeyword.entry.response)) {
        debug.cache("CACHE SKIP — keyword match is user-specific");
      } else {
        prisma.cacheEntry.update({
          where: { id: bestKeyword.entry.id },
          data: { usedCount: { increment: 1 } },
        }).catch(console.warn);

        debug.cache("CACHE HIT — keyword fallback", { score: bestKeyword.score.toFixed(2) });
        timer();
        return {
          type: "CACHE_HIT",
          entry: bestKeyword.entry as unknown as CacheEntry,
          similarity: bestKeyword.score,
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 7: AI_NEEDED - Final Decision
  // ═══════════════════════════════════════════════════════════════
  debug.ai("AI_NEEDED — intent-first routing");
  timer();
  return {
    type: "AI_NEEDED",
    reason: "No static rule or cache hit applied — AI generation required",
    intent: intentClassification,
  };
}

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

function isNearDuplicate(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return true;

  if (normA.length > 40 && normB.includes(normA)) return true;
  if (normB.length > 40 && normA.includes(normB)) return true;

  const wordsA = normA.split(" ").filter(w => w.length > 3);
  const wordsB = normB.split(" ").filter(w => w.length > 3);

  if (wordsA.length < 3 || wordsB.length < 3) return false;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const overlap = [...setA].filter(w => setB.has(w)).length;
  const total = Math.max(setA.size, setB.size);

  return total > 0 && overlap / total > 0.85;
}

function isUserSpecificResponse(response: string): boolean {
  const lowerResponse = response.toLowerCase();
  const userSpecificPatterns = [
    "your code", "your solution", "you wrote", "your approach",
    "your function", "your variable", "your loop", "your if statement",
    "in your", "the code you provided", "your bug", "your error",
    "debug your", "fix your",
  ];
  const hasUserSpecificRef = userSpecificPatterns.some(p => lowerResponse.includes(p));
  const hasErrorContent = /error at line|exception in|stack trace|syntax error in your|your bug/i.test(lowerResponse);
  return hasUserSpecificRef || hasErrorContent;
}

/**
 * Simple hash for cache key generation
 */
async function computeMd5Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────
// CACHE MANAGEMENT
// ─────────────────────────────────────────────

export type SaveToCacheResult =
  | { saved: true; entry: CacheEntry }
  | { saved: false; reason: string };

export async function saveToCache(params: {
  problemId: string;
  question: string;
  response: string;
  stage: TeachingStage;
  rung: LearningRung;
  embedding?: number[];
  intent?: IntentClassification;
}): Promise<SaveToCacheResult> {
  const { problemId, question, response, stage, rung, intent } = params;

  // Use intent classification to determine cache eligibility
  if (intent) {
    const cacheDecision = shouldSaveResponseToCache(response, intent);
    if (!cacheDecision.save) {
      debug.cache("Response NOT saved to cache", {
        intent: intent.intent,
        reason: cacheDecision.reason
      });
      return { saved: false, reason: cacheDecision.reason };
    }
  }

  const embedding = params.embedding ?? await getEmbedding(question);
  const questionMd5 = await computeMd5Hash(question);

  const pgvectorAvailable = await isPgvectorAvailable();

  if (pgvectorAvailable) {
    try {
      await saveCacheEntryWithVector({
        problemId,
        questionMd5,
        questionText: question,
        embedding,
        response,
        stage: stage as string,
        rung: rung as number,
      });

      return {
        saved: true,
        entry: {
          id: "",
          problemId,
          questionMd5,
          questionText: question,
          embedding,
          response,
          stage: stage as string,
          rung: rung as number,
          usedCount: 0,
          similarity: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as CacheEntry
      };
    } catch (error) {
      console.warn("pgvector save failed, falling back:", error);
    }
  }

  const entry = await prisma.cacheEntry.upsert({
    where: {
      problemId_questionMd5: {
        problemId,
        questionMd5,
      },
    },
    create: {
      problemId,
      questionMd5,
      questionText: question,
      embedding,
      response,
      stage: stage as string,
      rung: rung as number,
      usedCount: 0,
    },
    update: {
      response,
      stage: stage as string,
      rung: rung as number,
      questionText: question,
      embedding,
    },
  });

  return { saved: true, entry: entry as unknown as CacheEntry };
}

function shouldSaveResponseToCache(
  response: string,
  classification: IntentClassification
): { save: boolean; reason: string } {
  if (!classification.shouldEnforceStage) {
    return {
      save: false,
      reason: `Intent "${classification.intent}" does not enforce stage`
    };
  }

  const contentAnalysis = analyzeResponseForCacheEligibility(response, classification.intent);

  if (!contentAnalysis.shouldCache) {
    return { save: false, reason: contentAnalysis.reason };
  }

  return { save: true, reason: "Intent and content indicate cacheable" };
}

function analyzeResponseForCacheEligibility(
  response: string,
  intent: string
): { shouldCache: boolean; reason: string } {
  const lowerResponse = response.toLowerCase();

  const userSpecificPatterns = [
    "your code", "your solution", "you wrote", "your approach",
    "in your function", "your variable", "your loop", "your if statement"
  ];
  const hasUserSpecificRef = userSpecificPatterns.some(p => lowerResponse.includes(p));

  const hasCodeBlock = /```[\s\S]*?```/.test(response);

  if (response.length < 50) {
    return { shouldCache: false, reason: "Response too short to cache" };
  }

  const hasErrorContent = /error:|exception:|stack trace|line \d+|at \w+\(/.test(lowerResponse);

  const emotionalPatterns = [
    "i understand you['’]re", "i can see that", "don't worry",
    "you're doing great", "hang in there", "i'm here to help you"
  ];
  const hasEmotionalContent = emotionalPatterns.some(p => lowerResponse.includes(p));

  if (hasUserSpecificRef) {
    return { shouldCache: false, reason: "Response contains user-specific references" };
  }

  if (hasErrorContent && (intent === "debugging" || intent === "code_review")) {
    return { shouldCache: false, reason: "Response contains error-specific content" };
  }

  if (hasEmotionalContent && intent === "frustration") {
    return { shouldCache: false, reason: "Response is personalized emotional support" };
  }

  if (hasCodeBlock && intent !== "understanding" && intent !== "concept_explanation") {
    const codeBlockLength = (response.match(/```[\s\S]*?```/g) || [])
      .reduce((sum, block) => sum + block.length, 0);
    if (codeBlockLength > 200) {
      return { shouldCache: false, reason: "Response contains substantial code blocks" };
    }
  }

  return { shouldCache: true, reason: "Response is generic and cacheable" };
}

export async function clearCacheForSession(params: {
  problemId: string;
}): Promise<void> {
  const { problemId } = params;
  await prisma.cacheEntry.deleteMany({ where: { problemId } });
}

export async function getCacheStats(params?: {
  problemId?: string;
}): Promise<{
  totalEntries: number;
  avgUsedCount: number;
  hitRate?: number;
}> {
  const where = params?.problemId ? { problemId: params.problemId } : undefined;
  const entries = await prisma.cacheEntry.findMany({ where, select: { usedCount: true } });
  const totalEntries = entries.length;
  const totalUses = entries.reduce((sum, e) => sum + e.usedCount, 0);
  const avgUsedCount = totalEntries > 0 ? totalUses / totalEntries : 0;
  return { totalEntries, avgUsedCount };
}