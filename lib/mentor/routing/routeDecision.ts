import { TeachingStage } from "@/lib/mentorContext";
import { LearningRung } from "@/types/mentor";
import { IntentClassification } from "../intent";
import { isUserSpecificResponse } from "../cache/eligibility";

export type RouteDecision =
  | {
      type: "STATIC";
      handler: "breakdown" | "already_answered" | "stage_gate";
      reason?: string;
      intent?: IntentClassification;
    }
  | {
      type: "CACHE_HIT";
      entry: CacheEntry;
      similarity: number;
      intent?: IntentClassification;
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

/**
 * CacheEntry used for internal cache routing decisions.
 * Differs from types/mentor.ts CacheEntry (which includes userId).
 * TODO: Consolidate with canonical type when the extra field is no longer needed.
 */
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

export function isNearDuplicate(a: string, b: string): boolean {
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

export { isUserSpecificResponse };
