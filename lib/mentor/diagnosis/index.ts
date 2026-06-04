/**
 * =============================================================================
 * Public API for the CUD (Code Understanding Diagnosis) module
 * =============================================================================
 *
 * The orchestrator should import from this file. Individual modules are
 * implementation details.
 */

export type {
  CUDKind,
  CUDResult,
  CUDSignal,
  CUDSignals,
  PolicyDecision,
  PolicyThresholds,
  StageAction,
  ToneAction,
  InertiaState,
  InertiaDecision,
  DecisionTrace,
  TraceStep,
  SnapshotSummary,
  SnapshotPayload,
  SnapshotOutcome,
  PersistedSnapshot,
  DiagnoseInput,
  DiagnoseOutput,
} from "./types";

export { DEFAULT_THRESHOLDS } from "./types";
export {
  JUDGE_INDEPENDENCE_INVARIANT,
  PROJECTION_CONSISTENCY_CONTRACT,
  PROMPT_INJECTION_HARDENING,
  STAGE_INERTIA_RULES,
  INVARIANT_REGISTRY,
} from "./invariants";

export { runHeuristics } from "./heuristics";
export { sanitizeCodeForJudge, wrapSanitizedCode } from "./sanitize";
export {
  buildCUDFingerprint,
  fingerprintExecution,
  fingerprintHistory,
  fingerprintUserMessage,
} from "./cacheKey";
export { CUDCache, cudCache } from "./cache";
export { invokeJudge, JudgeError, JudgeTimeoutError } from "./judge";
export {
  emptyInertiaState,
  appendDecision,
  countMatching,
  decayedConfidence,
  dominantKind,
} from "./inertia";
export { evaluatePolicy } from "./policy/engine";
export { newTrace, appendStep, traceSummary } from "./trace";
export {
  buildSummary,
  buildPayload,
  persistSnapshot,
  resolveSnapshotOutcome,
} from "./snapshot";
export {
  getLatestSnapshot,
  getSnapshotsForSession,
  rebuildInertia,
  reconcileProjection,
} from "./projections";
export { runFastPath } from "./fastPath";
export { runSlowPath } from "./slowPath";
