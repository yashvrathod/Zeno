import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from "crypto";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot run seed.');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

function sha256Hash(text: string) {
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
      statementMd: "### Story\nKing Aldric is hosting a grand banquet. He has N guests seated in a line, each with a known appetite score. The royal chef can only prepare one special dish that exactly feeds two guests simultaneously — the dish size equals the sum of their appetite scores. Given a target dish size T, find any two guests whose combined appetite equals T. The guests are already seated in increasing order of appetite (the king's seating rule).\n\n### Task\nGiven a sorted array A of N integers and a target T, return the indices (0-indexed) of any two elements that sum to T. If no such pair exists, return -1.",
      constraintsMd: "2 ≤ N ≤ 2×10⁵\n1 ≤ A[i] ≤ 10⁹\n1 ≤ T ≤ 2×10⁹",
      tags: JSON.stringify(["two-pointers", "opposite-ends", "array"]),
      testCases: [
        { order: 1, input: "[[1,3,5,7,8], 9]\n",  expected: "[1, 3]\n",  isHidden: false },
        { order: 2, input: "[[2,4,6,8], 10]\n",     expected: "[1, 3]\n",  isHidden: false },
        { order: 3, input: "[[1,2,3], 100]\n",      expected: "-1\n",       isHidden: false },
        { order: 4, input: "[[1,1], 2]\n",          expected: "[0, 1]\n",  isHidden: false },
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
      statementMd: "### Story\nWizard Merinda needs to cast a stability spell using exactly three crystals whose combined power equals zero (positive and negative energies cancel). She has N crystals with integer power values. Find ALL unique triplets — no duplicate triplet should appear twice, even if crystals are identical. The order of crystals in a triplet does not matter.\n\n### Task\nGiven array A of N integers, return an array of all unique triplets (a, b, c) with a ≤ b ≤ c such that a + b + c = 0. The order of triplets in the array does not matter.",
      constraintsMd: "3 ≤ N ≤ 3000\n-10⁵ ≤ A[i] ≤ 10⁵",
      tags: JSON.stringify(["two-pointers", "opposite-ends", "3sum"]),
      testCases: [
        { order: 1, input: "[[-1,0,1,2,-1,-4]]\n",  expected: "[[-1,-1,2],[-1,0,1]]\n", isHidden: false },
        { order: 2, input: "[[0,0,0,0,0]]\n",       expected: "[[0,0,0]]\n",            isHidden: false },
        { order: 3, input: "[[1,2,3,4]]\n",          expected: "[]\n",                     isHidden: false },
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
        statementMd: "### Story\nPort master Elena oversees N vertical pillars along a harbour. She wants to choose two pillars to form the walls of a water reservoir. The amount of water the reservoir holds equals the distance between the pillars multiplied by the height of the shorter pillar. Find the maximum water the reservoir can hold. Elena cannot tilt or move pillars — only choose which two to use.\n\n### Task\nGiven N pillar heights, return the maximum water volume (width × min-height) achievable by choosing any two pillars.",
        constraintsMd: "2 ≤ N ≤ 10⁵\n1 ≤ H[i] ≤ 10⁴",
        tags: JSON.stringify(["two-pointers", "opposite-ends", "max-area"]),
        testCases: [
          { order: 1, input: "[[1,8,6,2,5,4,8,3,7]]\n", expected: "49\n", isHidden: false },
          { order: 2, input: "[[1,1]]\n",                 expected: "1\n",   isHidden: false },
          { order: 3, input: "[[4,3,2,1,4]]\n",            expected: "16\n",  isHidden: false },
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
        slug: "tp-04-alchemist-closest-potion",
        title: "The Alchemist's Closest Potion",
        category: "Opposite Ends",
        difficulty: "MEDIUM",
        statementMd: "### Story\nAlchemist Dorian is crafting a potion that needs exactly three ingredients with a combined potency as close to a target value P as possible. He has N ingredients sorted by potency. Find the triplet whose sum is closest to P. If two triplets are equally close, report the smaller sum.\n\n### Task\nGiven sorted array A of N integers and target P, find the triplet sum closest to P. Output that sum.",
        constraintsMd: "3 ≤ N ≤ 5000\n-10⁴ ≤ A[i] ≤ 10⁴\n-3×10⁴ ≤ P ≤ 3×10⁴",
        tags: JSON.stringify(["two-pointers", "opposite-ends", "3sum-closest"]),
        testCases: [
          { order: 1, input: "4 2\n-1 2 1 -4\n", expected: "2\n", isHidden: false },
          { order: 2, input: "4 1\n0 0 0 1\n", expected: "1\n", isHidden: false },
          { order: 3, input: "3 100\n1 2 3\n", expected: "6\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Fix one element, use two pointers on the rest. Track closest sum seen so far.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Almost identical to 3Sum but instead of checking == 0, update a 'best answer' variable.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "How to update the best answer?", r: "Calculate the difference `Math.abs(target - currentSum)`. If it is less than the current best difference, update the best sum." }
        ]
    },
    {
        slug: "tp-05-plague-doctor-quarantine",
        title: "The Plague Doctor's Quarantine",
        category: "Same Direction",
        difficulty: "EASY",
        statementMd: "### Story\nPlague doctor Silas must record only unique patient IDs in a scroll. The IDs arrive pre-sorted. He has limited ink and cannot use extra scrolls — he must overwrite the original list in-place, keeping only the first occurrence of each ID, and report how many unique patients there are. The remaining positions in the scroll are ignored.\n\n### Task\nGiven a sorted array A of N integers, return the array of unique elements in their first-occurrence order. Duplicates beyond the first occurrence are dropped.",
        constraintsMd: "1 ≤ N ≤ 10⁵\n-10⁹ ≤ A[i] ≤ 10⁹",
        tags: JSON.stringify(["two-pointers", "same-direction", "in-place"]),
        testCases: [
          { order: 1, input: "[[1,1,2,3,3,4]]\n",  expected: "[1,2,3,4]\n",     isHidden: false },
          { order: 2, input: "[[1,1,1,1,1]]\n",    expected: "[1]\n",           isHidden: false },
          { order: 3, input: "[[-3,-1,0,5]]\n",    expected: "[-3,-1,0,5]\n",   isHidden: false },
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
        slug: "tp-06-cartographer-expedition",
        title: "The Cartographer's Expedition",
        category: "Same Direction",
        difficulty: "EASY",
        statementMd: "### Story\nCartographer Lyra is mapping a mountain range. She records the elevation change at each step as a positive integer. She wants to find the shortest contiguous stretch of terrain whose total elevation gain equals exactly a target G.\n\n### Task\nGiven array A of N positive integers and target G, find the minimum length contiguous subarray with sum exactly G. Print the length, or -1 if none.",
        constraintsMd: "1 ≤ N ≤ 10⁵\n1 ≤ A[i] ≤ 10⁴\n1 ≤ G ≤ 10⁹",
        tags: JSON.stringify(["two-pointers", "sliding-window", "subarray-sum"]),
        testCases: [
          { order: 1, input: "8 7\n2 3 1 2 4 3 1 2\n", expected: "2\n", isHidden: false },
          { order: 2, input: "5 15\n1 2 3 4 5\n", expected: "5\n", isHidden: false },
          { order: 3, input: "3 100\n1 2 3\n", expected: "-1\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Expand the window by moving the right pointer. Shrink by moving the left pointer when sum equals target.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Since all values are positive, the sum is monotonic. Use two pointers to maintain the current sum.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Can we use this if there are negative numbers?", r: "No, with negative numbers the sum is not monotonic as the window grows. You would need prefix sums and a hash map instead." }
        ]
    },
    {
        slug: "tp-07-spy-network-code-breaker",
        title: "The Spy Network's Code Breaker",
        category: "Same Direction",
        difficulty: "EASY",
        statementMd: "### Story\nSpy coordinator Vance intercepts enemy messages encoded as arrays of integers. He wants to find the longest contiguous segment of the message that contains at most K distinct values.\n\n### Task\nGiven array A of N integers and integer K, find the length of the longest contiguous subarray containing at most K distinct values.",
        constraintsMd: "1 ≤ N ≤ 10⁵\n1 ≤ A[i] ≤ 10⁵\n1 ≤ K ≤ N",
        tags: JSON.stringify(["two-pointers", "sliding-window", "at-most-k-distinct"]),
        testCases: [
          { order: 1, input: "7 2\n1 2 1 3 2 2 3\n", expected: "4\n", isHidden: false },
          { order: 2, input: "5 3\n1 2 3 4 5\n", expected: "3\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Maintain a frequency map of elements in the window. Shrink from the left whenever distinct count exceeds K.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "HashMap + two pointers is extremely powerful for tracking the state of the window in O(1).", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "What is the time complexity?", r: "O(N) because each pointer (left and right) travels across the array at most once." }
        ]
    },
    {
        slug: "tp-08-merchant-profit-window",
        title: "The Merchant's Profit Window",
        category: "Same Direction",
        difficulty: "MEDIUM",
        statementMd: "### Story\nMerchant Ophelia sells exactly K different types of goods. Her inventory log records type IDs for each item in order. She wants the number of contiguous segments of her log that contain EXACTLY K distinct item types — each such segment represents a valid product showcase she could run.\n\n### Task\nGiven array A of N integers and integer K, count the number of contiguous subarrays containing EXACTLY K distinct values.",
        constraintsMd: "1 ≤ N ≤ 2×10⁴\n1 ≤ A[i] ≤ N\n1 ≤ K ≤ N",
        tags: JSON.stringify(["two-pointers", "sliding-window", "exactly-k-distinct"]),
        testCases: [
          { order: 1, input: "5 2\n1 2 1 2 3\n", expected: "7\n", isHidden: false },
          { order: 2, input: "5 1\n1 1 1 1 1\n", expected: "5\n", isHidden: false },
          { order: 3, input: "4 3\n1 2 3 4\n", expected: "2\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "f(exactly K) = f(at most K) − f(at most K−1). Solve the 'at most K' version twice.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "'Exactly K' is hard to track directly but becomes easy with the 'atMost(K) - atMost(K-1)' reduction.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why use the atMost trick?", r: "Tracking 'exactly K' requires complex conditions to shrink the window from both sides. Calculating 'at most K' is monotonic and simple, and their difference gives exactly K." }
        ]
    },
    {
        slug: "tp-09-arena-color-sorting",
        title: "The Arena's Color Sorting Trial",
        category: "Partition",
        difficulty: "EASY",
        statementMd: "### Story\nArena master Calix has N warriors, each wearing a red (0), white (1), or blue (2) sash. He must arrange them in order: all reds first, then whites, then blues — in a single pass without counting. The arrangement must be done in-place.\n\n### Task\nGiven array A of N integers each 0, 1, or 2, sort it in-place in O(N) time using at most O(1) extra space. Print the sorted array.",
        constraintsMd: "1 ≤ N ≤ 3×10⁵\nA[i] ∈ {0, 1, 2}",
        tags: JSON.stringify(["two-pointers", "partition", "dutch-national-flag"]),
        testCases: [
          { order: 1, input: "6\n2 0 2 1 1 0\n", expected: "0 0 1 1 2 2\n", isHidden: false },
          { order: 2, input: "5\n0 0 0 0 0\n", expected: "0 0 0 0 0\n", isHidden: false },
          { order: 3, input: "4\n1 0 2 1\n", expected: "0 1 1 2\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Three pointers: low (next 0 pos), mid (current), high (next 2 pos).", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "When A[mid]=0 swap with low++; when 2 swap with high--; when 1 just mid++.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "What is the invariant here?", r: "A[0..low-1]=0, A[low..mid-1]=1, A[high+1..N-1]=2 at all times." }
        ]
    },
    {
        slug: "tp-10-siege-engineer-catapult-ranges",
        title: "The Siege Engineer's Catapult Ranges",
        category: "Partition",
        difficulty: "MEDIUM",
        statementMd: "### Story\nSiege engineer Brennan has N catapults sorted by their launch power (negative = fires backward, positive = fires forward). He needs to know, after squaring all launch powers (to compute kinetic energy), what the sorted order of energies would be. He must do this in O(N) time — no time for re-sorting.\n\n### Task\nGiven a sorted (non-decreasing) array A of N integers (may include negatives), return the array of squares sorted in non-decreasing order. Do it in O(N).",
        constraintsMd: "1 ≤ N ≤ 10⁵\n-10⁴ ≤ A[i] ≤ 10⁴",
        tags: JSON.stringify(["two-pointers", "opposite-ends", "squares-sorted"]),
        testCases: [
          { order: 1, input: "6\n-4 -1 0 3 10\n", expected: "0 1 9 16 100\n", isHidden: false },
          { order: 2, input: "4\n-7 -3 2 3\n", expected: "4 9 9 49\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Largest squares come from the ends of the original sorted array.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Use two pointers at both ends, fill the result array from right to left.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why fill from right to left?", r: "Since the largest squares are at the ends, it's easier to find the maximum in each step and place it at the end of the new array." }
        ]
    },
    {
        slug: "tp-11-flood-model-trapped-rainwater",
        title: "The Flood Model — Trapped Rainwater",
        category: "Partition",
        difficulty: "MEDIUM",
        statementMd: "### Story\nClimate scientist Nora models a mountain terrain as an elevation map. After heavy rain, water gets trapped between peaks. She needs to compute the total volume of trapped rainwater. The terrain is given as a height array. Walls at both ends are implicitly zero. No water flows off the sides.\n\n### Task\nGiven array H of N non-negative integers representing the terrain height at each unit, return the total units of water trapped after rain.",
        constraintsMd: "1 ≤ N ≤ 3×10⁴\n0 ≤ H[i] ≤ 10⁴",
        tags: JSON.stringify(["two-pointers", "partition", "trapping-rainwater"]),
        testCases: [
          { order: 1, input: "[[0,1,0,2,1,0,1,3,2,1,2,1]]\n", expected: "6\n", isHidden: false },
          { order: 2, input: "[[4,2,0,3,2,5]]\n",            expected: "9\n", isHidden: false },
          { order: 3, input: "[[1,0,1,0]]\n",                 expected: "1\n", isHidden: false },
          { order: 4, input: "[[3,3,0,3]]\n",                 expected: "3\n", isHidden: false },
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
        statementMd: "### Story\nOracle Thessaly receives a single prophecy written on a stone tablet. A prophecy is considered 'mirrored' (palindrome) if it reads the same forwards and backwards, ignoring spaces and punctuation (only letters and digits count, and case is ignored).\n\n### Task\nGiven a string `s`, return **true** if it is a palindrome (ignoring non-alphanumeric characters and case), or **false** otherwise.",
        constraintsMd: "1 ≤ s.length ≤ 10⁵",
        tags: JSON.stringify(["two-pointers", "strings", "palindrome"]),
        testCases: [
          { order: 1, input: "[\"A man, a plan, a canal: Panama\"]\n", expected: "true\n", isHidden: false },
          { order: 2, input: "[\"race a car\"]\n", expected: "false\n", isHidden: false },
          { order: 3, input: "[\" \"]\n", expected: "true\n", isHidden: false },
          { order: 4, input: "[\"No 'x' in Nixon\"]\n", expected: "true\n", isHidden: true },
        ],
        hints: [
          { order: 1, textMd: "Preprocess the string to remove non-alphanumeric characters or skip them using pointers.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Use left and right pointers moving inward to compare characters.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
            { q: "What should we do with case sensitivity?", r: "Convert all characters to lowercase (or uppercase) before comparing to ensure 'A' and 'a' are treated as identical." }
        ]
    },
    {
        slug: "tp-13-forger-one-repair",
        title: "The Forger's One Repair",
        category: "Strings",
        difficulty: "EASY",
        statementMd: "### Story\nForger Renata must make a document appear authentic. A document passes inspection if it is a palindrome. She can erase at most one character. Determine if the document can become a palindrome with at most one erasure.\n\n### Task\nGiven string S, determine if it can become a palindrome by removing at most one character. Print YES or NO.",
        constraintsMd: "1 ≤ |S| ≤ 10⁵\nS contains only lowercase English letters",
        tags: JSON.stringify(["two-pointers", "strings", "palindrome-one-delete"]),
        testCases: [
          { order: 1, input: "abca\n", expected: "YES\n", isHidden: false },
          { order: 2, input: "raceacar\n", expected: "NO\n", isHidden: false },
          { order: 3, input: "abcba\n", expected: "YES\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Use two pointers. When a mismatch is found, try skipping the left character OR the right character.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Check if either remaining substring (after skipping one char) is a palindrome. This remains O(N).", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why is it O(N)?", r: "You only perform the skip-and-check at most once. The rest is a standard two-pointer pass." }
        ]
    },
    {
        slug: "tp-14-linguist-shortest-transform",
        title: "The Linguist's Shortest Transform",
        category: "Strings",
        difficulty: "MEDIUM",
        statementMd: "### Story\nLinguist Evander studies ancient manuscripts. He has a source text T and a pattern word P. He needs to find the shortest contiguous window in T that contains all characters of P (in any order, with multiplicity).\n\n### Task\nGiven strings T (text) and P (pattern), find the minimum length window in T that contains all characters of P. Output the window substring. If none, print -1.",
        constraintsMd: "1 ≤ |P| ≤ |T| ≤ 10⁵\nBoth strings contain only lowercase letters",
        tags: JSON.stringify(["two-pointers", "sliding-window", "minimum-window-substring"]),
        testCases: [
          { order: 1, input: "adobecodebanc abc\n", expected: "banc\n", isHidden: false },
          { order: 2, input: "aaabbbccc abc\n", expected: "abbbc\n", isHidden: false },
          { order: 3, input: "xyz abc\n", expected: "-1\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Expand right until all chars of P are covered; then shrink from left as much as possible. Track coverage with a count variable.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "The 'formed' counter (how many unique characters in P are satisfied with required frequency) lets you check window validity in O(1).", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "What is the sliding window logic here?", r: "Expand the right pointer to include characters until the criteria is met, then contract the left pointer to find the minimum window that still meets the criteria." }
        ]
    },
    {
        slug: "tp-15-botanist-fruit-basket",
        title: "The Botanist's Fruit Basket",
        category: "Advanced",
        difficulty: "MEDIUM",
        statementMd: "### Story\nBotanist Iris travels a fruit garden where each tree bears one type of fruit (represented by an integer). She carries two baskets, each holding only one fruit type. Starting from any tree, she picks fruit from consecutive trees until she must stop (she cannot put a third fruit type in her baskets).\n\n### Task\nGiven array A of N integers (fruit types), find the maximum length of a contiguous subarray with at most 2 distinct values.",
        constraintsMd: "1 ≤ N ≤ 10⁵\n1 ≤ A[i] ≤ 10⁵",
        tags: JSON.stringify(["two-pointers", "sliding-window", "at-most-2-distinct"]),
        testCases: [
          { order: 1, input: "5\n1 2 1 2 3\n", expected: "4\n", isHidden: false },
          { order: 2, input: "6\n0 1 2 2 2 1\n", expected: "5\n", isHidden: false },
          { order: 3, input: "4\n3 3 3 3\n", expected: "4\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Same pattern as 'at most K distinct' with K=2.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "A HashMap tracks at most 2 types; shrink from the left when a third type appears.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "How to track the number of distinct elements?", r: "Use a frequency map (or hash map). The map's size tells you the number of distinct fruit types currently in your baskets." }
        ]
    },
    {
        slug: "tp-16-general-subarray-battle",
        title: "The General's Subarray Battle Count",
        category: "Advanced",
        difficulty: "MEDIUM",
        statementMd: "### Story\nGeneral Maxis needs to deploy squads. Each squad is a contiguous subarray of soldier power values. A squad is 'combat-ready' if the product of its soldiers' powers is strictly less than a threshold K. Count all possible combat-ready squads. All power values are positive.\n\n### Task\nGiven array A of N positive integers and integer K, count the number of contiguous subarrays whose product of elements is strictly less than K.",
        constraintsMd: "1 ≤ N ≤ 3×10⁴\n1 ≤ A[i] ≤ 1000\n0 ≤ K ≤ 10⁶",
        tags: JSON.stringify(["two-pointers", "sliding-window", "subarray-product"]),
        testCases: [
          { order: 1, input: "4 100\n10 5 2 6\n", expected: "8\n", isHidden: false },
          { order: 2, input: "3 0\n0 1 2 3\n", expected: "0\n", isHidden: false },
          { order: 3, input: "5 10\n1 2 3 4 5\n", expected: "7\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Maintain a sliding window product. For each right pointer position, the number of valid subarrays ending at right is (right - left + 1).", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "When you fix the right boundary and find the smallest left such that the window is valid, ALL subarrays [left..right], [left+1..right], ..., [right..right] are valid.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why add (right - left + 1)?", r: "Every subarray ending at `right` and starting anywhere between `left` and `right` (inclusive) will also have a product less than K if the product of [left..right] is less than K (since all numbers are positive)." }
        ]
    },
    {
        slug: "tp-17-architect-longest-bridge",
        title: "The Architect's Longest Valid Bridge",
        category: "Advanced",
        difficulty: "HARD",
        statementMd: "### Story\nArchitect Celeste is designing a bridge. The structural plan is a binary string: 1 = strong pillar, 0 = weak support. She has budget to reinforce at most K weak supports (flipping 0s to 1s). Find the longest contiguous stretch of the bridge that can be made entirely strong (all 1s) using at most K flips.\n\n### Task\nGiven binary array A of N integers (0s and 1s) and integer K, find the maximum length of a contiguous subarray that contains at most K zeros.",
        constraintsMd: "1 ≤ N ≤ 10⁵\nA[i] ∈ {0, 1}\n0 ≤ K ≤ N",
        tags: JSON.stringify(["two-pointers", "sliding-window", "longest-ones-with-flips"]),
        testCases: [
          { order: 1, input: "6 2\n1 1 1 0 0 0\n", expected: "5\n", isHidden: false },
          { order: 2, input: "10 2\n1 1 0 0 0 1 1 0 1 1\n", expected: "6\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Sliding window: track the count of zeros in the window. When zeros exceed K, move the left pointer past the first zero.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Instead of tracking the leftmost zero explicitly, you can use a 'lazy shrink' — only shrink the window when its size would NOT improve the answer.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "What is the lazy shrink trick?", r: "It's a way to maintain the maximum window size seen so far. The window only shifts or grows, never contracts, giving an elegant O(N) solution." }
        ]
    },
    {
        slug: "tp-18-mathematician-missing-ranges",
        title: "The Mathematician's Missing Ranges",
        category: "Advanced",
        difficulty: "HARD",
        statementMd: "### Story\nMathematician Quintus studies number quartets. He has a sequence of N integers and a target T. He needs all unique quadruplets (a, b, c, d) such that a + b + c + d = T. As a researcher, he must list them without duplicates, sorted lexicographically.\n\n### Task\nGiven array A of N integers and target T, find all unique quadruplets (a ≤ b ≤ c ≤ d) with sum T. Print count on first line, then each quadruplet.",
        constraintsMd: "4 ≤ N ≤ 200\n-10⁹ ≤ A[i] ≤ 10⁹\n-10⁹ ≤ T ≤ 10⁹",
        tags: JSON.stringify(["two-pointers", "opposite-ends", "4sum"]),
        testCases: [
          { order: 1, input: "6 0\n1 0 -1 0 -2 2\n", expected: "3\n-2 -1 1 2\n-2 0 0 2\n-1 0 0 1\n", isHidden: false },
          { order: 2, input: "5 0\n0 0 0 0 0\n", expected: "1\n0 0 0 0\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "kSum generalizes: each outer loop reduces k by 1 until you reach 2Sum (two pointers).", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "For 4Sum, you'll have two nested loops fixing two elements, then two pointers for the remaining sum. Deduplication is key.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "What is the complexity?", r: "O(N³). Each outer loop reduces the problem size. With N=200, N³ is 8,000,000, which fits in time limits." }
        ]
    },
    {
        slug: "tp-19-shipwright-greedy-pairs",
        title: "The Shipwright's Greedy Pairs",
        category: "Advanced",
        difficulty: "HARD",
        statementMd: "### Story\nShipwright Cassius must rescue N people from a sinking island. Each rescue boat holds at most 2 people and has a weight limit W. Each person has a weight. Find the minimum number of boats needed to save everyone. Cassius wants to pair heavy and light people optimally.\n\n### Task\nGiven array A of N people's weights and limit W (each A[i] ≤ W guaranteed), find the minimum number of boats needed where each boat holds ≤ 2 people with total weight ≤ W.",
        constraintsMd: "1 ≤ N ≤ 5×10⁴\n1 ≤ A[i] ≤ W ≤ 3×10⁴",
        tags: JSON.stringify(["two-pointers", "greedy", "boats-to-save-people"]),
        testCases: [
          { order: 1, input: "4 3\n1 2 2 3\n", expected: "3\n", isHidden: false },
          { order: 2, input: "3 3\n3 2 2\n", expected: "3\n", isHidden: false },
          { order: 3, input: "2 10\n5 5\n", expected: "1\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Sort the weights. Greedily pair the heaviest with the lightest (if they fit).", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "If the heaviest and lightest don't fit, the heaviest must go alone. The lightest might pair with someone else.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why greedy work here?", r: "The lightest person is always the best possible candidate to pair with the heaviest person. If they can't pair, the heaviest must have a boat to themselves." }
        ]
    },
    {
        slug: "tp-20-clockmaker-circular-palindrome",
        title: "The Clockmaker's Circular Palindrome",
        category: "Advanced",
        difficulty: "HARD",
        statementMd: "### Story\nClockmaker Theo engraves palindromic motifs on clock faces. He has a string of N characters and wants to find the longest palindromic substring.\n\n### Task\nGiven string S of length N, find the longest palindromic substring. If multiple answers of the same maximum length exist, output the one that appears first. Output the substring and its length.",
        constraintsMd: "1 ≤ N ≤ 10³\nS contains only lowercase English letters",
        tags: JSON.stringify(["two-pointers", "strings", "longest-palindromic-substring"]),
        testCases: [
          { order: 1, input: "babad\n", expected: "bab 3\n", isHidden: false },
          { order: 2, input: "cbbd\n", expected: "bb 2\n", isHidden: false },
          { order: 3, input: "a\n", expected: "a 1\n", isHidden: false },
        ],
        hints: [
          { order: 1, textMd: "Expand around every center. Each character is an odd-length center; each gap between characters is an even-length center.", hintType: "strategy", escalationLevel: 1 },
          { order: 2, textMd: "Total: 2N-1 centers. For each center, expand while characters match.", hintType: "detail", escalationLevel: 2 },
        ],
        exploreQuestions: [
          { q: "Why use two pointers expanding outward?", r: "Expanding outward from a center allows us to find the longest palindrome for that specific center in O(N). Doing this for all centers gives O(N²)." }
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
        difficulty: pd.difficulty as any,
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
          hintType: hint.hintType as any,
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
