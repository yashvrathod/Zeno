/**
 * =============================================================================
 * Snapshot persistence — summary + payload (CQRS-lite)
 * =============================================================================
 *
 * The snapshot is the source of truth. All other CUD state is a derived
 * projection. This module is responsible for:
 *
 *   - Building the summary (query-optimized) from a PolicyDecision
 *   - Persisting the full row to MentorDecisionSnapshot
 *   - Resolving outcomes (problem solved → outcome row populated)
 *
 * Storage cost: payload is large (full CUD + policy + trace). Summary is
 * small (~20 fields). For v1, both live in the same row. v2 may move
 * payload to cold storage after 90 days.
 */

import prisma from "@/lib/prisma";
import type {
  PersistedSnapshot,
  SnapshotSummary,
  SnapshotPayload,
  SnapshotOutcome,
  CUDResult,
  PolicyDecision,
  InertiaState,
  DecisionTrace,
} from "./types";
import type { TeachingStage } from "@/lib/mentorContext";
import type { LastExecution } from "@/lib/mentor/lastExecution";

export function buildSummary(args: {
  cud: CUDResult;
  policy: PolicyDecision;
  stageBefore: TeachingStage;
  stageAfter: TeachingStage;
  executionKind: LastExecution["kind"] | null;
  historyLen: number;
  messageCount: number;
}): SnapshotSummary {
  return {
    cudKind: args.cud.kind,
    cudConfidence: args.cud.confidence,
    policyKind: args.policy.policyKind,
    policyConfidence: args.policy.policyConfidence,
    stageBefore: args.stageBefore,
    stageAfter: args.stageAfter,
    stageAction: args.policy.stageAction,
    toneAction: args.policy.toneAction,
    tone: args.policy.suggestedTone,
    executionKind: args.executionKind,
    historyLen: args.historyLen,
    messageCount: args.messageCount,
    thresholds: args.policy.thresholds,
    source: args.cud.source,
  };
}

export function buildPayload(args: {
  cud: CUDResult;
  policy: PolicyDecision;
  inertia: InertiaState;
  fingerprints: SnapshotPayload["fingerprints"];
  trace: DecisionTrace;
}): SnapshotPayload {
  return args;
}

export async function persistSnapshot(args: {
  userId: string;
  problemId: string;
  sessionId: string;
  summary: SnapshotSummary;
  payload: SnapshotPayload;
}): Promise<PersistedSnapshot> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row: any = await prisma.mentorDecisionSnapshot.create({
    data: {
      userId: args.userId,
      problemId: args.problemId,
      sessionId: args.sessionId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      summary: args.summary as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payload: args.payload as any,
    },
  });
  return {
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    problemId: row.problemId,
    sessionId: row.sessionId,
    summary: row.summary as unknown as SnapshotSummary,
    payload: row.payload as unknown as SnapshotPayload,
    outcome: row.outcome as unknown as SnapshotOutcome | null,
    resolvedAt: row.resolvedAt,
  };
}

export async function resolveSnapshotOutcome(
  snapshotId: string,
  outcome: SnapshotOutcome,
): Promise<void> {
  await prisma.mentorDecisionSnapshot.update({
    where: { id: snapshotId },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outcome: outcome as any,
      resolvedAt: outcome.resolvedAt ? new Date(outcome.resolvedAt) : new Date(),
    },
  });
}
