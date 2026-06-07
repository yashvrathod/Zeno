require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

function cuid() {
  return crypto.randomBytes(12).toString("hex");
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function sha256Hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// ─── Profiles ─────────────────────────────────────────────────────────────

const PROFILES = {
  alice: {
    totalSolved: 45, currentStreak: 12, longestStreak: 21, interviewReadiness: 78,
    learningStyle: { prefersVisual: true, prefersExamples: true, prefersTheory: false, learnsByDoing: true, needsStepByStep: false, prefersAnalogy: true, hintLevelPreference: 1, explanationDensity: "concise", feedbackTiming: "immediate" },
    strengths: ["binary_search", "hash_map", "two_pointer", "array_manipulation", "dfs", "bfs"],
    weaknesses: ["geometry", "segment_tree", "fenwick_tree", "dp"],
    targetCompany: "Google",
    weakPatterns: [{ tag: "off-by-one", count: 3, percentOfSessions: 12 }, { tag: "edge-case-missed", count: 4, percentOfSessions: 16 }, { tag: "wrong-algorithm", count: 2, percentOfSessions: 8 }],
    strongPatterns: [{ tag: "two-pointer", count: 12 }, { tag: "hash-map", count: 10 }, { tag: "binary-search", count: 8 }],
    avgTimePerProblem: 840, giveUpRate: 0.12, hintDependency: 0.15, peakHour: 10, plan: "pro",
    conceptData: {
      binary_search: { mastery: 92, practiceCount: 18, successRate: 89, difficultyRating: 3, confidenceRating: 5, prerequisites: ["array_manipulation"] },
      two_pointer: { mastery: 88, practiceCount: 15, successRate: 87, difficultyRating: 3, confidenceRating: 4, prerequisites: ["array_manipulation"] },
      sliding_window: { mastery: 76, practiceCount: 10, successRate: 70, difficultyRating: 4, confidenceRating: 3, prerequisites: ["two_pointer"] },
      hash_map: { mastery: 95, practiceCount: 20, successRate: 95, difficultyRating: 2, confidenceRating: 5, prerequisites: ["array_manipulation"] },
      stack: { mastery: 82, practiceCount: 12, successRate: 83, difficultyRating: 3, confidenceRating: 4, prerequisites: ["array_manipulation"] },
      queue: { mastery: 78, practiceCount: 8, successRate: 75, difficultyRating: 3, confidenceRating: 3, prerequisites: ["array_manipulation"] },
      heap: { mastery: 65, practiceCount: 6, successRate: 67, difficultyRating: 4, confidenceRating: 3, prerequisites: ["queue"] },
      dfs: { mastery: 85, practiceCount: 14, successRate: 86, difficultyRating: 4, confidenceRating: 4, prerequisites: ["recursion", "stack"] },
      bfs: { mastery: 83, practiceCount: 12, successRate: 83, difficultyRating: 4, confidenceRating: 4, prerequisites: ["queue"] },
      union_find: { mastery: 55, practiceCount: 4, successRate: 50, difficultyRating: 5, confidenceRating: 2, prerequisites: ["graph"] },
      trie: { mastery: 60, practiceCount: 5, successRate: 60, difficultyRating: 5, confidenceRating: 2, prerequisites: ["hash_map"] },
      segment_tree: { mastery: 30, practiceCount: 2, successRate: 50, difficultyRating: 6, confidenceRating: 1, prerequisites: ["binary_search", "array_manipulation"] },
      fenwick_tree: { mastery: 25, practiceCount: 1, successRate: 0, difficultyRating: 6, confidenceRating: 1, prerequisites: ["array_manipulation"] },
      dp: { mastery: 45, practiceCount: 5, successRate: 40, difficultyRating: 5, confidenceRating: 2, prerequisites: ["recursion"] },
      recursion: { mastery: 90, practiceCount: 16, successRate: 88, difficultyRating: 2, confidenceRating: 5, prerequisites: [] },
      backtracking: { mastery: 58, practiceCount: 6, successRate: 50, difficultyRating: 5, confidenceRating: 2, prerequisites: ["recursion"] },
      greedy: { mastery: 62, practiceCount: 7, successRate: 57, difficultyRating: 4, confidenceRating: 3, prerequisites: [] },
      graph: { mastery: 72, practiceCount: 9, successRate: 67, difficultyRating: 4, confidenceRating: 3, prerequisites: [] },
      tree: { mastery: 80, practiceCount: 11, successRate: 82, difficultyRating: 3, confidenceRating: 4, prerequisites: ["recursion"] },
      topological_sort: { mastery: 50, practiceCount: 3, successRate: 33, difficultyRating: 5, confidenceRating: 2, prerequisites: ["graph", "dfs"] },
      dijkstra: { mastery: 68, practiceCount: 7, successRate: 71, difficultyRating: 5, confidenceRating: 3, prerequisites: ["graph", "heap"] },
      mst: { mastery: 45, practiceCount: 3, successRate: 33, difficultyRating: 5, confidenceRating: 2, prerequisites: ["graph", "union_find"] },
      string_matching: { mastery: 70, practiceCount: 7, successRate: 71, difficultyRating: 4, confidenceRating: 3, prerequisites: [] },
      rolling_hash: { mastery: 40, practiceCount: 3, successRate: 67, difficultyRating: 5, confidenceRating: 2, prerequisites: ["hash_map", "string_matching"] },
      bit_manipulation: { mastery: 75, practiceCount: 8, successRate: 75, difficultyRating: 3, confidenceRating: 3, prerequisites: [] },
      math: { mastery: 85, practiceCount: 10, successRate: 90, difficultyRating: 2, confidenceRating: 4, prerequisites: [] },
      geometry: { mastery: 20, practiceCount: 1, successRate: 0, difficultyRating: 6, confidenceRating: 1, prerequisites: ["math"] },
      array_manipulation: { mastery: 96, practiceCount: 22, successRate: 95, difficultyRating: 1, confidenceRating: 5, prerequisites: [] },
    },
    learningPatterns: {
      two_pointer: { strength: 0.92, successRate: 0.90, preferredContext: ["arrays", "strings"] },
      binary_search: { strength: 0.88, successRate: 0.85, preferredContext: ["sorted arrays"] },
      dp_tabulation: { strength: 0.35, successRate: 0.30, preferredContext: ["optimization"] },
      dp_memoization: { strength: 0.40, successRate: 0.35, preferredContext: ["recursion"] },
      bfs: { strength: 0.82, successRate: 0.80, preferredContext: ["graphs", "grids"] },
      dfs: { strength: 0.85, successRate: 0.83, preferredContext: ["graphs", "trees"] },
      greedy: { strength: 0.60, successRate: 0.55, preferredContext: ["scheduling"] },
      backtracking: { strength: 0.52, successRate: 0.50, preferredContext: ["constraint satisfaction"] },
      divide_conquer: { strength: 0.70, successRate: 0.68, preferredContext: ["sorting", "searching"] },
      sliding_window: { strength: 0.75, successRate: 0.72, preferredContext: ["subarrays", "substrings"] },
    },
    misconceptions: [
      { conceptId: "dp", description: "Thinks DP only applies to optimization problems — misses counting and probability DP", corrected: false, detectedDate: daysAgo(15) },
      { conceptId: "sliding_window", description: "Confuses fixed-size and variable-size window conditions", corrected: true, correctionDate: daysAgo(5), detectedDate: daysAgo(20) },
    ],
  },
  bob: {
    totalSolved: 18, currentStreak: 5, longestStreak: 8, interviewReadiness: 45,
    learningStyle: { prefersVisual: false, prefersExamples: true, prefersTheory: true, learnsByDoing: true, needsStepByStep: true, prefersAnalogy: false, hintLevelPreference: 2, explanationDensity: "detailed", feedbackTiming: "immediate" },
    strengths: ["binary_search", "two_pointer", "array_manipulation", "stack"],
    weaknesses: ["dp", "backtracking", "greedy", "graph", "geometry", "segment_tree"],
    targetCompany: "Amazon",
    weakPatterns: [{ tag: "off-by-one", count: 8, percentOfSessions: 42 }, { tag: "index-out-of-bounds", count: 5, percentOfSessions: 26 }, { tag: "infinite-loop-risk", count: 4, percentOfSessions: 21 }, { tag: "wrong-algorithm", count: 6, percentOfSessions: 32 }, { tag: "edge-case-missed", count: 5, percentOfSessions: 26 }],
    strongPatterns: [{ tag: "binary-search", count: 5 }, { tag: "two-pointer", count: 4 }],
    avgTimePerProblem: 1200, giveUpRate: 0.25, hintDependency: 0.35, peakHour: 14, plan: "free",
    conceptData: {
      binary_search: { mastery: 72, practiceCount: 10, successRate: 70, difficultyRating: 3, confidenceRating: 3, prerequisites: ["array_manipulation"] },
      two_pointer: { mastery: 68, practiceCount: 8, successRate: 63, difficultyRating: 3, confidenceRating: 3, prerequisites: ["array_manipulation"] },
      sliding_window: { mastery: 35, practiceCount: 3, successRate: 33, difficultyRating: 4, confidenceRating: 2, prerequisites: ["two_pointer"] },
      hash_map: { mastery: 60, practiceCount: 7, successRate: 57, difficultyRating: 2, confidenceRating: 3, prerequisites: ["array_manipulation"] },
      stack: { mastery: 65, practiceCount: 7, successRate: 57, difficultyRating: 3, confidenceRating: 3, prerequisites: ["array_manipulation"] },
      queue: { mastery: 45, practiceCount: 4, successRate: 50, difficultyRating: 3, confidenceRating: 2, prerequisites: ["array_manipulation"] },
      heap: { mastery: 30, practiceCount: 2, successRate: 50, difficultyRating: 4, confidenceRating: 1, prerequisites: ["queue"] },
      dfs: { mastery: 55, practiceCount: 6, successRate: 50, difficultyRating: 4, confidenceRating: 2, prerequisites: ["recursion", "stack"] },
      bfs: { mastery: 42, practiceCount: 4, successRate: 50, difficultyRating: 4, confidenceRating: 2, prerequisites: ["queue"] },
      union_find: { mastery: 10, practiceCount: 1, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["graph"] },
      trie: { mastery: 15, practiceCount: 1, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["hash_map"] },
      segment_tree: { mastery: 5, practiceCount: 0, successRate: 0, difficultyRating: 6, confidenceRating: 0, prerequisites: ["binary_search", "array_manipulation"] },
      fenwick_tree: { mastery: 5, practiceCount: 0, successRate: 0, difficultyRating: 6, confidenceRating: 0, prerequisites: ["array_manipulation"] },
      dp: { mastery: 15, practiceCount: 2, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["recursion"] },
      recursion: { mastery: 70, practiceCount: 9, successRate: 67, difficultyRating: 2, confidenceRating: 3, prerequisites: [] },
      backtracking: { mastery: 20, practiceCount: 2, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["recursion"] },
      greedy: { mastery: 25, practiceCount: 3, successRate: 33, difficultyRating: 4, confidenceRating: 1, prerequisites: [] },
      graph: { mastery: 20, practiceCount: 2, successRate: 0, difficultyRating: 4, confidenceRating: 1, prerequisites: [] },
      tree: { mastery: 55, practiceCount: 6, successRate: 50, difficultyRating: 3, confidenceRating: 2, prerequisites: ["recursion"] },
      topological_sort: { mastery: 10, practiceCount: 1, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["graph", "dfs"] },
      dijkstra: { mastery: 25, practiceCount: 2, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["graph", "heap"] },
      mst: { mastery: 10, practiceCount: 1, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["graph", "union_find"] },
      string_matching: { mastery: 40, practiceCount: 4, successRate: 50, difficultyRating: 4, confidenceRating: 2, prerequisites: [] },
      rolling_hash: { mastery: 10, practiceCount: 1, successRate: 0, difficultyRating: 5, confidenceRating: 1, prerequisites: ["hash_map", "string_matching"] },
      bit_manipulation: { mastery: 50, practiceCount: 4, successRate: 50, difficultyRating: 3, confidenceRating: 2, prerequisites: [] },
      math: { mastery: 60, practiceCount: 5, successRate: 60, difficultyRating: 2, confidenceRating: 3, prerequisites: [] },
      geometry: { mastery: 10, practiceCount: 1, successRate: 0, difficultyRating: 6, confidenceRating: 1, prerequisites: ["math"] },
      array_manipulation: { mastery: 75, practiceCount: 12, successRate: 75, difficultyRating: 1, confidenceRating: 3, prerequisites: [] },
    },
    learningPatterns: {
      two_pointer: { strength: 0.65, successRate: 0.60, preferredContext: ["arrays"] },
      binary_search: { strength: 0.70, successRate: 0.68, preferredContext: ["sorted arrays"] },
      dp_memoization: { strength: 0.20, successRate: 0.15, preferredContext: ["recursion"] },
      bfs: { strength: 0.35, successRate: 0.30, preferredContext: ["graphs"] },
      dfs: { strength: 0.50, successRate: 0.48, preferredContext: ["trees"] },
      greedy: { strength: 0.25, successRate: 0.20, preferredContext: [] },
      backtracking: { strength: 0.20, successRate: 0.15, preferredContext: [] },
      divide_conquer: { strength: 0.55, successRate: 0.50, preferredContext: ["sorting"] },
      sliding_window: { strength: 0.30, successRate: 0.25, preferredContext: ["subarrays"] },
    },
    misconceptions: [
      { conceptId: "dp", description: "Thinks memoization and tabulation are the same thing", corrected: false, detectedDate: daysAgo(10) },
      { conceptId: "bfs", description: "Uses DFS instead of BFS for shortest path problems", corrected: false, detectedDate: daysAgo(7) },
      { conceptId: "sliding_window", description: "Always uses fixed window size even when variable needed", corrected: true, correctionDate: daysAgo(3), detectedDate: daysAgo(12) },
    ],
  },
  carol: {
    totalSolved: 5, currentStreak: 2, longestStreak: 3, interviewReadiness: 22,
    learningStyle: { prefersVisual: true, prefersExamples: true, prefersTheory: true, learnsByDoing: false, needsStepByStep: true, prefersAnalogy: true, hintLevelPreference: 3, explanationDensity: "comprehensive", feedbackTiming: "immediate" },
    strengths: ["array_manipulation"],
    weaknesses: ["dp", "backtracking", "greedy", "graph", "segment_tree", "fenwick_tree", "geometry", "topological_sort", "mst", "union_find", "trie", "rolling_hash"],
    targetCompany: "Startup",
    weakPatterns: [{ tag: "off-by-one", count: 7, percentOfSessions: 78 }, { tag: "index-out-of-bounds", count: 5, percentOfSessions: 56 }, { tag: "null-check-missing", count: 3, percentOfSessions: 33 }, { tag: "edge-case-missed", count: 6, percentOfSessions: 67 }, { tag: "wrong-algorithm", count: 4, percentOfSessions: 44 }],
    strongPatterns: [],
    avgTimePerProblem: 1800, giveUpRate: 0.45, hintDependency: 0.60, peakHour: 20, plan: "free",
    conceptData: {
      binary_search: { mastery: 25, practiceCount: 3, successRate: 33, difficultyRating: 3, confidenceRating: 1, prerequisites: ["array_manipulation"] },
      two_pointer: { mastery: 30, practiceCount: 4, successRate: 25, difficultyRating: 3, confidenceRating: 1, prerequisites: ["array_manipulation"] },
      sliding_window: { mastery: 5, practiceCount: 0, successRate: 0, difficultyRating: 4, confidenceRating: 0, prerequisites: ["two_pointer"] },
      hash_map: { mastery: 40, practiceCount: 5, successRate: 40, difficultyRating: 2, confidenceRating: 2, prerequisites: ["array_manipulation"] },
      stack: { mastery: 15, practiceCount: 2, successRate: 0, difficultyRating: 3, confidenceRating: 1, prerequisites: ["array_manipulation"] },
      queue: { mastery: 10, practiceCount: 1, successRate: 0, difficultyRating: 3, confidenceRating: 1, prerequisites: ["array_manipulation"] },
      heap: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 4, confidenceRating: 0, prerequisites: ["queue"] },
      dfs: { mastery: 5, practiceCount: 1, successRate: 0, difficultyRating: 4, confidenceRating: 0, prerequisites: ["recursion", "stack"] },
      bfs: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 4, confidenceRating: 0, prerequisites: ["queue"] },
      union_find: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["graph"] },
      trie: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["hash_map"] },
      segment_tree: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 6, confidenceRating: 0, prerequisites: ["binary_search", "array_manipulation"] },
      fenwick_tree: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 6, confidenceRating: 0, prerequisites: ["array_manipulation"] },
      dp: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["recursion"] },
      recursion: { mastery: 35, practiceCount: 4, successRate: 25, difficultyRating: 2, confidenceRating: 1, prerequisites: [] },
      backtracking: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["recursion"] },
      greedy: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 4, confidenceRating: 0, prerequisites: [] },
      graph: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 4, confidenceRating: 0, prerequisites: [] },
      tree: { mastery: 10, practiceCount: 1, successRate: 0, difficultyRating: 3, confidenceRating: 0, prerequisites: ["recursion"] },
      topological_sort: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["graph", "dfs"] },
      dijkstra: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["graph", "heap"] },
      mst: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["graph", "union_find"] },
      string_matching: { mastery: 15, practiceCount: 2, successRate: 0, difficultyRating: 4, confidenceRating: 0, prerequisites: [] },
      rolling_hash: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 5, confidenceRating: 0, prerequisites: ["hash_map", "string_matching"] },
      bit_manipulation: { mastery: 5, practiceCount: 1, successRate: 0, difficultyRating: 3, confidenceRating: 0, prerequisites: [] },
      math: { mastery: 20, practiceCount: 2, successRate: 50, difficultyRating: 2, confidenceRating: 1, prerequisites: [] },
      geometry: { mastery: 0, practiceCount: 0, successRate: 0, difficultyRating: 6, confidenceRating: 0, prerequisites: ["math"] },
      array_manipulation: { mastery: 50, practiceCount: 6, successRate: 50, difficultyRating: 1, confidenceRating: 2, prerequisites: [] },
    },
    learningPatterns: {
      two_pointer: { strength: 0.25, successRate: 0.20, preferredContext: ["arrays"] },
      binary_search: { strength: 0.20, successRate: 0.15, preferredContext: [] },
      divide_conquer: { strength: 0.20, successRate: 0.15, preferredContext: [] },
    },
    misconceptions: [
      { conceptId: "two_pointer", description: "Doesn't understand when to move left vs right pointer", corrected: false, detectedDate: daysAgo(5) },
    ],
  },
};

