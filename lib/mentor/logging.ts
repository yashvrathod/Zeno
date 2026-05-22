export interface MentorInteractionLog {
  userId: string;
  problemId: string;
  userMessage: string;
  decisionType: "STATIC" | "CACHE_HIT" | "AI_NEEDED";
  responseData: string;
  stage: string;
  rung: number;
  aiCalled?: boolean;
  cacheHitData?: { similarity: string; cacheEntryId: string };
  error?: string;
}

export async function logMentorInteraction(data: MentorInteractionLog): Promise<void> {
  try {
    const entry = {
      t: "mentor",
      u: data.userId.slice(0, 8),
      p: data.problemId.slice(0, 12),
      d: data.decisionType,
      s: data.stage,
      r: data.rung,
      a: data.aiCalled,
      e: data.error?.slice(0, 100),
    };

    if (data.decisionType === "AI_NEEDED" && data.aiCalled) {
      console.debug("[MENTOR_AI]", JSON.stringify(entry));
    }

    if (data.error) {
      console.warn("[MENTOR_ERR]", data.error.slice(0, 200));
    }
  } catch {
  }
}

export function logDbError(reason: unknown): void {
  try {
    console.warn(`[MENTOR_DB] ${reason instanceof Error ? reason.message : String(reason)}`);
  } catch {}
}

export function createMetadataEntry(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      entry[key] = value;
    }
  }
  return entry;
}
