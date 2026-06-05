import { registerChecker } from "./index";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const aKeys = Object.keys(aObj).sort();
  const bKeys = Object.keys(bObj).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (!deepEqual(aObj[aKeys[i]!], bObj[bKeys[i]!])) return false;
  }
  return true;
}

function isTwoSumPair(p: unknown): p is [unknown, unknown] {
  return Array.isArray(p) && p.length === 2;
}

function isArrayOfPairs(v: unknown): v is [unknown, unknown][] {
  return Array.isArray(v) && v.length > 0 && v.every(isTwoSumPair);
}

function unorderedPairEquals(a: [unknown, unknown], b: [unknown, unknown]): boolean {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

function twoSumMatches(actual: unknown, expected: unknown): boolean {
  if (!isTwoSumPair(actual)) return false;
  if (isArrayOfPairs(expected)) {
    for (const pair of expected) {
      if (unorderedPairEquals(actual, pair)) return true;
    }
    return false;
  }
  if (isTwoSumPair(expected)) {
    return unorderedPairEquals(actual, expected);
  }
  return false;
}

registerChecker("twoSum", twoSumMatches);
registerChecker("twoSum2", twoSumMatches);

export const twoSumChecker = twoSumMatches;
