import { registerChecker } from "./index";

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString);
}

function isGroupedAnagrams(v: unknown): v is string[][] {
  return Array.isArray(v) && v.every(isStringArray);
}

function normalizeGroup(g: string[]): string {
  return [...g].sort().join("|");
}

function groupAnagramsMatches(actual: unknown, expected: unknown): boolean {
  if (!isGroupedAnagrams(actual)) return false;
  if (!isGroupedAnagrams(expected)) return false;
  if (actual.length !== expected.length) return false;
  const aSorted = [...actual]
    .map((g) => [...g].sort())
    .map((g) => normalizeGroup(g))
    .sort();
  const eSorted = [...expected]
    .map((g) => [...g].sort())
    .map((g) => normalizeGroup(g))
    .sort();
  for (let i = 0; i < aSorted.length; i++) {
    if (aSorted[i] !== eSorted[i]) return false;
  }
  return true;
}

registerChecker("groupAnagrams", groupAnagramsMatches);

export const groupAnagramsChecker = groupAnagramsMatches;
