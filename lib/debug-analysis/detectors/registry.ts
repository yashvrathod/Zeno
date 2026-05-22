import type { BugHypothesis, ParsedCode } from '../types';

export interface BugDetector {
  id: string;
  detect(code: string, ast: any, parsed: ParsedCode): BugHypothesis[];
}
