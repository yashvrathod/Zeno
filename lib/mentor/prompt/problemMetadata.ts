/**
 * Problem metadata → prompt section renderer.
 *
 * Scaffolding now; enriched in PR 5 when `expectedComplexity` and
 * `topicTags` schema fields land on the Problem model. The function
 * degrades gracefully when those fields are undefined, so the prompt
 * architecture does not need a second migration later.
 */

export type ProblemMetadataInput = {
  title?: string;
  difficulty?: string;
  tags?: readonly string[];
  patterns?: readonly string[];
  /** PR 5: O(n), O(n log n), etc. Undefined for now. */
  expectedComplexity?: string;
  /** PR 5: free-form topic tags. Undefined for now. */
  topicTags?: readonly string[];
};

function joinList(items: readonly string[] | undefined, max: number = 8): string {
  if (!items || items.length === 0) return "";
  const shown = items.slice(0, max);
  const suffix = items.length > max ? ` (+${items.length - max} more)` : "";
  return shown.join(", ") + suffix;
}

export function buildProblemMetadata(meta: ProblemMetadataInput): string {
  const segments: string[] = [];

  if (meta.title) segments.push(`Problem: ${meta.title}.`);
  if (meta.difficulty) segments.push(`Difficulty: ${meta.difficulty}.`);

  const tags = joinList(meta.tags);
  if (tags) segments.push(`Tags: ${tags}.`);

  const patterns = joinList(meta.patterns);
  if (patterns) segments.push(`Patterns: ${patterns}.`);

  // PR 5 fields. Degrade gracefully when undefined.
  if (meta.expectedComplexity) {
    segments.push(`Expected complexity: ${meta.expectedComplexity}.`);
  }
  const topicTags = joinList(meta.topicTags);
  if (topicTags) segments.push(`Topic tags: ${topicTags}.`);

  return segments.join(" ");
}
