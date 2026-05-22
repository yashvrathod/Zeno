import type { RootCauseAnalysis, BugHypothesis, BugType, CodeSmell } from './types';

export function analyzeRootCause(hypotheses: BugHypothesis[], codeSmells: CodeSmell[]): RootCauseAnalysis | null {
  if (hypotheses.length === 0) return null;
  const primary = hypotheses[0];

  const reasons: Record<BugType, string> = {
    off_by_one: 'Array indices start at 0. Using `<= array.length` accesses one element past the last valid index. This is the most common DSA bug.',
    index_out_of_bounds: 'Not validating index calculations before array access. Always check that index is within [0, array.length).',
    null_pointer: 'Variables assigned null or coming from functions that can return null are accessed without checking.',
    infinite_loop: 'Loop exit condition never becomes false, or recursion lacks a base case that is reachable for all inputs.',
    wrong_termination: 'Stopping condition is incorrect for the problem — either too early or one step too late.',
    state_not_reset: 'State variables are declared outside the loop scope and carry values across iterations.',
    edge_case_missed: 'Special cases like empty input, single element, or all-identical elements are not handled.',
    wrong_algorithm: 'The chosen approach does not match the problem constraints or input characteristics.',
    logic_error: 'A flaw in the reasoning — the code runs but produces wrong results for some inputs.',
    type_mismatch: 'Using a value of one type where another type is expected (e.g., string vs number).',
    boundary_conditions: 'Not handling minimum, maximum, or edge values correctly (e.g., Number.MAX_SAFE_INTEGER).',
    initialization_error: 'Variables are used before they are given a value, leading to undefined behavior.',
  };

  return {
    primaryCause: primary.description,
    contributingFactors: codeSmells.map(s => s.description),
    whyItHappened: reasons[primary.type] || 'A bug was detected in the implementation logic.',
    preventionStrategies: generatePreventionStrategies(primary.type),
  };
}

function generatePreventionStrategies(type: BugType): string[] {
  const strategies: Record<BugType, string[]> = {
    off_by_one: ['Test with array size 0, 1, and 2 as edge cases', 'Use half-open intervals [start, end) consistently', 'Draw loop invariants before coding'],
    index_out_of_bounds: ['Always verify index < array.length before access', 'Test with empty arrays and arrays of size 1', 'Use for-of or .forEach() when index is not needed'],
    null_pointer: ['Initialize all variables when declared', 'Add null checks before property access with ?.', 'Use default parameter values where possible'],
    infinite_loop: ['Verify loop condition can eventually become false', 'Test with smallest possible input first', 'Add a loop iteration counter for debugging'],
    wrong_termination: ['Verify termination with concrete trace-through', 'Test boundary values: empty, size 1, size 2', 'Add assertions for loop invariants'],
    state_not_reset: ['Declare variables inside the loop when state should reset', 'Initialize accumulators/counters at loop entry', 'Test with multiple iterations to verify independence'],
    edge_case_missed: ['List all edge cases before writing code', 'Write tests for each edge case first (TDD)', 'Consider: empty, single, duplicates, extremes, negatives'],
    wrong_algorithm: ['Analyze constraints to pick the right approach', 'Validate algorithm matches problem type', 'Test with sample cases from the problem statement'],
    logic_error: ['Walk through code with concrete values on paper', 'Explain your logic to a rubber duck', 'Use console.log/print at each decision point'],
    type_mismatch: ['Use TypeScript for type safety', 'Add runtime type checks for external inputs', 'Use parseInt/Number() explicitly for string-to-number'],
    boundary_conditions: ['Test with Number.MAX_SAFE_INTEGER and Number.MIN_SAFE_INTEGER', 'Check for overflow in arithmetic operations', 'Verify loops handle maximum iterations gracefully'],
    initialization_error: ['Always initialize variables when declared', 'Use const by default, let only when reassignment needed', 'Enable strict mode / noImplicitAny in tsconfig'],
  };
  return strategies[type] || ['Add more test cases before deploying', 'Review the logic with a peer', 'Take a break and review with fresh eyes'];
}
