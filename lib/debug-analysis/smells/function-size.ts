import type { CodeSmell, ParsedCode } from '../types';
import type { SmellDetector } from './registry';

export const functionSizeDetector: SmellDetector = {
  id: 'function-size',
  detect(parsed: ParsedCode): CodeSmell[] {
    const smells: CodeSmell[] = [];
    for (const fn of parsed.functions) {
      if (fn.lines > 30) {
        smells.push({
          type: 'long_function',
          description: `Function '${fn.name}' is ${fn.lines} lines long (recommended: <30)`,
          severity: 'medium',
          location: { line: fn.line, function: fn.name },
          suggestion: `Break '${fn.name}' into smaller, focused functions. Consider extracting logic at lines ${fn.line}-${fn.line + fn.lines}.`,
        });
      }
      if (fn.nestingDepth > 3) {
        smells.push({
          type: 'deep_nesting',
          description: `Function '${fn.name}' has nesting depth of ${fn.nestingDepth}`,
          severity: 'medium',
          location: { line: fn.line, function: fn.name },
          suggestion: 'Extract deeply nested blocks into separate functions to improve readability.',
        });
      }
    }
    return smells;
  },
};
