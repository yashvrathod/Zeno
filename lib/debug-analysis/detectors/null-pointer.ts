import type { BugHypothesis, ParsedCode } from '../types';
import { codeSlice } from '../parser';
import type { BugDetector } from './registry';

export const nullPointerDetector: BugDetector = {
  id: 'null-pointer',
  detect(code: string, ast: any, _parsed: ParsedCode): BugHypothesis[] {
    const bugs: BugHypothesis[] = [];
    const nullAssignments = new Map<string, number>();
    const body = ast?.body || ast?.program?.body || [];
    walk(body);
    return bugs;

    function walk(nodes: any[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'VariableDeclaration') {
          for (const decl of node.declarations || []) {
            if (decl.init && (decl.init.type === 'Literal' && decl.init.value === null)) {
              if (decl.id?.name) nullAssignments.set(decl.id.name, decl.loc?.start?.line || 0);
            }
          }
        }
        if (node.type === 'AssignmentExpression') {
          if (node.right.type === 'Literal' && node.right.value === null && node.left?.name) {
            nullAssignments.set(node.left.name, node.loc?.start?.line || 0);
          }
        }
        if (node.type === 'MemberExpression' && node.object?.name && nullAssignments.has(node.object.name)) {
          bugs.push({
            type: 'null_pointer',
            confidence: 0.7,
            severity: 'high',
            location: { line: node.loc?.start?.line || 0, context: `\`${node.object.name}\` could be null` },
            description: `Property access on '${node.object.name}' which was set to null at line ${nullAssignments.get(node.object.name)}`,
            explanation: `'${node.object.name}' was assigned null at line ${nullAssignments.get(node.object.name)}, but accessed at line ${node.loc?.start?.line}. This will throw.`,
            evidence: [`null assignment at line ${nullAssignments.get(node.object.name)}`, `access at line ${node.loc?.start?.line}`],
            fix: `Add null check before accessing: \`if (${node.object.name}) { ... }\` or use optional chaining: \`${codeSlice(node).replace(/^(\w+)\./, '$1?.')}\``,
            relatedConcepts: ['null_pointer', 'defensive_programming'],
            testCasesToVerify: [],
          });
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
