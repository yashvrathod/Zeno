import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function sha256Hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function main() {
  console.log("Starting Two Pointers seed...\n");

  // Ensure "Two Pointers" pattern exists
  let pattern = await prisma.pattern.findUnique({
    where: { name: "Two Pointers" },
  });

  if (!pattern) {
    pattern = await prisma.pattern.create({
      data: {
        name: "Two Pointers",
        description: "Use two indices moving towards each other to solve array/string problems efficiently.",
      },
    });
    console.log("Created Two Pointers pattern.");
  }

  const problemsData = [
    {
      slug: "tp-01-royal-banquet-pairing",
      title: "The Royal Banquet Pairing",
      category: "Opposite Ends",
      difficulty: "EASY",
      statementMd: "### Story\nKing Aldric is hosting a grand banquet. He has N guests seated in a line, each with a known appetite score. The royal chef can only prepare one special dish that exactly feeds two guests simultaneously — the dish size equals the sum of their appetite scores. Given a target dish size T, find any two guests whose combined appetite equals T. The guests are already seated in increasing order of appetite (the king's seating rule).\n\n### Task\nGiven a sorted array A of N integers and a target T, find indices (1-indexed) of any two elements that sum to T. If no such pair exists, print -1.",
      constraintsMd: "2 ≤ N ≤ 2×10⁵\n1 ≤ A[i] ≤ 10⁹\n1 ≤ T ≤ 2×10⁹",
      tags: JSON.stringify(["two-pointers", "opposite-ends", "array"]),
      testCases: [
        { order: 1, input: "5 9\n1 3 5 7 8\n", expected: "2 4\n", isHidden: false },
        { order: 2, input: "4 10\n2 4 6 8\n", expected: "2 4\n", isHidden: false },
        { order: 3, input: "3 100\n1 2 3\n", expected: "-1\n", isHidden: false },
        { order: 4, input: "2 2\n1 1\n", expected: "1 2\n", isHidden: false },
      ],
      hints: [
        { order: 1, textMd: "Place one pointer at the leftmost guest and one at the rightmost.", hintType: "strategy", escalationLevel: 1 },
        { order: 2, textMd: "If their sum is too large, move the right pointer left; if too small, move the left pointer right.", hintType: "detail", escalationLevel: 2 },
      ],
      exploreQuestions: [
        { q: "Why move the pointers inward?", r: "Since the array is sorted, moving the left pointer right increases the sum, and moving the right pointer left decreases the sum. This allows us to search the entire possible space in O(N)." }
      ]
    },
    {
      slug: "tp-02-wizard-triplet-spell",
      title: "The Wizard's Triplet Spell",
      category: "Opposite Ends",
      difficulty: "EASY",
      statementMd: "### Story\nWizard Merinda needs to cast a stability spell using exactly three crystals whose combined power equals zero (positive and negative energies cancel). She has N crystals with integer power values. Find ALL unique triplets — no duplicate triplet should appear twice, even if crystals are identical. The order of crystals in a triplet does not matter.\n\n### Task\nGiven array A of N integers, find all unique triplets (a, b, c) with a ≤ b ≤ c such that a + b + c = 0. Print the count on the first line, then each triplet.",
      constraintsMd: "3 ≤ N ≤ 3000\n-10⁵ ≤ A[i] ≤ 10⁵",
      tags: JSON.stringify(["two-pointers", "opposite-ends", "3sum"]),
      testCases: [
        { order: 1, input: "6\n-1 0 1 2 -1 -4\n", expected: "2\n-1 -1 2\n-1 0 1\n", isHidden: false },
        { order: 2, input: "5\n0 0 0 0 0\n", expected: "1\n0 0 0\n", isHidden: false },
        { order: 3, input: "4\n1 2 3 4\n", expected: "0\n", isHidden: false },
      ],
      hints: [
        { order: 1, textMd: "Sort the array first to make it easier to handle duplicates and use two pointers.", hintType: "strategy", escalationLevel: 1 },
        { order: 2, textMd: "Fix the first element with a loop, then apply the two-sum opposite-ends approach on the remaining subarray.", hintType: "detail", escalationLevel: 2 },
      ],
      exploreQuestions: [
        { q: "How to avoid duplicate triplets?", r: "Skip the same elements in the outer loop and inner two-pointer loops using `while` loops to advance pointers past identical values." }
      ]
    },
    {
        slug: "tp-03-harbour-container-stack",
        title: "The Harbour Container Stack",
        category: "Opposite Ends",
        difficulty: "EASY",
        statementMd: "### Story\nPort master Elena oversees N vertical pillars along a harbour. She wants to choose two pillars to form the walls of a water reservoir. The amount of water the reservoir holds equals the distance between the pillars multiplied by the height of the shorter pillar. Find the maximum water the reservoir can hold. Elena cannot tilt or move pillars — only choose which two to use.\n\n### Task\nGiven N pillar heights, find the maximum water volume (width × min-height) achievable by choosing any two pillars.",
        constraintsMd: "2 ≤ N ≤ 10⁵\n1 ≤ H[i] ≤ 10⁴",
        tags: JSON.stringify(["two-pointers", "opposite-ends", "max-area"]),
        testCases: [
          { order: 1, input: "9\n1 8 6 2 5 4 8 3 7\n", expected: "49\n", isHidden: false },
          { order: 2, input: "2\n1 1\n", expected: "1\n", isHidden: false },
          { order: 3, input: "6\n4 3 2 1 4\n", expected: "16\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Start with the widest possible reservoir (both ends).", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "To find a larger area, you must find a taller pillar. Moving the taller pillar's pointer inward won't help because the width decreases and the height is limited by the shorter pillar anyway.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why always move the shorter pillar?", r: "The area is limited by the shorter pillar. Moving the taller one inward decreases the width without potentially increasing the height limit. Moving the shorter one is the only way to potentially increase the height limit." }
        ]
    },
    {
        slug: "tp-05-plague-doctor-quarantine",
        title: "The Plague Doctor's Quarantine",
        category: "Same Direction",
        difficulty: "EASY",
        statementMd: "### Story\nPlague doctor Silas must record only unique patient IDs in a scroll. The IDs arrive pre-sorted. He has limited ink and cannot use extra scrolls — he must overwrite the original list in-place, keeping only the first occurrence of each ID, and report how many unique patients there are. The remaining positions in the scroll are ignored.\n\n### Task\nGiven a sorted array A of N integers, remove duplicates in-place and return the count of unique elements. Modify A such that A[0..k-1] holds the k unique elements in order. Print k, then the first k elements.",
        constraintsMd: "1 ≤ N ≤ 10⁵\n-10⁹ ≤ A[i] ≤ 10⁹",
        tags: JSON.stringify(["two-pointers", "same-direction", "in-place"]),
        testCases: [
          { order: 1, input: "6\n1 1 2 3 3 4\n", expected: "4\n1 2 3 4\n", isHidden: false },
          { order: 2, input: "5\n1 1 1 1 1\n", expected: "1\n1\n", isHidden: false },
          { order: 3, input: "4\n-3 -1 0 5\n", expected: "4\n-3 -1 0 5\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Use two pointers: a 'read' pointer (fast) and a 'write' pointer (slow).", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "The slow pointer only advances when you find a value that is different from the last written unique value.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
            { q: "How does the slow pointer work?", r: "The slow pointer always points to the last unique element found. When the fast pointer finds a new unique element, we increment the slow pointer and copy the value there." }
        ]
    },
    {
        slug: "tp-11-flood-model-trapped-rainwater",
        title: "The Flood Model — Trapped Rainwater",
        category: "Partition",
        difficulty: "MEDIUM",
        statementMd: "### Story\nClimate scientist Nora models a mountain terrain as an elevation map. After heavy rain, water gets trapped between peaks. She needs to compute the total volume of trapped rainwater. The terrain is given as a height array. Walls at both ends are implicitly zero. No water flows off the sides.\n\n### Task\nGiven array H of N non-negative integers representing the terrain height at each unit, compute total units of water trapped after rain.",
        constraintsMd: "1 ≤ N ≤ 3×10⁴\n0 ≤ H[i] ≤ 10⁴",
        tags: JSON.stringify(["two-pointers", "partition", "trapping-rainwater"]),
        testCases: [
          { order: 1, input: "12\n0 1 0 2 1 0 1 3 2 1 2 1\n", expected: "6\n", isHidden: false },
          { order: 2, input: "6\n4 2 0 3 2 5\n", expected: "9\n", isHidden: false },
          { order: 3, input: "4\n1 0 1 0\n", expected: "1\n", isHidden: false },
          { order: 4, input: "4\n3 3 0 3\n", expected: "3\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Water at any position is limited by the shorter of the maximum heights to its left and right.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Use two pointers (left and right) and track leftMax and rightMax. Process the side with the smaller max height.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why use two pointers instead of precomputing max arrays?", r: "The two-pointer approach reduces space complexity from O(N) to O(1) by calculating the trapped water on-the-fly." }
        ]
    },
    {
        slug: "tp-12-oracle-mirror-validation",
        title: "The Oracle's Mirror Validation",
        category: "Strings",
        difficulty: "EASY",
        statementMd: "### Story\nOracle Thessaly receives prophecies written on stone tablets. A prophecy is considered 'mirrored' (palindrome) if it reads the same forwards and backwards, ignoring spaces and punctuation (only letters and digits count, and case is ignored). She has Q prophecies to validate before the eclipse.\n\n### Task\nFor each query string, determine if it is a valid palindrome (ignoring non-alphanumeric characters and case). Print YES or NO.",
        constraintsMd: "1 ≤ Q ≤ 100\n1 ≤ |S| ≤ 10⁵",
        tags: JSON.stringify(["two-pointers", "strings", "palindrome"]),
        testCases: [
          { order: 1, input: "1\nA man, a plan, a canal: Panama\n", expected: "YES\n", isHidden: false },
          { order: 2, input: "1\nrace a car\n", expected: "NO\n", isHidden: false },
          { order: 3, input: "1\n \n", expected: "YES\n", isHidden: false },
          { order: 4, input: "1\nNo 'x' in Nixon\n", expected: "YES\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Preprocess the string to remove non-alphanumeric characters or skip them using pointers.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Use left and right pointers moving inward to compare characters.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
            { q: "What should we do with case sensitivity?", r: "Convert all characters to lowercase (or uppercase) before comparing to ensure 'A' and 'a' are treated as identical." }
        ]
    }
  ];

  console.log("\nCreating problems...");
  for (const pd of problemsData) {
    const existing = await prisma.problem.findUnique({
      where: { slug: pd.slug },
    });

    if (existing) {
      console.log(`  Skipping ${pd.slug} (exists)`);
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

  console.log("\nTwo Pointers seed complete!\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
