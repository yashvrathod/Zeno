/**
 * =============================================================================
 * Projections — rebuild mentorSession.stage and InertiaState from the
 * snapshot log
 * =============================================================================
 *
 * Per PROJECTION_CONSISTENCY_CONTRACT (invariants.ts), the projections are
 * eventually consistent with ≤ 1 message lag. This module provides the
 * rebuild functions and a self-heal helper.
 *
 * Why a rebuild? Because the snapshot log is the source of truth, and the
 * mentorSession.stage column on the session row is just a denormalized
 * projection. If the projection update fails (DB blip, deploy mid-write,
 * etc.), the next message re-derives it from the log.
 */

import prisma from "@/lib/prisma";
import type { PersistedSnapshot, InertiaState } from "./types";
import { emptyInertiaState, appendDecision } from "./inertia";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

/**
 * Returns the most recent snapshot for a session, or null.
 */
export async function getLatestSnapshot(sessionId: string): Promise<PersistedSnapshot | null> {
  const row: AnyRow = await prisma.mentorDecisionSnapshot.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    problemId: row.problemId,
    sessionId: row.sessionId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary: row.summary as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: row.payload as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outcome: row.outcome as any,
    resolvedAt: row.resolvedAt,
  };
}

/**
 * Returns all snapshots for a session in chronological order (oldest first).
 * Used for the inertia rebuild.
 */
export async function getSnapshotsForSession(sessionId: string, limit: number = 200): Promise<PersistedSnapshot[]> {
  const rows: AnyRow[] = await prisma.mentorDecisionSnapshot.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    problemId: row.problemId,
    sessionId: row.sessionId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    summary: row.summary as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: row.payload as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outcome: row.outcome as any,
    resolvedAt: row.resolvedAt,
  }));
}

/**
 * Rebuilds the inertia state for a session by walking the snapshot log.
 * Idempotent. Safe to call on every session load.
 */
export async function rebuildInertia(sessionId: string): Promise<InertiaState> {
  const snapshots = await getSnapshotsForSession(sessionId);
  if (snapshots.length === 0) {
    // Cold start: empty state. Caller passes thresholds to size the window.
    return emptyInertiaState({
      retreat: 0.7,
      forward: 0.8,
      ambiguity: 0.5,
      inertia: 2,
      decayRate: 5.0,
      skipJudgeFloor: 0.6,
    });
  }
  // Use the thresholds from the most recent snapshot for window sizing.
  const last = snapshots[snapshots.length - 1];
  let state = emptyInertiaState(last.summary.thresholds);
  for (const s of snapshots) {
    state = appendDecision(state, {
      kind: s.summary.cudKind,
      confidence: s.summary.cudConfidence,
      messageIndex: s.summary.messageCount,
    });
  }
  return state;
}

/**
 * Self-heal: if the mentorSession.stage projection does not match the
 * latest snapshot's stageAfter, update the projection. This handles the
 * case where a slow-path DB write failed mid-deploy.
 */
export async function reconcileProjection(args: {
  sessionId: string;
  currentProjectionStage: string;
}): Promise<{ healed: boolean; stage: string }> {
  const latest = await getLatestSnapshot(args.sessionId);
  if (!latest) return { healed: false, stage: args.currentProjectionStage };
  if (latest.summary.stageAfter === args.currentProjectionStage) {
    return { healed: false, stage: args.currentProjectionStage };
  }
  // Heal by updating the projection. We use updateMany to avoid races.
  await prisma.mentorSession.updateMany({
    where: { id: args.sessionId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { stage: latest.summary.stageAfter as any },
  });
  return { healed: true, stage: latest.summary.stageAfter };
}
