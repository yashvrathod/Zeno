import type { BugHypothesis, ParsedCode } from '../types';
import { codeSlice } from '../parser';
import type { BugDetector } from './registry';

function extractVarNames(node: any): string[] {
  const names: string[] = [];
  function walk(n: any) {
    if (!n || typeof n !== 'object') return;
    if (n.type === 'Identifier') { names.push(n.name); return; }
    for (const key of Object.keys(n)) {
      if (key === 'parent') continue;
      if (Array.isArray(n[key])) n[key].forEach(walk);
      else if (typeof n[key] === 'object' && n[key] !== null) walk(n[key]);
    }
  }
  walk(node);
  return names;
}

function findModifiedVars(stmts: any[]): Set<string> {
  const vars = new Set<string>();
  function walk(nodes: any[]) {
    if (!nodes) return;
    for (const n of nodes) {
      if (!n || typeof n !== 'object') continue;
      if (n.type === 'AssignmentExpression' && n.left?.type === 'Identifier') vars.add(n.left.name);
      if (n.type === 'UpdateExpression' && n.argument?.type === 'Identifier') vars.add(n.argument.name);
      if (n.type === 'VariableDeclaration') {
        for (const decl of n.declarations || []) { if (decl.id?.name) vars.add(decl.id.name); }
      }
      if (n.body && typeof n.body === 'object') {
        walk(Array.isArray(n.body) ? n.body : n.body.body ? n.body.body : [n.body]);
      }
      if (n.consequent) walk(Array.isArray(n.consequent) ? n.consequent : [n.consequent]);
      if (n.alternate) walk(Array.isArray(n.alternate) ? n.alternate : [n.alternate]);
    }
  }
  walk(stmts);
  return vars;
}

export const infiniteLoopDetector: BugDetector = {
  id: 'infinite-loop',
  detect(code: string, ast: any, _parsed: ParsedCode): BugHypothesis[] {
    const bugs: BugHypothesis[] = [];
    const body = ast?.body || ast?.program?.body || [];
    walk(body);
    return bugs;

    function walk(nodes: any[]) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'WhileStatement' && node.test) {
          if (node.test.type === 'Literal' && node.test.value === true) {
            const bodyCode = node.body?.body ? node.body.body.map((s: any) => codeSlice(s)).join('\n') : '';
            const hasBreak = /break\s*;/.test(bodyCode);
            if (!hasBreak) {
              bugs.push({
                type: 'infinite_loop',
                confidence: 0.9,
                severity: 'critical',
                location: { line: node.loc?.start?.line || 0, context: 'while(true)' },
                description: 'Infinite loop detected: while(true) without break',
                explanation: 'The loop uses `while(true)` with no `break` statement inside the body. This will run forever.',
                evidence: [`while(true) at line ${node.loc?.start?.line}`],
                fix: 'Add a break condition inside the loop body, or change the while condition.',
                relatedConcepts: ['infinite_loop', 'termination'],
                testCasesToVerify: [
                  { input: 'any input', expected: 'Execution terminates', description: 'Quick termination test', exposesBug: true, minimized: true },
                ],
              });
            }
          }
          const conditionVars = extractVarNames(node.test);
          const bodyStmts = node.body?.body || [];
          const modifiedVars = findModifiedVars(bodyStmts);
          const unmodified = conditionVars.filter(v => !modifiedVars.has(v) && v !== 'true' && v !== 'false');
          if (unmodified.length > 0 && conditionVars.length > 0) {
            bugs.push({
              type: 'infinite_loop',
              confidence: 0.7,
              severity: 'high',
              location: { line: node.loc?.start?.line || 0 },
              description: `Variables [${unmodified.join(', ')}] in loop condition are never modified inside the loop`,
              explanation: `The loop condition depends on variables that never change inside the body. The loop may never terminate.`,
              evidence: [`Unmodified condition variables: ${unmodified.join(', ')}`],
              fix: `Ensure ${unmodified.join(', ')} is updated inside the loop body to eventually make the condition false.`,
              relatedConcepts: ['infinite_loop', 'loop_invariants'],
              testCasesToVerify: [],
            });
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
