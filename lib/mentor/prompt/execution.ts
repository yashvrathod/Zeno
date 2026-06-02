/**
 * LastExecution → prompt section renderer.
 *
 * Module boundary: this is the ONLY place in the mentor pipeline that turns
 * structured execution data into natural language. The shapeAnalyzer
 * produces facts, the failureClassifier produces evidence, the
 * buildLastExecution composes the union, and this file is the renderer.
 *
 * Hidden-input safety:
 *   - The shapeAnalyzer gates `small_literal` structurally for hidden inputs.
 *   - As defense in depth, this renderer NEVER emits the raw inputShape
 *     literal payload or the failure evidence as raw test data. We render
 *     the KIND of the input shape (int array, tree, unknown shape, ...)
 *     and the count/length/range. Evidence is taken verbatim from
 *     `failureClassifier`, which never invents.
 *   - The hidden-test regression test asserts that rendered output for a
 *     hidden failure contains no `[`, `{`, or the word "literal".
 *
 * Stale:
 *   - The orchestrator computes `isStale` authoritatively. The renderer
 *     reads the flag and prefixes the section with a stale note. No
 *     re-computation of the hash here.
 */

import type {
  FailureSummary,
  InputShape,
  LastExecution,
  RootCauseHint,
} from "../lastExecution";

const STALE_PREFIX = "Note: this execution context is from a previous code version. The student has since edited the code. The failure may no longer apply to the code they are currently looking at.";
const MAX_ERROR_CHARS = 600;

/**
 * Maps the enum-typed rootCauseHint to a short phrase.
 * Stable, never includes the input value. Used only as advisory metadata;
 * the system prompt explicitly tells the model to treat this as evidence,
 * not certainty.
 */
const ROOT_CAUSE_PHRASE: Record<RootCauseHint, string> = {
  off_by_one: "off-by-one",
  missing_return: "missing return",
  null_pointer: "null/None reference",
  incorrect_base_case: "incorrect base case",
  overflow: "potential overflow",
  state_leak: "state leak across calls",
};

function describeInputShape(shape: InputShape): string {
  switch (shape.kind) {
    case "int_array": {
      const parts: string[] = [`int array of ${shape.length} elements`];
      if (shape.sampledSorted === "asc") parts.push("sampled segments appear sorted");
      else if (shape.sampledSorted === "desc") parts.push("sampled segments appear descending");
      if (shape.sampledDuplicates) parts.push("duplicates detected in samples");
      if (shape.sampledValueRange) {
        const [lo, hi] = shape.sampledValueRange;
        parts.push(`range ${lo}..${hi}`);
      }
      return parts.join(", ");
    }
    case "string":
      return `text of ${shape.length} chars`;
    case "matrix":
      return `${shape.rows}x${shape.cols} matrix`;
    case "tree":
      return `tree with ${shape.nodes} nodes`;
    case "graph":
      return `graph with ${shape.nodes} nodes, ${shape.edges} edges`;
    case "list_of_pairs":
      return `list of ${shape.length} pairs`;
    case "small_literal":
      // For non-hidden inputs only. The shapeAnalyzer enforces this; we render
      // a length proxy here so the word "literal" never appears in the prompt.
      return `concrete value of ${shape.literal.length} chars`;
    case "unknown":
      return `opaque input of ${shape.length} bytes`;
  }
}

function renderFailureSummary(f: FailureSummary): string {
  const hintPart = f.rootCauseHint ? ` [hint: ${ROOT_CAUSE_PHRASE[f.rootCauseHint]}]` : "";
  const evidencePart = f.evidence.length > 0
    ? ` Evidence: ${f.evidence.join("; ")}.`
    : "";
  const shapePart = ` Input shape: ${describeInputShape(f.inputShape)}.`;
  return `Failure #${f.index + 1}: ${f.failureType}${hintPart}.${evidencePart}${shapePart} Expected: ${f.expectedShape}. Actual: ${f.actualShape}.`;
}

export type BuildExecutionContextOptions = {
  isStale: boolean;
  limitMs: number;
};

/**
 * Builds the EXECUTION CONTEXT section for the system prompt.
 *
 * Returns an empty string when there is no execution data to report
 * (lastExecution is undefined or no_execution_yet AND the page is not
 * asking about the current state).
 */
export function buildExecutionContext(
  le: LastExecution | undefined | null,
  opts: BuildExecutionContextOptions,
): string {
  if (!le || le.kind === "no_execution_yet") {
    return "";
  }

  const lines: string[] = [];
  if (opts.isStale) lines.push(STALE_PREFIX);
  lines.push("EXECUTION CONTEXT (from the most recent run):");

  switch (le.kind) {
    case "all_passed":
      lines.push(
        `All ${le.passed} of ${le.total} tests passed.` +
          (typeof le.runtimeMs === "number" ? ` Max runtime: ${le.runtimeMs}ms (limit: ${opts.limitMs}ms).` : ""),
      );
      break;

    case "tle":
      lines.push(
        `Time limit exceeded: ran ${le.runtimeMs}ms vs limit ${le.limitMs}ms in ${le.language}.`,
      );
      break;

    case "compile_error":
      lines.push(
        `Compile error in ${le.language}:` +
          (le.message ? ` ${le.message.slice(0, MAX_ERROR_CHARS)}` : ""),
      );
      break;

    case "runtime_error":
      lines.push(
        `Runtime error in ${le.language}:` +
          (le.message ? ` ${le.message.slice(0, MAX_ERROR_CHARS)}` : ""),
      );
      break;

    case "failed_tests":
      lines.push(`${le.passed} of ${le.total} tests passed. ${le.failures.length} failure(s) shown:`);
      for (const f of le.failures) {
        lines.push(renderFailureSummary(f));
      }
      if (le.omittedFailures > 0) {
        lines.push(`(+${le.omittedFailures} more failure(s) omitted for brevity)`);
      }
      break;
  }

  return lines.join("\n");
}
