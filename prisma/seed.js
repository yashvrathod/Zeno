/* eslint-disable no-console */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from 'crypto';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot run seed.');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

function sha256Hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────
// TWO POINTERS PROBLEMS (20 problems across 5 categories)
// ─────────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  // ── Category 1: Opposite-Ends ──
  {
    slug: "royal-banquet-pairing",
    title: "The Royal Banquet Pairing",
    difficulty: "EASY",
    statementMd: `# The Royal Banquet Pairing\n\nKing Aldric is hosting a grand banquet. He has N guests seated in a line, each with a known appetite score. The royal chef can only prepare one special dish that exactly feeds two guests simultaneously — the dish size equals the sum of their appetite scores. Given a target dish size T, find any two guests whose combined appetite equals T.\n\nThe guests are already seated in increasing order of appetite.\n\n## Input\nFirst line: N and T\nSecond line: N space-separated integers (sorted)\n\n## Output\nPrint the 1-indexed positions of any two guests that sum to T, or -1 if no pair exists.`,
    constraintsMd: `1 <= N <= 10^5\n1 <= A[i] <= 10^9\n1 <= T <= 2*10^9`,
    tags: ["two_pointers", "opposite_ends", "2sum"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Place one pointer at the leftmost guest and one at the rightmost. If their sum is too large, move the right pointer left; if too small, move the left pointer right.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Since the array is sorted, if A[left] + A[right] > T, no element to the right of left can pair with A[right] to make T. So move right--.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "The classic opposite-ends pattern: left = 0, right = N-1. While left < right, adjust based on sum vs target. O(N) time, O(1) space.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "5 9\n1 3 5 7 8\n", expected: "2 4\n", isHidden: false },
      { order: 2, input: "4 10\n2 4 6 8\n", expected: "2 4\n", isHidden: false },
      { order: 3, input: "3 100\n1 2 3\n", expected: "-1\n", isHidden: true },
      { order: 4, input: "2 2\n1 1\n", expected: "1 2\n", isHidden: true },
    ],
    keyInsight: "Sorted array + target sum means you can use opposite-ends pointers. If sum > target, decrement right; if sum < target, increment left. O(N) time, O(1) space.",
  },
  {
    slug: "wizards-triplet-spell",
    title: "The Wizard's Triplet Spell",
    difficulty: "MEDIUM",
    statementMd: `# The Wizard's Triplet Spell\n\nWizard Merinda needs to cast a stability spell using exactly three crystals whose combined power equals zero (positive and negative energies cancel). She has N crystals with integer power values. Find ALL unique triplets — no duplicate triplet should appear twice, even if crystals are identical.\n\n## Input\nFirst line: N\nSecond line: N space-separated integers\n\n## Output\nFirst line: count of unique triplets\nThen each triplet on its own line (values in non-decreasing order).`,
    constraintsMd: `1 <= N <= 3000\n-10^9 <= A[i] <= 10^9`,
    tags: ["two_pointers", "3sum", "deduplication"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Sort the array first. Fix the first element with a loop (skip duplicates!), then apply opposite-ends two pointers on the remaining subarray.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "For each fixed element A[i], you need A[left] + A[right] = -A[i]. This reduces to 2Sum. Skip when i > 0 and A[i] == A[i-1] to avoid duplicate triplets.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Deduplication at each pointer is critical: skip duplicates when you find a match (while left < right && A[left] == A[left+1]) left++.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "6\n-1 0 1 2 -1 -4\n", expected: "2\n-1 -1 2\n-1 0 1\n", isHidden: false },
      { order: 2, input: "5\n0 0 0 0 0\n", expected: "1\n0 0 0\n", isHidden: false },
      { order: 3, input: "4\n1 2 3 4\n", expected: "0\n", isHidden: true },
      { order: 4, input: "3\n-1000 0 1000\n", expected: "1\n-1000 0 1000\n", isHidden: true },
    ],
    keyInsight: "3Sum reduces to 2Sum via sorting + fixing one element. Deduplication at each pointer is critical — skip when A[i] == A[i-1].",
  },
  {
    slug: "harbour-container-stack",
    title: "The Harbour Container Stack",
    difficulty: "EASY",
    statementMd: `# The Harbour Container Stack\n\nPort master Elena oversees N vertical pillars along a harbour. She wants to choose two pillars to form the walls of a water reservoir. The amount of water the reservoir holds equals the distance between the pillars multiplied by the height of the shorter pillar.\n\nFind the maximum water the reservoir can hold. Elena cannot tilt or move pillars — only choose which two to use.\n\n## Input\nFirst line: N\nSecond line: N space-separated integers (pillar heights)\n\n## Output\nPrint the maximum water volume (width x min-height) achievable.`,
    constraintsMd: `2 <= N <= 10^5\n1 <= H[i] <= 10^4`,
    tags: ["two_pointers", "max_area", "container_with_most_water"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Start with the widest possible container (both ends). To potentially improve, move the shorter pillar's pointer inward.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Moving the taller pointer can never improve the answer — width decreases and height is still limited by the shorter. Always advance the shorter pillar pointer.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Track max_area as you go: while left < right, area = min(h[left], h[right]) * (right - left), update max, then move the pointer at the shorter pillar.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "9\n1 8 6 2 5 4 8 3 7\n", expected: "49\n", isHidden: false },
      { order: 2, input: "2\n1 1\n", expected: "1\n", isHidden: false },
      { order: 3, input: "6\n4 3 2 1 4\n", expected: "16\n", isHidden: true },
      { order: 4, input: "4\n1 2 1 2\n", expected: "4\n", isHidden: true },
    ],
    keyInsight: "Moving the taller pointer inward can never improve the answer. Always advance the shorter pillar pointer.",
  },
  {
    slug: "alchemists-closest-potion",
    title: "The Alchemist's Closest Potion",
    difficulty: "MEDIUM",
    statementMd: `# The Alchemist's Closest Potion\n\nAlchemist Dorian is crafting a potion that needs exactly three ingredients with a combined potency as close to a target value P as possible. He has N ingredients sorted by potency. Find the triplet whose sum is closest to P.\n\nIf two triplets are equally close, report the smaller sum.\n\n## Input\nFirst line: N and P\nSecond line: N space-separated integers (sorted)\n\n## Output\nPrint the closest triplet sum.`,
    constraintsMd: `3 <= N <= 5000\n-10^4 <= A[i] <= 10^4\n-3*10^4 <= P <= 3*10^4`,
    tags: ["two_pointers", "3sum_closest"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Fix one element, use two pointers on the rest. Track the closest sum seen so far.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Initialize closest = infinity. For each triplet, if |sum - P| < |closest - P|, update closest. Move pointers based on sum vs P comparison.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "If sum < P, move left++ (need larger). If sum > P, move right-- (need smaller). If sum == P, return immediately.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "4 2\n-1 2 1 -4\n", expected: "2\n", isHidden: false },
      { order: 2, input: "4 1\n0 0 0 1\n", expected: "1\n", isHidden: false },
      { order: 3, input: "3 100\n1 2 3\n", expected: "6\n", isHidden: true },
      { order: 4, input: "5 0\n-4 -1 -1 0 1\n", expected: "-2\n", isHidden: true },
    ],
    keyInsight: "Almost identical to 3Sum but instead of checking == 0, update a 'best answer' variable. If sum == P exactly, return immediately.",
  },

  // ── Category 2: Same-Direction ──
  {
    slug: "plague-doctors-quarantine",
    title: "The Plague Doctor's Quarantine",
    difficulty: "EASY",
    statementMd: `# The Plague Doctor's Quarantine\n\nPlague doctor Silas must record only unique patient IDs in a scroll. The IDs arrive pre-sorted. He has limited ink and cannot use extra scrolls — he must overwrite the original list in-place, keeping only the first occurrence of each ID, and report how many unique patients there are.\n\n## Input\nFirst line: N\nSecond line: N space-separated integers (sorted)\n\n## Output\nFirst line: k (count of unique elements)\nSecond line: the k unique elements in order`,
    constraintsMd: `1 <= N <= 10^5\n-10^5 <= A[i] <= 10^5`,
    tags: ["two_pointers", "remove_duplicates", "slow_fast"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Use a 'write' pointer (slow) and a 'read' pointer (fast). The slow pointer only advances when a new unique element is found.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Both start at index 1. If A[fast] != A[slow-1], copy A[fast] to A[slow] and increment slow. This keeps unique elements at the start.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Return slow as the count. The unique elements are in A[0..slow-1]. O(N) time, O(1) extra space.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "6\n1 1 2 3 3 4\n", expected: "4\n1 2 3 4\n", isHidden: false },
      { order: 2, input: "5\n1 1 1 1 1\n", expected: "1\n1\n", isHidden: false },
      { order: 3, input: "4\n-3 -1 0 5\n", expected: "4\n-3 -1 0 5\n", isHidden: true },
      { order: 4, input: "1\n42\n", expected: "1\n42\n", isHidden: true },
    ],
    keyInsight: "Slow pointer marks the next write position; fast pointer scans ahead. This slow/fast in-place overwrite pattern appears in dozens of problems.",
  },
  {
    slug: "cartographers-expedition",
    title: "The Cartographer's Expedition",
    difficulty: "EASY",
    statementMd: `# The Cartographer's Expedition\n\nCartographer Lyra is mapping a mountain range. She records the elevation change at each step as a positive integer. She wants to find the shortest contiguous stretch of terrain whose total elevation gain equals exactly a target G.\n\n## Input\nFirst line: N and G\nSecond line: N space-separated positive integers\n\n## Output\nPrint the minimum length contiguous subarray with sum exactly G, or -1 if none.`,
    constraintsMd: `1 <= N <= 10^5\n1 <= A[i] <= 10^4\n1 <= G <= 10^9`,
    tags: ["two_pointers", "subarray_sum", "sliding_window"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Expand the window by moving the right pointer. Shrink by moving the left pointer when sum >= G.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "While sum >= G, try to shrink from left (update min_len when sum == G). With all positive values, sum is monotonic as window grows/shrinks.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Track min_len initialized to infinity. After processing, if min_len is still infinity, return -1.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "8 7\n2 3 1 2 4 3 1 2\n", expected: "2\n", isHidden: false },
      { order: 2, input: "5 15\n1 2 3 4 5\n", expected: "5\n", isHidden: false },
      { order: 3, input: "3 100\n1 2 3\n", expected: "-1\n", isHidden: true },
      { order: 4, input: "4 6\n3 3 3 3\n", expected: "2\n", isHidden: true },
    ],
    keyInsight: "With all positive values, sum is monotonic as window grows/shrinks — this enables the two-pointer sliding window. Negative numbers would need prefix sums.",
  },
  {
    slug: "spy-networks-code-breaker",
    title: "The Spy Network's Code Breaker",
    difficulty: "MEDIUM",
    statementMd: `# The Spy Network's Code Breaker\n\nSpy coordinator Vance intercepts enemy messages encoded as arrays of integers. He wants to find the longest contiguous segment of the message that contains at most K distinct values (each value represents a different enemy agent ID).\n\n## Input\nFirst line: N and K\nSecond line: N space-separated integers\n\n## Output\nPrint the length of the longest contiguous subarray containing at most K distinct values.`,
    constraintsMd: `1 <= N <= 10^5\n1 <= A[i] <= N\n1 <= K <= N`,
    tags: ["two_pointers", "k_distinct", "hashmap", "sliding_window"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Maintain a frequency map of elements in the window. Shrink from the left whenever distinct count exceeds K.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Use a Map/object for frequencies. When a new element enters window, increment its count. When a count drops to 0, decrement the distinct counter.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "While (distinct > K): decrement freq[A[left]], if it becomes 0 decrement distinct, left++. Update max_len at each step.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "7 2\n1 2 1 3 2 2 3\n", expected: "4\n", isHidden: false },
      { order: 2, input: "5 3\n1 2 3 4 5\n", expected: "3\n", isHidden: false },
      { order: 3, input: "5 1\n2 2 2 2 2\n", expected: "5\n", isHidden: true },
      { order: 4, input: "6 2\n1 2 3 1 2 3\n", expected: "4\n", isHidden: true },
    ],
    keyInsight: "HashMap + two pointers is extremely powerful. The map tracks window state in O(1) per element. This pattern underlies most 'longest window with constraint' problems.",
  },
  {
    slug: "merchants-profit-window",
    title: "The Merchant's Profit Window",
    difficulty: "HARD",
    statementMd: `# The Merchant's Profit Window\n\nMerchant Ophelia wants the number of contiguous segments of her inventory log that contain EXACTLY K distinct item types — each such segment represents a valid product showcase she could run.\n\n## Input\nFirst line: N and K\nSecond line: N space-separated integers\n\n## Output\nPrint the count of contiguous subarrays containing exactly K distinct values.`,
    constraintsMd: `1 <= N <= 10^5\n1 <= A[i] <= N\n1 <= K <= N`,
    tags: ["two_pointers", "exactly_k", "at_most_k_trick"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "exactly(K) = at_most(K) - at_most(K-1). Solve the 'at most K' version twice.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Write a helper function atMost(k) using sliding window + frequency map. Return atMost(K) - atMost(K-1).", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "For atMost(k): for each right, while distinct > k, shrink left. Add (right - left + 1) to count — all subarrays ending at right are valid.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "5 2\n1 2 1 2 3\n", expected: "7\n", isHidden: false },
      { order: 2, input: "5 1\n1 1 1 1 1\n", expected: "5\n", isHidden: false },
      { order: 3, input: "4 3\n1 2 3 4\n", expected: "2\n", isHidden: true },
      { order: 4, input: "3 2\n1 2 1\n", expected: "3\n", isHidden: true },
    ],
    keyInsight: "'Exactly K' becomes easy with atMost(K) - atMost(K-1). For atMost(k), adding (right-left+1) counts all valid subarrays ending at right in O(1).",
  },

  // ── Category 3: Partition ──
  {
    slug: "arenas-color-sorting-trial",
    title: "The Arena's Color Sorting Trial",
    difficulty: "EASY",
    statementMd: `# The Arena's Color Sorting Trial\n\nArena master Calix has N warriors, each wearing a red (0), white (1), or blue (2) sash. He must arrange them in order: all reds first, then whites, then blues — in a single pass without counting, done in-place.\n\n## Input\nFirst line: N\nSecond line: N space-separated integers (each 0, 1, or 2)\n\n## Output\nPrint the sorted array.`,
    constraintsMd: `1 <= N <= 3*10^5\nA[i] in {0, 1, 2}`,
    tags: ["two_pointers", "dutch_flag", "partition"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Three pointers: low (next 0 pos), mid (current), high (next 2 pos). When A[mid]=0 swap with low++; when A[mid]=2 swap with high--; when 1 just mid++.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "The invariant: A[0..low-1]=0, A[low..mid-1]=1, A[high+1..N-1]=2 at all times. Mid scans left to right.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Swap A[mid] with A[low], then low++ and mid++. If A[mid]==2, swap with A[high] and high-- but DON'T increment mid (the swapped-in element is unknown).", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "6\n2 0 2 1 1 0\n", expected: "0 0 1 1 2 2\n", isHidden: false },
      { order: 2, input: "5\n0 0 0 0 0\n", expected: "0 0 0 0 0\n", isHidden: false },
      { order: 3, input: "5\n2 2 2 2 2\n", expected: "2 2 2 2 2\n", isHidden: true },
      { order: 4, input: "4\n1 0 2 1\n", expected: "0 1 1 2\n", isHidden: true },
    ],
    keyInsight: "Three-pointer partition (Dutch National Flag). The invariant is A[0..low-1]=0, A[low..mid-1]=1, A[high+1..N-1]=2. Don't increment mid when swapping with high.",
  },
  {
    slug: "siege-engineers-catapult-ranges",
    title: "The Siege Engineer's Catapult Ranges",
    difficulty: "MEDIUM",
    statementMd: `# The Siege Engineer's Catapult Ranges\n\nSiege engineer Brennan has N catapults sorted by their launch power (negative = fires backward, positive = fires forward). He needs to know, after squaring all launch powers (to compute kinetic energy), what the sorted order of energies would be — in O(N) time.\n\n## Input\nFirst line: N\nSecond line: N space-separated integers (sorted, may include negatives)\n\n## Output\nPrint the squares in non-decreasing order.`,
    constraintsMd: `1 <= N <= 10^5\n-10^4 <= A[i] <= 10^4`,
    tags: ["two_pointers", "squares_sorted", "merge"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Largest squares come from the ends. Use two pointers at both ends, fill result array from right to left.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Compare |A[left]| vs |A[right]|. The larger one goes at result[resultIndex], then move that pointer. Fill from result[N-1] down to 0.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "When left pointer's square > right pointer's square, result[k--] = A[left]^2, left++. Else result[k--] = A[right]^2, right--.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "6\n-4 -1 0 3 10\n", expected: "0 1 9 16 100\n", isHidden: false },
      { order: 2, input: "4\n-7 -3 2 3\n", expected: "4 9 9 49\n", isHidden: false },
      { order: 3, input: "3\n-5 -4 -3\n", expected: "9 16 25\n", isHidden: true },
      { order: 4, input: "3\n1 2 3\n", expected: "1 4 9\n", isHidden: true },
    ],
    keyInsight: "When merging from the extremes into the result array backwards, you avoid extra passes. 'Fill from end' trick is reusable in many merge scenarios.",
  },
  {
    slug: "flood-model-trapped-rainwater",
    title: "The Flood Model — Trapped Rainwater",
    difficulty: "MEDIUM",
    statementMd: `# The Flood Model — Trapped Rainwater\n\nClimate scientist Nora models a mountain terrain as an elevation map. After heavy rain, water gets trapped between peaks. She needs to compute the total volume of trapped rainwater.\n\nAt each position, trapped water = min(maxLeft, maxRight) - H[i]. Use two pointers to track maxLeft and maxRight without a separate pass.\n\n## Input\nFirst line: N\nSecond line: N space-separated integers (terrain heights)\n\n## Output\nPrint total units of water trapped.`,
    constraintsMd: `1 <= N <= 3*10^4\n0 <= H[i] <= 10^4`,
    tags: ["two_pointers", "trapping_rain_water"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "At each position, water = min(maxLeft, maxRight) - H[i]. Use two pointers to track maxLeft and maxRight without a separate pass.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "If leftMax < rightMax, process left side (we know the limiting wall). water += leftMax - H[left], left++. Else process right side.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Initialize leftMax = H[0], rightMax = H[N-1]. Process whichever side has the smaller max — that side's max is the bottleneck for trapping.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "12\n0 1 0 2 1 0 1 3 2 1 2 1\n", expected: "6\n", isHidden: false },
      { order: 2, input: "6\n4 2 0 3 2 5\n", expected: "9\n", isHidden: false },
      { order: 3, input: "4\n1 0 1 0\n", expected: "1\n", isHidden: true },
      { order: 4, input: "3\n3 0 3\n", expected: "3\n", isHidden: true },
    ],
    keyInsight: "When leftMax < rightMax, process the left side (the left wall is the bottleneck). This conditional processing based on which side has the smaller max is the deep insight.",
  },

  // ── Category 4: Strings ──
  {
    slug: "oracles-mirror-validation",
    title: "The Oracle's Mirror Validation",
    difficulty: "EASY",
    statementMd: `# The Oracle's Mirror Validation\n\nOracle Thessaly receives prophecies written on stone tablets. A prophecy is considered 'mirrored' (palindrome) if it reads the same forwards and backwards, ignoring spaces and punctuation (only letters and digits count, and case is ignored).\n\n## Input\nA single line string s.\n\n## Output\nPrint "YES" if it's a valid palindrome (ignoring non-alphanumeric and case), "NO" otherwise.`,
    constraintsMd: `0 <= |s| <= 10^5\ns may contain any ASCII characters`,
    tags: ["two_pointers", "palindrome", "string"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Filter only alphanumeric, lowercase. Then use left/right pointers moving inward.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Alternatively, skip non-alphanumeric characters with the pointers themselves — no need to create a new string.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "While left < right: skip non-alnum from left, skip non-alnum from right, compare. If mismatch, return NO.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "A man, a plan, a canal: Panama\n", expected: "YES\n", isHidden: false },
      { order: 2, input: "race a car\n", expected: "NO\n", isHidden: false },
      { order: 3, input: " \n", expected: "YES\n", isHidden: true },
      { order: 4, input: "No 'x' in Nixon\n", expected: "YES\n", isHidden: true },
    ],
    keyInsight: "Preprocessing the string into a clean form before applying two pointers is common. Or skip invalid chars with the pointers themselves for O(1) space.",
  },
  {
    slug: "forgers-one-repair",
    title: "The Forger's One Repair",
    difficulty: "MEDIUM",
    statementMd: `# The Forger's One Repair\n\nForger Renata must make a document appear authentic. A document passes inspection if it is a palindrome. She can erase at most one character.\n\n## Input\nA single line string s (lowercase letters only).\n\n## Output\nPrint "YES" if it can become a palindrome by removing at most one character, "NO" otherwise.`,
    constraintsMd: `1 <= |s| <= 10^5\ns contains only lowercase English letters`,
    tags: ["two_pointers", "palindrome", "one_deletion"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Use two pointers. When mismatch found, try skipping the left character OR the right character, and check if either remaining substring is a palindrome.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Write a helper function isPalindrome(s, i, j). When A[left] != A[right], return isPalindrome(s, left+1, right) || isPalindrome(s, left, right-1).", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "The sub-check scans at most the rest of the string once, so total is still O(N). Don't recurse both sides independently — each branch is O(N).", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "abca\n", expected: "YES\n", isHidden: false },
      { order: 2, input: "raceacar\n", expected: "NO\n", isHidden: false },
      { order: 3, input: "abcba\n", expected: "YES\n", isHidden: true },
      { order: 4, input: "deeee\n", expected: "YES\n", isHidden: true },
    ],
    keyInsight: "When you hit a mismatch, you have exactly two choices to fix it. Trying both is O(N) total because the sub-check at most scans the rest once.",
  },
  {
    slug: "linguists-shortest-transform",
    title: "The Linguist's Shortest Transform",
    difficulty: "HARD",
    statementMd: `# The Linguist's Shortest Transform\n\nLinguist Evander studies ancient manuscripts. He has a source text T and a pattern word P. He needs to find the shortest contiguous window in T that contains all characters of P (in any order, with multiplicity).\n\n## Input\nFirst line: text T\nSecond line: pattern P\n\n## Output\nPrint the minimum length window substring that contains all chars of P. If none, print -1.`,
    constraintsMd: `1 <= |P| <= |T| <= 10^5\nBoth strings contain only lowercase letters`,
    tags: ["two_pointers", "minimum_window", "sliding_window"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Expand right until all chars of P are covered; then shrink from left as much as possible. Track coverage with a count variable.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Use a frequency map for P. Track 'formed' = how many unique characters have their required count. When formed == required, try shrinking.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Track best (min_len, best_start). When window has all chars, update best, then shrink left until it doesn't anymore.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "adobecodebanc\nabc\n", expected: "banc\n", isHidden: false },
      { order: 2, input: "aaabbbccc\nabc\n", expected: "abbc\n", isHidden: false },
      { order: 3, input: "xyz\nabc\n", expected: "-1\n", isHidden: true },
      { order: 4, input: "a\na\n", expected: "a\n", isHidden: true },
    ],
    keyInsight: "The 'formed' counter (how many unique characters are satisfied with required frequency) lets you check window validity in O(1). Two-pointer runs in O(|T|).",
  },

  // ── Category 5: Advanced ──
  {
    slug: "botanists-fruit-basket",
    title: "The Botanist's Fruit Basket",
    difficulty: "MEDIUM",
    statementMd: `# The Botanist's Fruit Basket\n\nBotanist Iris travels a fruit garden where each tree bears one type of fruit (represented by an integer). She carries two baskets, each holding only one fruit type. Starting from any tree, she picks fruit from consecutive trees until she must stop (she cannot put a third fruit type in her baskets).\n\n## Input\nFirst line: N\nSecond line: N space-separated integers (fruit types)\n\n## Output\nPrint the maximum fruits she can collect in one journey.`,
    constraintsMd: `1 <= N <= 10^5\n1 <= A[i] <= 10^5`,
    tags: ["two_pointers", "at_most_2_distinct", "sliding_window"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "This is 'at most K distinct' with K=2. A HashMap tracks at most 2 types; shrink when a third appears.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Use the same sliding window + frequency map as TP-07, but with K=2 for exactly two baskets.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "For each right, add fruit type to map. While map.size > 2, shrink left and remove types with count 0. Update max_len.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "5\n1 2 1 2 3\n", expected: "4\n", isHidden: false },
      { order: 2, input: "6\n1 2 2 2 1 4\n", expected: "5\n", isHidden: false },
      { order: 3, input: "4\n3 3 3 3\n", expected: "4\n", isHidden: true },
      { order: 4, input: "7\n1 2 3 2 2 1 4\n", expected: "4\n", isHidden: true },
    ],
    keyInsight: "This is just 'at most K distinct' with K=2 — demonstrating how one pattern solves many themed problems. Recognizing the underlying pattern is the skill.",
  },
  {
    slug: "generals-subarray-battle-count",
    title: "The General's Subarray Battle Count",
    difficulty: "MEDIUM",
    statementMd: `# The General's Subarray Battle Count\n\nGeneral Maxis needs to deploy squads. Each squad is a contiguous subarray of soldier power values. A squad is 'combat-ready' if the product of its soldiers' powers is strictly less than a threshold K.\n\nAll power values are positive. Count all possible combat-ready squads.\n\n## Input\nFirst line: N and K\nSecond line: N space-separated positive integers\n\n## Output\nPrint the count of continuous subarrays with product strictly less than K.`,
    constraintsMd: `1 <= N <= 3*10^4\n1 <= A[i] <= 1000\n0 <= K <= 10^6`,
    tags: ["two_pointers", "subarray_product", "counting"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Maintain a sliding window product. For each right pointer position, the number of valid subarrays ending at right is (right - left + 1).", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "While (product >= K && left <= right): product /= A[left], left++. Then add (right - left + 1) to count.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "When you fix the right boundary and find the smallest left such that the window is valid, ALL subarrays [left..right] through [right..right] are valid.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "4 100\n10 5 2 6\n", expected: "8\n", isHidden: false },
      { order: 2, input: "3 0\n1 2 3\n", expected: "0\n", isHidden: false },
      { order: 3, input: "4 1\n1 1 1 1\n", expected: "0\n", isHidden: true },
      { order: 4, input: "5 10\n1 2 3 4 5\n", expected: "7\n", isHidden: true },
    ],
    keyInsight: "When you fix the right boundary and find the smallest valid left, ALL subarrays ending at right from left..right are valid. Adding (right-left+1) counts them in O(1).",
  },
  {
    slug: "architects-longest-valid-bridge",
    title: "The Architect's Longest Valid Bridge",
    difficulty: "HARD",
    statementMd: `# The Architect's Longest Valid Bridge\n\nArchitect Celeste is designing a bridge. The structural plan is a binary string: 1 = strong pillar, 0 = weak support. She has budget to reinforce at most K weak supports (flipping 0s to 1s). Find the longest contiguous stretch of the bridge that can be made entirely strong (all 1s) using at most K flips.\n\n## Input\nFirst line: N and K\nSecond line: N space-separated integers (0s and 1s)\n\n## Output\nPrint the maximum length of a contiguous subarray containing at most K zeros.`,
    constraintsMd: `1 <= N <= 10^5\nA[i] in {0, 1}\n0 <= K <= N`,
    tags: ["two_pointers", "longest_ones", "zero_flips"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Sliding window. Track count of zeros in window. When zeros exceed K, move left pointer past the first zero in the current window.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Or use the 'lazy shrink' approach: only shrink when window size would NOT improve the answer. The window never contracts, only shifts.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "When K=0, just find the longest run of 1s. When K>=N, answer is N. The edge case of all zeros with K=0 returns 0.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "6 2\n1 1 1 0 0 0\n", expected: "5\n", isHidden: false },
      { order: 2, input: "10 2\n1 1 0 0 1 1 0 1 1 1\n", expected: "7\n", isHidden: false },
      { order: 3, input: "5 0\n0 0 1 1 0\n", expected: "2\n", isHidden: true },
      { order: 4, input: "5 5\n0 0 0 0 0\n", expected: "5\n", isHidden: true },
    ],
    keyInsight: "The 'lazy shrink' approach: only shrink when the window size wouldn't improve the answer. Gives O(N) where the window never contracts, only shifts.",
  },
  {
    slug: "mathematicians-missing-ranges",
    title: "The Mathematician's Missing Ranges",
    difficulty: "HARD",
    statementMd: `# The Mathematician's Missing Ranges\n\nMathematician Quintus studies number quartets. He has a sequence of N integers and a target T. He needs all unique quadruplets (a, b, c, d) such that a + b + c + d = T.\n\nList them without duplicates, sorted lexicographically.\n\n## Input\nFirst line: N and T\nSecond line: N space-separated integers\n\n## Output\nFirst line: count of unique quadruplets\nThen each quadruplet on its own line (values in non-decreasing order).`,
    constraintsMd: `4 <= N <= 200\n-10^6 <= A[i] <= 10^6\n-10^6 <= T <= 10^6`,
    tags: ["two_pointers", "4sum", "ksum"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Fix two outer elements with loops (skip duplicates at each), then apply 3Sum's two-pointer technique on the remaining subarray.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "kSum generalizes: each outer loop reduces k by 1 until you reach 2Sum (two pointers). For 4Sum: O(N^3). Always sort first.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Deduplication: skip when i > start and A[i] == A[i-1]. Same for the second loop. Same for the two-pointer part.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "6 0\n1 0 -1 0 -2 2\n", expected: "3\n-2 -1 1 2\n-2 0 0 2\n-1 0 0 1\n", isHidden: false },
      { order: 2, input: "5 0\n0 0 0 0 0\n", expected: "1\n0 0 0 0\n", isHidden: false },
      { order: 3, input: "4 4\n1 1 1 1\n", expected: "1\n1 1 1 1\n", isHidden: true },
      { order: 4, input: "4 100\n1 2 3 4\n", expected: "0\n", isHidden: true },
    ],
    keyInsight: "kSum: each outer loop reduces k by 1 until you reach 2Sum (two pointers). Deduplication is the tricky part — always skip when A[i] == A[i-1].",
  },
  {
    slug: "shipwrights-greedy-pairs",
    title: "The Shipwright's Greedy Pairs",
    difficulty: "MEDIUM",
    statementMd: `# The Shipwright's Greedy Pairs\n\nShipwright Cassius must rescue N people from a sinking island. Each rescue boat holds at most 2 people and has a weight limit W. Each person has a weight. Find the minimum number of boats needed.\n\nCassius wants to pair heavy and light people optimally.\n\n## Input\nFirst line: N and W\nSecond line: N space-separated integers (weights)\n\n## Output\nPrint the minimum number of boats needed.`,
    constraintsMd: `1 <= N <= 10^5\n1 <= weight[i] <= W <= 10^5`,
    tags: ["two_pointers", "greedy", "boats"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Sort. Greedily pair the heaviest with the lightest (if they fit). If not, the heaviest goes alone.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "left = 0, right = N-1. If A[left] + A[right] <= W, both go (left++, right--), else heaviest goes alone (right--). Each step uses one boat.", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "The optimal solution never benefits from pairing two heavy people — the lightest person is always the best pairing candidate for the heaviest.", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "4 3\n1 2 2 3\n", expected: "3\n", isHidden: false },
      { order: 2, input: "3 3\n3 2 2\n", expected: "3\n", isHidden: false },
      { order: 3, input: "5 5\n3 2 2 1 1\n", expected: "3\n", isHidden: true },
      { order: 4, input: "2 10\n5 5\n", expected: "1\n", isHidden: true },
    ],
    keyInsight: "Sort + greedy two-pointer works because the optimal solution never benefits from pairing two heavy people — the lightest is always the best pairing candidate for the heaviest.",
  },
  {
    slug: "clockmakers-circular-palindrome",
    title: "The Clockmaker's Circular Palindrome",
    difficulty: "HARD",
    statementMd: `# The Clockmaker's Circular Palindrome\n\nClockmaker Theo engraves palindromic motifs on clock faces. He has a string of N characters and wants to find the longest palindromic substring — the longest contiguous part of the string that reads the same forwards and backwards.\n\nIf multiple answers of the same max length exist, output the one that appears first.\n\n## Input\nA single line string S.\n\n## Output\nFirst line: the longest palindromic substring\nSecond line: its length`,
    constraintsMd: `1 <= |S| <= 10^3\nS contains only lowercase English letters`,
    tags: ["two_pointers", "longest_palindromic_substring", "expand_around_center"],
    patterns: ["Two Pointers"],
    hints: [
      { order: 1, textMd: "Expand around every center. Each character is an odd-length center; each gap between characters is an even-length center. Total: 2N-1 centers.", hintType: "strategy", escalationLevel: 1 },
      { order: 2, textMd: "Write a helper expandAroundCenter(s, left, right) that expands while chars match. Call it for each center: expand(s, i, i) and expand(s, i, i+1).", hintType: "detail", escalationLevel: 2 },
      { order: 3, textMd: "Track bestStart and bestLen. When a new palindrome is longer, update. Return s.slice(bestStart, bestStart + bestLen).", hintType: "edge_case", escalationLevel: 3 },
    ],
    testCases: [
      { order: 1, input: "babad\n", expected: "bab\n3\n", isHidden: false },
      { order: 2, input: "cbbd\n", expected: "bb\n2\n", isHidden: false },
      { order: 3, input: "a\n", expected: "a\n1\n", isHidden: true },
      { order: 4, input: "racecarxyz\n", expected: "racecar\n7\n", isHidden: true },
    ],
    keyInsight: "The 'expand around center' technique uses two pointers expanding outward (not inward). For each of 2N-1 centers, expand while chars match. O(N^2) time, O(1) space.",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Two Pointers Workbook — 20 problems across 5 categories...\n");

  // ── 1. Create the Two Pointers pattern ──
  const pattern = await prisma.pattern.upsert({
    where: { name: "Two Pointers" },
    update: { description: "Use two indices moving towards each other, same direction, or as partition pointers. Covers opposite-ends, slow/fast, sliding window, and expand-around-center techniques." },
    create: { name: "Two Pointers", description: "Use two indices moving towards each other, same direction, or as partition pointers. Covers opposite-ends, slow/fast, sliding window, and expand-around-center techniques." },
  });
  console.log(`✓ Pattern: ${pattern.name} (${pattern.id})`);

  // ── 2. Seed all 20 problems ──
  for (let i = 0; i < PROBLEMS.length; i++) {
    const p = PROBLEMS[i];
    console.log(`\n[${i + 1}/${PROBLEMS.length}] ${p.title}`);

    // Create or update problem
    const problem = await prisma.problem.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        statementMd: p.statementMd,
        constraintsMd: p.constraintsMd,
        difficulty: p.difficulty,
        tags: p.tags,
        isPublished: true,
      },
      create: {
        slug: p.slug,
        title: p.title,
        statementMd: p.statementMd,
        constraintsMd: p.constraintsMd,
        difficulty: p.difficulty,
        tags: p.tags,
        isPublished: true,
      },
    });
    console.log(`  ✓ Problem: ${problem.title} (${problem.slug})`);

    // Link to Two Pointers pattern
    await prisma.problemPattern.upsert({
      where: { problemId_patternId: { problemId: problem.id, patternId: pattern.id } },
      update: {},
      create: { problemId: problem.id, patternId: pattern.id },
    });

    // Create hints
    await prisma.hint.deleteMany({ where: { problemId: problem.id } });
    await prisma.hint.createMany({
      data: p.hints.map(h => ({
        problemId: problem.id,
        order: h.order,
        textMd: h.textMd,
        hintType: h.hintType,
        escalationLevel: h.escalationLevel,
      })),
    });
    console.log(`  ✓ Hints: ${p.hints.length} levels`);

    // Create test cases
    await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
    await prisma.testCase.createMany({
      data: p.testCases.map(tc => ({
        problemId: problem.id,
        order: tc.order,
        input: tc.input,
        expected: tc.expected,
        isHidden: tc.isHidden,
      })),
    });
    console.log(`  ✓ Test cases: ${p.testCases.length} (${p.testCases.filter(t => !t.isHidden).length} public, ${p.testCases.filter(t => t.isHidden).length} hidden)`);
    console.log(`  💡 Key Insight: ${p.keyInsight}`);
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   Pattern: ${pattern.name}`);
  console.log(`   Problems: ${PROBLEMS.length} (across 5 categories)`);
  console.log(`   Total hints: ${PROBLEMS.reduce((s, p) => s + p.hints.length, 0)}`);
  console.log(`   Total test cases: ${PROBLEMS.reduce((s, p) => s + p.testCases.length, 0)}`);
  console.log(`\n   Categories:`);
  console.log(`     1. Opposite-Ends (TP-01 to TP-04)`);
  console.log(`     2. Same-Direction (TP-05 to TP-08)`);
  console.log(`     3. Partition (TP-09 to TP-11)`);
  console.log(`     4. Strings (TP-12 to TP-14)`);
  console.log(`     5. Advanced (TP-15 to TP-20)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
