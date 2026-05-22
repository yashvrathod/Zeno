import type { DebugStep, BugHypothesis, CodeSmell } from './types';

export function determineNextSteps(hypotheses: BugHypothesis[], codeSmells: CodeSmell[]): DebugStep[] {
  const steps: DebugStep[] = [];

  if (hypotheses.length > 0) {
    const top = hypotheses[0];
    steps.push({
      action: 'verify_bug',
      description: `Test hypothesis: ${top.description} (line ${top.location.line})`,
      expectedOutcome: 'Confirm or rule out this bug type with specific test cases',
      difficulty: 'easy',
    });
    steps.push({
      action: 'apply_fix',
      description: `Apply the suggested fix for ${top.type.replace(/_/g, ' ')}`,
      expectedOutcome: 'Bug should be resolved or symptoms reduced',
      difficulty: 'medium',
      nextStepDependsOn: 'verify_bug',
    });
  }

  if (codeSmells.length > 0) {
    steps.push({
      action: 'refactor',
      description: `Address ${codeSmells.length} code smell(s) — start with: ${codeSmells[0].description}`,
      expectedOutcome: 'Code becomes cleaner and easier to maintain',
      difficulty: 'medium',
    });
  }

  steps.push({
    action: 'add_tests',
    description: 'Add generated test cases covering edge cases and bug scenarios',
    expectedOutcome: 'Prevent regression and validate fixes',
    difficulty: 'easy',
  });

  steps.push({
    action: 'review_concept',
    description: 'Review related DSA concepts to prevent similar bugs',
    expectedOutcome: 'Deeper understanding of the underlying pattern',
    difficulty: 'medium',
  });

  return steps;
}
