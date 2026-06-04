/**
 * =============================================================================
 * CUD (Code Understanding Diagnosis) — public types
 * =============================================================================
 *
 * The CUD pipeline produces a structured understanding diagnosis from
 * (user code, problem, execution result, conversation history). The output
 * flows through three layers, each with a distinct type:
 *
 *   1. Heuristic + LLM judge   →  CUDResult        (raw, stochastic)
 *   2. Policy Engine           →  PolicyDecision   (deterministic rules)
 *   3. Inertia                 →  InertiaState     (history-weighted view)
 *
 * Storage shape: see snapshot.ts. UI never sees CUDResult directly —
 * it sees a small, audit-only "policy context" string derived from
 * PolicyDecision (see promptContext.ts).
 */

import type { TeachingStage } from "@/lib/mentorContext";
import type { LastExecution } from "@/lib/mentor/lastExecution";
import type { ConversationTone } from "@/lib/mentorContext";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Raw CUD output (heuristic + LLM judge)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The five understanding categories. The first two ("understood_*") are
 * positive, the second two ("misunderstood" / "weak_logic") are intervention
 * signals. "no_code" / "code_doesnt_run" are pre-diagnosis states that
 * trigger specific scaffolding but not stage mutations.
 */
export type CUDKind =
  | "no_code"
  | "code_doesnt_run"
  | "no_execution_yet"
  | "misunderstood"
  | "understood_weak_logic"
  | "understood_strong_logic"
  | "ambiguous";

export type CUDSignal =
  | "empty_code"
  | "only_boilerplate"
  | "no_execution"
  | "compile_error"
  | "runtime_error"
  | "all_passed"
  | "partial_pass"
  | "tle"
  | "nested_loop_brute_force"
  | "uses_optimal_datastruct"
  | "off_by_one_pattern"
  | "unrelated_identifiers"
  | "no_progress"
  | "chat_silence";

export type CUDSignals = {
  signals: CUDSignal[];
  nestedLoopDepth: number;          // 0 if no nested loops
  mentionsOptimalDS: string[];      // e.g. ["hash_map", "two_pointer"]
  variableNameClarity: number;      // 0..1, heuristic on identifier quality
  failureTypeMix: string[];         // ["off_by_one", "null_pointer", ...]
};

