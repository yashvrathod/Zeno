export { analyzeCodeForDebugging } from '@/lib/debug-analysis';
export type {
  BugType, BugHypothesis, CodeLocation, GeneratedTestCase, CodeSmell,
  ExecutionTrace, VariableState, CallFrame, MemoryObject, DataStructureState,
  StateChange, DebugAnalysis, FixSuggestion, RootCauseAnalysis, DebugStep,
  ParsedCode, FunctionInfo, LoopInfo, VariableInfo, ComplexityInfo,
} from '@/lib/debug-analysis/types';
