/**
 * Product constants for the LastExecution module.
 *
 * Locked, not configurable, not env-driven. Change once here if telemetry
 * proves a value is wrong; never override per-call.
 */

/**
 * Hard cap on input size for shape analysis.
 *
 * Above this threshold, shapeAnalyzer returns `{ kind: "unknown", length }`
 * immediately without invoking JSON.parse. The goal is useful instructional
 * context, not perfect classification of arbitrarily large inputs — marginal
 * value drops while latency and resource costs continue to climb.
 */
export const MAX_SHAPE_ANALYSIS_BYTES = 256 * 1024;

/**
 * Threshold below which a parsed input is sent verbatim to the model as
 * `small_literal` rather than as an inferred shape. Tiny inputs are cheap
 * to send in full and more useful to the AI as concrete examples than as
 * shape descriptions.
 *
 * Hidden inputs are structurally incapable of producing `small_literal` —
 * see shapeAnalyzer's small_literal gate.
 */
export const SMALL_LITERAL_MAX_BYTES = 200;

/**
 * Per-call sample size used by the int_array shape detector. Three samples
 * of this size total ~3000 elements, regardless of input length.
 */
export const SAMPLE_SIZE = 1000;

/**
 * Defensive cap on tree node counting to prevent runaway recursion /
 * iteration on pathological inputs (e.g., 100k-deep left-skewed trees).
 * Backlog: replace with iterative traversal that emits a "truncated" flag
 * once we have real-world pathological inputs to calibrate against.
 */
export const MAX_TREE_NODES = 1_000_000;

/**
 * Maximum number of failures surfaced in the `failed_tests` variant.
 * Omitted failures are counted in the `omittedFailures` field.
 */
export const MAX_FAILURES = 3;
