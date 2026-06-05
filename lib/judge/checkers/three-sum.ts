import { registerChecker } from "./index";

function isTriplet(t: unknown): t is unknown[] {
  return Array.isArray(t) && t.length === 3;
}

function tripletEquals(a: unknown[], b: unknown[]): boolean {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sortTriplets(triplets: unknown[][]): unknown[][] {
  return triplets
    .map((t) => [...t].sort((x, y) => Number(x) - Number(y)))
    .sort((a, b) => {
      for (let i = 0; i < 3; i++) {
        const av = Number(a[i]);
        const bv = Number(b[i]);
        if (av !== bv) return av - bv;
      }
      return 0;
    });
}

function isTripletList(v: unknown): v is unknown[][] {
  return Array.isArray(v) && v.every(isTriplet);
}

function threeSumMatches(actual: unknown, expected: unknown): boolean {
  if (!isTripletList(actual)) return false;
  if (!isTripletList(expected)) return false;
  if (actual.length !== expected.length) return false;
  const aSorted = sortTriplets(actual);
  const eSorted = sortTriplets(expected);
  for (let i = 0; i < aSorted.length; i++) {
    if (!tripletEquals(aSorted[i]!, eSorted[i]!)) return false;
  }
  return true;
}

registerChecker("threeSum", threeSumMatches);

export const threeSumChecker = threeSumMatches;
