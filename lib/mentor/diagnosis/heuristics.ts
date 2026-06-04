/**
 * =============================================================================
 * Heuristic CUD layer — deterministic, < 5ms, no LLM
 * =============================================================================
 *
 * Runs first on every message. Returns a CUDResult with `source:
 * "heuristic_only"`. When `confidence >= skipJudgeFloor` (default 0.6), the
 * LLM judge is skipped entirely for this message. When confidence is low,
 * the LLM judge is invoked asynchronously and its verdict (when it arrives)
 * is cached for the *next* message in this session.
 *
 * Signal catalog (see types.ts):
 *   - empty_code, only_boilerplate, no_execution
 *   - compile_error, runtime_error, tle
 *   - all_passed, partial_pass
 *   - nested_loop_brute_force, uses_optimal_datastruct
 *   - off_by_one_pattern, unrelated_identifiers, no_progress
 *   - chat_silence
 *
 * Confidence floor: per JUDGE_INDEPENDENCE_INVARIANT, the policy engine
 * treats heuristic confidence as max(heuristicConf, 0.5). This means the
 * heuristic never claims a low-confidence answer — it returns 0.5 minimum.
 */

import type { CUDResult, CUDSignals, CUDKind, CUDSignal } from "./types";
import type { LastExecution } from "@/lib/mentor/lastExecution";

const HEURISTIC_CONFIDENCE_FLOOR = 0.5;

const OPTIMAL_DATASTRUCTS = [
  "hashmap",
  "hash_map",
  "hash",
  "map<",
  "dict",
  "dictionary",
  "two_pointer",
  "twopointer",
  "left_ptr",
  "right_ptr",
  "sliding",
  "binary_search",
  "bsearch",
  "lowerbound",
  "upperbound",
  "heap",
  "priorityqueue",
  "priority_queue",
  "stack",
  "queue",
  "deque",
  "trie",
  "unionfind",
  "union_find",
  "monostack",
  "monotonic",
];

// Note: BRUTE_FORCE_MARKERS is reserved for future use; current detection
// uses the nestedLoopDepth computation in detectCodeFeatures().
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BRUTE_FORCE_MARKERS = [
  "for.*for.*for", // nested 3+
  "while.*for",
  "for.*while",
];

const TODO_MARKERS = /TODO|FIXME|XXX|HACK|\/\/\s*\?/;

const GENERIC_IDENTIFIERS = /^(a|b|c|i|j|k|n|m|x|y|z|tmp|temp|arr|nums|data|input|output|res|result|ans)$/i;

