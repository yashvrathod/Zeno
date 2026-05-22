import type { ExecutionTrace, VariableState, ParsedCode } from './types';
import { codeSlice } from './parser';

export function generateExecutionTraces(body: any[], parsedCode: ParsedCode): ExecutionTrace[] {
  const traces: ExecutionTrace[] = [];
  let step = 0;
  walk(body, 0);
  return traces;

  function walk(nodes: any[], depth: number): void {
    if (!nodes) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') return;
      step++;
      const vars: VariableState[] = parsedCode.variables.filter(v => v.line <= (node.loc?.start?.line || 0)).map(v => ({
        name: v.name,
        value: v.initialized ? '(initialized)' : '(uninitialized)',
        type: v.type || 'unknown',
        changed: false,
      }));
      const action = codeSlice(node).split('\n')[0].slice(0, 80);
      let condition: string | undefined;
      if (node.test) condition = codeSlice(node.test);
      else if (node.type === 'IfStatement' && node.test) condition = codeSlice(node.test);

      traces.push({
        step, line: node.loc?.start?.line || 0,
        function: parsedCode.functions.find(f => node.loc?.start?.line && node.loc.start.line >= f.line && node.loc.start.line <= f.line + f.lines)?.name,
        variables: vars,
        condition, action,
        callStack: [{ function: 'main', line: node.loc?.start?.line || 0, variables: [], depth }],
        heap: [], dataStructures: [],
      });

      if (node.body && typeof node.body === 'object') {
        walk(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body], depth + (node.type === 'IfStatement' || node.type === 'ForStatement' || node.type === 'WhileStatement' ? 1 : 0));
      }
      if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent], depth + 1);
      if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate], depth + 1);
    }
  }
}
