#!/usr/bin/env tsx
/**
 * pgvector Migration Script
 *
 * Run this after:
 * 1. Installing pgvector extension in PostgreSQL
 * 2. Creating the migration: npx prisma migrate dev --create-only --name add_pgvector
 * 3. Adding to migration SQL: CREATE EXTENSION IF NOT EXISTS vector;
 *
 * This script:
 * - Enables pgvector extension
 * - Adds embeddingVector column to CacheEntry
 * - Migrates existing JSON embeddings to vector format
 *
 * Usage: npx tsx scripts/migrate-pgvector.ts
 */

import { PrismaClient } from "@prisma/client";
import { enablePgvectorExtension, migrateEmbeddingsToVector, isPgvectorAvailable } from "../lib/pgvector";

const prisma = new PrismaClient();

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  pgvector Migration Tool");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Step 1: Check if pgvector is available
  console.log("Step 1: Checking pgvector extension...");
  const available = await isPgvectorAvailable();

  if (!available) {
    console.log("❌ pgvector extension not found.");
    console.log("\nTo enable pgvector, run these SQL commands as superuser:");
    console.log("  1. CREATE EXTENSION IF NOT EXISTS vector;");
    console.log("\nOr if you don't have superuser access, contact your DBA.");
    console.log("\nFor local development:");
    console.log("  - Docker: Use ankane/pgvector image");
    console.log("  - Homebrew: brew install pgvector");
    process.exit(1);
  }

  console.log("✅ pgvector extension is available\n");

  // Step 2: Add embeddingVector column if needed
  console.log("Step 2: Checking CacheEntry schema...");
  try {
    // Test if the column exists by attempting to query it
    await prisma.$queryRaw`SELECT embedding_vector FROM "CacheEntry" LIMIT 1`;
    console.log("✅ embeddingVector column exists\n");
  } catch {
    console.log("⚠️ embeddingVector column not found.");
    console.log("Run: npx prisma migrate dev --name add_pgvector_column\n");
    console.log("Add this to the migration SQL:");
    console.log(`  ALTER TABLE "CacheEntry" ADD COLUMN embedding_vector vector(768);`);
    console.log(`  CREATE INDEX ON "CacheEntry" USING ivfflat (embedding_vector vector_cosine_ops);`);
    process.exit(1);
  }

  // Step 3: Count existing embeddings using raw queries for pgvector
  console.log("Step 3: Counting embeddings to migrate...");

  const totalResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "CacheEntry" WHERE embedding IS NOT NULL
  `;
  const totalCount = Number(totalResult[0]?.count || 0);

  const migratedResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM "CacheEntry" WHERE embedding_vector IS NOT NULL
  `;
  const migratedCount = Number(migratedResult[0]?.count || 0);

  const pendingCount = totalCount - migratedCount;

  console.log(`  Total entries with embeddings: ${totalCount}`);
  console.log(`  Already migrated: ${migratedCount}`);
  console.log(`  Pending migration: ${pendingCount}\n`);

  if (pendingCount === 0) {
    console.log("✅ All embeddings already migrated!");
    process.exit(0);
  }

  // Step 4: Migrate embeddings
  console.log("Step 4: Migrating embeddings to pgvector format...");
  console.log("  This may take a while depending on the number of entries.\n");

  const { migrated, failed } = await migrateEmbeddingsToVector(100);

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Migration Complete");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Successfully migrated: ${migrated}`);
  console.log(`  Failed: ${failed}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Test the application with pgvector lookups`);
  console.log(`  2. Monitor query performance (should be ~10ms)`);
  console.log(`  3. Optional: Remove old JSON embedding column after verification`);
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
