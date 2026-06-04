/**
 * =============================================================================
 * Fast path — runs in the request/response critical path
 * =============================================================================
 *
 * MUST be < 200ms p99 (excluding LLM call latency, which dominates).
 * MUST NOT throw. MUST NOT block on the LLM judge.
 *
 * Returns a DiagnoseOutput that the orchestrator can use to:
 *   - Build the prompt (policy decision → small audit-only context)
 *   - Override the tone (policy decision → suggestedTone)
 *   - Mutate the stage (policy decision → stageAction)
 *   - Update the trace (TraceStep[] accumulated during this run)
 */

import type {
  CUDResult,
  DiagnoseInput,
  DiagnoseOutput,
  InertiaState,
  DecisionTrace,
} from "./types";
import { DEFAULT_THRESHOLDS } from "./types";
import { runHeuristics } from "./heuristics";
import { cudCache } from "./cache";
import {
  buildCUDFingerprint,
  fingerprintExecution,
  fingerprintHistory,
  fingerprintUserMessage,
} from "./cacheKey";
import { evaluatePolicy } from "./policy/engine";
import { emptyInertiaState } from "./inertia";
import { newTrace } from "./trace";
import { reconcileProjection } from "./projections";
import type { TeachingStage } from "@/lib/mentorContext";
import type { ApiConfig } from "@/lib/mentor/llm";

const HISTORY_LENGTH_TRIGGER_MAX = 2;

function shouldRunDiagnosis(input: DiagnoseInput): boolean {
  // Skip when the user is deep in conversation — chat itself is the better signal.
  const userMessages = input.history.filter((m) => m.role === "user").length;
  if (userMessages > HISTORY_LENGTH_TRIGGER_MAX) return false;
  // Skip when there's nothing to diagnose.
  if (!input.userCode) return false;
  if (!input.lastExecution || input.lastExecution.kind === "no_execution_yet") return false;
  return true;
}

export type FastPathResult = {
  output: DiagnoseOutput;
  trace: DecisionTrace;
  ranDiagnosis: boolean;
};

/**
 * Runs the fast path. The user-facing flow:
 *   1. Reconcile projection (self-heal, idempotent, cheap)
 *   2. Decide whether diagnosis is needed (history length gate)
 *   3. Compute fingerprint
 *   4. Cache lookup → return cached CUD on hit
 *   5. Run heuristics (always, even on cache hit, to measure timing)
 *   6. If heuristic confidence ≥ skipJudgeFloor → use heuristic only
 *   7. Otherwise → return heuristic CUD now; the slow path will judge later
 *      and populate the cache for the next message
 *   8. Evaluate policy against CUD + inertia
 *   9. Build DiagnoseOutput + DecisionTrace
 */
