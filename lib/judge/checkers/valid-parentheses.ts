import { registerChecker } from "./index";

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function validParenthesesMatches(actual: unknown, expected: unknown): boolean {
  if (!isBoolean(actual)) return false;
  if (!isBoolean(expected)) return false;
  return actual === expected;
}

registerChecker("isValid", validParenthesesMatches);

export const validParenthesesChecker = validParenthesesMatches;
