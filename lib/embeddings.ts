/**
 * =============================================================================
 * EMBEDDING SYSTEM FOR ALGOMENTOR
 * =============================================================================
 *
 * This module provides semantic search capabilities for the mentor system by:
 * 1. Generating vector embeddings from text using Xenova's all-MiniLM-L6-v2
 * 2. Caching embeddings in-memory for fast lookups (in-memory store)
 * 3. Persisting embeddings in PostgreSQL for durability
 * 4. Computing cosine similarity for semantic matching
 *
 * ARCHITECTURE:
 *
 *   User Question
 *       │
 *       ▼
 * ┌──────────────────┐     ┌─────────────────────────────────────────────┐
 * │  getEmbedding()  │────▶│  @xenova/transformers                        │
 * │                  │     │  Model: all-MiniLM-L6-v2 (384 dimensions)    │
 * │                  │     │  Cached at module level (singleton)          │
 * └──────────────────┘     └─────────────────────────────────────────────┘
 *       │
 *       ▼
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                    CACHE LOOKUP (read path)                          │
 * │  DB CacheEntry → cosine similarity > 0.6 → HIT                      │
 * │  Keyword match fallback → 40% word overlap → HIT                     │
 * └──────────────────────────────────────────────────────────────────────┘
 *       │
 *       ▼
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │                    CACHE STORE (write path)                          │
 * │  Prisma CacheEntry upsert + in-memory store sync                     │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * DEBUGGING:
 * - All functions emit debug logs via debugLog()
 * - Enable verbose mode: set DEBUG_EMBEDDINGS=true in .env
 * - Logs include timing, cache hit/miss, similarity scores
 *
 * @module embeddings
 */

import prisma from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

const DEBUG_ENABLED = process.env.DEBUG_EMBEDDINGS === "true";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

// Cache threshold (matching debug behavior)
const CACHE_HIT_THRESHOLD = 0.6;

// ─────────────────────────────────────────────────────────────────────────
// DEBUGGING UTILITIES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Debug logger for embedding operations
 * Only outputs when DEBUG_EMBEDDINGS=true
 */
