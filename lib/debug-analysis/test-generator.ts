import type { GeneratedTestCase, LoopInfo } from './types';

export function generateTestCases(body: any[], code: string, loops: LoopInfo[]): GeneratedTestCase[] {
  const cases: GeneratedTestCase[] = [];
  const codeLower = code.toLowerCase();
  const hasArray = /\[.*\]/.test(code) || /array|list|nums|arr/.test(codeLower);
  const hasString = /string|str|s\b|char/.test(codeLower) || /"|'/.test(code);
  const hasNumber = /number|int|float|num|target/.test(codeLower);
  const hasBinarySearch = /left|right|mid/.test(codeLower) && /binary.*search|search.*binary/.test(codeLower);
  const hasTwoPointer = /\bleft\b.*\bright\b|\bright\b.*\bleft\b/.test(codeLower);
  const hasSlidingWindow = /window/.test(codeLower);

  if (hasArray) {
    cases.push({ input: '[]', expected: 'Appropriate default (0, null, [], etc.)', description: 'Empty array edge case', exposesBug: true, minimized: true });
    cases.push({ input: '[1]', expected: 'Single element result', description: 'Single element array', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 1]', expected: 'All-same elements result', description: 'Two identical elements', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 2, 3]', expected: 'Normal case result', description: 'Basic case with 3 elements', exposesBug: false, minimized: true });
    cases.push({ input: '[-1, 0, 1]', expected: 'Handles negatives and zero', description: 'Negative and zero values', exposesBug: true, minimized: true });
  }

  if (hasString) {
    cases.push({ input: '""', expected: 'Empty string result', description: 'Empty string edge case', exposesBug: true, minimized: true });
    cases.push({ input: '"a"', expected: 'Single character result', description: 'Single character string', exposesBug: true, minimized: true });
    cases.push({ input: '"aa"', expected: 'Two same characters', description: 'Repeated characters', exposesBug: true, minimized: true });
    cases.push({ input: '"abc"', expected: 'Normal string result', description: 'Basic string case', exposesBug: false, minimized: true });
  }

  if (hasNumber) {
    cases.push({ input: '0', expected: 'Zero case result', description: 'Zero value', exposesBug: true, minimized: true });
    cases.push({ input: '1', expected: 'Single positive result', description: 'Single positive', exposesBug: false, minimized: true });
    cases.push({ input: '-1', expected: 'Negative case result', description: 'Negative value', exposesBug: true, minimized: true });
  }

  if (hasBinarySearch || hasTwoPointer) {
    cases.push({ input: '[1, 2, 3, 4, 5], target=3', expected: 'Found at index 2', description: 'Binary search: target in middle', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 2, 3, 4, 5], target=1', expected: 'Found at index 0', description: 'Binary search: target at start', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 2, 3, 4, 5], target=5', expected: 'Found at index 4', description: 'Binary search: target at end', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 2, 3, 4, 5], target=0', expected: 'Not found (-1)', description: 'Binary search: target not present (below)', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 2, 3, 4, 5], target=6', expected: 'Not found (-1)', description: 'Binary search: target not present (above)', exposesBug: true, minimized: true });
  }

  if (hasTwoPointer && !hasBinarySearch) {
    cases.push({ input: '[1, 2, 3, 4, 5]', expected: 'Two pointer result', description: 'Sorted array case', exposesBug: true, minimized: true });
    cases.push({ input: '[5, 4, 3, 2, 1]', expected: 'Two pointer result', description: 'Reverse sorted array', exposesBug: true, minimized: true });
    cases.push({ input: '[1, 1, 1, 1]', expected: 'All same elements', description: 'All identical values', exposesBug: true, minimized: true });
  }

  if (hasSlidingWindow) {
    cases.push({ input: 's="abcabcbb"', expected: '3', description: 'Sliding window: longest unique substring', exposesBug: true, minimized: true });
    cases.push({ input: 's="bbbbb"', expected: '1', description: 'Sliding window: all same characters', exposesBug: true, minimized: true });
    cases.push({ input: 's=""', expected: '0', description: 'Sliding window: empty string', exposesBug: true, minimized: true });
  }

  if (loops.length > 0) {
    cases.push({ input: 'Edge case: input that triggers 0 loop iterations', expected: 'Should handle gracefully', description: 'Zero iteration test', exposesBug: true, minimized: true });
    cases.push({ input: 'Edge case: input that triggers 1 loop iteration', expected: 'Single iteration test', description: 'Single iteration test', exposesBug: true, minimized: true });
  }

  return cases;
}