const conversationTemplates = [
  {
    problemSlug: "valid-palindrome",
    status: "SOLVED", lastRung: 6, messageCount: 8,
    breakthroughs: ["two-pointer", "string-manipulation"],
    summaryMd: "Worked through the two-pointer approach for palindrome validation. Understood how to skip non-alphanumeric characters and compare case-insensitively.",
    messages: [
      { role: "user", content: "I need help understanding how to check if a string is a palindrome.", stage: "EXPLORE" },
      { role: "assistant", content: "Let's break this down. A palindrome reads the same forward and backward. What characters should we consider?", stage: "EXPLORE" },
      { role: "user", content: "Only alphanumeric characters, right? And case doesn't matter.", stage: "EXPLORE" },
      { role: "assistant", content: "Exactly. Now think about how you'd check this with two pointers.", stage: "STRATEGIZE" },
      { role: "user", content: "One pointer from start, one from end, skip non-alphanumeric chars?", stage: "STRATEGIZE" },
      { role: "assistant", content: "Perfect. Let's implement it.", stage: "IMPLEMENT" },
      { role: "user", content: "Got it working with the two-pointer approach!", stage: "IMPLEMENT" },
      { role: "assistant", content: "Great work! The time complexity is O(n) and space is O(1).", stage: "REFLECT" },
    ],
  },
  {
    problemSlug: "two-sum",
    status: "SOLVED", lastRung: 5, messageCount: 6,
    breakthroughs: ["hash-map"],
    summaryMd: "Learned to use hash map for O(n) two-sum solution instead of brute force O(n^2).",
    messages: [
      { role: "user", content: "I solved it with nested loops but it's slow. How do I optimize?", stage: "EXPLORE" },
      { role: "assistant", content: "What data structure gives you O(1) lookup?", stage: "STRATEGIZE" },
      { role: "user", content: "A hash map! I can store complements as I iterate.", stage: "STRATEGIZE" },
      { role: "assistant", content: "Exactly right. One pass, store complement, check if seen.", stage: "IMPLEMENT" },
      { role: "user", content: "Done! O(n) time, O(n) space.", stage: "IMPLEMENT" },
      { role: "assistant", content: "Beautiful. This is the optimal solution.", stage: "REFLECT" },
    ],
  },
  {
    problemSlug: "binary-search",
    status: "SOLVED", lastRung: 5, messageCount: 5,
    breakthroughs: ["binary-search"],
    summaryMd: "Mastered binary search implementation with proper mid calculation and boundary handling.",
    messages: [
      { role: "user", content: "I need help understanding binary search boundaries.", stage: "EXPLORE" },
      { role: "assistant", content: "The key invariant: the target must be in [left, right] at each step.", stage: "EXPLORE" },
      { role: "user", content: "So if nums[mid] < target, I search right half?", stage: "STRATEGIZE" },
      { role: "assistant", content: "Yes. left = mid + 1. If nums[mid] > target, right = mid - 1.", stage: "STRATEGIZE" },
      { role: "user", content: "Got it working! O(log n) time.", stage: "IMPLEMENT" },
      { role: "assistant", content: "Excellent. Binary search is a fundamental pattern.", stage: "REFLECT" },
    ],
  },
];

