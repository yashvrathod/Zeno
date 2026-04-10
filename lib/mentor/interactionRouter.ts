/**
 * Intelligent Interaction Router for AlgoMentor
 *
 * Routes user questions through a decision tree that prioritizes:
 * 1. Static rules (stage checks, duplicate detection, stage-gating)
 * 2. Cache lookups (embedding-based similarity search)
 * 3. AI fallback (only when nothing else applies)
 *
 * PHILOSOPHY: Use AI as little as possible. Intelligence comes from structure
 * and logic first, AI second.
 */

import prisma from "@/lib/prisma";
import { TeachingStage } from "@/lib/mentorContext";
import { LearningRung } from "@/types/mentor";
import { debug, startTimer } from "@/lib/debug";
import { getEmbedding, cosineSimilarity } from "@/lib/embeddings";
import { searchSimilarCachedResponses, isPgvectorAvailable, saveCacheEntryWithVector } from "@/lib/pgvector";

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
    };

export type CacheEntry = {
  id: string;
  problemId: string;
  questionMd5: string;
  embedding: number[];
  response: string;
  stage: string;
  rung: number;
  similarity?: number;
  usedCount: number;
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

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

// Threshold matching debug embedding behavior
const CACHE_HIT_THRESHOLD_DB = 0.6;

// Patterns that indicate user is trying to skip stages
const SOLUTION_REQUEST_PATTERNS = [
  "give me the solution",
  "give me solution",
  "what is the answer",
  "what's the answer",
  "just tell me the code",
  "show me the full solution",
  "write the code for me",
  "code this for me",
  "just write it",
  "just code it",
  "show me how to solve",
  "show me the answer",
  "tell me the answer",
  "what should i write",
  "what code should i write",
  "how do i solve this",
  "solve this for me",
  "do this for me",
  "complete the code",
  "finish the code",
  "fill in the blanks",
  "write the full code",
  "give me the full code",
  "paste the solution",
  "drop the solution",
  "show the complete",
  "show me complete",
];

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Computes SHA-256 hash of a string for exact deduplication.
 * (MD5 is not supported by Web Crypto API, using SHA-256 instead)
 */
async function md5Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  // SHA-256 is used instead of MD5 (not supported by Web Crypto API)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Computes a high-quality 384-dimensional embedding vector for text
 * using Xenova's all-MiniLM-L6-v2 model.
 */
export async function computeEmbedding(text: string): Promise<number[]> {
  return getEmbedding(text);
}

/**
 * Checks if two strings are near-duplicates (simple heuristic)
 */
function isNearDuplicate(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  const normA = normalize(a);
  const normB = normalize(b);

  // Exact match after normalization
  if (normA === normB) return true;

  // Containment check — only for meaningfully long strings
  if (normA.length > 40 && normB.includes(normA)) return true;
  if (normB.length > 40 && normA.includes(normB)) return true;

  // Word overlap — only for questions long enough to have meaningful vocabulary
  // Short questions like "how?" or "hint please" share too many stop words
  const wordsA = normA.split(" ").filter(w => w.length > 3);
  const wordsB = normB.split(" ").filter(w => w.length > 3);

  if (wordsA.length < 3 || wordsB.length < 3) return false;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const overlap = [...setA].filter(w => setB.has(w)).length;
  const total = Math.max(setA.size, setB.size);

  return total > 0 && overlap / total > 0.85;
}

/**
 * Detects if user is trying to skip stages (ask for solution directly)
 */
function isStageSkipAttempt(input: string): boolean {
  const lower = input.toLowerCase();
  return SOLUTION_REQUEST_PATTERNS.some(pattern => lower.includes(pattern));
}

// ─────────────────────────────────────────────
// MAIN ROUTING FUNCTION
// ─────────────────────────────────────────────

/**
 * Routes an interaction through the decision tree.
 *
 * This is the BRAIN of the mentor system. It implements a strict decision tree
 * that prioritizes fast, deterministic rules over expensive AI calls.
 *
 * DECISION TREE (evaluated in strict order, short-circuit on first match):
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ STEP 1: STATIC - Is session.stage === EXPLORE?                  │
 * │         → YES: Return "breakdown" handler                       │
 * │         → NO: Continue to STEP 2                                │
 * │         WHY: Users in EXPLORE stage need problem understanding, │
 * │              not AI-generated hints. This is a hard rule.       │
 * └─────────────────────────────────────────────────────────────────┘
 *                              ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ STEP 2: STATIC - Has this question been asked before?           │
 * │         → YES: Return "already_answered" handler                │
 * │         → NO: Continue to STEP 3                                │
 * │         WHY: No value in re-answering the same question.        │
 * │              Use near-duplicate detection (80% word overlap).   │
 * └─────────────────────────────────────────────────────────────────┘
 *                              ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ STEP 3: STATIC - Is user trying to skip stages?                 │
 * │         → YES: Return "stage_gate" handler                      │
 * │         → NO: Continue to STEP 4                                │
 * │         WHY: Never give solutions directly. Make them think.    │
 * │              Detect phrases like "give me the solution".        │
 * └─────────────────────────────────────────────────────────────────┘
 *                              ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ STEP 4: CACHE - Compute embedding of input                      │
 * │         → Generate 128-dimension vector from question text      │
 * │         → Compute MD5 hash for exact matching                   │
 * └─────────────────────────────────────────────────────────────────┘
 *                              ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ STEP 5: CACHE - Search database for similar questions           │
 * │         → Fetch top 50 cached entries for this problem          │
 * │         → Compute cosine similarity with each cached embedding  │
 * │         → If similarity > 0.6: CACHE_HIT!                       │
 * │         → If MD5 matches exactly: CACHE_HIT with 1.0!           │
 * │         → NO MATCH: Continue to STEP 6                          │
 * │         WHY: Reuse previous AI responses when questions are     │
 * │              semantically similar. Saves cost and latency.      │
 * └─────────────────────────────────────────────────────────────────┘
 *                              ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ STEP 6: AI_NEEDED - Call Groq/OpenRouter                        │
 * │         → No static rule applied                                │
 * │         → No cache hit                                          │
 * │         → Generate fresh response with AI                       │
 * │         → Save response to cache for future use                 │
 * │         WHY: AI is the last resort, not the first.              │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * @param input - The user's question/message
 * @param session - Current mentor session with message history
 * @param problem - Problem metadata (used for context-aware caching)
 * @returns RouteDecision indicating how to handle this interaction
 */
export async function routeInteraction(
  input: string,
  session: MentorSession & { messages: Array<{ role: string; content: string }> },
  problem: Problem & { meta: ProblemMeta }
): Promise<RouteDecision> {
  const timer = startTimer("routeInteraction");
  debug.mentor("routeInteraction called", { stage: session.stage, userId: session.userId.slice(0, 8) + "..." });

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: STATIC CHECK - Teaching Stage
  // ═══════════════════════════════════════════════════════════════
  // If user is in EXPLORE stage and hasn't messaged yet, provide a problem
  // breakdown intro. After they've said anything, let the AI respond naturally.
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
  // STEP 2: STATIC CHECK - Duplicate Question Detection
  // ═══════════════════════════════════════════════════════════════
  // Check if user has already asked this exact (or near-duplicate) question
  // in the current session. No value in answering twice.
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
  // STEP 3: STATIC CHECK - Stage Gate Detection
  // ═══════════════════════════════════════════════════════════════
  // Detect if user is trying to bypass the learning process by asking
  // for the solution directly. We gently redirect them instead.
  if (isStageSkipAttempt(input)) {
    debug.stage("Stage gate triggered — solution request detected");
    timer();
    return {
      type: "STATIC",
      handler: "stage_gate",
      reason: "User is trying to skip stages by asking for solution directly"
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: CACHE PREPARATION - Compute Embedding
  // ═══════════════════════════════════════════════════════════════
  // Convert the user's question into a vector representation.
  // This allows semantic similarity search (not just keyword matching).
  let embedding: number[] | null = null;
  try {
    debug.embed("Computing embedding for input", { inputLength: input.length });
    const embedEnd = startTimer("embedding");
    embedding = await computeEmbedding(input);
    embedEnd();
  } catch (e) {
    console.warn("[ROUTER] Embedding failed, skipping cache:", (e as Error).message);
  }
  const questionMd5 = await md5Hash(input);

  // If embedding failed, skip cache and go straight to AI
  if (!embedding) {
    debug.ai("AI_NEEDED — embedding generation failed");
    timer();
    return {
      type: "AI_NEEDED",
      reason: "No static rule or cache hit applied — AI generation required"
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: CACHE LOOKUP - Database Search (pgvector-powered)
  // ═══════════════════════════════════════════════════════════════
  // Search the CacheEntry table for previously answered questions
  // that are semantically similar to this one.
  // Uses pgvector for 10ms similarity search when available.
  try {
    // First check for exact MD5 match
    const exactMatch = await prisma.cacheEntry.findFirst({
      where: {
        problemId: session.problemId,
        questionMd5: questionMd5,
      },
    });

    if (exactMatch) {
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

    // Try pgvector similarity search if available
    if (embedding) {
      const pgvectorAvailable = await isPgvectorAvailable();

      if (pgvectorAvailable) {
        // Fast pgvector search (~10ms)
        const vectorResults = await searchSimilarCachedResponses(
          session.problemId,
          embedding,
          CACHE_HIT_THRESHOLD_DB,
          5
        );

        if (vectorResults.length > 0) {
          const bestMatch = vectorResults[0]!;
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
              questionMd5: "", // Not needed for response
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
      } else {
        // Fallback: In-memory similarity (slower but works without pgvector)
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

    // ── KEYWORD FALLBACK ──
    // When embeddings fail or no semantic match found, do keyword overlap
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
  } catch (error) {
    console.warn("Cache lookup failed:", error);
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 6: AI_NEEDED - No Rules Applied, No Cache Hit
  // ═══════════════════════════════════════════════════════════════
  // If we reach here, no static rule matched and no cache hit occurred.
  // The AI must generate a fresh response.
  // Caller should:
  // 1. Call Groq/OpenRouter with the user's input
  // 2. Save the response to cache via saveToCache()
  debug.ai("AI_NEEDED — no static rule or cache hit applied");
  timer();
  return {
    type: "AI_NEEDED",
    reason: "No static rule or cache hit applied — AI generation required"
  };
}

// ─────────────────────────────────────────────
// CACHE MANAGEMENT
// ─────────────────────────────────────────────

/**
 * Saves a response to the cache for future lookups
 * Uses pgvector when available for faster similarity search
 */
export async function saveToCache(params: {
  problemId: string;
  question: string;
  response: string;
  stage: TeachingStage;
  rung: LearningRung;
  embedding?: number[];
}): Promise<CacheEntry> {
  const { problemId, question, response, stage, rung } = params;

  const embedding = params.embedding ?? await computeEmbedding(question);
  const questionMd5 = await md5Hash(question);

  // Check if pgvector is available
  const pgvectorAvailable = await isPgvectorAvailable();

  if (pgvectorAvailable) {
    // Use pgvector for both JSON and binary vector storage
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

      // Return a cache entry object
      return {
        id: "", // Will be generated by DB
        problemId,
        questionMd5,
        questionText: question,
        embedding: embedding as unknown as any,
        response,
        stage: stage as string,
        rung: rung as number,
        usedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as CacheEntry;
    } catch (error) {
      console.warn("pgvector save failed, falling back to regular save:", error);
      // Fall through to regular Prisma upsert
    }
  }

  // Regular Prisma upsert (fallback or when pgvector unavailable)
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
      embedding: embedding as unknown as any,
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
      embedding: embedding as unknown as any,
    },
  });

  return entry as unknown as CacheEntry;
}

/**
 * Clears cache entries for a specific problem (global cache)
 */
export async function clearCacheForSession(params: {
  problemId: string;
}): Promise<void> {
  const { problemId } = params;

  await prisma.cacheEntry.deleteMany({
    where: { problemId },
  });
}

/**
 * Gets cache statistics for debugging/monitoring (global cache)
 */
export async function getCacheStats(params?: {
  problemId?: string;
}): Promise<{
  totalEntries: number;
  avgUsedCount: number;
  hitRate?: number;
}> {
  const where = params?.problemId ? { problemId: params.problemId } : undefined;

  const entries = await prisma.cacheEntry.findMany({
    where,
    select: { usedCount: true },
  });

  const totalEntries = entries.length;
  const totalUses = entries.reduce((sum, e) => sum + e.usedCount, 0);
  const avgUsedCount = totalEntries > 0 ? totalUses / totalEntries : 0;

  return {
    totalEntries,
    avgUsedCount,
  };
}
