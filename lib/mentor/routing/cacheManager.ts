import prisma from "@/lib/prisma";
import { debug } from "@/lib/debug";
import { getEmbedding, cosineSimilarity } from "@/lib/embeddings";
import { 
  searchSimilarCachedResponses, 
  isPgvectorAvailable, 
  saveCacheEntryWithVector 
} from "@/lib/pgvector";
import { TeachingStage } from "@/lib/mentorContext";
import { LearningRung } from "@/types/mentor";
import { IntentClassification } from "../intent/core";
import { CacheEntry } from "./routeDecision";
import {
  isUserSpecificResponse,
  shouldSaveResponseToCache,
  isCacheCompatible,
} from "../cache/eligibility";

const CACHE_HIT_THRESHOLD_DB = 0.6;

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function searchCache(
  input: string,
  problemId: string,
  embedding: number[],
  options?: {
    currentStage?: string;
    currentRung?: number;
  }
): Promise<{ entry: CacheEntry; similarity: number } | null> {
  const questionMd5 = await computeMd5Hash(input);

  try {
    const exactMatch = await prisma.cacheEntry.findFirst({
      where: { problemId, questionMd5 },
    });

    if (exactMatch) {
      if (isExpired(exactMatch)) {
        await prisma.cacheEntry.delete({ where: { id: exactMatch.id } }).catch(() => {});
      } else if (!isUserSpecificResponse(exactMatch.response)) {
        if (isStageRungCompatible(exactMatch, options)) {
          debug.cache("CACHE HIT — exact match");
          incrementUsage(exactMatch.id);
          return {
            entry: exactMatch as unknown as CacheEntry,
            similarity: 1.0,
          };
        }
        debug.cache("CACHE SKIP — exact match incompatible stage/rung");
      }
    }

    const pgvectorAvailable = await isPgvectorAvailable();

    if (pgvectorAvailable) {
      const vectorResults = await searchSimilarCachedResponses(
        problemId, embedding, CACHE_HIT_THRESHOLD_DB, 5
      );

      const compatible = vectorResults.filter(r =>
        !isUserSpecificResponse(r.response) &&
        isStageRungCompatible(r, options)
      );

      if (compatible.length > 0) {
        const best = compatible[0];
        debug.cache("CACHE HIT — pgvector semantic", { score: best.similarity.toFixed(4) });
        incrementUsage(best.id, best.similarity);
        return {
          entry: {
            id: best.id, problemId, questionMd5: "", questionText: best.questionText,
            embedding: [], response: best.response, stage: best.stage, rung: best.rung,
            usedCount: best.usedCount, similarity: best.similarity,
            createdAt: new Date(), updatedAt: new Date(),
          } as unknown as CacheEntry,
          similarity: best.similarity,
        };
      }
    } else {
      debug.cache("pgvector not available, using in-memory similarity");

      const cachedEntries = await prisma.cacheEntry.findMany({
        where: { problemId },
        orderBy: { usedCount: "desc" },
        take: 50,
      });

      let bestMatch: { entry: typeof cachedEntries[0]; similarity: number } | null = null;

      for (const entry of cachedEntries) {
        if (isExpired(entry)) {
          prisma.cacheEntry.delete({ where: { id: entry.id } }).catch(() => {});
          continue;
        }
        if (!isStageRungCompatible(entry, options)) continue;

        const cachedEmbedding = Array.isArray(entry.embedding)
          ? entry.embedding.map(Number) : [];
        if (cachedEmbedding.length === 0) continue;

        const similarity = cosineSimilarity(embedding, cachedEmbedding);
        if (similarity > CACHE_HIT_THRESHOLD_DB && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { entry, similarity };
        }
      }

      if (bestMatch && !isUserSpecificResponse(bestMatch.entry.response)) {
        incrementUsage(bestMatch.entry.id, bestMatch.similarity);
        debug.cache("CACHE HIT — semantic (in-memory)", { score: bestMatch.similarity.toFixed(4) });
        return { entry: bestMatch.entry as unknown as CacheEntry, similarity: bestMatch.similarity };
      }
    }

    return null;
  } catch (error) {
    console.warn("Cache lookup failed:", error);
    return null;
  }
}

export async function saveToCache(params: {
  problemId: string;
  question: string;
  response: string;
  stage: TeachingStage;
  rung: LearningRung;
  embedding?: number[];
  intent?: IntentClassification;
}): Promise<{ saved: boolean; entry?: CacheEntry; reason?: string }> {
  const { problemId, question, response, stage, rung, intent } = params;

  if (intent) {
    const decision = shouldSaveResponseToCache(response, intent);
    if (!decision.save) {
      debug.cache("Response NOT saved to cache", { intent: intent.intent, reason: decision.reason });
      return { saved: false, reason: decision.reason };
    }
  }

  const embedding = params.embedding ?? await getEmbedding(question);
  const questionMd5 = await computeMd5Hash(question);
  const pgvectorAvailable = await isPgvectorAvailable();

  if (pgvectorAvailable) {
    try {
      await saveCacheEntryWithVector({
        problemId, questionMd5, questionText: question, embedding,
        response, stage: stage as string, rung: rung as number,
      });
      return { saved: true, reason: "Saved via pgvector" };
    } catch {
      console.warn("pgvector save failed, falling back to Prisma");
    }
  }

  const entry = await prisma.cacheEntry.upsert({
    where: { problemId_questionMd5: { problemId, questionMd5 } },
    create: {
      problemId, questionMd5, questionText: question, embedding,
      response, stage: stage as string, rung: rung as number, usedCount: 0,
    },
    update: {
      response, stage: stage as string, rung: rung as number,
      questionText: question, embedding,
    },
  });

  return { saved: true, entry: entry as unknown as CacheEntry };
}

export async function clearCacheForSession(params: {
  problemId: string;
}): Promise<void> {
  const { problemId } = params;
  const cutoff = new Date(Date.now() - CACHE_TTL_MS);
  await prisma.cacheEntry.deleteMany({
    where: { problemId, createdAt: { lt: cutoff } },
  });
}

export async function getCacheStats(params?: {
  problemId?: string;
}): Promise<{
  totalEntries: number;
  avgUsedCount: number;
  hitRate?: number;
  staleEntries: number;
}> {
  const where = params?.problemId ? { problemId: params.problemId } : undefined;
  const entries = await prisma.cacheEntry.findMany({ where, select: { usedCount: true, createdAt: true } });
  const totalEntries = entries.length;
  const totalUses = entries.reduce((sum, e) => sum + e.usedCount, 0);
  const avgUsedCount = totalEntries > 0 ? totalUses / totalEntries : 0;
  const cutoff = new Date(Date.now() - CACHE_TTL_MS);
  const staleEntries = entries.filter(e => e.createdAt < cutoff).length;
  return { totalEntries, avgUsedCount, staleEntries };
}

export async function computeMd5Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function isExpired(entry: { createdAt: Date }): boolean {
  return Date.now() - entry.createdAt.getTime() > CACHE_TTL_MS;
}

function isStageRungCompatible(
  entry: { stage?: string | null; rung?: number | null },
  options?: { currentStage?: string; currentRung?: number },
): boolean {
  if (!options?.currentStage || !entry.stage) return true;
  if (!options?.currentRung || !entry.rung) return true;
  return isCacheCompatible(entry.stage, entry.rung, options.currentStage, options.currentRung);
}

function incrementUsage(id: string, similarity?: number): void {
  const data: any = { usedCount: { increment: 1 } };
  if (similarity !== undefined) data.similarity = similarity;
  prisma.cacheEntry.update({ where: { id }, data }).catch(() => {});
}
