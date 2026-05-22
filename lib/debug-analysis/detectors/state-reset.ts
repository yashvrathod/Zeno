import type { BugHypothesis, ParsedCode } from '../types';
import type { BugDetector } from './registry';

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

export const stateResetDetector: BugDetector = {
  id: 'state-reset',
  detect(_code: string, ast: any, parsed: ParsedCode): BugHypothesis[] {
    const bugs: BugHypothesis[] = [];
    const body = ast?.body || ast?.program?.body || [];
    walk(body, new Set<string>());
    return bugs;

    function walk(nodes: any[], outerVars: Set<string>) {
      if (!nodes) return;
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        if ((node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement') && node.body) {
          const bodyStmts = node.body.body || (node.body.type === 'ExpressionStatement' ? [node.body] : []);
          const assignedInside = findModifiedVars(bodyStmts);
          const candidates = [...assignedInside].filter(v => outerVars.has(v));
          for (const v of candidates) {
            const varDecl = parsed.variables.find(vv => vv.name === v);
            if (varDecl && varDecl.line < (node.loc?.start?.line || 0)) {
              bugs.push({
                type: 'state_not_reset',
                confidence: 0.65,
                severity: 'medium',
                location: { line: node.loc?.start?.line || 0 },
                description: `Variable '${v}' declared outside loop but modified inside — may need reset each iteration`,
                explanation: `'${v}' is declared at line ${varDecl.line} (before the loop) and modified inside the loop. If the loop runs multiple times, state from the previous iteration carries over.`,
                evidence: [`'${v}' declared at line ${varDecl.line}, modified inside loop at line ${node.loc?.start?.line}`],
                fix: `Move \`let ${v}\` inside the loop (before usage) to reset each iteration, or manually reset at loop start.`,
                relatedConcepts: ['state_management', 'loop_structure'],
                testCasesToVerify: [],
              });
            }
          }
        }
        const newOuter = new Set(outerVars);
        if (node.type === 'VariableDeclaration') {
          for (const decl of node.declarations || []) {
            if (decl.id?.name) newOuter.add(decl.id.name);
          }
        }
        if (node.body && typeof node.body === 'object') {
          walk(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body], newOuter);
        }
        if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent], newOuter);
        if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate], newOuter);
      }
    }
  },
};