function debugLog(...args: unknown[]): void {
  if (!DEBUG_ENABLED) return;

  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [EMBEDDINGS]`, ...args);
}

/**
 * Performance timer for measuring operation duration
 */
function createTimer(label: string): { end: () => void } {
  const start = performance.now();

  return {
    end: () => {
      const duration = performance.now() - start;
      debugLog(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
}

/**
 * Logs cache hit/miss metrics
 */
function logCacheEvent(event: "HIT" | "MISS" | "STORE", details: {
  stage?: string;
  similarity?: number;
  questionLength?: number;
  source?: "redis" | "db";
}): void {
  if (!DEBUG_ENABLED) return;

  const emoji = event === "HIT" ? "✅" : event === "MISS" ? "❌" : "💾";
  const parts = [emoji, event];

  if (details.source) parts.push(`[${details.source}]`);
  if (details.stage) parts.push(`stage=${details.stage}`);
  if (details.similarity !== undefined) parts.push(`similarity=${details.similarity.toFixed(4)}`);
  if (details.questionLength) parts.push(`len=${details.questionLength}`);

  console.log(`[${new Date().toISOString()}] [CACHE]`, parts.join(" "));
}

// ─────────────────────────────────────────────────────────────────────────
// IN-MEMORY EMBEDDING STORE (like debug, used for fast local matching)
// ─────────────────────────────────────────────────────────────────────────

type MemEntry = {
  entry: {
    id: string;
    problemId: string;
    questionMd5: string;
    embedding: number[];
    response: string;
    stage: string;
    rung: number;
    usedCount: number;
  };
  problemId: string;
  stage: string;
};

const memStore: MemEntry[] = [];
const STORE_MAX = 5000;

// ─────────────────────────────────────────────────────────────────────────
// TRANSFORMER PIPELINE (Singleton)
// ─────────────────────────────────────────────────────────────────────────

// Pipeline type from @xenova/transformers
type PipelineType = {
  (text: string, options?: { pooling?: string; normalize?: boolean }): Promise<{
    embeddings: Float32Array;
  }>;
};

let embeddingPipeline: PipelineType | null = null;
let pipelineLoadPromise: Promise<PipelineType> | null = null;

/**
 * Gets or creates the embedding pipeline singleton.
 * Uses @xenova/transformers with all-MiniLM-L6-v2 model.
 *
 * The pipeline is cached at module level to avoid reloading on each request.
 * First call downloads/loads the model (~80MB), subsequent calls are instant.
 */
async function getPipeline(): Promise<PipelineType> {
  // Return cached pipeline if already loaded
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // Return pending promise if already loading (prevent duplicate loads)
  if (pipelineLoadPromise) {
    return pipelineLoadPromise;
  }

  // Start loading the pipeline
  pipelineLoadPromise = (async () => {
    const timer = createTimer("Model loading");

    try {
      // Dynamically import @xenova/transformers (not a hard dependency)
      const { pipeline } = await import("@xenova/transformers").catch((e) => {
        debugLog("⚠️ @xenova/transformers not installed. Install with: npm install @xenova/transformers");
        throw e;
      });

      // Load the embedding model
      // all-MiniLM-L6-v2: 384 dimensions, fast inference, good quality
      const pipe = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        // Optional: specify quantized model for faster loading
        // quantized: true,
      });

      embeddingPipeline = pipe as unknown as PipelineType;

      timer.end();
      debugLog("✅ Embedding pipeline loaded:", EMBEDDING_MODEL);

      return embeddingPipeline;
    } catch (error) {
      debugLog("❌ Failed to load embedding pipeline:", error);
      throw error;
    }
  })();

  return pipelineLoadPromise;
}

// ─────────────────────────────────────────────────────────────────────────
// EMBEDDING GENERATION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Generates a 384-dimensional embedding vector for the input text.
 *
 * Uses Xenova's all-MiniLM-L6-v2 model via @xenova/transformers.
 * This model produces high-quality embeddings suitable for semantic search.
 *
 * FEATURES:
 * - Module-level caching (model loaded once per server process)
 * - Text preprocessing (normalization, truncation)
 * - L2 normalization for cosine similarity
 *
 * @param text - Input text to embed (question, sentence, or paragraph)
 * @returns Promise resolving to number[384] embedding vector
 *
 * @example
 * const embedding = await getEmbedding("How do I use two pointers?");
 * console.log(embedding.length); // 384
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const timer = createTimer("getEmbedding");

  // Preprocess text
  const normalizedText = text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 512); // Model max length

  debugLog("📝 Generating embedding for:", normalizedText.slice(0, 50) + "...");

  try {
    // Get or load the pipeline
    const pipe = await getPipeline();

    // Generate embedding
    // Options: pooling='mean', normalize=true for cosine similarity
    const result = await pipe(normalizedText, {
      pooling: "mean",
      normalize: true,
    });

    // Handle output format differences between @xenova/transformers versions
    // Old versions: { embeddings: Float32Array }
    // New versions: { last_hidden_state: Tensor }
    let tensor: Float32Array;
    if (result && typeof result === "object" && "embeddings" in result) {
      tensor = result.embeddings as Float32Array;
    } else if (result && typeof result === "object" && "last_hidden_state" in result) {
      tensor = (result as any).last_hidden_state.data;
    } else if (result?.data) {
      tensor = result.data;
    } else {
      throw new Error(`Unexpected pipeline output structure: ${Object.keys(result || {})}`);
    }

    // Convert Float32Array to number[]
    const embedding = Array.from(tensor);

    timer.end();
    debugLog(`📊 Embedding generated: ${embedding.length} dimensions`);

    return embedding;
  } catch (error) {
    debugLog("❌ getEmbedding failed:", error);
    throw new Error(
      `Failed to generate embedding. Ensure @xenova/transformers is installed: npm install @xenova/transformers`
    );
  }
}

/**
 * Computes cosine similarity between two embedding vectors.
 *
 * Cosine similarity measures the angle between two vectors:
 * - 1.0 = identical direction (semantically similar)
 * - 0.0 = orthogonal (unrelated)
 * - -1.0 = opposite direction
 *
 * Since our embeddings are L2-normalized, this simplifies to dot product.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between -1 and 1
 *
 * @example
 * const sim = cosineSimilarity(embedding1, embedding2);
 * if (sim > 0.92) console.log("Highly similar!");
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    debugLog("⚠️ Vector length mismatch:", a.length, "vs", b.length);
    return 0;
  }

  if (a.length === 0) {
    return 0;
  }

  // For L2-normalized vectors, cosine similarity = dot product
  let dotProduct = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }

  // Clamp to [-1, 1] to handle floating point errors
  return Math.max(-1, Math.min(1, dotProduct));
}

// ─────────────────────────────────────────────────────────────────────────
// CACHE OPERATIONS — in-memory store + DB
// ─────────────────────────────────────────────────────────────────────────

/**
 * Searches the in-memory store for a semantically similar question.
 * Mirrors the debug API's search behavior.
 */
export function searchMemStore(
  embedding: number[],
  problemId: string,
  threshold: number = CACHE_HIT_THRESHOLD
): { response: string; score: number; questionMd5: string; stage: string } | null {
  const timer = createTimer("searchMemStore");
  try {
    const entries = memStore.filter((e) => e.problemId === problemId);
    let bestMatch: { response: string; score: number; questionMd5: string; stage: string } | null = null;

    for (const entry of entries) {
      const similarity = cosineSimilarity(embedding, entry.entry.embedding);
      if (similarity > threshold && (!bestMatch || similarity > bestMatch.score)) {
        bestMatch = {
          response: entry.entry.response,
          score: similarity,
          questionMd5: entry.entry.questionMd5,
          stage: entry.stage,
        };
      }
    }

    timer.end();
    if (bestMatch) {
      logCacheEvent("HIT", { source: "redis", stage: bestMatch.stage, similarity: bestMatch.score });
    } else {
      logCacheEvent("MISS", { source: "redis", stage: "unknown" });
    }
    return bestMatch;
  } catch (e) {
    debugLog("❌ searchMemStore failed:", e);
    return null;
  }
}

/**
 * Adds an entry to the in-memory store.
 */
export function addToMemStore(
  id: string,
  problemId: string,
  questionMd5: string,
  embedding: number[],
  response: string,
  stage: string,
  rung: number,
  usedCount: number = 0
): void {
  // Check duplicate
  const existing = memStore.find(
    (e) => e.entry.problemId === problemId && e.entry.questionMd5 === questionMd5
  );
  if (existing) {
    existing.entry.response = response;
    existing.entry.embedding = embedding;
    existing.entry.stage = stage;
    existing.entry.rung = rung;
    return;
  }

  if (memStore.length >= STORE_MAX) {
    memStore.shift(); // Evict oldest
  }

  memStore.push({
    entry: { id, problemId, questionMd5, embedding, response, stage, rung, usedCount },
    problemId,
    stage,
  });

  logCacheEvent("STORE", { source: "redis", stage, questionLength: questionMd5.length });
}

/**
 * Stores an embedding in the DB and syncs to in-memory store.
 */
export async function storeEmbedding(
  problemId: string,
  questionMd5: string,
  embedding: number[],
  response: string,
  stage: string,
  rung: number,
): Promise<void> {
  const timer = createTimer("storeEmbedding");
  debugLog(`💾 Storing embedding: problemId=${problemId.slice(0, 8)}, stage=${stage}`);

  try {
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
        embedding: embedding as unknown as any,
        response,
        stage,
        rung,
        usedCount: 0,
      },
      update: {
        response,
        stage,
        rung,
        embedding: embedding as unknown as any,
      },
    });

    addToMemStore(entry.id, problemId, questionMd5, embedding, response, stage, rung, 0);
    debugLog("✅ Embedding stored successfully");
    logCacheEvent("STORE", { source: "db", stage, questionLength: questionMd5.length });
  } catch (error) {
    debugLog("❌ Database write failed:", error);
    throw error;
  }

  timer.end();
}

// ─────────────────────────────────────────────────────────────────────────
// CACHE WARMUP
// ─────────────────────────────────────────────────────────────────────────

/**
 * Precomputes embeddings for static problem breakdowns.
 *
 * This function should be called once at server startup to:
 * 1. Load the embedding model into memory
 * 2. Pre-populate cache with common questions
 * 3. Reduce cold-start latency for first users
 *
 * STATIC BREAKDOWNS TO CACHE:
 * - "Explain the problem" → Problem statement breakdown
 * - "What are the constraints" → Constraints explanation
 * - "Give me an example" → Example walkthrough
 *
 * These are asked frequently in EXPLORE stage and can be pre-cached.
 *
 * @param problems - Optional array of problems to warm cache for
 * @returns Promise resolving when warmup complete
 *
 * @example
 * // In app/api/mentor/route.ts or middleware
 * if (process.env.NODE_ENV === 'production') {
 *   await warmupCache();
 * }
 */
export async function warmupCache(problems?: Array<{ id: string; title: string }>): Promise<void> {
  const timer = createTimer("warmupCache");

  debugLog("🔥 Starting cache warmup...");

  const staticBreakdowns = [
    { question: "Explain the problem", stage: "EXPLORE" },
    { question: "What are the constraints?", stage: "EXPLORE" },
    { question: "Can you give me an example?", stage: "EXPLORE" },
    { question: "What's the brute force approach?", stage: "STRATEGIZE" },
    { question: "How do I optimize this?", stage: "STRATEGIZE" },
  ];

  try {
    debugLog("📦 Loading embedding model...");
    await getPipeline();
    debugLog("✅ Model loaded");

    // Warmup only populates the in-memory store (no DB for static breakdowns)
    for (const b of staticBreakdowns) {
      try {
        const embedding = await getEmbedding(b.question);
        if (memStore.length >= STORE_MAX) memStore.shift();
        memStore.push({
          entry: {
            id: `warm_${b.stage}_${Math.random().toString(36).slice(2, 8)}`,
            problemId: "__global__",
            questionMd5: await crypto.subtle.digest("SHA-256", new TextEncoder().encode(b.question)).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')),
            embedding,
            response: "",
            stage: b.stage,
            rung: 1,
            usedCount: 0,
          },
          problemId: "__global__",
          stage: b.stage,
        });
        debugLog(`✅ Warmed: "${b.question}"`);
      } catch (error) {
        debugLog(`❌ Failed to warm: "${b.question}":`, error);
      }
    }

    timer.end();
    debugLog("🔥 Cache warmup complete!");
  } catch (error) {
    debugLog("❌ Cache warmup failed:", error);
  }
}

/**
 * Clears all cached embeddings (useful for testing or reset).
 *
 * @param stage - Optional stage to clear (clears all if not specified)
 */
export async function clearCache(stage?: string): Promise<void> {
  debugLog("🗑️ Clearing cache...", stage ? `stage=${stage}` : "all");

  // Clear in-memory store
  if (stage) {
    const before = memStore.length;
    const idx = memStore.findIndex((_, i, arr) => {
      // Remove all entries for this stage
      for (let j = i; j < arr.length; j++) {
        if (arr[j].stage === stage) return true;
      }
      return false;
    });
    for (let i = memStore.length - 1; i >= 0; i--) {
      if (memStore[i].stage === stage) memStore.splice(i, 1);
    }
    debugLog(`✅ Cleared ${before - memStore.length} in-memory entries`);
  } else {
    memStore.length = 0;
    debugLog("✅ Cleared all in-memory entries");
  }

  // Clear DB cache
  try {
    const result = stage
      ? await prisma.cacheEntry.deleteMany({ where: { stage } })
      : await prisma.cacheEntry.deleteMany({});
    debugLog(`✅ Cleared ${result.count} DB entries`);
  } catch (error) {
    debugLog("❌ DB clear failed:", error);
  }
}

/**
 * Gets cache statistics for monitoring and debugging.
 */
export async function getCacheStats(): Promise<{
  dbCount: number;
  dbTotalHits: number;
  avgDbHits: number;
  memCount: number;
}> {
  const stats = {
    memCount: memStore.length,
    dbCount: 0,
    dbTotalHits: 0,
    avgDbHits: 0,
  };

  try {
    const entries = await prisma.cacheEntry.findMany({
      select: { usedCount: true },
    });
    stats.dbCount = entries.length;
    stats.dbTotalHits = entries.reduce((sum, e) => sum + e.usedCount, 0);
    stats.avgDbHits = entries.length > 0 ? stats.dbTotalHits / entries.length : 0;
    debugLog(`📊 DB cache: ${stats.dbCount} entries, ${stats.dbTotalHits} total hits, ${stats.avgDbHits.toFixed(2)} avg`);
  } catch (error) {
    debugLog("❌ DB stats failed:", error);
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────
// MODULE INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Initializes the embedding system.
 * Call this at server startup to pre-load the model.
 */
export async function initEmbeddings(): Promise<void> {
  debugLog("🚀 Initializing embeddings system...");

  // Pre-load the model (warm start)
  await getPipeline().catch((e) => {
    console.warn("[EMBEDDINGS] Model pre-load failed:", e);
  });

  debugLog("✅ Embeddings system initialized");
}

// Auto-initialize if DEBUG_EMBEDDINGS is enabled
if (DEBUG_ENABLED) {
  initEmbeddings().catch(console.error);
}

