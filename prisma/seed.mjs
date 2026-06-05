import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function sha256Hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function main() {
  console.log("Starting seed...\n");

  // Cleanup
  console.log("Cleaning up existing data...");
  await prisma.cacheEntry.deleteMany({});
  await prisma.hint.deleteMany({});
  await prisma.testCase.deleteMany({});
  await prisma.problemPattern.deleteMany({});
  await prisma.problem.deleteMany({});
  await prisma.pattern.deleteMany({});
  await prisma.userProblemStats.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("Cleanup done.\n");

  // Create patterns
  console.log("Creating patterns...");
  const patterns = {
    "Two Pointers": "Use two indices moving towards each other to solve array/string problems efficiently.",
    "Sliding Window": "Maintain a window over data to find optimal subarrays or substrings.",
    "Binary Search": "Divide and conquer to find elements in sorted data in O(log n) time.",
    "Hash Map": "Use hash tables for O(1) lookups, counting, and frequency tracking.",
    "DFS": "Explore depth-first using recursion or a stack - great for trees and graphs.",
    "BFS": "Explore breadth-first using a queue - finds shortest path in unweighted graphs.",
    "Dynamic Programming": "Break problems into overlapping subproblems and memoize results.",
    "Backtracking": "Build solutions incrementally and backtrack when constraints are violated.",
    "Greedy": "Make locally optimal choices at each step hoping to find global optimum.",
    "Monotonic Stack": "Maintain a stack where elements are sorted - find next greater/smaller efficiently.",
  };

  const createdPatterns = [];
  for (const [name, desc] of Object.entries(patterns)) {
    const p = await prisma.pattern.create({
      data: { name, description: desc },
    });
    createdPatterns.push(p);
    console.log("  Created:", p.name);
  }

  // Create problems
  console.log("\nCreating problems...");

  const problemsData = [
    {
      slug: "valid-palindrome",
      title: "Valid Palindrome",
      statementMd:
        "A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return **true** if it is a palindrome, or **false** otherwise.\n\n**Example 1:**\nInput: s = 'A man, a plan, a canal: Panama'\nOutput: true\n\n**Example 2:**\nInput: s = 'race a car'\nOutput: false",
      constraintsMd:
        "- 1 <= s.length <= 2 * 10^5\n- s consists only of ASCII characters.",
      difficulty: "EASY",
      patternName: "Two Pointers",
      tags: JSON.stringify(["string", "two-pointers"]),
      testCases: [
        { order: 1, input: "[\"A man, a plan, a canal: Panama\"]\n", expected: "true\n", isHidden: false },
        { order: 2, input: "[\"race a car\"]\n", expected: "false\n", isHidden: false },
        { order: 3, input: "[\" \"]\n", expected: "true\n", isHidden: false },
        { order: 99, input: "[\"0P\"]\n", expected: "false\n", isHidden: true },
      ],
      hints: [
        { order: 1, textMd: "Think about what characters actually matter in a palindrome check.", hintType: "concept", escalationLevel: 1 },
        { order: 2, textMd: "You need to skip non-alphanumeric characters and compare only letters/numbers.", hintType: "strategy", escalationLevel: 2 },
        { order: 3, textMd: "Use two pointers - one starting from the beginning and one from the end.", hintType: "detail", escalationLevel: 3 },
      ],
      exploreQuestions: [
        { q: "What is a palindrome?", r: "A **palindrome** is a word, phrase, or sequence that reads the same backwards as forwards. Examples: madam, racecar, 12321." },
        { q: "What edge cases should I consider?", r: "Consider: empty string (true), only special characters (true), single character (true), mixed case (convert to lowercase first)." },
        { q: "What is the two pointer approach?", r: "The **Two Pointer** technique uses two indices moving toward each other: left starts at 0 moves right, right starts at last index moves left. They compare characters and skip non-alphanumeric ones. This gives **O(n) time, O(1) space**." },
      ],
    },
    {
      slug: "two-sum",
      title: "Two Sum",
      statementMd:
        "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\n**Example 1:**\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n\n**Example 2:**\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]",
      constraintsMd:
        "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9",
      difficulty: "EASY",
      patternName: "Hash Map",
      tags: JSON.stringify(["array", "hash-map"]),
      testCases: [
        { order: 1, input: "[[2,7,11,15], 9]\n", expected: "[0,1]\n", isHidden: false },
        { order: 2, input: "[[3,2,4], 6]\n", expected: "[1,2]\n", isHidden: false },
        { order: 3, input: "[[3,3], 6]\n", expected: "[0,1]\n", isHidden: false },
        { order: 99, input: "[[1,5,7,-1], 6]\n", expected: "[0,1]\n", isHidden: true },
      ],
      hints: [
        { order: 1, textMd: "A brute force approach would check every pair. But can you do better?", hintType: "concept", escalationLevel: 1 },
        { order: 2, textMd: "Think about what data structure lets you check have I seen this number before in O(1).", hintType: "strategy", escalationLevel: 2 },
        { order: 3, textMd: "Use a hash map to store complement = target - num as you iterate.", hintType: "detail", escalationLevel: 3 },
      ],
      exploreQuestions: [
        { q: "What is the brute force approach?", r: "Check every pair of numbers with nested loops. Time: O(n^2), Space: O(1). Works but slow for large arrays." },
        { q: "How can I optimize to O(n) time?", r: "Use a **hash map** to store complements as you go. For each number, check if its complement (target - num) is already in the map. Time: O(n), Space: O(n)." },
      ],
    },
    {
      slug: "binary-search",
      title: "Binary Search",
      statementMd:
        "Given an array of integers `nums` which is **sorted in ascending order** and an integer `target`, return the index of the target if it exists in the array. If not, return -1.\n\n**Example 1:**\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\n\n**Example 2:**\nInput: nums = [-1,0,3,5,9,12], target = 2\nOutput: -1",
      constraintsMd:
        "- 1 <= nums.length <= 10^4\n- -10^4 < nums[i], target < 10^4\n- All integers in nums are unique",
      difficulty: "EASY",
      patternName: "Binary Search",
      tags: JSON.stringify(["array", "binary-search"]),
      testCases: [
        { order: 1, input: "[[-1,0,3,5,9,12], 9]\n", expected: "4\n", isHidden: false },
        { order: 2, input: "[[-1,0,3,5,9,12], 2]\n", expected: "-1\n", isHidden: false },
        { order: 3, input: "[[5], 5]\n", expected: "0\n", isHidden: false },
        { order: 99, input: "[[1,3,5,7,9], 6]\n", expected: "-1\n", isHidden: true },
      ],
      hints: [
        { order: 1, textMd: "Since the array is sorted, you dont need to check every element.", hintType: "concept", escalationLevel: 1 },
        { order: 2, textMd: "Think about elimination - you can discard half the search space each time.", hintType: "strategy", escalationLevel: 2 },
        { order: 3, textMd: "Compare target with middle element. If target < middle, search left half. Otherwise search right half.", hintType: "detail", escalationLevel: 3 },
      ],
      exploreQuestions: [
        { q: "Why must the array be sorted for binary search?", r: "Binary search relies on the **ordering** property. If target < mid, you know target can ONLY be in the left half. Without sorting, you cannot make this conclusion." },
        { q: "What is the time complexity?", r: "**Time: O(log n)**. Each step halves the search space. For n=10000, that is only about 14 comparisons." },
      ],
    },
    {
      slug: "number-of-islands",
      title: "Number of Islands",
      statementMd:
        "Given an `m x n` 2D grid map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands **horizontally or vertically**.\n\n**Example 1:**\nInput: grid = [[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]]\nOutput: 1\n\n**Example 2:**\nInput: grid = [[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]\nOutput: 3",
      constraintsMd:
        "- m == grid.length\n- n == grid[i].length\n- 1 <= m, n <= 300",
      difficulty: "MEDIUM",
      patternName: "DFS",
      tags: JSON.stringify(["array", "dfs", "graph", "matrix"]),
      testCases: [
        { order: 1, input: "[[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]]\n", expected: "1\n", isHidden: false },
        { order: 2, input: "[[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]\n", expected: "3\n", isHidden: false },
        { order: 99, input: "[[0]]\n", expected: "0\n", isHidden: true },
      ],
      hints: [
        { order: 1, textMd: "An island is a connected component of 1s. How can you find and count connected components?", hintType: "concept", escalationLevel: 1 },
        { order: 2, textMd: "When you find a 1, increment your count and mark all connected 1s as visited.", hintType: "strategy", escalationLevel: 2 },
        { order: 3, textMd: "Use DFS or BFS to explore and mark all connected land cells.", hintType: "detail", escalationLevel: 3 },
      ],
      exploreQuestions: [
        { q: "How do I count connected components?", r: "Pattern: Iterate through each cell. When you find a 1, increment count and use DFS to mark all connected 1s. Time: O(m*n)." },
        { q: "How do I implement DFS on a grid?", r: "DFS visits a cell and recursively visits all valid neighbors (up, down, left, right). Mark visited cells by changing 1 to 0." },
      ],
    },
    {
      slug: "climbing-stairs",
      title: "Climbing Stairs",
      statementMd:
        "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb **1** or **2** steps. In how many distinct ways can you climb to the top?\n\n**Example 1:**\nInput: n = 2\nOutput: 2\n(Two ways: 1+1 or 2)\n\n**Example 2:**\nInput: n = 3\nOutput: 3\n(Three ways: 1+1+1, 1+2, or 2+1)",
      constraintsMd: "- 1 <= n <= 45",
      difficulty: "EASY",
      patternName: "Dynamic Programming",
      tags: JSON.stringify(["dp", "math"]),
      testCases: [
        { order: 1, input: "2\n", expected: "2\n", isHidden: false },
        { order: 2, input: "3\n", expected: "3\n", isHidden: false },
        { order: 3, input: "5\n", expected: "8\n", isHidden: false },
        { order: 99, input: "1\n", expected: "1\n", isHidden: true },
      ],
      hints: [
        { order: 1, textMd: "Try working backwards. If you are at step n, how could you have gotten there?", hintType: "concept", escalationLevel: 1 },
        { order: 2, textMd: "Think about the last step: you either came from n-1 (took 1 step) or n-2 (took 2 steps).", hintType: "strategy", escalationLevel: 2 },
        { order: 3, textMd: "This creates the recurrence: f(n) = f(n-1) + f(n-2). This is the Fibonacci sequence.", hintType: "detail", escalationLevel: 3 },
      ],
      exploreQuestions: [
        { q: "What is the pattern?", r: "Let f(n) = number of ways to reach step n. To get to step n, you could come from step n-1 (take 1 step) or n-2 (take 2 steps). So: **f(n) = f(n-1) + f(n-2)**. This is the **Fibonacci sequence**!" },
        { q: "How do I optimize with memoization?", r: "Store results you have already computed. Time: O(n), Space: O(n). Or use iterative DP with O(1) space since you only need the last 2 values." },
      ],
    },
  ];

  const createdProblems = [];
  for (const pd of problemsData) {
    const pattern = createdPatterns.find((p) => p.name === pd.patternName);
    if (!pattern) {
      console.log("  Pattern not found:", pd.patternName);
      continue;
    }

    const problem = await prisma.problem.create({
      data: {
        slug: pd.slug,
        title: pd.title,
        statementMd: pd.statementMd,
        constraintsMd: pd.constraintsMd,
        difficulty: pd.difficulty,
        isPublished: true,
        tags: pd.tags,
      },
    });
    createdProblems.push(problem);
    console.log("  Created:", problem.title);

    // Link to pattern
    await prisma.problemPattern.create({
      data: {
        problemId: problem.id,
        patternId: pattern.id,
      },
    });

    // Create test cases
    for (const tc of pd.testCases) {
      await prisma.testCase.create({
        data: {
          problemId: problem.id,
          order: tc.order,
          input: tc.input,
          expected: tc.expected,
          isHidden: tc.isHidden,
        },
      });
    }

    // Create hints
    for (const hint of pd.hints) {
      await prisma.hint.create({
        data: {
          problemId: problem.id,
          order: hint.order,
          textMd: hint.textMd,
          hintType: hint.hintType,
          escalationLevel: hint.escalationLevel,
        },
      });
    }

    // Pre-seed cache entries
    const SYSTEM_USER = "system";
    for (const qa of pd.exploreQuestions) {
      const questionMd5 = sha256Hash(qa.q);
      const dummyEmbedding = new Array(384)
        .fill(0)
        .map((_, idx) => Math.sin(idx * 137.508) * 0.01);

      await prisma.cacheEntry.create({
        data: {
          problemId: problem.id,
          questionMd5,
          questionText: qa.q,
          embedding: dummyEmbedding,
          response: qa.r,
          stage: "EXPLORE",
          rung: 1,
          usedCount: 0,
        },
      });
    }
  }

  // Create demo users
  console.log("\nCreating demo users...");
  const demoUsers = [
    { name: "Alice Chen", email: "alice@example.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice", totalSolved: 45, currentStreak: 12, interviewReadiness: 85 },
    { name: "Bob Smith", email: "bob@example.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob", totalSolved: 38, currentStreak: 8, interviewReadiness: 72 },
    { name: "Carol Williams", email: "carol@example.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol", totalSolved: 32, currentStreak: 5, interviewReadiness: 65 },
  ];

  for (const user of demoUsers) {
    await prisma.user.create({
      data: user,
    });
    console.log("  Created:", user.name);
  }

  console.log("\n========================================");
  console.log("Seed complete!\n");
  console.log("Summary:");
  console.log("  -", createdPatterns.length, "patterns");
  console.log("  -", createdProblems.length, "problems");
  console.log("  - Demo users:", demoUsers.length);
  console.log("\nReady for your presentation!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
