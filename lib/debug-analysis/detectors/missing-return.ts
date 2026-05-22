import type { BugHypothesis, ParsedCode } from '../types';
import { codeSlice } from '../parser';
import type { BugDetector } from './registry';

export const missingReturnDetector: BugDetector = {
  id: 'missing-return',
  detect(_code: string, ast: any, _parsed: ParsedCode): BugHypothesis[] {
    const bugs: BugHypothesis[] = [];
    const body = ast?.body || ast?.program?.body || [];
    walk(body);
    return bugs;

    function walk(nodes: any[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'ArrowFunctionExpression' && node.body?.type === 'BlockStatement') {
          const stmts = node.body.body || [];
          if (stmts.length > 0) {
            const last = stmts[stmts.length - 1];
            const hasReturn = stmts.some((s: any) => s.type === 'ReturnStatement');
            const hasExpressionBody = stmts.some((s: any) =>
              s.type === 'ExpressionStatement' && s.expression?.type !== 'CallExpression' &&
              !(s.expression?.type === 'AssignmentExpression')
            );
            if (!hasReturn && hasExpressionBody && !node.async) {
              bugs.push({
                type: 'logic_error',
                confidence: 0.7,
                severity: 'medium',
                location: { line: node.loc?.start?.line || 0 },
                description: 'Arrow function with block body may be missing a return statement',
                explanation: `Arrow function at line ${node.loc?.start?.line || 0} uses \`{ }\` block body with expression statements but no \`return\`. The function will return \`undefined\` instead of the computed value.`,
                evidence: [`Block body without return at line ${node.loc?.start?.line || 0}`],
                fix: `Add \`return\` before the last expression, or change \`{ }\` to a concise body (remove braces and \`return\`).`,
                relatedConcepts: ['logic_error', 'arrow_functions'],
                testCasesToVerify: [
                  { input: 'any input', expected: 'Correct computed value instead of undefined', description: 'Verify function returns the expected value', exposesBug: true, minimized: true },
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
