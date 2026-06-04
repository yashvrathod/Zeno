/**
 * =============================================================================
 * Slow path — async, fire-and-forget
 * =============================================================================
 *
 * Runs AFTER the response is sent to the user. Two responsibilities:
 *
 *   1. (Optional) Invoke the LLM judge for the current message and
 *      populate the cache. The verdict is available for the NEXT message.
 *
 *   2. Persist the snapshot row to MentorDecisionSnapshot.
 *
 *   3. Update the projection (mentorSession.stage) from the snapshot.
 *
 * All three steps are wrapped in try/catch. Failures are logged but NEVER
 * propagated to the user. The fast path is the source of truth for the
 * current response.
 */

import { cudCache } from "./cache";
import { invokeJudge, JudgeError, JudgeTimeoutError } from "./judge";
import { buildCUDFingerprint, fingerprintExecution, fingerprintHistory, fingerprintUserMessage } from "./cacheKey";
import { persistSnapshot, buildSummary, buildPayload } from "./snapshot";
import type {
  CUDResult,
  DiagnoseInput,
  DiagnoseOutput,
  DecisionTrace,
} from "./types";
import type { TeachingStage } from "@/lib/mentorContext";
import type { ApiConfig } from "@/lib/mentor/llm";
import prisma from "@/lib/prisma";

export type SlowPathInput = {
  userId: string;
  problemId: string;
  sessionId: string;
  fastOutput: DiagnoseOutput;
  fastTrace: DecisionTrace;
  input: DiagnoseInput;
  stageBefore: TeachingStage;
  stageAfter: TeachingStage;
  apiConfig?: ApiConfig;
};

/**
 * Runs the slow path. Returns the snapshotId if persisted, null on any failure.
 * Never throws.
 */
export async function runSlowPath(args: SlowPathInput): Promise<{ snapshotId: string | null; judgeCud: CUDResult | null }> {
  let snapshotId: string | null = null;
  let judgeCud: CUDResult | null = null;
  const trace = args.fastTrace;

  // 1. (Optional) LLM judge for the next message's cache.
  try {
    const skipJudgeFloor = args.fastOutput.thresholds.skipJudgeFloor;
    if (args.fastOutput.cud.confidence < skipJudgeFloor) {
      const execFp = fingerprintExecution(args.input.lastExecution);
      const histFp = fingerprintHistory(args.input.history as Array<{ role: string; content: string }>);
      const umFp = fingerprintUserMessage(args.input.userMessage);
      const fingerprint = buildCUDFingerprint({
        codeHash: args.input.codeHash,
        executionFingerprint: execFp,
        historyFingerprint: histFp,
        userMessageFingerprint: umFp,
      });
      try {
        const judgeStart = Date.now();
        const judgeResult = await invokeJudge({
          userCode: args.input.userCode,
          problemStatementMd: args.input.problemStatementMd,
          lastExecution: args.input.lastExecution,
          historyLength: args.input.history.length,
          userMessage: args.input.userMessage,
          apiConfig: args.apiConfig,
        });
        judgeCud = judgeResult;
        const judgeMs = Date.now() - judgeStart;
        cudCache.set(fingerprint, judgeResult);
        trace.steps.push({
          kind: "judge_invoked",
          model: args.apiConfig?.model ?? "judge",
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: judgeMs,
        });
      } catch (e) {
        const reason = e instanceof JudgeTimeoutError ? "judge_timeout" : e instanceof JudgeError ? "judge_failed" : "judge_error";
        trace.steps.push({ kind: "judge_failed", error: reason, fellBackTo: "heuristics" });
        // Per JUDGE_INDEPENDENCE_INVARIANT, the system continues with the
        // heuristic-only verdict that the fast path already used.
      }
    } else {
      trace.steps.push({ kind: "judge_skipped", reason: "high_heuristic_conf" });
    }
  } catch (e) {
    console.warn("[cud.slowPath] judge wrapper failed:", e);
  }

  // 2. Persist snapshot.
  try {
    const summary = buildSummary({
      cud: args.fastOutput.cud,
      policy: args.fastOutput.policy,
      stageBefore: args.stageBefore,
      stageAfter: args.stageAfter,
      executionKind: args.input.lastExecution?.kind ?? null,
      historyLen: args.input.history.length,
      messageCount: args.input.messageCount,
    });
    const execFp = fingerprintExecution(args.input.lastExecution);
    const histFp = fingerprintHistory(args.input.history as Array<{ role: string; content: string }>);
    const umFp = fingerprintUserMessage(args.input.userMessage);
    const payload = buildPayload({
      cud: args.fastOutput.cud,
      policy: args.fastOutput.policy,
      inertia: args.fastOutput.inertia,
      fingerprints: {
        codeHash: args.input.codeHash,
        executionFingerprint: execFp,
        historyFingerprint: histFp,
        userMessageFingerprint: umFp,
      },
      trace,
    });
    const persisted = await persistSnapshot({
      userId: args.userId,
      problemId: args.problemId,
      sessionId: args.sessionId,
      summary,
      payload,
    });
    snapshotId = persisted.id;
    trace.steps.push({ kind: "snapshot_persisted", snapshotId });
  } catch (e) {
    console.warn("[cud.slowPath] snapshot persist failed:", e);
    return { snapshotId: null, judgeCud };
  }

  // 3. Update the projection.
  if (args.stageAfter !== args.stageBefore) {
    try {
      await prisma.mentorSession.updateMany({
        where: { id: args.sessionId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { stage: args.stageAfter as any },
      });
      trace.steps.push({
        kind: "projection_updated",
        table: "MentorSession.stage",
        fromValue: args.stageBefore,
        toValue: args.stageAfter,
      });
    } catch (e) {
      console.warn("[cud.slowPath] projection update failed:", e);
    }
  }

  // 4. Cache the inertia state for the next message (avoids a snapshot walk).
  try {
    // No-op: the next fast path will call rebuildInertia. The cache here is
    // for diagnostics only.
  } catch {}

  return { snapshotId, judgeCud };
}
