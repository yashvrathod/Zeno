import { debug, startTimer } from "@/lib/debug";
import { getEmbedding } from "@/lib/embeddings";
import { classifyIntent } from "../intent/core";
import { shouldSkipCacheLookup } from "../cache/eligibility";
import { 
  RouteDecision, 
  MentorSession, 
  Problem, 
  ProblemMeta, 
  isNearDuplicate 
} from "./routeDecision";
import { searchCache } from "./cacheManager";

export async function routeInteraction(
  input: string,
  session: MentorSession & { messages: Array<{ role: string; content: string }> },
  problem: Problem & { meta: ProblemMeta },
  currentRung: number = 1,
): Promise<RouteDecision> {
  const timer = startTimer("routeInteraction");
  debug.mentor("routeInteraction called", { stage: session.stage, userId: session.userId.slice(0, 8) + "..." });

  const intentClassification = classifyIntent(input);
  debug.mentor("Intent classified", {
    intent: intentClassification.intent,
    confidence: intentClassification.confidence,
  });

  if (session.stage === "EXPLORE" && session.messages.length === 0) {
    debug.stage("EXPLORE stage, no messages yet — returning breakdown handler");
    timer();
    return {
      type: "STATIC",
      handler: "breakdown",
      reason: "User is in EXPLORE stage with no prior conversation — provide problem breakdown",
      intent: intentClassification,
    };
  }

  const userMessages = session.messages.filter((m) => m.role === "user");
  for (const prevMsg of userMessages) {
    if (isNearDuplicate(input, prevMsg.content)) {
      debug.mentor("Duplicate question detected", { inputLength: input.length });
      timer();
      return {
        type: "STATIC",
        handler: "already_answered",
        reason: "User has already asked this question in this session",
        intent: intentClassification,
      };
    }
  }

  const cacheSkipCheck = shouldSkipCacheLookup(input, intentClassification);

  if (cacheSkipCheck.skip) {
    debug.mentor("Cache lookup skipped by intent classification", {
      intent: intentClassification.intent,
      reason: cacheSkipCheck.reason
    });
    timer();
    return {
      type: "AI_NEEDED",
      reason: cacheSkipCheck.reason,
      intent: intentClassification,
    };
  }

  let embedding: number[] | null = null;
  try {
    debug.embed("Computing embedding for input", { inputLength: input.length });
    const embedEnd = startTimer("embedding");
    embedding = await getEmbedding(input);
    embedEnd();
  } catch (e) {
    console.warn("[ROUTER] Embedding failed, skipping cache:", (e as Error).message);
  }

  if (!embedding) {
    debug.ai("AI_NEEDED — embedding generation failed");
    timer();
    return {
      type: "AI_NEEDED",
      reason: "No static rule or cache hit applied — AI generation required",
      intent: intentClassification,
    };
  }

  const cacheHit = await searchCache(input, session.problemId, embedding, {
    currentStage: session.stage,
    currentRung,
  });

  if (cacheHit) {
    timer();
    return {
      type: "CACHE_HIT",
      entry: cacheHit.entry,
      similarity: cacheHit.similarity,
      intent: intentClassification,
    };
  }

  debug.ai("AI_NEEDED — intent-first routing");
  timer();
  return {
    type: "AI_NEEDED",
    reason: "No static rule or cache hit applied — AI generation required",
    intent: intentClassification,
  };
}
