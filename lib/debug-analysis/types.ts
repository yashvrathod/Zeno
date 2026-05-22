export type BugType =
  | 'off_by_one'
  | 'index_out_of_bounds'
  | 'null_pointer'
  | 'infinite_loop'
  | 'wrong_termination'
  | 'state_not_reset'
  | 'edge_case_missed'
  | 'wrong_algorithm'
  | 'logic_error'
  | 'type_mismatch'
  | 'boundary_conditions'
  | 'initialization_error';

export interface CodeLocation {
  line: number;
  column?: number;
  function?: string;
  context?: string;
}

export interface GeneratedTestCase {
  input: string;
  expected: string;
  description: string;
  exposesBug: boolean;
  minimized: boolean;
}

export interface BugHypothesis {
  type: BugType;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: CodeLocation;
  description: string;
  explanation: string;
  evidence: string[];
  fix: string;
  relatedConcepts: string[];
  testCasesToVerify: GeneratedTestCase[];
}

export interface CodeSmell {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  location: CodeLocation;
  suggestion: string;
}

export interface VariableState {
  name: string;
  value: string;
  type: string;
  changed: boolean;
  previousValue?: string;
}

export interface CallFrame {
  function: string;
  line: number;
  variables: VariableState[];
  depth: number;
}

export interface MemoryObject {
  id: string;
  type: string;
  value: string;
  references: string[];
  referencedBy: string[];
}

export interface DataStructureState {
  type: 'array' | 'stack' | 'queue' | 'tree' | 'graph' | 'heap' | 'map';
  name: string;
  representation: string;
  changes: StateChange[];
}

export interface StateChange {
  step: number;
  description: string;
  before: string;
  after: string;
}

export interface ExecutionTrace {
  step: number;
  line: number;
  function?: string;
  variables: VariableState[];
  condition?: string;
  conditionResult?: boolean;
  action: string;
  callStack: CallFrame[];
  heap: MemoryObject[];
  dataStructures: DataStructureState[];
}

export interface FixSuggestion {
  description: string;
  code: string;
  explanation: string;
  sideEffects: string[];
  confidence: number;
}

export interface RootCauseAnalysis {
  primaryCause: string;
  contributingFactors: string[];
  whyItHappened: string;
  preventionStrategies: string[];
}

export interface DebugStep {
  action: string;
  description: string;
  expectedOutcome: string;
  difficulty: 'easy' | 'medium' | 'hard';
  nextStepDependsOn?: string;
}

export interface DebugAnalysis {
  bugHypotheses: BugHypothesis[];
  testCases: GeneratedTestCase[];
  codeSmells: CodeSmell[];
  executionTraces: ExecutionTrace[];
  fixSuggestions: FixSuggestion[];
  rootCause: RootCauseAnalysis | null;
  nextSteps: DebugStep[];
  complexity?: ComplexityInfo;
}

export interface FunctionInfo {
  name: string;
  line: number;
  lines: number;
  nestingDepth: number;
}

export interface LoopInfo {
  line: number;
  function?: string;
  type: 'for' | 'while';
  condition: string;
}

export interface VariableInfo {
  name: string;
  line: number;
  type?: string;
  initialized: boolean;
}

export interface ParsedCode {
  code: string;
  functions: FunctionInfo[];
  loops: LoopInfo[];
  variables: VariableInfo[];
}

export interface ComplexityInfo {
  bigO: string;
  explanation: string;
  improvement: string | null;
  loopDepth: number;
}