export type CUDResult = {
  kind: CUDKind;
  confidence: number;               // 0..1
  reasoning: string;                // ≤ 200 chars, audit-only, never in prompt
  evidence: string[];               // bullet evidence lines
  signals: CUDSignals;
  source: "heuristic_only" | "llm_judge" | "cache_hit";
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. Policy decision (the only thing the rest of the system reads)
// ─────────────────────────────────────────────────────────────────────────────

export type StageAction = "advance" | "hold" | "retreat" | "stay";
export type ToneAction = "override" | "keep";

export type PolicyThresholds = {
  retreat: number;      // conf floor for retreating the stage (default 0.7)
  forward: number;      // conf floor for forward-jumping a stage (default 0.8)
  ambiguity: number;    // below this → no policy mutation (default 0.5)
  inertia: number;      // 2-of-N confirmation requirement (default 2)
  decayRate: number;    // exp(-age/decayRate) decay (default 5.0)
  skipJudgeFloor: number; // heuristic conf at/above which judge is skipped (default 0.6)
};

export const DEFAULT_THRESHOLDS: PolicyThresholds = {
  retreat: 0.7,
  forward: 0.8,
  ambiguity: 0.5,
  inertia: 2,
  decayRate: 5.0,
  skipJudgeFloor: 0.6,
};

export type PolicyDecision = {
  cudKind: CUDKind;
  cudConfidence: number;
  policyKind: CUDKind;             // may differ from cudKind if ambiguity gate fired
  policyConfidence: number;        // possibly decayed via inertia
  stageAction: StageAction;
  toneAction: ToneAction;
  suggestedTone?: ConversationTone;
  suggestedStage?: TeachingStage;
  explanationMd: string;           // ≤ 200 chars, logged, never in user prompt
  thresholds: PolicyThresholds;    // snapshot for audit reproducibility
  source: CUDResult["source"];
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. Inertia state (history-weighted view of recent decisions)
// ─────────────────────────────────────────────────────────────────────────────

export type InertiaDecision = {
  kind: CUDKind;
  confidence: number;              // raw, pre-decay
  decayedConfidence: number;       // exp(-age/decayRate) weighted
  messageIndex: number;
  createdAt: number;               // epoch ms
};

export type InertiaState = {
  window: InertiaDecision[];       // most recent N, oldest first
  windowSize: number;              // N (default 3)
  decayRate: number;               // default 5.0 messages
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Decision trace (debug artifact, persisted in payload.trace)
// ─────────────────────────────────────────────────────────────────────────────

export type TraceStep =
  | { kind: "input_fingerprint"; fingerprint: string }
  | { kind: "cache_lookup"; hit: boolean; cachedCudKind?: CUDKind; cachedConfidence?: number }
  | { kind: "heuristics"; confidence: number; signals: CUDSignal[]; durationMs: number }
  | { kind: "judge_skipped"; reason: "high_heuristic_conf" | "judge_disabled" | "cache_hit" | "fast_path" }
  | { kind: "judge_invoked"; model: string; tokensIn: number; tokensOut: number; latencyMs: number }
  | { kind: "judge_failed"; error: string; fellBackTo: "heuristics" }
  | { kind: "policy_evaluated"; chosen: CUDKind; thresholds: PolicyThresholds }
  | { kind: "inertia_applied"; decayedConfidence: number; window: InertiaDecision[] }
  | { kind: "stage_transition"; from: TeachingStage; to: TeachingStage; rule: string }
  | { kind: "tone_override"; from: ConversationTone; to: ConversationTone; reason: string }
  | { kind: "snapshot_persisted"; snapshotId: string }
  | { kind: "projection_updated"; table: string; fromValue: unknown; toValue: unknown };

export type DecisionTrace = {
  decisionId: string;
  createdAt: number;               // epoch ms
  steps: TraceStep[];
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. Snapshot model (CQRS-lite: write model = append-only log)
// ─────────────────────────────────────────────────────────────────────────────

export type SnapshotSummary = {
  cudKind: CUDKind;
  cudConfidence: number;
  policyKind: CUDKind;
  policyConfidence: number;
  stageBefore: TeachingStage;
  stageAfter: TeachingStage;
  stageAction: StageAction;
  toneAction: ToneAction;
  tone?: ConversationTone;
  executionKind: LastExecution["kind"] | null;
  historyLen: number;
  messageCount: number;
  thresholds: PolicyThresholds;
  source: CUDResult["source"];
};

export type SnapshotPayload = {
  cud: CUDResult;
  policy: PolicyDecision;
  inertia: InertiaState;
  fingerprints: {
    codeHash: string | null;
    executionFingerprint: string | null;
    historyFingerprint: string | null;
    userMessageFingerprint: string | null;
  };
  trace: DecisionTrace;
};

export type SnapshotOutcome = {
  problemSolved: boolean | null;
  userResubmitted: boolean | null;
  stageReached: TeachingStage | null;
  timeToSolveMs: number | null;
  resolvedAt: number | null;
};

export type PersistedSnapshot = {
  id: string;
  createdAt: Date;
  userId: string;
  problemId: string;
  sessionId: string;
  summary: SnapshotSummary;
  payload: SnapshotPayload;
  outcome: SnapshotOutcome | null;
  resolvedAt: Date | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. Diagnostics input (the public surface for the orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnoseInput = {
  userCode: string | undefined;
  problemStatementMd: string | undefined;
  problemConstraintsMd: string | undefined;
  publicTestCases: Array<{ order: number; input: string; expected: string }> | undefined;
  lastExecution: LastExecution | undefined;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
  stats: {
    runCount: number;
    submitCount: number;
    acceptedCount: number;
    wrongAnswerCount: number;
    runtimeErrorCount: number;
    lastStatus: string | null;
    lastError: string | null;
  } | null;
  codeHash: string | null;
  messageCount: number;
};

export type DiagnoseOutput = {
  cud: CUDResult;
  policy: PolicyDecision;
  inertia: InertiaState;
  thresholds: PolicyThresholds;
  /** True if the policy suggests a stage mutation this turn. */
  willMutateStage: boolean;
  /** True if the policy suggests a tone override this turn. */
  willOverrideTone: boolean;
  /** Audit-only fingerprint of the input, for caching and snapshot id. */
  fingerprint: string;
};
