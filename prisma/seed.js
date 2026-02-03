/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot run seed.');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

function starterCodeTemplates() {
  return {
    javascript: `// Read from stdin, write to stdout.\n// Implement your solution in main() or directly.\n\nconst fs = require('fs');\nconst input = fs.readFileSync(0,'utf8').trim().split(/\\s+/);\nlet idx = 0;\n\nfunction main() {\n  // TODO\n  console.log('');\n}\n\nmain();\n`,
    python: `# Read from stdin, write to stdout\nimport sys\n\ndef main():\n    data = sys.stdin.read().strip().split()\n    # TODO\n    print('')\n\nif __name__ == '__main__':\n    main()\n`,
    java: `import java.io.*;\nimport java.util.*;\n\npublic class Main {\n  public static void main(String[] args) throws Exception {\n    FastScanner fs = new FastScanner(System.in);\n    // TODO\n    System.out.println();\n  }\n\n  static class FastScanner {\n    private final InputStream in;\n    private final byte[] buffer = new byte[1 << 16];\n    private int ptr = 0, len = 0;\n    FastScanner(InputStream in) { this.in = in; }\n    private int read() throws IOException {\n      if (ptr >= len) {\n        len = in.read(buffer);\n        ptr = 0;\n        if (len <= 0) return -1;\n      }\n      return buffer[ptr++];\n    }\n    String next() throws IOException {\n      StringBuilder sb = new StringBuilder();\n      int c;\n      while ((c = read()) != -1 && Character.isWhitespace(c)) {}\n      if (c == -1) return null;\n      do {\n        sb.append((char)c);\n        c = read();\n      } while (c != -1 && !Character.isWhitespace(c));\n      return sb.toString();\n    }\n    int nextInt() throws IOException { return Integer.parseInt(next()); }\n  }\n}\n`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  // TODO\n  return 0;\n}\n`,
  };
}

function normalizeTestCases(testCases) {
  const pub = testCases.filter((t) => !t.isHidden);
  const hid = testCases.filter((t) => t.isHidden);
  return [
    ...pub.map((t, i) => ({ ...t, isHidden: false, order: i + 1 })),
    ...hid.map((t, i) => ({ ...t, isHidden: true, order: i + 1 })),
  ];
}

async function upsertPatternByName(name, description) {
  return prisma.pattern.upsert({
    where: { name },
    update: { description: description ?? null },
    create: { name, description: description ?? null },
    select: { id: true, name: true },
  });
}

async function upsertProblem(problem) {
  const templates = starterCodeTemplates();

  return prisma.$transaction(async (tx) => {
    const saved = await tx.problem.upsert({
      where: { slug: problem.slug },
      update: {
        title: problem.title,
        statementMd: problem.statementMd,
        constraintsMd: problem.constraintsMd ?? null,
        difficulty: problem.difficulty,
        isPublished: problem.isPublished,
        tags: problem.tags ?? undefined,
        starterCode: problem.starterCode ?? templates,
      },
      create: {
        slug: problem.slug,
        title: problem.title,
        statementMd: problem.statementMd,
        constraintsMd: problem.constraintsMd ?? null,
        difficulty: problem.difficulty,
        isPublished: problem.isPublished,
        tags: problem.tags ?? undefined,
        starterCode: problem.starterCode ?? templates,
      },
      select: { id: true, slug: true },
    });

    // Re-sync patterns
    await tx.problemPattern.deleteMany({ where: { problemId: saved.id } });
    if (problem.patternIds?.length) {
      await tx.problemPattern.createMany({
        data: problem.patternIds.map((patternId) => ({ problemId: saved.id, patternId })),
        skipDuplicates: true,
      });
    }

    // Re-sync hints
    await tx.hint.deleteMany({ where: { problemId: saved.id } });
    if (problem.hints?.length) {
      const cleaned = problem.hints.map((h) => String(h).trim()).filter(Boolean);
      if (cleaned.length) {
        await tx.hint.createMany({
          data: cleaned.map((textMd, idx) => ({ problemId: saved.id, order: idx + 1, textMd })),
        });
      }
    }

    // Re-sync test cases
    await tx.testCase.deleteMany({ where: { problemId: saved.id } });
    const normalized = normalizeTestCases(problem.testCases ?? []);
    if (normalized.length) {
      await tx.testCase.createMany({
        data: normalized.map((tc) => ({
          problemId: saved.id,
          order: tc.order,
          input: String(tc.input ?? ''),
          expected: String(tc.expected ?? ''),
          isHidden: Boolean(tc.isHidden),
        })),
      });
    }

    return saved;
  });
}

