export interface HeapObject {
  id: string;
  type: 'object' | 'array' | 'function' | 'string' | 'number';
  value: string;
  preview: string;
  size: number;
  references: string[];
  referencedBy: string[];
  isOrphaned: boolean;
  createdAt: number;
  color?: string;
}

export interface CallStackFrame {
  functionName: string;
  line: number;
  variables: Record<string, unknown>;
  depth: number;
  parameters: string[];
  returnValue?: unknown;
}

export interface Reference {
  from: string;
  to: string;
  kind: 'variable→heap' | 'heap→heap' | 'array→element' | 'function→closure';
  label?: string;
}

export interface EnhancedTraceEvent {
  step: number;
  line: number;
  type: string;
  callStack: CallStackFrame[];
  heap: HeapObject[];
  references: Reference[];
  variables: Record<string, unknown>;
  changedVars: string[];
  code: string;
  output?: string;
  action: string;
}

export interface EnhancedTraceResult {
  events: EnhancedTraceEvent[];
  finalOutput: string;
  error?: string;
  totalLines: number;
  heapHistory: HeapObject[][];
  callStackHistory: CallStackFrame[][];
}
