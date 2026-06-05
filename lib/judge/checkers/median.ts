import { registerChecker } from "./index";

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function medianMatches(actual: unknown, expected: unknown): boolean {
  if (!isNumber(actual)) return false;
  if (!isNumber(expected)) return false;
  return Math.abs(actual - expected) < 1e-6;
}

registerChecker("findMedianSortedArrays", medianMatches);

export const medianChecker = medianMatches;