async function main() {
  console.log('Seeding patterns + problems...');

  const patterns = await Promise.all([
    upsertPatternByName('Two Pointers', 'Use two indices moving towards each other to optimize search/scan.'),
    upsertPatternByName('Sliding Window', 'Maintain a moving window to solve subarray/substring problems.'),
    upsertPatternByName('Binary Search', 'Divide and conquer on sorted/monotonic search space.'),
    upsertPatternByName('Merge Intervals', 'Sort and merge overlapping intervals.'),
    upsertPatternByName('Dynamic Programming', 'Optimize over overlapping subproblems.'),
    upsertPatternByName('Graph BFS/DFS', 'Traverse graphs with BFS/DFS.'),
    upsertPatternByName('Heap / Top K', 'Use heaps to keep top/bottom k elements.'),
    upsertPatternByName('Tree Traversal', 'DFS/BFS on trees.'),
  ]);

  const patternId = Object.fromEntries(patterns.map((p) => [p.name, p.id]));

  const problems = [
    {
      slug: 'sum-of-two-integers',
      title: 'Sum of Two Integers',
      difficulty: 'EASY',
      isPublished: true,
      tags: ['warmup'],
      patternIds: [patternId['Two Pointers']],
      statementMd: `# Sum of Two Integers\n\nGiven two integers **a** and **b**, print their sum.\n\n## Input\nTwo integers in one line.\n\n## Output\nPrint a single integer: a + b.\n`,
      constraintsMd: `-10^9 ≤ a, b ≤ 10^9`,
      hints: ['Just parse two integers and print their sum.'],
      testCases: [
        { input: '1 2\n', expected: '3\n', isHidden: false },
        { input: '10 20\n', expected: '30\n', isHidden: false },
        { input: '-5 9\n', expected: '4\n', isHidden: true },
      ],
    },
    {
      slug: 'valid-palindrome',
      title: 'Valid Palindrome',
      difficulty: 'EASY',
      isPublished: true,
      tags: ['string'],
      patternIds: [patternId['Two Pointers']],
      statementMd: `# Valid Palindrome\n\nGiven a string **s**, determine if it is a palindrome considering only alphanumeric characters and ignoring case.\n\n## Input\nA single line string s.\n\n## Output\nPrint \"true\" if s is a palindrome, otherwise \"false\".\n`,
      constraintsMd: `1 ≤ |s| ≤ 2*10^5`,
      hints: ['Use two pointers from both ends; skip non-alphanumerics.'],
      testCases: [
        { input: 'A man, a plan, a canal: Panama\n', expected: 'true\n', isHidden: false },
        { input: 'race a car\n', expected: 'false\n', isHidden: false },
        { input: '0P\n', expected: 'false\n', isHidden: true },
      ],
    },
    {
      slug: 'longest-substring-without-repeating-characters',
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'MEDIUM',
      isPublished: true,
      tags: ['string'],
      patternIds: [patternId['Sliding Window']],
      statementMd: `# Longest Substring Without Repeating Characters\n\nGiven a string **s**, find the length of the longest substring without repeating characters.\n\n## Input\nA single line string s.\n\n## Output\nPrint a single integer: the maximum length.\n`,
      constraintsMd: `0 ≤ |s| ≤ 2*10^5`,
      hints: ['Sliding window with a map of last seen positions.'],
      testCases: [
        { input: 'abcabcbb\n', expected: '3\n', isHidden: false },
        { input: 'bbbbb\n', expected: '1\n', isHidden: false },
        { input: 'pwwkew\n', expected: '3\n', isHidden: true },
      ],
    },
    {
      slug: 'binary-search',
      title: 'Binary Search',
      difficulty: 'EASY',
      isPublished: true,
      tags: ['array'],
      patternIds: [patternId['Binary Search']],
      statementMd: `# Binary Search\n\nYou are given a sorted array of integers and a target. Return the index of the target in the array or -1 if it does not exist.\n\n## Input\nFirst line: n\nSecond line: n integers (sorted)\nThird line: target\n\n## Output\nIndex (0-based) or -1\n`,
      constraintsMd: `1 ≤ n ≤ 2*10^5`,
      hints: ['Classic binary search.'],
      testCases: [
        { input: '5\n-1 0 3 5 9\n9\n', expected: '4\n', isHidden: false },
        { input: '5\n-1 0 3 5 9\n2\n', expected: '-1\n', isHidden: false },
        { input: '1\n5\n5\n', expected: '0\n', isHidden: true },
      ],
    },
    {
      slug: 'merge-intervals',
      title: 'Merge Intervals',
      difficulty: 'MEDIUM',
      isPublished: true,
      tags: ['intervals'],
      patternIds: [patternId['Merge Intervals']],
      statementMd: `# Merge Intervals\n\nGiven a list of intervals, merge all overlapping intervals and output the resulting intervals.\n\n## Input\nFirst line: n\nNext n lines: l r\n\n## Output\nMerged intervals (one per line) in ascending order of start.\n`,
      constraintsMd: `1 ≤ n ≤ 2*10^5`,
      hints: ['Sort by start; then sweep and merge.'],
      testCases: [
        { input: '4\n1 3\n2 6\n8 10\n15 18\n', expected: '1 6\n8 10\n15 18\n', isHidden: false },
        { input: '2\n1 4\n4 5\n', expected: '1 5\n', isHidden: false },
        { input: '1\n5 7\n', expected: '5 7\n', isHidden: true },
      ],
    },
    {
      slug: 'climbing-stairs',
      title: 'Climbing Stairs',
      difficulty: 'EASY',
      isPublished: true,
      tags: ['dp'],
      patternIds: [patternId['Dynamic Programming']],
      statementMd: `# Climbing Stairs\n\nYou can climb 1 or 2 steps. Given n, return number of distinct ways to reach the top.\n\n## Input\nSingle integer n\n\n## Output\nNumber of ways\n`,
      constraintsMd: `1 ≤ n ≤ 45`,
      hints: ['Fibonacci DP.'],
      testCases: [
        { input: '2\n', expected: '2\n', isHidden: false },
        { input: '3\n', expected: '3\n', isHidden: false },
        { input: '45\n', expected: '1836311903\n', isHidden: true },
      ],
    },
    {
      slug: 'number-of-islands',
      title: 'Number of Islands',
      difficulty: 'MEDIUM',
      isPublished: true,
      tags: ['graph'],
      patternIds: [patternId['Graph BFS/DFS']],
      statementMd: `# Number of Islands\n\nGiven a grid of '0' and '1', count the number of islands (connected 1s using 4-direction adjacency).\n\n## Input\nFirst line: r c\nNext r lines: string of length c (chars 0/1)\n\n## Output\nNumber of islands\n`,
      constraintsMd: `1 ≤ r,c ≤ 500`,
      hints: ['Run DFS/BFS from each unvisited land cell.'],
      testCases: [
        { input: '4 5\n11000\n11000\n00100\n00011\n', expected: '3\n', isHidden: false },
        { input: '1 1\n0\n', expected: '0\n', isHidden: false },
        { input: '2 2\n11\n11\n', expected: '1\n', isHidden: true },
      ],
    },
    {
      slug: 'top-k-frequent-elements',
      title: 'Top K Frequent Elements',
      difficulty: 'MEDIUM',
      isPublished: true,
      tags: ['heap'],
      patternIds: [patternId['Heap / Top K']],
      statementMd: `# Top K Frequent Elements\n\nGiven an integer array and integer k, output the k most frequent elements in any order.\n\n## Input\nFirst line: n k\nSecond line: n integers\n\n## Output\nPrint k integers separated by space (any order).\n`,
      constraintsMd: `1 ≤ n ≤ 2*10^5`,
      hints: ['Use hashmap + heap (or bucket sort).'],
      testCases: [
        { input: '6 2\n1 1 1 2 2 3\n', expected: '1 2\n', isHidden: false },
        { input: '1 1\n1\n', expected: '1\n', isHidden: false },
        { input: '10 3\n4 4 4 5 5 6 6 6 7 7\n', expected: '4 6 5\n', isHidden: true },
      ],
    },
    {
      slug: 'invert-binary-tree',
      title: 'Invert Binary Tree',
      difficulty: 'EASY',
      isPublished: true,
      tags: ['tree'],
      patternIds: [patternId['Tree Traversal']],
      statementMd: `# Invert Binary Tree\n\nGiven a binary tree, invert it (swap left/right recursively).\n\nFor this platform seed, we represent a tree as a level-order list with 'null'.\n\n## Input\nA single line of space-separated tokens (e.g. 4 2 7 1 3 6 9).\n\n## Output\nLevel-order of inverted tree using same format.\n\nNote: This is a seed problem; you can refine format/executor later.\n`,
      constraintsMd: `Number of nodes ≤ 10^4`,
      hints: ['DFS recursively swapping children.'],
      testCases: [
        { input: '4 2 7 1 3 6 9\n', expected: '4 7 2 9 6 3 1\n', isHidden: false },
        { input: '2 1 3\n', expected: '2 3 1\n', isHidden: false },
        { input: '\n', expected: '\n', isHidden: true },
      ],
    },
  ];

  for (const p of problems) {
    await upsertProblem(p);
    console.log(`✓ ${p.slug}`);
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