async function main() {
  console.log("Starting seed...\n");

  // Cleanup
  console.log("Cleaning up existing data...");
  await prisma.cacheEntry.deleteMany({});
  await prisma.misconception.deleteMany({});
  await prisma.problemAttempt.deleteMany({});
  await prisma.learningPattern.deleteMany({});
  await prisma.conceptMastery.deleteMany({});
  await prisma.userKnowledgeGraph.deleteMany({});
  await prisma.mentorMessage.deleteMany({});
  await prisma.mentorSession.deleteMany({});
  await prisma.mentorConversationMessage.deleteMany({});
  await prisma.mentorConversationSummary.deleteMany({});
  await prisma.userAiSettings.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.studentProfile.deleteMany({});
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
      statementMd: "A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string `s`, return **true** if it is a palindrome, or **false** otherwise.\n\n**Example 1:**\nInput: s = 'A man, a plan, a canal: Panama'\nOutput: true\n\n**Example 2:**\nInput: s = 'race a car'\nOutput: false",
      constraintsMd: "- 1 <= s.length <= 2 * 10^5\n- s consists only of ASCII characters.",
      difficulty: "EASY",
      patternName: "Two Pointers",
      tags: ["string", "two-pointers"],
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
      statementMd: "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have **exactly one solution**, and you may not use the same element twice.\n\n**Example 1:**\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n\n**Example 2:**\nInput: nums = [3,2,4], target = 6\nOutput: [1,2]",
      constraintsMd: "- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9\n- -10^9 <= target <= 10^9",
      difficulty: "EASY",
      patternName: "Hash Map",
      tags: ["array", "hash-map"],
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
      statementMd: "Given an array of integers `nums` which is **sorted in ascending order** and an integer `target`, return the index of the target if it exists in the array. If not, return -1.\n\n**Example 1:**\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\n\n**Example 2:**\nInput: nums = [-1,0,3,5,9,12], target = 2\nOutput: -1",
      constraintsMd: "- 1 <= nums.length <= 10^4\n- -10^4 < nums[i], target < 10^4\n- All integers in nums are unique",
      difficulty: "EASY",
      patternName: "Binary Search",
      tags: ["array", "binary-search"],
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
      statementMd: "Given an `m x n` 2D grid map of '1's (land) and '0's (water), return the number of islands.\n\nAn island is surrounded by water and is formed by connecting adjacent lands **horizontally or vertically**.\n\n**Example 1:**\nInput: grid = [[1,1,1,1,0],[1,1,0,1,0],[1,1,0,0,0],[0,0,0,0,0]]\nOutput: 1\n\n**Example 2:**\nInput: grid = [[1,1,0,0,0],[1,1,0,0,0],[0,0,1,0,0],[0,0,0,1,1]]\nOutput: 3",
      constraintsMd: "- m == grid.length\n- n == grid[i].length\n- 1 <= m, n <= 300",
      difficulty: "MEDIUM",
      patternName: "DFS",
      tags: ["array", "dfs", "graph", "matrix"],
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
      statementMd: "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb **1** or **2** steps. In how many distinct ways can you climb to the top?\n\n**Example 1:**\nInput: n = 2\nOutput: 2\n(Two ways: 1+1 or 2)\n\n**Example 2:**\nInput: n = 3\nOutput: 3\n(Three ways: 1+1+1, 1+2, or 2+1)",
      constraintsMd: "- 1 <= n <= 45",
      difficulty: "EASY",
      patternName: "Dynamic Programming",
      tags: ["dp", "math"],
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
        expectedTimeMin: pd.slug === "number-of-islands" ? 30 : 15,
      },
    });
    createdProblems.push(problem);
    console.log("  Created:", problem.title);

    await prisma.problemPattern.create({
      data: { problemId: problem.id, patternId: pattern.id },
    });

    for (const tc of pd.testCases) {
      let args = null;
      let expectedJson = null;
      try {
        args = JSON.parse(tc.input.trim());
        expectedJson = JSON.parse(tc.expected.trim());
      } catch {}
      await prisma.testCase.create({
        data: { problemId: problem.id, order: tc.order, input: tc.input, expected: tc.expected, args, expectedJson, isHidden: tc.isHidden },
      });
    }

    for (const hint of pd.hints) {
      await prisma.hint.create({
        data: { problemId: problem.id, order: hint.order, textMd: hint.textMd, hintType: hint.hintType, escalationLevel: hint.escalationLevel },
      });
    }

    const SYSTEM_USER = "system";
    for (const qa of pd.exploreQuestions) {
      const questionMd5 = sha256Hash(qa.q);
      const dummyEmbedding = new Array(384).fill(0).map((_, idx) => Math.sin(idx * 137.508) * 0.01);
      await prisma.cacheEntry.create({
        data: {
          problemId: problem.id, questionMd5, questionText: qa.q, embedding: dummyEmbedding,
          response: qa.r, stage: "EXPLORE", rung: 1, usedCount: 0,
        },
      });
    }
  }

  // Create demo users
  console.log("\nCreating demo users...");
  const demoUserData = [
    { name: "Alice Chen", email: "alice@example.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice", totalSolved: 45, currentStreak: 12, longestStreak: 21, interviewReadiness: 78 },
    { name: "Bob Smith", email: "bob@example.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob", totalSolved: 18, currentStreak: 5, longestStreak: 8, interviewReadiness: 45 },
    { name: "Carol Williams", email: "carol@example.com", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol", totalSolved: 5, currentStreak: 2, longestStreak: 3, interviewReadiness: 22 },
  ];

  const passwordHash = await bcrypt.hash("password123", 10);
  const createdUsers = [];
  for (const user of demoUserData) {
    const u = await prisma.user.create({
      data: { ...user, password: passwordHash, lastSolvedDate: daysAgo(1) },
    });
    createdUsers.push(u);
    console.log("  Created:", u.name);
  }

  // ── DASHBOARD DATA ─────────────────────────────────────────────────────
  console.log("\nSeeding dashboard data...\n");

  const userKeys = ["alice", "bob", "carol"];

  for (let ui = 0; ui < createdUsers.length; ui++) {
    const user = createdUsers[ui];
    const key = userKeys[ui];
    const p = PROFILES[key];
    console.log(`── ${user.name} (${p.targetCompany}) ──`);

    // StudentProfile
    await prisma.studentProfile.create({
      data: {
        id: cuid(), userId: user.id,
        learningStyle: JSON.stringify(p.learningStyle),
        peakHour: p.peakHour, avgTimePerProblem: p.avgTimePerProblem,
        giveUpRate: p.giveUpRate, hintDependency: p.hintDependency,
        weakPatterns: p.weakPatterns,
        strongPatterns: p.strongPatterns,
        targetCompany: p.targetCompany,
        placementGoalDate: daysAgo(-60), hasBeenPlaced: false,
        createdAt: daysAgo(90), updatedAt: new Date(),
      },
    });

    // Subscription
    await prisma.subscription.create({
      data: {
        id: cuid(), userId: user.id, plan: p.plan, status: "active",
        currentPeriodEnd: daysAgo(-30), cancelAtPeriodEnd: false,
        createdAt: daysAgo(90), updatedAt: new Date(),
      },
    });

    // UserAiSettings
    await prisma.userAiSettings.create({
      data: { userId: user.id, apiProvider: "server", verbosity: "normal", hasCompletedOnboarding: true },
    });

    // UserKnowledgeGraph
    const trajectory = [];
    const startMastery = Math.max(5, p.interviewReadiness - 50);
    for (let i = 30; i >= 0; i--) {
      const progress = (30 - i) / 30;
      const noise = Math.sin(i * 0.5) * 3;
      trajectory.push({
        date: daysAgo(i).toISOString().split("T")[0],
        overallMastery: Math.min(100, Math.round(startMastery + (p.interviewReadiness - startMastery) * progress + noise)),
        conceptsMastered: Math.min(Object.keys(p.conceptData).length, Math.round(Object.keys(p.conceptData).length * progress * 0.7)),
        problemsSolved: Math.max(0, Math.round(p.totalSolved * progress)),
      });
    }
    const ukg = await prisma.userKnowledgeGraph.create({
      data: {
        userId: user.id, learningStyle: p.learningStyle,
        strengths: p.strengths, weaknesses: p.weaknesses,
        learningTrajectory: trajectory,
      },
    });

    // ConceptMastery
    for (const [cid, cd] of Object.entries(p.conceptData)) {
      const isLearning = cd.practiceCount > 0;
      await prisma.conceptMastery.create({
        data: {
          userId: ukg.id, conceptId: cid, mastery: cd.mastery,
          lastPracticed: isLearning ? daysAgo(Math.floor(Math.random() * 7)) : null,
          practiceCount: cd.practiceCount, successRate: cd.successRate,
          averageTimeToSolve: cd.mastery > 0 ? Math.max(120, 1200 - cd.mastery * 10) : null,
          commonErrors: [], prerequisites: cd.prerequisites, dependents: [],
          nextReviewDue: isLearning && cd.mastery < 80 ? daysAgo(Math.floor(Math.random() * 3) - 1) : null,
          difficultyRating: cd.difficultyRating, confidenceRating: cd.confidenceRating,
        },
      });
    }

    // LearningPattern
    for (const [ptype, pdata] of Object.entries(p.learningPatterns)) {
      await prisma.learningPattern.create({
        data: {
          userId: ukg.id, patternType: ptype, strength: pdata.strength,
          lastUsed: daysAgo(Math.floor(Math.random() * 5)),
          successRate: pdata.successRate, preferredContext: pdata.preferredContext,
        },
      });
    }

    // ProblemAttempt
    const solvedSet = new Set();
    const attemptsLimit = [5, 3, 1][ui];
    for (let pi = 0; pi < Math.min(createdProblems.length, attemptsLimit); pi++) {
      const prob = createdProblems[pi];
      const isSolved = ui === 0 || (ui === 1 && pi < 3) || (ui === 2 && pi < 2);
      if (isSolved) solvedSet.add(prob.id);
      await prisma.problemAttempt.create({
        data: {
          userId: ukg.id, problemId: prob.id, problemSlug: prob.slug,
          concepts: [prob.slug === "valid-palindrome" ? "two_pointer" : prob.slug === "two-sum" ? "hash_map" : prob.slug === "binary-search" ? "binary_search" : prob.slug === "number-of-islands" ? "dfs" : "dp"],
          patterns: [], attempts: isSolved ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 5) + 3,
          solved: isSolved, timeSpent: isSolved ? Math.floor(Math.random() * 1800) + 300 : Math.floor(Math.random() * 3600) + 1800,
          firstAttemptSuccess: isSolved && Math.random() > 0.5,
          hintCount: isSolved ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 4) + 2,
          stageReached: isSolved ? "REFLECT" : "DEBUG", rungReached: isSolved ? 6 : Math.floor(Math.random() * 4) + 1,
          date: daysAgo(Math.floor(Math.random() * 14)),
          errors: isSolved ? [] : [{ type: "off_by_one", message: "Off by one error in loop condition", line: 12, timestamp: Date.now() - 3600000 }],
        },
      });
    }

    // Misconception
    for (const mc of p.misconceptions) {
      await prisma.misconception.create({
        data: {
          userId: ukg.id, conceptId: mc.conceptId, description: mc.description,
          detectedDate: mc.detectedDate, corrected: mc.corrected,
          correctionDate: mc.correctionDate || null,
          relatedProblems: createdProblems.slice(0, 2).map(p => p.id),
        },
      });
    }

    // UserProblemStats
    for (const prob of createdProblems) {
      const isSolved = solvedSet.has(prob.id);
      await prisma.userProblemStats.create({
        data: {
          userId: user.id, problemId: prob.id,
          runCount: (isSolved ? 3 : 8) * 3,
          submitCount: isSolved ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 8) + 3,
          acceptedCount: isSolved ? 1 : 0,
          wrongAnswerCount: isSolved ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 5) + 2,
          runtimeErrorCount: Math.floor(Math.random() * 2),
          firstAttemptAt: daysAgo(Math.floor(Math.random() * 30) + 10),
          solvedAt: isSolved ? daysAgo(Math.floor(Math.random() * 10)) : null,
          timeSpentSeconds: isSolved ? Math.floor(Math.random() * 3600) + 600 : Math.floor(Math.random() * 7200) + 1800,
          hintsUsed: Math.floor(Math.random() * 4),
          escalationReached: isSolved ? Math.floor(Math.random() * 3) + 3 : Math.floor(Math.random() * 4) + 1,
          lastStatus: isSolved ? "ACCEPTED" : "WRONG_ANSWER",
          lastError: isSolved ? null : "Wrong answer on test case 3",
        },
      });
    }

    // MentorConversationSummary + Messages
    let msgTotal = 0;
    for (const ct of conversationTemplates) {
      const prob = createdProblems.find(p => p.slug === ct.problemSlug);
      if (!prob) continue;

      await prisma.mentorConversationSummary.create({
        data: {
          userId: user.id, problemId: prob.id, status: ct.status,
          solvedAt: ct.status === "SOLVED" ? daysAgo(Math.floor(Math.random() * 10) + 5) : null,
          summaryMd: ct.summaryMd, messageCount: ct.messageCount, lastRung: ct.lastRung,
          breakthroughs: ct.breakthroughs,
        },
      });

      for (let mi = 0; mi < ct.messages.length; mi++) {
        const m = ct.messages[mi];
        await prisma.mentorConversationMessage.create({
          data: {
            userId: user.id, problemId: prob.id, role: m.role, content: m.content,
            metadata: { stage: m.stage },
            createdAt: hoursAgo((ct.messages.length - mi) * 2 + Math.floor(Math.random() * 24)),
          },
        });
        msgTotal++;
      }
    }

    // MentorSession + MentorMessage
    for (const ct of conversationTemplates) {
      const prob = createdProblems.find(p => p.slug === ct.problemSlug);
      if (!prob) continue;
      const session = await prisma.mentorSession.create({
        data: { userId: user.id, problemId: prob.id, stage: "REFLECT", currentRung: ct.lastRung },
      });
      for (const m of ct.messages.slice(0, 4)) {
        await prisma.mentorMessage.create({
          data: { sessionId: session.id, role: m.role, content: m.content, stage: m.stage },
        });
      }
    }

    console.log(`  ✓ All dashboard data seeded`);
  }

  // ── Two Pointers seed (sibling .mjs) ──────────────────────────────────
  const { execSync } = require("child_process");
  console.log("\nRunning Two Pointers seed...");
  execSync("node prisma/seed-two-pointers.mjs", { stdio: "inherit" });

  // ── Report ────────────────────────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    patterns: await prisma.pattern.count(),
    problems: await prisma.problem.count(),
    problemStats: await prisma.userProblemStats.count(),
    studentProfiles: await prisma.studentProfile.count(),
    knowledgeGraphs: await prisma.userKnowledgeGraph.count(),
    conceptMasteries: await prisma.conceptMastery.count(),
    learningPatterns: await prisma.learningPattern.count(),
    problemAttempts: await prisma.problemAttempt.count(),
    misconceptions: await prisma.misconception.count(),
    mentorConversations: await prisma.mentorConversationSummary.count(),
    mentorMessages: await prisma.mentorConversationMessage.count(),
    mentorSessions: await prisma.mentorSession.count(),
  };

  console.log("\n========================================");
  console.log("Seed complete!\n");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nDashboard is fully populated!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
