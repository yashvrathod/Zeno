import { describe, it, expect } from "@jest/globals";
import { getChecker, hasChecker, listCheckers, clearCheckers, registerChecker } from "../checkers";
import "../checkers/two-sum";
import "../checkers/three-sum";
import "../checkers/median";
import "../checkers/valid-parentheses";
import "../checkers/group-anagrams";

describe("checker registry", () => {
  it("registers a checker on import (side effect of two-sum.ts)", () => {
    expect(hasChecker("twoSum")).toBe(true);
    expect(hasChecker("twoSum2")).toBe(true);
  });

  it("registers threeSum, findMedianSortedArrays, isValid, groupAnagrams (PR 2)", () => {
    expect(hasChecker("threeSum")).toBe(true);
    expect(hasChecker("findMedianSortedArrays")).toBe(true);
    expect(hasChecker("isValid")).toBe(true);
    expect(hasChecker("groupAnagrams")).toBe(true);
  });

  it("returns the registered function", () => {
    const c = getChecker("twoSum");
    expect(typeof c).toBe("function");
  });

  it("lists registered slugs", () => {
    const list = listCheckers();
    expect(list).toContain("twoSum");
    expect(list).toContain("threeSum");
    expect(list).toContain("findMedianSortedArrays");
    expect(list).toContain("isValid");
    expect(list).toContain("groupAnagrams");
  });

  it("clearCheckers removes all entries", () => {
    clearCheckers();
    expect(hasChecker("twoSum")).toBe(false);
    registerChecker("twoSum", (a, e) => a === e);
    expect(hasChecker("twoSum")).toBe(true);
    registerChecker("twoSum", (a, e) => {
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
  const c = getChecker("twoSum")!;

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

describe("three-sum checker (PR 2)", () => {
  const c = getChecker("threeSum")!;

  it("accepts triplets in the same order as expected", () => {
    expect(c([[-1, 0, 1], [-1, -1, 2]], [[-1, 0, 1], [-1, -1, 2]])).toBe(true);
  });

  it("accepts triplets in different order", () => {
    expect(c([[-1, -1, 2], [-1, 0, 1]], [[-1, 0, 1], [-1, -1, 2]])).toBe(true);
  });

  it("accepts triplets with elements in different internal order", () => {
    expect(c([[0, -1, 1], [-1, -1, 2]], [[-1, 0, 1], [-1, -1, 2]])).toBe(true);
  });

  it("rejects when number of triplets differs", () => {
    expect(c([[-1, 0, 1]], [[-1, 0, 1], [-1, -1, 2]])).toBe(false);
  });

  it("rejects when a triplet is missing", () => {
    expect(c([[-1, 0, 1], [0, 0, 0]], [[-1, 0, 1], [-1, -1, 2]])).toBe(false);
  });

  it("rejects empty result when expected is non-empty (or vice versa)", () => {
    expect(c([], [[-1, 0, 1]])).toBe(false);
    expect(c([[]], [[-1, 0, 1]])).toBe(false);
  });

  it("rejects non-triplet elements", () => {
    expect(c([[-1, 0]], [[-1, 0, 1]])).toBe(false);
    expect(c([-1, 0, 1], [[-1, 0, 1]])).toBe(false);
  });

  it("rejects non-arrays", () => {
    expect(c(null, [[-1, 0, 1]])).toBe(false);
    expect(c(42, [[-1, 0, 1]])).toBe(false);
  });
});

describe("median checker (PR 2)", () => {
  const c = getChecker("findMedianSortedArrays")!;

  it("accepts exact integer match", () => {
    expect(c(2.0, 2.0)).toBe(true);
  });

  it("accepts fractional values within tolerance", () => {
    expect(c(2.5, 2.5)).toBe(true);
    expect(c(2.0, 2.0000001)).toBe(true);
    expect(c(2.0000001, 2.0)).toBe(true);
  });

  it("rejects values outside tolerance", () => {
    expect(c(2.5, 2.6)).toBe(false);
  });

  it("rejects non-numbers", () => {
    expect(c("2.5", 2.5)).toBe(false);
    expect(c(null, 2.5)).toBe(false);
    expect(c(undefined, 2.5)).toBe(false);
    expect(c([2.5], 2.5)).toBe(false);
  });

  it("rejects NaN / Infinity", () => {
    expect(c(NaN, 2.5)).toBe(false);
    expect(c(Infinity, 2.5)).toBe(false);
  });
});

describe("valid-parentheses checker (PR 2)", () => {
  const c = getChecker("isValid")!;

  it("accepts boolean true === true", () => {
    expect(c(true, true)).toBe(true);
  });

  it("accepts boolean false === false", () => {
    expect(c(false, false)).toBe(true);
  });

  it("rejects true vs false", () => {
    expect(c(true, false)).toBe(false);
    expect(c(false, true)).toBe(false);
  });

  it("rejects non-booleans", () => {
    expect(c(1, true)).toBe(false);
    expect(c("true", true)).toBe(false);
    expect(c(null, false)).toBe(false);
    expect(c([], true)).toBe(false);
  });
});

describe("group-anagrams checker (PR 2)", () => {
  const c = getChecker("groupAnagrams")!;

  it("accepts groups in same order", () => {
    expect(
      c(
        [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
        [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
      ),
    ).toBe(true);
  });

  it("accepts groups in different order", () => {
    expect(
      c(
        [["bat"], ["tan", "nat"], ["eat", "tea", "ate"]],
        [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
      ),
    ).toBe(true);
  });

  it("accepts groups with words in different internal order", () => {
    expect(
      c(
        [["ate", "eat", "tea"], ["nat", "tan"], ["bat"]],
        [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
      ),
    ).toBe(true);
  });

  it("rejects when a group contains a wrong word", () => {
    expect(
      c(
        [["eat", "tea", "ate"], ["tan", "nat"], ["cat"]],
        [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
      ),
    ).toBe(false);
  });

  it("rejects when number of groups differs", () => {
    expect(
      c(
        [["eat", "tea", "ate"], ["tan", "nat"]],
        [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]],
      ),
    ).toBe(false);
  });

  it("rejects non-arrays", () => {
    expect(c([], [])).toBe(true);
    expect(c([], [[]])).toBe(false);
    expect(c(null, [])).toBe(false);
    expect(c({}, [])).toBe(false);
  });

  it("rejects when a group is not an array of strings", () => {
    expect(c([["eat", 1]], [["eat", "1"]])).toBe(false);
  });
});
