/**
 * pgvector Embedding Service
 *
 * Provides fast vector similarity search using PostgreSQL pgvector extension.
 * Replaces in-memory embedding computation with 10ms database lookups.
 *
 * Setup:
 * 1. Run: CREATE EXTENSION IF NOT EXISTS vector;
 * 2. Migration adds embeddingVector column to CacheEntry
 * 3. Use migrateEmbeddings() to convert existing Json embeddings
 */

import prisma from "./prisma";
import { getEmbedding } from "./embeddings";

// Vector dimension (adjust based on your embedding model)
const VECTOR_DIMENSION = 768;

// Minimum similarity threshold for cache hits
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Convert float array to pgvector binary format
 * pgvector expects: 4 bytes for dimension count + 4 bytes per float
 */
export function floatsToPgVector(floats: number[]): Buffer {
  const dimension = floats.length;
  const buffer = Buffer.alloc(4 + dimension * 4);

  // Write dimension as uint16 (2 bytes) but pgvector uses 4 bytes header
  buffer.writeUInt32LE(dimension, 0);

  // Write each float as little-endian float32
  for (let i = 0; i < dimension; i++) {
    buffer.writeFloatLE(floats[i]!, 4 + i * 4);
  }

  return buffer;
}

/**
 * Convert pgvector binary format back to float array
 */
export function pgVectorToFloats(buffer: Buffer): number[] {
  const dimension = buffer.readUInt32LE(0);
  const floats: number[] = [];

  for (let i = 0; i < dimension; i++) {
    floats.push(buffer.readFloatLE(4 + i * 4));
  }

  return floats;
}

/**
 * Compute cosine similarity between two float arrays
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Search cache entries using pgvector similarity
 * Returns entries with similarity >= threshold, sorted by similarity desc
 */
export async function searchSimilarCachedResponses(
  problemId: string,
  queryEmbedding: number[],
  threshold: number = SIMILARITY_THRESHOLD,
  limit: number = 5
): Promise<Array<{
  id: string;
  questionText: string;
  response: string;
  stage: string;
  rung: number;
  similarity: number;
  usedCount: number;
}>> {
  try {
    // Use raw query for pgvector cosine similarity search
    // The <=> operator computes cosine distance (1 - similarity)
    const queryVector = floatsToPgVector(queryEmbedding);

    const results = await prisma.$queryRaw`
      SELECT 
        id,
        question_text as "questionText",
        response,
        stage,
        rung,
        used_count as "usedCount",
        1 - (embedding_vector <=> ${queryVector}::vector) as similarity
      FROM "CacheEntry"
      WHERE problem_id = ${problemId}
        AND embedding_vector IS NOT NULL
        AND 1 - (embedding_vector <=> ${queryVector}::vector) >= ${threshold}
      ORDER BY embedding_vector <=> ${queryVector}::vector
      LIMIT ${limit}
    `;

    return (results as any[]).map((row) => ({
      id: row.id,
      questionText: row.questionText,
      response: row.response,
      stage: row.stage,
      rung: row.rung,
      similarity: parseFloat(row.similarity),
      usedCount: row.usedCount,
    }));
  } catch (error) {
    console.error("pgvector search failed:", error);
    // Fallback to empty results
    return [];
  }
}

/**
 * Save cache entry with pgvector embedding
 */
export async function saveCacheEntryWithVector(params: {
  problemId: string;
  questionMd5: string;
  questionText: string;
  embedding: number[];
  response: string;
  stage: string;
  rung: number;
}) {
  const { problemId, questionMd5, questionText, embedding, response, stage, rung } = params;

  const vectorBuffer = floatsToPgVector(embedding);

  try {
    await prisma.$executeRaw`
      INSERT INTO "CacheEntry" (
        id, problem_id, question_md5, question_text, 
        embedding, embedding_vector, response, stage, rung, 
        used_count, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), ${problemId}, ${questionMd5}, ${questionText},
        ${JSON.stringify(embedding)}::jsonb, ${vectorBuffer}::vector, 
        ${response}, ${stage}, ${rung}, 0, NOW(), NOW()
      )
      ON CONFLICT (problem_id, question_md5) 
      DO UPDATE SET
        response = EXCLUDED.response,
        embedding = EXCLUDED.embedding,
        embedding_vector = EXCLUDED.embedding_vector,
        updated_at = NOW()
    `;
  } catch (error) {
    console.error("Failed to save cache entry with vector:", error);
    throw error;
  }
}

/**
 * Migrate existing JSON embeddings to pgvector format
 * Run this once after enabling pgvector
 */
export async function migrateEmbeddingsToVector(batchSize: number = 100): Promise<{
  migrated: number;
  failed: number;
}> {
  let migrated = 0;
  let failed = 0;
  let cursor: string | null = null;

  while (true) {
    // Fetch batch of entries without vectors (using raw query to handle pgvector column)
    type EntryRow = { id: string; embedding: unknown };
    const entries: EntryRow[] = await prisma.$queryRaw`
      SELECT id, embedding
      FROM "CacheEntry"
      WHERE embedding_vector IS NULL
        AND embedding IS NOT NULL
        AND (${cursor}::text IS NULL OR id > ${cursor}::text)
      ORDER BY id
      LIMIT ${batchSize}
    `;

    if (entries.length === 0) break;

    for (const entry of entries) {
      try {
        const embedding = entry.embedding as number[];
        if (!Array.isArray(embedding) || embedding.length === 0) {
          failed++;
          continue;
        }

        const vectorBuffer = floatsToPgVector(embedding);

        await prisma.$executeRaw`
          UPDATE "CacheEntry"
          SET embedding_vector = ${vectorBuffer}::vector
          WHERE id = ${entry.id}
        `;

        migrated++;
      } catch (error) {
        console.error(`Failed to migrate entry ${entry.id}:`, error);
        failed++;
      }
    }

    cursor = entries[entries.length - 1]?.id ?? null;
    console.log(`  Migrated batch: ${migrated} succeeded, ${failed} failed so far`);
  }

  return { migrated, failed };
}

/**
 * Check if pgvector extension is available
 */
export async function isPgvectorAvailable(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw`
      SELECT 1 FROM pg_extension WHERE extname = 'vector'
    `;
    return Array.isArray(result) && result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Enable pgvector extension (run once as superuser)
 */
export async function enablePgvectorExtension(): Promise<void> {
  try {
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log("pgvector extension enabled");
  } catch (error) {
    console.error("Failed to enable pgvector extension:", error);
    throw new Error("Failed to enable pgvector. Run as superuser or check PostgreSQL version >= 14.");
  }
}
