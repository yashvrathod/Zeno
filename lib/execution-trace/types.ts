export type SupportedLanguage = "javascript" | "python" | "java" | "cpp" | "typescript";

export interface TestCase {
  input: string;
  expected: string;
  parsedInput: unknown[];
}

export interface TraceStep {
  stepIndex: number;
  line: number;
  column?: number;
  type: StepType;
  variables: Record<string, VariableSnapshot>;
  operation: string;
  code: string;
  dataStructures?: DataStructureSnapshot[];
  functionName?: string;
  depth: number;
}

export type StepType =
  | "assignment"
  | "loop_start"
  | "loop_end"
  | "loop_iteration"
  | "condition"
  | "function_call"
  | "function_return"
  | "array_mutation"
  | "pointer_move"
  | "swap"
  | "comparison"
  | "binary_operation"
  | "block_start"
  | "block_end";

export interface VariableSnapshot {
  name: string;
  type: VariableType;
  value: unknown;
  previousValue?: unknown;
  changed: boolean;
  scope: string;
}

export type VariableType =
  | "number" | "string" | "boolean" | "null" | "undefined"
  | "array" | "object" | "function" | "pointer" | "unknown";

export interface DataStructureSnapshot {
  type: "array" | "linked_list" | "tree" | "graph" | "matrix";
  name: string;
  state: unknown;
  highlightIndices?: number[];
  pointers?: ArrayPointer[];
}

export interface ArrayPointer {
  name: string;
  index: number;
  color: string;
}

export interface ExecutionTrace {
  steps: TraceStep[];
  summary: TraceSummary;
  metadata: TraceMetadata;
  divergence?: DivergencePoint | null;
}

export interface TraceSummary {
  totalSteps: number;
  operations: Record<StepType, number>;
  executionTimeMs: number;
  variableCount: number;
  finalVariables: Record<string, unknown>;
  error?: string | null;
}

export interface TraceMetadata {
  problemId?: string;
  problemSlug?: string;
  language: SupportedLanguage;
  testCase: TestCase;
  studentCode: string;
  expectedCode?: string;
}

export interface DivergencePoint {
  stepIndex: number;
  line: number;
  message: string;
  expectedState: string;
  actualState: string;
  severity: "info" | "warning" | "error";
  suggestedFix?: string;
}

export interface AlgorithmPattern {
  name: string;
  steps: TraceStep[];
  variables: string[];
  dataStructures: string[];
}

export interface StepExecutionRequest {
  code: string;
  language: SupportedLanguage;
  testCase: TestCase;
  startLine?: number;
  maxSteps?: number;
}

export interface StepExecutionResponse {
  trace: ExecutionTrace;
  remainingSteps: number;
  hasMore: boolean;
  error?: string;
}

export interface CompareRequest {
  studentCode: string;
  expectedCode: string;
  language: SupportedLanguage;
  testCases: TestCase[];
}

export interface CompareResponse {
  traces: Array<{
    testCase: TestCase;
    studentTrace: ExecutionTrace;
    expectedTrace: ExecutionTrace;
    divergences: DivergencePoint[];
    matchScore: number;
  }>;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    overallScore: number;
  };
}

export interface VisualizationData {
  type: VisualizationType;
  algorithm: string;
  steps: VisualizationStep[];
  metadata: {
    title: string;
    description: string;
    totalSteps: number;
  };
}

export type VisualizationType =
  | "array_traversal"
  | "two_pointer"
  | "sliding_window"
  | "binary_search"
  | "tree_traversal"
  | "graph_traversal"
  | "linked_list"
  | "sorting"
  | "dp_table"
  | "matrix"
  | "recursion_tree";

export interface VisualizationStep {
  stepIndex: number;
  label: string;
  description: string;
  data: ArrayState | TwoPointerState | TreeState | GraphState | MatrixState;
  highlights?: Record<string, number[]>;
  variables?: Record<string, unknown>;
}

export interface ArrayState {
  type: "array";
  elements: ArrayElement[];
  labels?: string[];
}

export interface ArrayElement {
  value: unknown;
  index: number;
  highlight?: "active" | "compared" | "swapped" | "pivot" | "sorted" | "pointer_a" | "pointer_b" | "none";
  label?: string;
}

export interface TwoPointerState {
  type: "two_pointer";
  array: ArrayElement[];
  left: { index: number; value: unknown };
  right: { index: number; value: unknown };
  mid?: { index: number; value: unknown };
  description: string;
}

export interface TreeState {
  type: "tree";
  nodes: TreeNode[];
  edges: TreeEdge[];
  currentNode?: string;
  visited: string[];
}

export interface TreeNode {
  id: string;
  value: unknown;
  x?: number;
  y?: number;
  highlight?: "current" | "visited" | "processing";
}

export interface TreeEdge {
  from: string;
  to: string;
  label?: string;
}

export interface GraphState {
  type: "graph";
  nodes: Array<{ id: string; value: unknown; highlight?: string }>;
  edges: Array<{ from: string; to: string; weight?: number; highlight?: string }>;
  visited: string[];
  current: string;
}

export interface MatrixState {
  type: "matrix";
  rows: Array<Array<ArrayElement>>;
  rowLabels?: string[];
  colLabels?: string[];
}

export interface FeedbackRecord {
  sessionId: string;
  userId: string;
  problemId: string;
  messageId: string;
  mentorResponse: string;
  studentReaction: "solved" | "progressed" | "stuck" | "gave_up" | "irrelevant";
  helpfulScore: 1 | 2 | 3 | 4 | 5;
  studentCodeBefore?: string;
  studentCodeAfter?: string;
  executionTraceAvailable: boolean;
  timestamp: number;
}
