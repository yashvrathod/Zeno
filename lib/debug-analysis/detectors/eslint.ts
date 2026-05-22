import type { BugHypothesis, BugType, ParsedCode } from '../types';
import { getLinter } from '../parser';
import type { BugDetector } from './registry';

const RULE_MAPPINGS: Record<string, { type: BugType; severity: BugHypothesis['severity']; confidence: number }> = {
  'no-unused-vars': { type: 'initialization_error', severity: 'low', confidence: 0.6 },
  'no-undef': { type: 'null_pointer', severity: 'high', confidence: 0.85 },
  'no-constant-condition': { type: 'infinite_loop', severity: 'critical', confidence: 0.85 },
  'no-unreachable': { type: 'wrong_termination', severity: 'medium', confidence: 0.85 },
  'no-loop-func': { type: 'logic_error', severity: 'medium', confidence: 0.6 },
  'no-self-assign': { type: 'logic_error', severity: 'high', confidence: 0.85 },
  'no-self-compare': { type: 'logic_error', severity: 'high', confidence: 0.85 },
  'no-fallthrough': { type: 'logic_error', severity: 'medium', confidence: 0.6 },
  'no-eval': { type: 'logic_error', severity: 'critical', confidence: 0.9 },
  'no-implied-eval': { type: 'logic_error', severity: 'high', confidence: 0.85 },
  'radix': { type: 'logic_error', severity: 'medium', confidence: 0.6 },
  'require-await': { type: 'logic_error', severity: 'low', confidence: 0.5 },
  'no-await-in-loop': { type: 'logic_error', severity: 'medium', confidence: 0.6 },
  'no-constant-binary-expression': { type: 'logic_error', severity: 'high', confidence: 0.8 },
  'no-dupe-else-if': { type: 'logic_error', severity: 'high', confidence: 0.85 },
  'no-promise-executor-return': { type: 'logic_error', severity: 'medium', confidence: 0.7 },
  'no-constructor-return': { type: 'logic_error', severity: 'high', confidence: 0.75 },
  'prefer-promise-reject-errors': { type: 'type_mismatch', severity: 'medium', confidence: 0.6 },
  'no-return-await': { type: 'logic_error', severity: 'low', confidence: 0.5 },
  'no-param-reassign': { type: 'logic_error', severity: 'low', confidence: 0.5 },
  'no-sequences': { type: 'logic_error', severity: 'medium', confidence: 0.7 },
  'no-throw-literal': { type: 'logic_error', severity: 'medium', confidence: 0.7 },
  'no-useless-catch': { type: 'logic_error', severity: 'low', confidence: 0.5 },
  'no-useless-escape': { type: 'logic_error', severity: 'low', confidence: 0.4 },
  'prefer-const': { type: 'initialization_error', severity: 'low', confidence: 0.5 },
  'no-extra-boolean-cast': { type: 'logic_error', severity: 'low', confidence: 0.5 },
  'no-implicit-coercion': { type: 'logic_error', severity: 'medium', confidence: 0.6 },
  'no-var': { type: 'initialization_error', severity: 'low', confidence: 0.4 },
  'no-new-func': { type: 'logic_error', severity: 'medium', confidence: 0.6 },
};

export const eslintDetector: BugDetector = {
  id: 'eslint',
  detect(code: string, _ast: any, _parsed: ParsedCode): BugHypothesis[] {
    const hypotheses: BugHypothesis[] = [];
    const linter = getLinter();
    if (!linter) return hypotheses;

    const config: any = {
      parser: '@typescript-eslint/parser',
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      rules: Object.fromEntries(Object.keys(RULE_MAPPINGS).map(r => [r, 'error'])),
    };

    try {
      const plugin = require('@typescript-eslint/eslint-plugin');
      linter.defineRules(plugin.rules);
    } catch {}

    try {
      const messages = linter.verify(code, config, { filename: 'file.ts' });
      for (const msg of messages) {
        const mapping = RULE_MAPPINGS[msg.ruleId || ''];
        if (!mapping) continue;
        hypotheses.push({
          type: mapping.type,
          confidence: mapping.confidence,
          severity: msg.severity === 2 ? mapping.severity : 'low',
          location: { line: msg.line || 0, column: msg.column, context: msg.ruleId || undefined },
          description: msg.message || `ESLint: ${msg.ruleId}`,
          explanation: `ESLint rule ${msg.ruleId} triggered at line ${msg.line}.`,
          evidence: [msg.message || ''],
          fix: `Review line ${msg.line}: ${msg.message}`,
          relatedConcepts: [],
          testCasesToVerify: [],
        });
      }
    } catch {}
    return hypotheses;
  },
};
