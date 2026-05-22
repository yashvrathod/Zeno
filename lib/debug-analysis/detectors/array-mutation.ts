import type { BugHypothesis, ParsedCode } from '../types';
import { codeSlice } from '../parser';
import type { BugDetector } from './registry';

export const arrayMutationDetector: BugDetector = {
  id: 'array-mutation',
  detect(_code: string, ast: any, _parsed: ParsedCode): BugHypothesis[] {
    const bugs: BugHypothesis[] = [];
    const body = ast?.body || ast?.program?.body || [];

    function getArrayName(node: any): string | null {
      if (!node) return null;
      if (node.type === 'Identifier') return node.name;
      return null;
    }

    function findLoopArray(nodes: any[]): string | null {
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if ((node.type === 'ForStatement' || node.type === 'WhileStatement') && node.test) {
          const testVars: string[] = [];
          function collectIdentifiers(n: any) {
            if (!n || typeof n !== 'object') return;
            if (n.type === 'Identifier') testVars.push(n.name);
            for (const key of Object.keys(n)) {
              if (key === 'parent') continue;
              if (Array.isArray(n[key])) n[key].forEach(collectIdentifiers);
              else if (typeof n[key] === 'object' && n[key] !== null) collectIdentifiers(n[key]);
            }
          }
          collectIdentifiers(node.test);
          const arrayVar = testVars.find(v => v.endsWith('s') || v.endsWith('Arr') || v.endsWith('ay') || v === 'nums' || v === 'arr');
          if (arrayVar) return arrayVar;
        }
        if (node.body && typeof node.body === 'object') {
          const result = findLoopArray(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body]);
          if (result) return result;
        }
      }
      return null;
    }

    const mutationMethods = new Set(['splice', 'push', 'pop', 'shift', 'unshift', 'sort', 'reverse']);
    const loopArray = findLoopArray(body);
    if (!loopArray) return bugs;

    function checkForMutation(nodes: any[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
          const objName = getArrayName(node.callee.object);
          const methodName = node.callee.property?.name;
          if (objName === loopArray && methodName && mutationMethods.has(methodName)) {
            bugs.push({
              type: 'logic_error',
              confidence: 0.75,
              severity: 'high',
              location: { line: node.loc?.start?.line || 0, context: `${loopArray}.${methodName}()` },
              description: `Array '${loopArray}' is mutated with .${methodName}() during iteration`,
              explanation: `Using .${methodName}() on '${loopArray}' inside a loop that reads its length or elements can cause skipped elements, incorrect indices, or infinite loops. When you remove elements, indices shift.`,
              evidence: [`${loopArray}.${methodName}() at line ${node.loc?.start?.line || 0} during iteration`],
              fix: `Instead of mutating '${loopArray}' during iteration, build a new array or iterate in reverse: \`for (let i = ${loopArray}.length - 1; i >= 0; i--)\``,
              relatedConcepts: ['array_manipulation', 'loop_structure'],
              testCasesToVerify: [
                { input: '[1, 2, 3, 4, 5]', expected: 'All elements processed correctly', description: 'Array mutation during iteration test', exposesBug: true, minimized: true },
              ],
            });
          }
        }
        if (node.body && typeof node.body === 'object') {
          checkForMutation(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body]);
        }
        if (node.consequent) checkForMutation(Array.isArray(node.consequent) ? node.consequent : [node.consequent]);
        if (node.alternate) checkForMutation(Array.isArray(node.alternate) ? node.alternate : [node.alternate]);
      }
    }
    checkForMutation(body);
    return bugs;
  },
};
