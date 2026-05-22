import type { CodeSmell, ParsedCode } from '../types';
import type { SmellDetector } from './registry';

export const magicNumbersDetector: SmellDetector = {
  id: 'magic-numbers',
  detect(_parsed: ParsedCode, code: string): CodeSmell[] {
    const lines = code.split('\n');
    const magicLines: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.matchAll(/[^a-zA-Z_$](\d{3,})[^a-zA-Z_$\d]/g);
      for (const m of matches) magicLines.push(i + 1);
    }
    if (magicLines.length > 3) {
      return [{
        type: 'magic_number',
        description: `${magicLines.length} magic numbers detected (at lines: ${magicLines.slice(0, 5).join(', ')}${magicLines.length > 5 ? '...' : ''})`,
        severity: 'medium',
        location: { line: magicLines[0] },
        suggestion: 'Replace magic numbers with named constants. E.g., `const MAX_RETRIES = 100;`',
      }];
    }
    return [];
  },
};
