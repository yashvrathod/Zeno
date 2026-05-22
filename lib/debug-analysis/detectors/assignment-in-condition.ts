import type { BugHypothesis, ParsedCode } from '../types';
import type { BugDetector } from './registry';

export const assignmentInConditionDetector: BugDetector = {
  id: 'assignment-in-condition',
  detect(_code: string, ast: any, _parsed: ParsedCode): BugHypothesis[] {
    const bugs: BugHypothesis[] = [];
    const body = ast?.body || ast?.program?.body || [];
    walk(body);
    return bugs;

    function walk(nodes: any[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        let test: any = null;
        if (node.type === 'IfStatement' || node.type === 'WhileStatement') test = node.test;
        if (node.type === 'ForStatement' && node.test) test = node.test;
        if (test && test.type === 'AssignmentExpression') {
          const line = node.loc?.start?.line || 0;
          const assignedVar = test.left?.name || 'unknown';
          bugs.push({
            type: 'logic_error',
            confidence: 0.9,
            severity: 'high',
            location: { line, context: `\`${assignedVar} = ...\` used as condition` },
            description: `Assignment \`=\` used in condition at line ${line}. Did you mean \`===\`?`,
            explanation: `At line ${line}, an assignment expression \`${assignedVar} = ...\` is used where a comparison is expected. This always evaluates to the assigned value (truthy/falsy) instead of comparing.`,
            evidence: [`Assignment \`=\` at line ${line} in ${node.type} condition`],
            fix: `Change \`=\` to \`===\` or \`==\` at line ${line} to compare instead of assign.`,
            relatedConcepts: ['logic_error', 'comparison'],
            testCasesToVerify: [
              { input: 'any input where condition should be false', expected: 'Condition evaluates correctly', description: 'Test condition evaluates as expected', exposesBug: true, minimized: true },
            ],
          });
        }
        if (node.body && typeof node.body === 'object') {
          walk(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body]);
        }
        if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent]);
        if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate]);
        if (node.handler?.body) walk(node.handler.body.body || [node.handler.body]);
      }
    }
  },
};
