export { generateTrace } from "./executor";
export type { ExecuteOptions } from "./executor";

export { compareTraces, findFirstDivergence, detectDivergencePatterns } from "./analysis";
export type { CompareResult, DetectionResult, DivergenceClass } from "./analysis";

export { buildTraceContext } from "./context/trace-context";
export type { TracePromptContext } from "./context/trace-context";

export type {
  ExecutionTrace, TraceStep, TraceSummary, TraceMetadata,
  DivergencePoint, VariableSnapshot, SupportedLanguage,
  TestCase, StepExecutionRequest, StepExecutionResponse,
  CompareRequest, CompareResponse, FeedbackRecord,
  VisualizationData, VisualizationStep, VisualizationType,
} from "./types";
