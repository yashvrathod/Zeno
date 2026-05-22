import type { CodeSmell, ParsedCode } from '../types';

export interface SmellDetector {
  id: string;
  detect(parsed: ParsedCode, code: string): CodeSmell[];
}