export async function runFastPath(args: {
  input: DiagnoseInput;
  currentStage: TeachingStage;
  inertia: InertiaState;
  sessionId: string;
  decisionId: string;
  apiConfig?: ApiConfig;
}): Promise<FastPathResult> {
  const { input, currentStage, decisionId, sessionId } = args;
  const trace = newTrace(decisionId);

  // 1. Reconcile projection (idempotent; cheap when no work).
  try {
    await reconcileProjection({
      sessionId,
      currentProjectionStage: currentStage,
    });
  } catch {
    // Self-heal failure is non-fatal. The fast path continues.
  }

  // 2. Skip if not in "user jumped to code" mode.
  if (!shouldRunDiagnosis(input)) {
    const empty = emptyInertiaState(DEFAULT_THRESHOLDS);
    const skipOutput: DiagnoseOutput = {
      cud: {
        kind: "ambiguous",
        confidence: 0.5,
        reasoning: "diagnosis skipped (history > 2 or no execution yet)",
        evidence: [],
        signals: { signals: [], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
        source: "heuristic_only",
      },
      policy: evaluatePolicy({
        cud: {
          kind: "ambiguous",
          confidence: 0.5,
          reasoning: "skipped",
          evidence: [],
          signals: { signals: [], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
          source: "heuristic_only",
        },
        inertia: empty,
        currentStage,
        lastExecution: input.lastExecution,
        messageIndex: input.messageCount,
      }),
      inertia: empty,
      thresholds: DEFAULT_THRESHOLDS,
      willMutateStage: false,
      willOverrideTone: false,
      fingerprint: "",
    };
    return { output: skipOutput, trace, ranDiagnosis: false };
  }

  // 3. Build fingerprint.
  const execFp = fingerprintExecution(input.lastExecution);
  const histFp = fingerprintHistory(input.history as Array<{ role: string; content: string }>);
  const umFp = fingerprintUserMessage(input.userMessage);
  const fingerprint = buildCUDFingerprint({
    codeHash: input.codeHash,
    executionFingerprint: execFp,
    historyFingerprint: histFp,
    userMessageFingerprint: umFp,
  });
  trace.steps.push({ kind: "input_fingerprint", fingerprint });

  // 4. Cache lookup.
  const cached = cudCache.get(fingerprint);
  if (cached) {
    trace.steps.push({
      kind: "cache_lookup",
      hit: true,
      cachedCudKind: cached.kind,
      cachedConfidence: cached.confidence,
    });
    const cachedCud: CUDResult = { ...cached, source: "cache_hit" };
    const policy = evaluatePolicy({
      cud: cachedCud,
      inertia: args.inertia,
      currentStage,
      lastExecution: input.lastExecution,
      messageIndex: input.messageCount,
    });
    trace.steps.push({ kind: "judge_skipped", reason: "cache_hit" });
    trace.steps.push({ kind: "policy_evaluated", chosen: policy.policyKind, thresholds: policy.thresholds });
    return {
      output: {
        cud: cachedCud,
        policy,
        inertia: args.inertia,
        thresholds: policy.thresholds,
        willMutateStage: policy.stageAction !== "stay" && policy.stageAction !== "hold",
        willOverrideTone: policy.toneAction === "override",
        fingerprint,
      },
      trace,
      ranDiagnosis: true,
    };
  }
  trace.steps.push({ kind: "cache_lookup", hit: false });

  // 5. Run heuristics.
  const heuristicsStart = Date.now();
  const heuristicCud = runHeuristics({
    userCode: input.userCode,
    lastExecution: input.lastExecution,
    history: input.history,
  });
  const heuristicsMs = Date.now() - heuristicsStart;
  trace.steps.push({
    kind: "heuristics",
    confidence: heuristicCud.confidence,
    signals: heuristicCud.signals.signals,
    durationMs: heuristicsMs,
  });

  // 6. Decide whether the slow path will judge.
  const willJudge = heuristicCud.confidence < DEFAULT_THRESHOLDS.skipJudgeFloor;
  trace.steps.push({
    kind: willJudge ? "judge_skipped" : "judge_skipped", // fast path always skips judge for THIS message
    reason: "fast_path",
  });

  // 7. Use heuristic verdict (per JUDGE_INDEPENDENCE_INVARIANT).
  // Cache the verdict so the next message can short-circuit.
  cudCache.set(fingerprint, heuristicCud);

  // 8. Evaluate policy.
  const policy = evaluatePolicy({
    cud: heuristicCud,
    inertia: args.inertia,
    currentStage,
    lastExecution: input.lastExecution,
    messageIndex: input.messageCount,
  });
  trace.steps.push({ kind: "policy_evaluated", chosen: policy.policyKind, thresholds: policy.thresholds });

  return {
    output: {
      cud: heuristicCud,
      policy,
      inertia: args.inertia,
      thresholds: policy.thresholds,
      willMutateStage: policy.stageAction !== "stay" && policy.stageAction !== "hold",
      willOverrideTone: policy.toneAction === "override",
      fingerprint,
    },
    trace,
    ranDiagnosis: true,
  };
}
