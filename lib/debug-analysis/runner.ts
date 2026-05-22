import type { DebugAnalysis, BugHypothesis } from './types';
import type { ProblemAttempt } from '../mentor/personalizationEngine';
import { parseCode, getAST } from './parser';

import { eslintDetector } from './detectors/eslint';
import { offByOneDetector } from './detectors/off-by-one';
import { infiniteLoopDetector } from './detectors/infinite-loop';
import { stateResetDetector } from './detectors/state-reset';
import { nullPointerDetector } from './detectors/null-pointer';
import { assignmentInConditionDetector } from './detectors/assignment-in-condition';
import { missingReturnDetector } from './detectors/missing-return';
import { arrayMutationDetector } from './detectors/array-mutation';
import type { BugDetector } from './detectors/registry';

import { functionSizeDetector } from './smells/function-size';
import { magicNumbersDetector } from './smells/magic-numbers';
import { todoCommentsDetector } from './smells/todo-comments';
import { duplicateCodeDetector } from './smells/duplicate-code';
import type { SmellDetector } from './smells/registry';

import { generateTestCases } from './test-generator';
import { generateFixSuggestions } from './fix-generator';
import { analyzeRootCause } from './root-cause';
import { determineNextSteps } from './next-steps';
import { generateExecutionTraces } from './trace-generator';
import { analyzeComplexity } from './complexity';

const DETECTORS: BugDetector[] = [
  eslintDetector,
  offByOneDetector,
  infiniteLoopDetector,
  stateResetDetector,
  nullPointerDetector,
  assignmentInConditionDetector,
  missingReturnDetector,
  arrayMutationDetector,
];

const SMELL_DETECTORS: SmellDetector[] = [
  functionSizeDetector,
  magicNumbersDetector,
  todoCommentsDetector,
  duplicateCodeDetector,
];

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
  const parsed = parseCode(code, language);
  const ast = getAST(code, language);
  const body = ast?.body || ast?.program?.body || [];

  const allBugs: BugHypothesis[] = [];
  for (const detector of DETECTORS) {
    try {
      const results = detector.detect(code, ast, parsed);
      allBugs.push(...results);
    } catch (e) {
      console.warn(`[debug] Detector ${detector.id} failed:`, e);
    }
  }

  allBugs.sort((a, b) => b.confidence - a.confidence);
  const seen = new Set<string>();
  const uniqueBugs = allBugs.filter(b => {
    const key = `${b.type}:${b.location.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const allSmells = SMELL_DETECTORS.flatMap(d => d.detect(parsed, code));
  const complexity = analyzeComplexity(code, ast);

  return {
    bugHypotheses: uniqueBugs,
    testCases: generateTestCases(body, code, parsed.loops),
    codeSmells: allSmells,
    executionTraces: generateExecutionTraces(body, parsed),
    fixSuggestions: generateFixSuggestions(uniqueBugs, code),
    rootCause: analyzeRootCause(uniqueBugs, allSmells),
    nextSteps: determineNextSteps(uniqueBugs, allSmells),
    complexity: complexity,
  };
}
