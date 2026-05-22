import type { ComplexityInfo } from './types';

export function analyzeComplexity(code: string, ast: any): ComplexityInfo {
  const body = ast?.body || ast?.program?.body || [];
  const loopDepths: number[] = [];

  // Primary: AST-based loop detection
  function walk(nodes: any[], depth: number) {
    if (!nodes) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      if (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
        loopDepths.push(depth + 1);
        const bodyContent = node.body ? (Array.isArray(node.body) ? node.body : (node.body.body || [])) : [];
        walk(bodyContent, depth + 1);
      } else {
        const content = node.body ?
          (Array.isArray(node.body) ? node.body : (node.body.body || [])) : [];
        walk(content, depth);
      }
      if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent], depth);
      if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate], depth);
    }
  }

  try {
    walk(body, 0);
  } catch (e) {
    console.warn('[complexity] AST walk failed, falling back to regex:', e);
  }

  // Fallback: regex-based loop depth detection for when AST fails
  const regexDepth = regexLoopDepth(code);
  if (loopDepths.length === 0 && regexDepth > 0) {
    for (let i = 1; i <= regexDepth; i++) loopDepths.push(i);
  }

  const maxDepth = loopDepths.length > 0 ? Math.max(...loopDepths) : 0;
  const hasHashMap = /\bMap\b|\bSet\b|\{.*\}.*=.*new/.test(code) || /\w+\[/.test(code);
  const hasBinarySearch = /\bleft\b.*\bright\b|\bright\b.*\bleft\b/.test(code) && /while\s*\(/.test(code);

  let bigO: string;
  let explanation: string;
  let improvement: string | null = null;

  if (hasBinarySearch) {
    bigO = 'O(log n)';
    explanation = 'Binary search halves the search space each iteration — logarithmic time.';
  } else if (maxDepth === 0) {
    bigO = 'O(1) or O(n)';
    explanation = 'No nested loops detected. Likely constant or linear time.';
  } else if (maxDepth === 1) {
    bigO = 'O(n)';
    explanation = 'Single loop — linear time relative to input size.';
    if (!hasHashMap) {
      improvement = 'If you need O(1) lookups, consider using a hash map (Map or object).';
    }
  } else if (maxDepth === 2) {
    bigO = 'O(n²)';
    explanation = `Nested loops with depth ${maxDepth} — quadratic time.`;
    improvement = 'Consider if a hash map or sorting can reduce this to O(n log n) or O(n).';
  } else {
    bigO = `O(n^${maxDepth})`;
    explanation = `Nested loops with depth ${maxDepth} — polynomial time.`;
    improvement = 'This may be too slow for large inputs. Consider a different algorithm approach.';
  }

  return { bigO, explanation, improvement, loopDepth: maxDepth };
}

function regexLoopDepth(code: string): number {
  const lines = code.split('\n');
  let maxDepth = 0;
  let currentDepth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\s*(for|while|do)\s*\(/.test(trimmed)) {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    }
    // Simple heuristic: a closing brace reduces depth
    if (trimmed === '}' || trimmed.startsWith('}')) {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }
  return maxDepth;
}
