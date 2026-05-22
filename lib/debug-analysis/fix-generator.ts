import type { FixSuggestion, BugHypothesis } from './types';

export function generateFixSuggestions(hypotheses: BugHypothesis[], code: string): FixSuggestion[] {
  return hypotheses.slice(0, 3).map(h => {
    const lines = code.split('\n');
    let fixedCode = code;

    switch (h.type) {
      case 'off_by_one': {
        const lineIdx = h.location.line - 1;
        if (lines[lineIdx]) {
          const original = lines[lineIdx];
          const fixed = original.replace(/<=/, '<').replace(/>=/, '>');
          lines[lineIdx] = fixed;
          fixedCode = lines.join('\n');
        }
        break;
      }
      case 'null_pointer': {
        fixedCode = code.replace(/(\w+)\.(\w+)/g, (match, obj, prop) => `${obj}?.${prop}`);
        break;
      }
      case 'infinite_loop': {
        const lineIdx = h.location.line - 1;
        if (lines[lineIdx] && lines[lineIdx].includes('while(true)')) {
          lines[lineIdx] = '// TODO: Add proper loop condition\n' + lines[lineIdx];
          fixedCode = lines.join('\n');
        }
        break;
      }
      case 'initialization_error': {
        fixedCode = code.replace(/(let|var|const)\s+(\w+)\s*;/g, (match, kw, name) => `${kw} ${name} = undefined;`);
        break;
      }
    }

    const sideEffects: string[] = [];
    if (h.type === 'off_by_one') sideEffects.push('May change loop iteration count by 1');
    if (h.type === 'null_pointer') sideEffects.push('Optional chaining returns undefined instead of throwing');
    if (h.type === 'state_not_reset') sideEffects.push('Variable scope changes — verify other references still work');

    return {
      description: `Fix for ${h.type}: ${h.description}`,
      code: fixedCode,
      explanation: h.explanation,
      sideEffects,
      confidence: h.confidence,
    };
  });
}
