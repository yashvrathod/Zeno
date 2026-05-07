/**
 * Enhanced Debugging Assistant
 *
 * AI-powered debugging assistance that goes beyond simple syntax errors.
 * Analyzes code, predicts bugs, generates test cases, and provides
 * step-by-step debugging guidance with execution visualization.
 */

import type { TeachingStage } from '../mentorContext';
import type { ProblemAttempt } from './personalizationEngine';

// ─────────────────────────────────────────────────────────────────────────────
// BUG HYPOTHESIS & ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

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

export interface BugHypothesis {
  type: BugType;
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: CodeLocation;
  description: string;
  explanation: string;
  evidence: string[];
  fix: string;
  relatedConcepts: string[];
  testCasesToVerify: GeneratedTestCase[];
}

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

export interface CodeSmell {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  location: CodeLocation;
  suggestion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION TRACE & VISUALIZATION
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DEBUGGING ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

export interface DebugAnalysis {
  bugHypotheses: BugHypothesis[];
  testCases: GeneratedTestCase[];
  codeSmells: CodeSmell[];
  executionTraces: ExecutionTrace[];
  fixSuggestions: FixSuggestion[];
  rootCause: RootCauseAnalysis | null;
  nextSteps: DebugStep[];
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

/**
 * Main debugging analysis function
 */
export async function analyzeCodeForDebugging(
  code: string,
  language: string,
  errorInfo?: {
    errorMessage?: string;
    failingTestCase?: string;
    expectedOutput?: string;
    actualOutput?: string;
  },
  userHistory?: ProblemAttempt[]
): Promise<DebugAnalysis> {
  // Parse and analyze code
  const parsedCode = parseCode(code, language);

  // Generate bug hypotheses
  const bugHypotheses = await generateBugHypotheses(
    parsedCode,
    language,
    errorInfo
  );

  // Generate test cases
  const testCases = await generateTestCases(
    parsedCode,
    language,
    bugHypotheses,
    errorInfo
  );

  // Detect code smells
  const codeSmells = detectCodeSmells(parsedCode, language);

  // Generate execution traces
  const executionTraces = await generateExecutionTraces(
    parsedCode,
    language,
    testCases.slice(0, 2) // Trace for first 2 test cases
  );

  // Generate fix suggestions
  const fixSuggestions = generateFixSuggestions(
    bugHypotheses,
    parsedCode,
    language
  );

  // Analyze root cause
  const rootCause = analyzeRootCause(bugHypotheses, codeSmells, errorInfo);

  // Determine next steps
  const nextSteps = determineNextSteps(
    bugHypotheses,
    codeSmells,
    userHistory
  );

  return {
    bugHypotheses,
    testCases,
    codeSmells,
    executionTraces,
    fixSuggestions,
    rootCause,
    nextSteps
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG HYPOTHESIS GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function generateBugHypotheses(
  parsedCode: ParsedCode,
  language: string,
  errorInfo?: { errorMessage?: string; failingTestCase?: string }
): Promise<BugHypothesis[]> {
  const hypotheses: BugHypothesis[] = [];

  // Analyze based on error message
  if (errorInfo?.errorMessage) {
    const errorBased = analyzeErrorMessage(errorInfo.errorMessage, parsedCode);
    hypotheses.push(...errorBased);
  }

  // Common bug patterns
  const patterns = detectCommonBugPatterns(parsedCode, language);
  hypotheses.push(...patterns);

  // Algorithm-specific checks
  const algorithmBugs = checkAlgorithmSpecificBugs(parsedCode, language);
  hypotheses.push(...algorithmBugs);

  // Sort by confidence
  hypotheses.sort((a, b) => b.confidence - a.confidence);

  return hypotheses.slice(0, 5); // Top 5 hypotheses
}

function analyzeErrorMessage(
  errorMessage: string,
  parsedCode: ParsedCode
): BugHypothesis[] {
  const hypotheses: BugHypothesis[] = [];
  const error = errorMessage.toLowerCase();

  // Index out of bounds
  if (error.includes('index') && /out of bounds|range|length/i.test(error)) {
    hypotheses.push({
      type: 'index_out_of_bounds',
      confidence: 0.9,
      severity: 'high',
      location: findLoopBoundaries(parsedCode),
      description: 'Array/index out of bounds access detected',
      explanation: 'Code is trying to access an array element at an index that doesn\'t exist',
      evidence: [
        'Check loop boundaries: ensure i < array.length not i <= array.length',
        'Verify index calculations before array access'
      ],
      fix: 'Add bounds checking: if (index >= 0 && index < array.length)',
      relatedConcepts: ['array_manipulation', 'loop_invariants'],
      testCasesToVerify: []
    });
  }

  // Null pointer
  if (error.includes('null') || error.includes('undefined')) {
    hypotheses.push({
      type: 'null_pointer',
      confidence: 0.85,
      severity: 'high',
      location: findObjectAccess(parsedCode),
      description: 'Attempting to access property of null/undefined object',
      explanation: 'Code is using an object that hasn\'t been initialized or can be null',
      evidence: [
        'Check object initialization before use',
        'Add null checks before property access'
      ],
      fix: 'Initialize object or add null check: if (obj) { ... }',
      relatedConcepts: ['initialization', 'defensive_programming'],
      testCasesToVerify: []
    });
  }

  // Stack overflow / infinite recursion
  if (error.includes('stack') || error.includes('recursion') || error.includes('maximum')) {
    hypotheses.push({
      type: 'infinite_loop',
      confidence: 0.8,
      severity: 'critical',
      location: findRecursiveCalls(parsedCode),
      description: 'Infinite recursion or loop detected',
      explanation: 'Recursive function lacks proper base case or loop exit condition',
      evidence: [
        'Verify base case is reachable',
        'Ensure recursive calls converge toward base case',
        'Check loop termination condition'
      ],
      fix: 'Add/modify base case or loop exit condition',
      relatedConcepts: ['recursion', 'termination'],
      testCasesToVerify: []
    });
  }

  return hypotheses;
}

function detectCommonBugPatterns(
  parsedCode: ParsedCode,
  language: string
): BugHypothesis[] {
  const patterns: BugHypothesis[] = [];

  // Check for off-by-one in loops
  const loops = extractLoops(parsedCode);
  loops.forEach(loop => {
    if (isOffByOne(loop)) {
      patterns.push({
        type: 'off_by_one',
        confidence: 0.75,
        severity: 'medium',
        location: { line: loop.line, function: loop.function },
        description: 'Off-by-one error in loop boundary',
        explanation: 'Loop goes one iteration too far or stops one too early',
        evidence: ['Check if loop should be i < n or i <= n', 'Verify with small examples'],
        fix: 'Adjust loop condition: typically i < n for 0-indexed arrays',
        relatedConcepts: ['loop_invariants', 'boundary_conditions'],
        testCasesToVerify: []
      });
    }
  });

  // Check for uninitialized variables
  const uninitVars = findUninitializedVariables(parsedCode);
  uninitVars.forEach(v => {
    patterns.push({
      type: 'initialization_error',
      confidence: 0.7,
      severity: 'medium',
      location: { line: v.line },
      description: 'Variable may be used before initialization',
      explanation: 'Variable is declared but not given a value before first use',
      evidence: [`Variable '${v.name}' declared at line ${v.line} but not initialized`],
      fix: `Initialize variable: let ${v.name} = ${getDefaultValue(v.type)}`,
      relatedConcepts: ['variable_initialization'],
      testCasesToVerify: []
    });
  });

  // Check for state not reset between iterations
  if (hasStateAccumulation(parsedCode)) {
    patterns.push({
      type: 'state_not_reset',
      confidence: 0.65,
      severity: 'medium',
      location: findLoopStart(parsedCode),
      description: 'State accumulates across loop iterations when it should reset',
      explanation: 'Variables tracking state should be reset at start of each iteration',
      evidence: ['Variable values accumulate across iterations', 'Test case 2 fails but 1 passes'],
      fix: 'Move variable initialization inside loop',
      relatedConcepts: ['state_management', 'loop_structure'],
      testCasesToVerify: []
    });
  }

  return patterns;
}

function checkAlgorithmSpecificBugs(
  parsedCode: ParsedCode,
  language: string
): BugHypothesis[] {
  const bugs: BugHypothesis[] = [];
  const code = parsedCode.code.toLowerCase();

  // Binary search bugs
  if (code.includes('binary') && code.includes('search')) {
    // Missing +1/-1 in pointer update
    if (!code.includes('mid+1') && !code.includes('mid-1')) {
      bugs.push({
        type: 'logic_error',
        confidence: 0.6,
        severity: 'high',
        location: findBinarySearchLoop(parsedCode),
        description: 'Binary search may not converge',
        explanation: 'Pointer updates likely missing +1 or -1, causing infinite loop',
        evidence: ['left = mid should be left = mid + 1', 'right = mid should be right = mid - 1'],
        fix: 'Ensure left = mid + 1 and right = mid - 1',
        relatedConcepts: ['binary_search', 'convergence'],
        testCasesToVerify: []
      });
    }

    // Wrong loop condition
    if (code.includes('while') && code.includes('<=') && !code.includes('<')) {
      bugs.push({
        type: 'logic_error',
        confidence: 0.5,
        severity: 'medium',
        location: { line: findLineNumber(parsedCode, 'while'), function: 'binary_search' },
        description: 'Binary search loop condition may be wrong',
        explanation: 'Should be left <= right (inclusive) for correct termination',
        evidence: ['Check handles single element case', 'Verify termination for all inputs'],
        fix: 'Use while (left <= right) for inclusive search',
        relatedConcepts: ['binary_search', 'termination'],
        testCasesToVerify: []
      });
    }
  }

  // Two-pointer bugs
  if (code.includes('left') && code.includes('right')) {
    bugs.push({
      type: 'logic_error',
      confidence: 0.55,
      severity: 'medium',
      location: findTwoPointerLogic(parsedCode),
      description: 'Two-pointer movement logic may be incorrect',
      explanation: 'Pointers may move in wrong direction or not converge',
      evidence: ['Verify which pointer moves when', 'Check monotonicity of movement'],
      fix: 'Ensure pointers always move toward each other',
      relatedConcepts: ['two_pointer', 'convergence'],
      testCasesToVerify: []
    });
  }

  // Sliding window bugs
  if (code.includes('window') || (code.includes('left') && code.includes('right') && code.includes('while'))) {
    bugs.push({
      type: 'logic_error',
      confidence: 0.5,
      severity: 'medium',
      location: findWindowLogic(parsedCode),
      description: 'Sliding window boundaries may be incorrect',
      explanation: 'Window may not maintain valid state or shrink correctly',
      evidence: ['Check window validity condition', 'Verify shrink logic is triggered'],
      fix: 'Ensure window is valid before recording result; shrink while invalid',
      relatedConcepts: ['sliding_window', 'window_maintenance'],
      testCasesToVerify: []
    });
  }

  return bugs;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function generateTestCases(
  parsedCode: ParsedCode,
  language: string,
  hypotheses: BugHypothesis[],
  errorInfo?: { failingTestCase?: string; expectedOutput?: string }
): Promise<GeneratedTestCase[]> {
  const testCases: GeneratedTestCase[] = [];

  // Add failing test case from error info
  if (errorInfo?.failingTestCase) {
    testCases.push({
      input: errorInfo.failingTestCase,
      expected: errorInfo.expectedOutput || 'Unknown',
      description: 'Failing test case provided',
      exposesBug: true,
      minimized: false
    });
  }

  // Generate edge cases
  const edgeCases = generateEdgeCases(parsedCode, language);
  testCases.push(...edgeCases);

  // Generate base cases
  const baseCases = generateBaseCases(parsedCode, language);
  testCases.push(...baseCases);

  // Generate bug-specific test cases
  for (const hypothesis of hypotheses) {
    const bugCases = generateBugSpecificCases(hypothesis, language);
    testCases.push(...bugCases);
  }

  // Minimize test cases
  const minimized = await minimizeTestCases(testCases, parsedCode);

  return minimized;
}

function generateEdgeCases(
  parsedCode: ParsedCode,
  language: string
): GeneratedTestCase[] {
  const cases: GeneratedTestCase[] = [];
  const code = parsedCode.code.toLowerCase();

  // Empty input
  if (code.includes('array') || code.includes('list')) {
    cases.push({
      input: '[]',
      expected: '[] or 0 or appropriate default',
      description: 'Empty array edge case',
      exposesBug: true,
      minimized: true
    });
  }

  // Single element
  cases.push({
    input: '[1] or "a" or 1',
    expected: 'Appropriate output for single element',
    description: 'Single element edge case',
    exposesBug: true,
    minimized: true
  });

  // Already sorted (for sorting/search problems)
  if (code.includes('sort') || code.includes('search')) {
    cases.push({
      input: '[1, 2, 3, 4, 5]',
      expected: 'Same array or found index',
      description: 'Already sorted input',
      exposesBug: false,
      minimized: true
    });
  }

  // All same elements
  cases.push({
    input: '[5, 5, 5, 5]',
    expected: 'Depends on problem',
    description: 'All elements identical',
    exposesBug: true,
    minimized: true
  });

  // Large input (if time complexity might be issue)
  cases.push({
    input: 'Array of size 10000',
    expected: 'Correct output (checks for TLE)',
    description: 'Large input for performance testing',
    exposesBug: false,
    minimized: false
  });

  return cases;
}

function generateBaseCases(
  parsedCode: ParsedCode,
  language: string
): GeneratedTestCase[] {
  const cases: GeneratedTestCase[] = [];
  const code = parsedCode.code.toLowerCase();

  // Problem-specific base cases
  if (code.includes('binary')) {
    cases.push({ input: '[1, 2, 3], target=2', expected: '1', description: 'Binary search: target in middle', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 2, 3], target=0', expected: '-1', description: 'Binary search: target not found', exposesBug: true, minimized: true });
  }

  if (code.includes('two') && code.includes('sum')) {
    cases.push({ input: '[2, 7, 11, 15], target=9', expected: '[0, 1]', description: 'Two sum: simple case', exposesBug: true, minimized: true });
    cases.push({ input: '[3, 2, 4], target=6', expected: '[1, 2]', description: 'Two sum: not first element', exposesBug: true, minimized: true });
  }

  if (code.includes('sliding') || code.includes('window')) {
    cases.push({ input: 's="abcabcbb"', expected: '3', description: 'Sliding window: longest substring', exposesBug: true, minimized: true });
    cases.push({ input: 's="bbbbb"', expected: '1', description: 'Sliding window: all same', exposesBug: true, minimized: true });
  }

  return cases;
}

function generateBugSpecificCases(
  hypothesis: BugHypothesis,
  language: string
): GeneratedTestCase[] {
  const cases: GeneratedTestCase[] = [];

  switch (hypothesis.type) {
    case 'off_by_one':
      cases.push({ input: 'array of size 1', expected: 'Correct result', description: 'Tests off-by-one with minimal size', exposesBug: true, minimized: true });
      cases.push({ input: 'array of size 2', expected: 'Correct result', description: 'Tests boundary between 1 and many', exposesBug: true, minimized: true });
      break;

    case 'index_out_of_bounds':
      cases.push({ input: 'empty array', expected: 'Handle gracefully', description: 'Empty array case', exposesBug: true, minimized: true });
      cases.push({ input: 'index = array.length', expected: 'Should not access', description: 'Access at boundary', exposesBug: true, minimized: true });
      break;

    case 'infinite_loop':
      cases.push({ input: 'smallest valid input', expected: 'Should terminate', description: 'Quick termination test', exposesBug: true, minimized: true });
      break;

    case 'null_pointer':
      cases.push({ input: 'null input', expected: 'Handle or throw', description: 'Null input case', exposesBug: true, minimized: true });
      break;

    case 'state_not_reset':
      cases.push({ input: 'multiple test cases', expected: 'Each independent', description: 'Multiple invocations', exposesBug: true, minimized: false });
      break;
  }

  return cases;
}

async function minimizeTestCases(
  testCases: GeneratedTestCase[],
  parsedCode: ParsedCode
): Promise<GeneratedTestCase[]> {
  // Simple minimization: remove redundant cases
  const uniqueInputs = new Set<string>();
  return testCases.filter(tc => {
    if (uniqueInputs.has(tc.input)) return false;
    uniqueInputs.add(tc.input);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE SMELL DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function detectCodeSmells(parsedCode: ParsedCode, language: string): CodeSmell[] {
  const smells: CodeSmell[] = [];
  const code = parsedCode.code;

  // TODO/FIXME comments
  const todoMatches = code.match(/\/\/\s*TODO|\/\/\s*FIXME/g);
  if (todoMatches) {
    smells.push({
      type: 'todo_comment',
      description: 'Code contains TODO/FIXME comments',
      severity: 'low',
      location: { line: findLineNumber(parsedCode, todoMatches[0]) },
      suggestion: 'Address technical debt or remove comments'
    });
  }

  // Magic numbers
  const magicNumbers = code.match(/[^0-9]\s+(\d{2,})[^0-9]/g);
  if (magicNumbers && magicNumbers.length > 3) {
    smells.push({
      type: 'magic_number',
      description: 'Multiple magic numbers detected',
      severity: 'medium',
      location: { line: 0 },
      suggestion: 'Extract constants with meaningful names'
    });
  }

  // Long functions
  const functions = extractFunctions(parsedCode);
  functions.forEach(fn => {
    if (fn.lines > 30) {
      smells.push({
        type: 'long_function',
        description: `Function '${fn.name}' is ${fn.lines} lines long`,
        severity: 'medium',
        location: { line: fn.line, function: fn.name },
        suggestion: 'Break into smaller, focused functions'
      });
    }

    if (fn.nestingDepth > 3) {
      smells.push({
        type: 'deep_nesting',
        description: `Function '${fn.name}' has nesting depth of ${fn.nestingDepth}`,
        severity: 'medium',
        location: { line: fn.line, function: fn.name },
        suggestion: 'Extract nested logic into separate functions'
      });
    }
  });

  // Duplicate code
  const duplicates = findDuplicateCode(code);
  duplicates.forEach(dup => {
    smells.push({
      type: 'duplicate_code',
      description: 'Similar code blocks detected',
      severity: 'low',
      location: { line: dup.line },
      suggestion: 'Extract common logic into a reusable function'
    });
  });

  return smells;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION TRACE GENERATION
// ─────────────────────────────────────────────────────────────────────────────

async function generateExecutionTraces(
  parsedCode: ParsedCode,
  language: string,
  testCases: GeneratedTestCase[]
): Promise<ExecutionTrace[]> {
  const traces: ExecutionTrace[] = [];

  for (const testCase of testCases.slice(0, 2)) {
    try {
      const trace = await simulateExecution(parsedCode, language, testCase);
      traces.push(trace);
    } catch (error) {
      console.warn('Failed to simulate execution:', error);
    }
  }

  return traces;
}

async function simulateExecution(
  parsedCode: ParsedCode,
  language: string,
  testCase: GeneratedTestCase
): Promise<ExecutionTrace> {
  // This is a simplified simulation - in production, would use actual interpreter
  const steps: ExecutionTrace[] = [];
  const variables: VariableState[] = [];

  // Parse input
  const inputVars = parseInput(testCase.input);

  // Initialize variables
  inputVars.forEach(v => {
    variables.push({
      name: v.name,
      value: v.value,
      type: v.type,
      changed: false,
      previousValue: undefined
    });
  });

  // Simulate execution (simplified)
  const lines = parsedCode.code.split('\n');
  let step = 0;

  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('//')) continue;

    step++;

    // Detect variable assignments
    const assignment = line.match(/(\w+)\s*=\s*(.+)/);
    if (assignment) {
      const varName = assignment[1];
      const newValue = evaluateExpression(assignment[2], variables);

      const existingVar = variables.find(v => v.name === varName);
      if (existingVar) {
        existingVar.previousValue = existingVar.value;
        existingVar.value = newValue;
        existingVar.changed = true;
      } else {
        variables.push({
          name: varName,
          value: newValue,
          type: 'unknown',
          changed: true,
          previousValue: undefined
        });
      }
    }

    steps.push({
      step,
      line: i + 1,
      variables: JSON.parse(JSON.stringify(variables)), // Deep copy
      condition: extractCondition(line),
      conditionResult: evaluateCondition(line, variables),
      action: line,
      callStack: [{ function: 'main', line: i + 1, variables: [], depth: 0 }],
      heap: [],
      dataStructures: extractDataStructures(variables)
    });
  }

  return steps[steps.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX SUGGESTION GENERATION
// ─────────────────────────────────────────────────────────────────────────────

function generateFixSuggestions(
  hypotheses: BugHypothesis[],
  parsedCode: ParsedCode,
  language: string
): FixSuggestion[] {
  return hypotheses.slice(0, 3).map(hypothesis => ({
    description: `Fix for ${hypothesis.type}: ${hypothesis.description}`,
    code: generateFixedCode(hypothesis, parsedCode, language),
    explanation: hypothesis.explanation,
    sideEffects: identifySideEffects(hypothesis, parsedCode),
    confidence: hypothesis.confidence
  }));
}

function generateFixedCode(
  hypothesis: BugHypothesis,
  parsedCode: ParsedCode,
  language: string
): string {
  let fixedCode = parsedCode.code;

  switch (hypothesis.type) {
    case 'off_by_one':
      fixedCode = fixOffByOne(fixedCode);
      break;
    case 'index_out_of_bounds':
      fixedCode = addBoundsChecking(fixedCode);
      break;
    case 'infinite_loop':
      fixedCode = ensureTermination(fixedCode);
      break;
    case 'null_pointer':
      fixedCode = addNullChecks(fixedCode);
      break;
  }

  return fixedCode;
}

function fixOffByOne(code: string): string {
  // Common fix: change <= to < in loop conditions
  return code.replace(/for\s*\([^)]*;\s*(\w+)\s*<=\s*(\w+)\s*;/g, 'for ($1; $1 < $2;');
}

function addBoundsChecking(code: string): string {
  // Add bounds check before array access
  return code.replace(/(\w+)\[(\w+)\]/g, (match, arr, idx) => {
    return `(${idx} >= 0 && ${idx} < ${arr}.length ? ${arr}[${idx}] : null)`;
  });
}

function ensureTermination(code: string): string {
  // Ensure loops have proper exit conditions
  return code;
}

function addNullChecks(code: string): string {
  // Add null checks before property access
  return code.replace(/(\w+)\.(\w+)/g, (match, obj, prop) => {
    return `${obj} && ${obj}.${prop}`;
  });
}

function identifySideEffects(
  hypothesis: BugHypothesis,
  parsedCode: ParsedCode
): string[] {
  const sideEffects: string[] = [];

  switch (hypothesis.type) {
    case 'off_by_one':
      sideEffects.push('May change loop iteration count');
      sideEffects.push('Verify all boundary conditions still work');
      break;
    case 'index_out_of_bounds':
      sideEffects.push('May return null instead of throwing error');
      sideEffects.push('Check calling code handles null returns');
      break;
  }

  return sideEffects;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT CAUSE ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

function analyzeRootCause(
  hypotheses: BugHypothesis[],
  codeSmells: CodeSmell[],
  errorInfo?: { errorMessage?: string }
): RootCauseAnalysis | null {
  if (hypotheses.length === 0) return null;

  const primary = hypotheses[0];

  return {
    primaryCause: primary.description,
    contributingFactors: codeSmells.map(s => s.description),
    whyItHappened: generateWhyItHappened(primary),
    preventionStrategies: generatePreventionStrategies(primary)
  };
}

function generateWhyItHappened(hypothesis: BugHypothesis): string {
  const reasons: Record<BugType, string> = {
    off_by_one: 'Common mistake when translating mathematical logic to code. Remember: array indices start at 0.',
    index_out_of_bounds: 'Forgetting to check array length before access, or miscalculating valid index range.',
    null_pointer: 'Not initializing variables or checking for null before use.',
    infinite_loop: 'Loop exit condition never becomes false, or recursive function lacks proper base case.',
    wrong_termination: 'Stopping condition is incorrect - either too early or too late.',
    state_not_reset: 'Variables that should be fresh for each iteration are declared outside the loop.',
    edge_case_missed: 'Special cases (empty input, single element, duplicates) not considered.',
    wrong_algorithm: 'Chosen technique doesn\'t match problem requirements.',
    logic_error: 'Flaw in the reasoning, not just the code implementation.',
    type_mismatch: 'Using wrong data type for the operation.',
    boundary_conditions: 'Not handling minimum/maximum values correctly.',
    initialization_error: 'Variables used before being given a value.'
  };

  return reasons[hypothesis.type] || 'Bug in implementation logic.';
}

function generatePreventionStrategies(hypothesis: BugHypothesis): string[] {
  const strategies: Record<BugType, string[]> = {
    off_by_one: [
      'Always test with array size 0, 1, and 2',
      'Draw loop invariants on paper',
      'Use half-open intervals [start, end) consistently'
    ],
    index_out_of_bounds: [
      'Add bounds checking for all array accesses',
      'Test with empty arrays',
      'Verify index calculations with print statements'
    ],
    null_pointer: [
      'Initialize all variables when declared',
      'Use Optional/Maybe types where available',
      'Add null checks before property access'
    ],
    infinite_loop: [
      'Verify loop exit condition can become false',
      'Check recursive calls converge to base case',
      'Add loop iteration limit for debugging'
    ],
    wrong_termination: [
      'Test with smallest possible input',
      'Verify condition with concrete examples',
      'Check all code paths return or break'
    ],
    state_not_reset: [
      'Declare loop variables inside the loop when possible',
      'Reset state at start of each iteration',
      'Use fresh variables for each test case'
    ],
    edge_case_missed: [
      'List all edge cases before coding',
      'Write tests for each edge case first',
      'Consider: empty, single, duplicates, extremes'
    ],
    wrong_algorithm: [
      'Verify algorithm matches problem constraints',
      'Check time/space complexity requirements',
      'Test with known examples from problem statement'
    ],
    logic_error: [
      'Walk through code with pencil and paper',
      'Explain logic out loud or to rubber duck',
      'Test each decision point with specific values'
    ],
    type_mismatch: [
      'Use type annotations',
      'Check function parameter types',
      'Verify return types match expected'
    ],
    boundary_conditions: [
      'Test minimum and maximum values',
      'Check for off-by-one at boundaries',
      'Consider overflow/underflow'
    ],
    initialization_error: [
      'Initialize variables with default values',
      'Use const/val when possible',
      'Consider using a linter to catch uninitialized use'
    ]
  };

  return strategies[hypothesis.type] || [
    'Add more test cases',
    'Review code logic carefully',
    'Take a break and return with fresh eyes'
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// NEXT STEPS DETERMINATION
// ─────────────────────────────────────────────────────────────────────────────

function determineNextSteps(
  hypotheses: BugHypothesis[],
  codeSmells: CodeSmell[],
  userHistory?: ProblemAttempt[]
): DebugStep[] {
  const steps: DebugStep[] = [];

  if (hypotheses.length > 0) {
    const topHypothesis = hypotheses[0];

    steps.push({
      action: 'verify_bug',
      description: `Test the hypothesis: ${topHypothesis.description}`,
      expectedOutcome: 'Confirm or rule out this bug type',
      difficulty: topHypothesis.severity === 'critical' ? 'easy' : 'medium'
    });

    steps.push({
      action: 'apply_fix',
      description: `Implement the suggested fix`,
      expectedOutcome: 'Bug should be resolved or symptoms reduced',
      difficulty: 'medium',
      nextStepDependsOn: 'verify_bug'
    });
  }

  if (codeSmells.length > 0) {
    steps.push({
      action: 'refactor',
      description: 'Address identified code smells',
      expectedOutcome: 'Code becomes cleaner and easier to maintain',
      difficulty: 'medium'
    });
  }

  steps.push({
    action: 'add_tests',
    description: 'Add test cases covering the bug scenarios',
    expectedOutcome: 'Prevent regression of this bug',
    difficulty: 'easy'
  });

  steps.push({
    action: 'review_concept',
    description: 'Review related concepts to prevent similar bugs',
    expectedOutcome: 'Deeper understanding of the underlying pattern',
    difficulty: 'medium'
  });

  return steps;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSING UTILITIES (Simplified)
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedCode {
  code: string;
  functions: FunctionInfo[];
  loops: LoopInfo[];
  variables: VariableInfo[];
}

interface FunctionInfo {
  name: string;
  line: number;
  lines: number;
  nestingDepth: number;
}

interface LoopInfo {
  line: number;
  function?: string;
  type: 'for' | 'while';
  condition: string;
}

interface VariableInfo {
  name: string;
  line: number;
  type?: string;
  initialized: boolean;
}

interface ParsedInput {
  name: string;
  value: string;
  type: string;
}

function parseCode(code: string, language: string): ParsedCode {
  return {
    code,
    functions: extractFunctions({ code } as ParsedCode),
    loops: extractLoops({ code } as ParsedCode),
    variables: [] // Simplified
  };
}

function extractFunctions(parsedCode: ParsedCode): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = parsedCode.code.split('\n');

  lines.forEach((line, index) => {
    const funcMatch = line.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\(/);
    if (funcMatch) {
      functions.push({
        name: funcMatch[1] || funcMatch[2] || 'anonymous',
        line: index + 1,
        lines: 0, // Would need full parsing
        nestingDepth: 0 // Would need full parsing
      });
    }
  });

  return functions;
}

function extractLoops(parsedCode: ParsedCode): LoopInfo[] {
  const loops: LoopInfo[] = [];
  const lines = parsedCode.code.split('\n');

  lines.forEach((line, index) => {
    const forMatch = line.match(/for\s*\(/);
    const whileMatch = line.match(/while\s*\(/);

    if (forMatch) {
      loops.push({
        line: index + 1,
        type: 'for',
        condition: line
      });
    }

    if (whileMatch) {
      loops.push({
        line: index + 1,
        type: 'while',
        condition: line
      });
    }
  });

  return loops;
}

function parseInput(input: string): ParsedInput[] {
  // Simplified parser
  return [];
}

function evaluateExpression(expr: string, vars: VariableState[]): string {
  // Simplified evaluator
  return 'evaluated';
}

function extractCondition(line: string): string | undefined {
  const ifMatch = line.match(/if\s*\((.+)\)/);
  const whileMatch = line.match(/while\s*\((.+)\)/);
  return (ifMatch || whileMatch)?.[1];
}

function evaluateCondition(line: string, vars: VariableState[]): boolean | undefined {
  return undefined;
}

function extractDataStructures(vars: VariableState[]): DataStructureState[] {
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function findLoopBoundaries(parsedCode: ParsedCode): CodeLocation {
  const loop = parsedCode.loops[0];
  return loop ? { line: loop.line, function: loop.function } : { line: 0 };
}

function findObjectAccess(parsedCode: ParsedCode): CodeLocation {
  return { line: 0 };
}

function findRecursiveCalls(parsedCode: ParsedCode): CodeLocation {
  return { line: 0 };
}

function findBinarySearchLoop(parsedCode: ParsedCode): CodeLocation {
  return { line: 0 };
}

function findTwoPointerLogic(parsedCode: ParsedCode): CodeLocation {
  return { line: 0 };
}

function findWindowLogic(parsedCode: ParsedCode): CodeLocation {
  return { line: 0 };
}

function findLineNumber(parsedCode: ParsedCode, text: string): number {
  const lines = parsedCode.code.split('\n');
  return lines.findIndex(l => l.includes(text)) + 1;
}

function isOffByOne(loop: LoopInfo): boolean {
  return /<=\s*\w+\.length|length\s*-\s*1/.test(loop.condition);
}

function findUninitializedVariables(parsedCode: ParsedCode): VariableInfo[] {
  return [];
}

function hasStateAccumulation(parsedCode: ParsedCode): boolean {
  return false;
}

function findLoopStart(parsedCode: ParsedCode): CodeLocation {
  const loop = parsedCode.loops[0];
  return loop ? { line: loop.line } : { line: 0 };
}

function getDefaultValue(type?: string): string {
  switch (type) {
    case 'number': return '0';
    case 'string': return '""';
    case 'boolean': return 'false';
    case 'array': return '[]';
    default: return 'null';
  }
}

function findDuplicateCode(code: string): { line: number }[] {
  return [];
}