function detectCodeFeatures(code: string): {
  nestedLoopDepth: number;
  mentionsOptimalDS: string[];
  hasTodo: boolean;
  variableNameClarity: number;
} {
  if (!code) {
    return {
      nestedLoopDepth: 0,
      mentionsOptimalDS: [],
      hasTodo: false,
      variableNameClarity: 0,
    };
  }
  const lower = code.toLowerCase();
  const mentionsOptimalDS = OPTIMAL_DATASTRUCTS.filter((ds) => lower.includes(ds));
  // Also detect empty-dict/empty-map initialization patterns: `seen = {}`, `m = new Map()`.
  // Cheap heuristic: any line with `= {}` or `= new Map(` is a dict/hash signal.
  if (/=\s*\{\s*\}/.test(code) || /=\s*new\s+(Map|Set|HashMap|HashSet)\s*\(/.test(code)) {
    if (!mentionsOptimalDS.includes("hash_map")) mentionsOptimalDS.push("hash_map");
  }
  // Two-pointer pattern: pairs of left/right indices.
  if (/\b(left|right|l|r)\b.*\b(right|left|r|l)\b.*\bwhile\b/i.test(code) ||
      /\bwhile\s*\(.*<.*\+\+.*--/.test(code)) {
    if (!mentionsOptimalDS.includes("two_pointer")) mentionsOptimalDS.push("two_pointer");
  }
  const hasTodo = TODO_MARKERS.test(code);

  // Approximate max nested-loop depth by counting consecutive "for" / "while" tokens
  // within an indentation block. Cheap heuristic: count how many open braces occur
  // before a "for" or "while" on a deeper indentation level.
  const lines = code.split("\n");
  let maxDepth = 0;
  let currentDepth = 0;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("for ") || line.startsWith("while ") || /^\s*for\s*\(/.test(rawLine)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (line === "}" || line.endsWith("}")) {
      currentDepth = Math.max(0, currentDepth - 1);
    } else if (/^\s*for\s*\(/.test(rawLine)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  }
  // Indentation-based fallback for Python:
  if (maxDepth === 0) {
    let prevIndent = -1;
    let indentDepth = 0;
    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;
      const indent = rawLine.length - rawLine.trimStart().length;
      if (indent > prevIndent && (rawLine.trim().startsWith("for ") || rawLine.trim().startsWith("while "))) {
        indentDepth++;
        maxDepth = Math.max(maxDepth, indentDepth);
      } else if (indent < prevIndent) {
        indentDepth = Math.max(0, indentDepth - 1);
      }
      prevIndent = indent;
    }
  }

  // Variable name clarity: count identifiers that match meaningful patterns
  // vs. generic single-letter names.
  const identifiers = Array.from(
    new Set(
      Array.from(code.matchAll(/\b[a-zA-Z_][a-zA-Z0-9_]{1,40}\b/g))
        .map((m) => m[0])
        .filter((id) => !["if", "else", "for", "while", "return", "true", "false", "null", "None", "in", "function", "def", "class", "var", "let", "const", "new", "this", "self"].includes(id)),
    ),
  );
  if (identifiers.length === 0) {
    return { nestedLoopDepth: maxDepth, mentionsOptimalDS, hasTodo, variableNameClarity: 0.5 };
  }
  const genericCount = identifiers.filter((id) => GENERIC_IDENTIFIERS.test(id)).length;
  const clarity = 1 - genericCount / identifiers.length;
  return { nestedLoopDepth: maxDepth, mentionsOptimalDS, hasTodo, variableNameClarity: clarity };
}

function isOnlyBoilerplate(code: string): boolean {
  if (!code) return true;
  const stripped = code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"""/g, "")
    .replace(/'''/g, "")
    .trim();
  if (stripped.length < 30) return true;
  // Common boilerplate function signatures without bodies.
  if (/^(def\s+\w+\([^)]*\)\s*->\s*\w+\s*:\s*)?(pass|\.\.\.)$/i.test(stripped)) return true;
  return false;
}

function pickKind(
  le: LastExecution | undefined,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  features: ReturnType<typeof detectCodeFeatures>,
): { kind: CUDKind; signals: CUDSignal[]; failureMix: string[]; chatSilence: boolean } {
  const signals: CUDSignal[] = [];
  const failureMix: string[] = [];
  const userMessages = history.filter((m) => m.role === "user");
  const chatSilence = userMessages.length === 0;

  if (chatSilence) signals.push("chat_silence");

  if (!le || le.kind === "no_execution_yet") {
    signals.push("no_execution");
    return { kind: "no_execution_yet", signals, failureMix, chatSilence };
  }

  if (le.kind === "compile_error") {
    signals.push("compile_error");
    return { kind: "code_doesnt_run", signals, failureMix, chatSilence };
  }

  if (le.kind === "runtime_error") {
    signals.push("runtime_error");
    return { kind: "code_doesnt_run", signals, failureMix, chatSilence };
  }

  if (le.kind === "tle") {
    signals.push("tle");
    return { kind: "code_doesnt_run", signals, failureMix, chatSilence };
  }

  if (le.kind === "all_passed") {
    signals.push("all_passed");
    if (features.nestedLoopDepth >= 3) signals.push("nested_loop_brute_force");
    if (features.mentionsOptimalDS.length > 0) signals.push("uses_optimal_datastruct");
    const kind: CUDKind =
      features.mentionsOptimalDS.length > 0 && features.nestedLoopDepth < 3
        ? "understood_strong_logic"
        : features.nestedLoopDepth >= 3
          ? "understood_weak_logic"
          : "ambiguous";
    return { kind, signals, failureMix, chatSilence };
  }

  // failed_tests
  signals.push("partial_pass");
  for (const f of le.failures) {
    if (f.rootCauseHint) failureMix.push(f.rootCauseHint);
    if (f.rootCauseHint === "off_by_one") signals.push("off_by_one_pattern");
  }
  const dominatedByOffByOne = failureMix.length > 0 && failureMix.every((h) => h === "off_by_one");
  if (dominatedByOffByOne) {
    return { kind: "understood_weak_logic", signals, failureMix, chatSilence };
  }
  return { kind: "ambiguous", signals, failureMix, chatSilence };
}

function confidenceFor(
  kind: CUDKind,
  features: ReturnType<typeof detectCodeFeatures>,
  chatSilence: boolean,
): number {
  // Per JUDGE_INDEPENDENCE_INVARIANT, the floor is 0.5.
  // We assign high confidence only on unambiguous signals.
  switch (kind) {
    case "no_code":
    case "no_execution_yet":
    case "code_doesnt_run":
      return 0.95;
    case "understood_strong_logic":
      // High conf if DS markers + low loop depth.
      return features.mentionsOptimalDS.length > 0 && features.nestedLoopDepth < 2 ? 0.85 : 0.7;
    case "understood_weak_logic":
      return features.nestedLoopDepth >= 3 || features.mentionsOptimalDS.length > 0 ? 0.7 : 0.6;
    case "misunderstood":
      return 0.6;
    case "ambiguous":
    default:
      return Math.max(HEURISTIC_CONFIDENCE_FLOOR, chatSilence ? 0.55 : 0.5);
  }
}

function reasoningFor(
  kind: CUDKind,
  features: ReturnType<typeof detectCodeFeatures>,
  le: LastExecution | undefined,
  chatSilence: boolean,
): string {
  const parts: string[] = [];
  if (chatSilence) parts.push("user has not spoken to mentor yet");
  if (features.nestedLoopDepth >= 3) parts.push(`nested loop depth ${features.nestedLoopDepth}`);
  if (features.mentionsOptimalDS.length > 0) {
    parts.push(`uses ${features.mentionsOptimalDS.slice(0, 3).join(", ")}`);
  }
  if (le) parts.push(`exec=${le.kind}`);
  return `${kind} (${parts.join("; ")})`.slice(0, 200);
}

function evidenceFor(
  kind: CUDKind,
  features: ReturnType<typeof detectCodeFeatures>,
  le: LastExecution | undefined,
): string[] {
  const out: string[] = [];
  if (features.nestedLoopDepth > 0) out.push(`nested_loops=${features.nestedLoopDepth}`);
  if (features.mentionsOptimalDS.length > 0) out.push(`optimal_ds=${features.mentionsOptimalDS.join(",")}`);
  if (features.hasTodo) out.push("has_todo");
  if (le) {
    if (le.kind === "failed_tests") {
      out.push(`passed=${le.passed}/${le.total}`);
      for (const f of le.failures.slice(0, 2)) {
        out.push(`failure#${f.index + 1}=${f.failureType}${f.rootCauseHint ? `(${f.rootCauseHint})` : ""}`);
      }
    } else if (le.kind === "all_passed") {
      out.push(`passed=${le.passed}/${le.total}`);
    } else {
      out.push(`exec=${le.kind}`);
    }
  }
  return out;
}

export function runHeuristics(args: {
  userCode: string | undefined;
  lastExecution: LastExecution | undefined;
  history: Array<{ role: "user" | "assistant"; content: string }>;
}): CUDResult {
  const code = args.userCode ?? "";
  const le = args.lastExecution;
  const history = args.history;

  if (!code || code.trim().length === 0) {
    return {
      kind: "no_code",
      confidence: 0.95,
      reasoning: "user has not entered any code",
      evidence: ["empty_code"],
      signals: { signals: ["empty_code"], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
      source: "heuristic_only",
    };
  }
  if (isOnlyBoilerplate(code)) {
    return {
      kind: "no_code",
      confidence: 0.9,
      reasoning: "user code is only boilerplate",
      evidence: ["only_boilerplate"],
      signals: { signals: ["only_boilerplate"], nestedLoopDepth: 0, mentionsOptimalDS: [], variableNameClarity: 0, failureTypeMix: [] },
      source: "heuristic_only",
    };
  }

  const features = detectCodeFeatures(code);
  const { kind, signals, failureMix, chatSilence } = pickKind(le, history, features);
  const confidence = confidenceFor(kind, features, chatSilence);
  const reasoning = reasoningFor(kind, features, le, chatSilence);
  const evidence = evidenceFor(kind, features, le);

  const cudSignals: CUDSignals = {
    signals,
    nestedLoopDepth: features.nestedLoopDepth,
    mentionsOptimalDS: features.mentionsOptimalDS,
    variableNameClarity: features.variableNameClarity,
    failureTypeMix: failureMix,
  };

  return {
    kind,
    confidence,
    reasoning,
    evidence,
    signals: cudSignals,
    source: "heuristic_only",
  };
}
