/**
 * Public API of the LastExecution module.
 *
 * Consumers should import from "@/lib/mentor/lastExecution" rather than
 * reaching into individual files. This is the single place that lists
 * what is public.
 */

export {
  MAX_SHAPE_ANALYSIS_BYTES,
  SMALL_LITERAL_MAX_BYTES,
  SAMPLE_SIZE,
  MAX_TREE_NODES,
  MAX_FAILURES,
} from "./constants";

export type {
  InputShape,
  FailureType,
  RootCauseHint,
  FailureSummary,
  LastExecution,
} from "./types";

export { analyzeShape } from "./shapeAnalyzer";

export {
  classifyFailure,
  type ClassifierInput,
  type ClassifierResult,
} from "./failureClassifier";

export {
  buildLastExecution,
  type RawTestResult,
  type RawTestStatus,
  type BuildInput,
} from "./buildLastExecution";

export { resolveStale } from "./stale";

export {
  buildTestCaseView,
  type TestCaseView,
  type TestStatus,
  type RawTestCaseRecord,
} from "./testView";
