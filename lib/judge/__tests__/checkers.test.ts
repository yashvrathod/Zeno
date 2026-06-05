import { describe, it, expect } from "@jest/globals";
import { getChecker, hasChecker, listCheckers, clearCheckers, registerChecker } from "../checkers";
import "../checkers/two-sum";

describe("checker registry", () => {
  it("registers a checker on import (side effect of two-sum.ts)", () => {
    expect(hasChecker("two-sum")).toBe(true);
    expect(hasChecker("two-sum-ii")).toBe(true);
  });

  it("returns the registered function", () => {
    const c = getChecker("two-sum");
    expect(typeof c).toBe("function");
  });

  it("lists registered slugs", () => {
    const list = listCheckers();
    expect(list).toContain("two-sum");
  });

  it("clearCheckers removes all entries", () => {
    clearCheckers();
    expect(hasChecker("two-sum")).toBe(false);
    registerChecker("two-sum", (a, e) => a === e);
    expect(hasChecker("two-sum")).toBe(true);
    registerChecker("two-sum", (a, e) => {
      if (!Array.isArray(a) || !Array.isArray(e)) return false;
      if (a.length !== 2 || e.length !== 2) return false;
      for (const pair of e) {
        if (Array.isArray(pair) && pair.length === 2) {
          if (a[0] === pair[0] && a[1] === pair[1]) return true;
        }
      }
      return false;
    });
  });
});

describe("two-sum checker", () => {
  const c = getChecker("two-sum")!;

  it("accepts the correct order [0,1]", () => {
    expect(c([0, 1], [0, 1])).toBe(true);
  });

  it("accepts the reverse order [1,0] (the common bug)", () => {
    expect(c([1, 0], [0, 1])).toBe(true);
  });

  it("accepts any pair from a multi-pair expected (i.e., [0,1] is one of N valid answers)", () => {
    expect(c([0, 1], [[0, 1], [2, 3]])).toBe(true);
    expect(c([2, 3], [[0, 1], [2, 3]])).toBe(true);
    expect(c([3, 2], [[0, 1], [2, 3]])).toBe(true);
  });

  it("rejects when no pair matches", () => {
    expect(c([0, 2], [[0, 1], [2, 3]])).toBe(false);
  });

  it("rejects non-2-element arrays", () => {
    expect(c([0], [0, 1])).toBe(false);
    expect(c([0, 1, 2], [0, 1])).toBe(false);
  });

  it("rejects non-arrays", () => {
    expect(c(0, [0, 1])).toBe(false);
    expect(c("hi", [0, 1])).toBe(false);
    expect(c(null, [0, 1])).toBe(false);
  });

  it("rejects when expected is not a pair or list of pairs", () => {
    expect(c([0, 1], 42)).toBe(false);
    expect(c([0, 1], "0,1")).toBe(false);
  });

  it("works with zero-indexed pairs from a single-answer expected", () => {
    expect(c([0, 1], [0, 1])).toBe(true);
  });
});
