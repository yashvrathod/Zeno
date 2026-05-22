import type { CodeSmell, ParsedCode } from '../types';
import type { SmellDetector } from './registry';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `h${hash}`;
}

export const duplicateCodeDetector: SmellDetector = {
  id: 'duplicate-code',
  detect(_parsed: ParsedCode, code: string): CodeSmell[] {
    const lines = code.split('\n');
    const blockHashes = new Map<string, number[]>();
    const funcBlocks: string[] = [];
    let currentBlock = '';
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('import') || trimmed.startsWith('export')) {
        if (currentBlock.length > 50) funcBlocks.push(currentBlock);
        currentBlock = '';
        continue;
      }
      currentBlock += trimmed + '\n';
    }
    if (currentBlock.length > 50) funcBlocks.push(currentBlock);

    for (let i = 0; i < funcBlocks.length; i++) {
      const hash = simpleHash(funcBlocks[i]);
      if (!blockHashes.has(hash)) blockHashes.set(hash, [i]);
      else blockHashes.get(hash)!.push(i);
    }

    for (const [, indices] of blockHashes) {
      if (indices.length > 1) {
        return [{
          type: 'duplicate_code',
          description: `Similar code block found at multiple locations (blocks ${indices.map(i => `#${i + 1}`).join(', ')})`,
          severity: 'low',
          location: { line: indices[0] * 5 + 1 },
          suggestion: 'Extract the common code into a reusable function.',
        }];
      }
    }
    return [];
  },
};
