import type { BugHypothesis, ParsedCode } from '../types';
import { codeSlice } from '../parser';
import type { BugDetector } from './registry';

export const offByOneDetector: BugDetector = {
  id: 'off-by-one',
  detect(_code: string, ast: any, _parsed: ParsedCode): BugHypothesis[] {
    const bugs: BugHypothesis[] = [];
    const body = ast?.body || ast?.program?.body || [];
    walk(body);
    return bugs;

    function walk(nodes: any[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'ForStatement' && node.test) {
          const test = node.test;
          if (test.type === 'BinaryExpression') {
            const condStr = codeSlice(test);
            if (test.operator === '<=' && test.right?.type === 'MemberExpression' && test.right.property?.name === 'length') {
              bugs.push({
                type: 'off_by_one',
                confidence: 0.8,
                severity: 'medium',
                location: { line: node.loc?.start?.line || 0, context: condStr },
                description: 'Potential off-by-one error in loop boundary',
                explanation: `Loop condition \`${condStr}\` uses <= with .length. This will iterate one extra time when index equals length, causing an out-of-bounds access.`,
                evidence: [`Loop condition: ${condStr}`],
                fix: `Change \`${condStr}\` to use \`<\` instead of \`<=\`: ${condStr.replace(/<=/, '<')}`,
                relatedConcepts: ['off_by_one', 'loop_invariants'],
                testCasesToVerify: [
                  { input: 'empty array', expected: 'Handle without accessing out of bounds', description: 'Edge case: empty array', exposesBug: true, minimized: true },
                  { input: 'array of size 1', expected: 'Only access index 0', description: 'Edge case: single element', exposesBug: true, minimized: true },
                ],
              });
            }
          }
        }
        if (node.body && typeof node.body === 'object') {
          walk(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body]);
        }
        if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent]);
        if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate]);
      }
    }
  },
};
