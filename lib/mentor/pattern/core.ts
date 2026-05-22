import prisma from "../../prisma";
import { WeakPatternTag, WEAK_PATTERN_TAGS, PATTERN_METADATA } from "./metadata";

// ─────────────────────────────────────────────────────────────────────────
// DATABASE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Upsert weak patterns for a user — increment count if pattern exists, create if new.
 *
 * @param userId - User ID to track patterns for
 * @param tags - Array of weak pattern tags detected
 *
 * This function is idempotent — calling it multiple times with the same tags
 * will increment the count each time, allowing tracking of recurring issues.
 */
export async function trackWeakPatterns(
  userId: string,
  tags: WeakPatternTag[]
): Promise<void> {
  if (tags.length === 0) return;

  // Get or create user's StudentProfile
  let profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    await prisma.$executeRaw`
      INSERT INTO "StudentProfile" ("userId", "weakPatterns", "strongPatterns", "createdAt", "updatedAt")
      VALUES (${userId}, '[]'::jsonb, '[]'::jsonb, NOW(), NOW())
      ON CONFLICT ("userId") DO NOTHING
    `;
    profile = await prisma.studentProfile.findUnique({
      where: { userId },
    });
    if (!profile) return;
  }

  // Get current weak patterns (stored as JSON)
  const currentPatterns = (profile.weakPatterns as Record<string, number>) || {};

  // Increment counts for each detected tag
  for (const tag of tags) {
    currentPatterns[tag] = (currentPatterns[tag] || 0) + 1;
  }

  // Update the profile with new counts
  await prisma.studentProfile.update({
    where: { userId },
    data: {
      weakPatterns: currentPatterns as unknown as object,
    },
  });
}

/**
 * Get user's top weak patterns with full metadata and statistics.
 *
 * @param userId - User ID to get report for
 * @returns Array of patterns sorted by frequency, with metadata and percentages
 *
 * The percentOfSessions field shows what percentage of solved sessions
 * this pattern appeared in, giving context to the raw count.
 */
export async function getWeakPatternReport(
  userId: string
): Promise<
  Array<{
    tag: WeakPatternTag;
    count: number;
    friendlyName: string;
    description: string;
    howToFix: string;
    percentOfSessions: number;
  }>
> {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId },
  });

  if (!profile || !profile.weakPatterns) {
    return [];
  }

  const patterns = profile.weakPatterns as Record<string, number>;
  const totalSolvedSessions = await getTotalSolvedSessions(userId);

  // Build report with metadata
  const report = Object.entries(patterns)
    .filter(([tag]) => WEAK_PATTERN_TAGS.includes(tag as WeakPatternTag))
    .map(([tag, count]) => ({
      tag: tag as WeakPatternTag,
      count,
      friendlyName: PATTERN_METADATA[tag as WeakPatternTag].friendlyName,
      description: PATTERN_METADATA[tag as WeakPatternTag].description,
      howToFix: PATTERN_METADATA[tag as WeakPatternTag].howToFix,
      percentOfSessions:
        totalSolvedSessions > 0
          ? Math.round((count / totalSolvedSessions) * 10000) / 100 // 2 decimal places
          : 0,
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  return report;
}

/**
 * Get total number of solved sessions for a user.
 * Used to calculate pattern percentages.
 */
async function getTotalSolvedSessions(userId: string): Promise<number> {
  const count = await prisma.mentorSession.count({
    where: {
      userId,
      stage: "REFLECT",
    },
  });
  return count;
}

// ─────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get a human-readable summary of detected patterns.
 * Useful for displaying feedback to the user.
 */
export function summarizeDetectedPatterns(patterns: WeakPatternTag[]): string {
  if (patterns.length === 0) {
    return "No common issues detected. Good job!";
  }

  const summaries = patterns.map((tag) => {
    const meta = PATTERN_METADATA[tag];
    return `- ${meta.friendlyName}: ${meta.description}`;
  });

  return `Potential issues detected:\n${summaries.join("\n")}`;
}

/**
 * Get targeted advice for fixing detected patterns.
 */
export function getFixAdvice(patterns: WeakPatternTag[]): string[] {
  return patterns.map((tag) => {
    const meta = PATTERN_METADATA[tag];
    return `${meta.friendlyName}: ${meta.howToFix}`;
  });
}
