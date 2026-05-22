import type { CodeSmell, ParsedCode } from '../types';
import type { SmellDetector } from './registry';

export const todoCommentsDetector: SmellDetector = {
  id: 'todo-comments',
  detect(_parsed: ParsedCode, code: string): CodeSmell[] {
    const todoRegex = /\/\/\s*(TODO|FIXME|HACK|XXX)/gi;
    const todoLines: number[] = [];
    let match;
    while ((match = todoRegex.exec(code)) !== null) {
      const lineNum = code.slice(0, match.index).split('\n').length;
      todoLines.push(lineNum);
    }
    if (todoLines.length > 0) {
      return [{
        type: 'todo_comment',
        description: `Code contains ${todoLines.length} TODO/FIXME comment(s)`,
        severity: 'low',
        location: { line: todoLines[0] },
        suggestion: 'Address or remove TODO/FIXME comments before production.',
      }];
    }
    return [];
  },
};
