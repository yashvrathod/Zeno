/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-require-imports */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from 'crypto';
// const { PrismaClient } = require('@prisma/client');
// const { PrismaPg } = require('@prisma/adapter-pg');
// const crypto = require('crypto');

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Cannot run seed.');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

// ─────────────────────────────────────────────────────────────────────────
// EXPLORE STAGE — pre-seeded questions and mentor responses
// These cover the range of questions a user might ask when first
// understanding the "Valid Palindrome" problem.
// ─────────────────────────────────────────────────────────────────────────

const exploreQuestions = [
  {
    question: "Can you explain what this problem is asking?",
    response: "Let me break it down: you're given a string and you need to check if it reads the same forwards and backwards. But there's a twist — you should **only consider alphanumeric characters** (letters and numbers) and **ignore case**. So 'Race a car' won't match because after stripping non-alphanumeric characters and lowercasing, 'raceacar' is not the same as 'racacecar'. The key questions you should answer before coding: What happens with spaces? Punctuation? Empty strings?",
  },
  {
    question: "What is a palindrome?",
    response: "A **palindrome** is a word, phrase, or sequence that reads the same backwards as forwards. Examples: 'madam', 'racecar', '12321'. In this problem, we need to check if the given string is a palindrome, but with two important rules:\n\n1. **Ignore non-alphanumeric characters** — spaces, commas, colons don't count.\n2. **Ignore case** — 'A' and 'a' are treated as the same character.\n\nSo 'A man, a plan, a canal: Panama' becomes 'amanaplanacanalpanama' after cleaning — which IS a palindrome!",
  },
  {
    question: "What are the constraints?",
    response: "The constraint is `1 <= |s| <= 2*10^5`, meaning the string can be up to 200,000 characters long.\n\n**What this means for your approach:**\n- An O(n^2) solution won't work — that's ~40 billion operations\n- You need O(n) time — just one or two passes through the string\n- An O(n) approach with two pointers (one from each end) is optimal here\n- Space can be O(1) if you use two pointers directly on the string, or O(n) if you filter first",
  },
  {
    question: "What's the expected input and output?",
    response: "**Input:** A single line containing a string `s` (may include spaces, punctuation, mixed case)\n\n**Output:** Print \"true\" if it's a palindrome (after cleaning), \"false\" otherwise.\n\n**Examples:**\n- Input: `A man, a plan, a canal: Panama` → Output: `true`\n- Input: `race a car` → Output: `false`\n- Input: ` ` (just spaces) → Output: `true` (empty after cleaning)",
  },
  {
    question: "What edge cases should I consider?",
    response: "Great question! Here are the key edge cases:\n\n1. **Empty string** — `\"\"` → is this a palindrome? (Yes, vacuously true)\n2. **Only special characters** — `\"   !!!\"` → after cleaning, it's empty → true\n3. **Single character** — `\"a\"` → always a palindrome\n4. **All same characters** — `\"aaaaa\"` → true\n5. **Mixed case same letters** — `\"aA\"` → after lowercasing, \"aa\" → true\n6. **Numbers** — `\"0P\"` → \"0p\" → not a palindrome → false\n7. **Very long string** — up to 200,000 chars — your solution must handle this efficiently",
  },
  {
    question: "Can you give me an example walkthrough?",
    response: "Let's trace through `\"race a car\"` step by step:\n\n1. **Clean the string:** Remove non-alphanumeric chars → `\"raceacar\"`\n2. **Lowercase:** → `\"raceacar\"`\n3. **Compare from both ends:**\n   - `r` == `r` ✓\n   - `a` == `a` ✓  \n   - `c` == `a` ✗ → NOT a palindrome!\n\nNow let's try `\"A man, a plan, a canal: Panama\"`:\n1. **Clean:** → `\"AmanaplanacanalPanama\"`\n2. **Lowercase:** → `\"amanaplanacanalpanama\"`\n3. **Compare from both ends:**\n   - `a` == `a` ✓, `m` == `m` ✓, `a` == `a` ✓... every pair matches → TRUE!",
  },
  {
    question: "What's a brute force way to solve this?",
    response: "The simplest brute force approach:\n\n1. **Step 1:** Create a new string with only alphanumeric characters, all lowercased\n2. **Step 2:** Create the reverse of that cleaned string\n3. **Step 3:** Compare the cleaned string with its reverse\n\n```python\ncleaned = ''.join(c.lower() for c in s if c.isalnum())\nprint('true' if cleaned == cleaned[::-1] else 'false')\n```\n\nThis is O(n) time and O(n) space. It works! But can you think of a way to do it with **O(1) extra space**?",
  },
  {
    question: "How do I optimize this?",
    response: "To get O(1) extra space, use the **Two Pointers** approach:\n\n1. Start with one pointer at the beginning (`left = 0`) and one at the end (`right = len(s) - 1`)\n2. **Skip** non-alphanumeric characters by moving the pointers inward\n3. **Compare** the characters at both pointers (lowercased)\n4. If they differ → return false. If left >= right → return true.\n\n```python\nleft, right = 0, len(s) - 1\nwhile left < right:\n    while left < right and not s[left].isalnum():\n        left += 1\n    while left < right and not s[right].isalnum():\n        right -= 1\n    if s[left].lower() != s[right].lower():\n        print('false')\n        return\n    left += 1\n    right -= 1\nprint('true')\n```\n\nThis is O(n) time and O(1) space — optimal!",
  },
  {
    question: "What is the two pointer approach?",
    response: "The **Two Pointer** technique uses two indices that move through the data structure to solve the problem:\n\n- **Meet-in-the-middle** pointers: One starts at the left end, one at the right end. They move toward each other. Perfect for palindrome/verification problems.\n- **Fast and slow** pointers: Both start at the same place but move at different speeds. Good for cycle detection, finding middle elements.\n\nFor this palindrome problem, we use the meet-in-the-middle variant:\n- `left` starts at index 0, moves right\n- `right` starts at last index, moves left\n- They compare characters and skip non-alphanumeric ones\n\n**Why is this pattern useful?** Instead of creating a cleaned copy of the string (which costs O(n) space), you process it in-place by just adjusting pointers. This saves memory while keeping the same O(n) time complexity.",
  },
  {
    question: "How do I filter only alphanumeric characters?",
    response: "Different languages have different built-in methods:\n\n- **Python:** `char.isalnum()` — returns True if char is a letter or number\n- **JavaScript/Node.js:** `/[a-zA-Z0-9]/.test(char)` — regex test\n- **Java:** `Character.isLetterOrDigit(char)`\n- **C++:** `isalnum(char)` from `<cctype>`\n\nYou should skip characters that return false from these checks. For comparing, also remember to convert to lowercase: `char.toLowerCase()` in most languages.",
  },
  {
    question: "What's the time and space complexity?",
    response: "For the optimal two-pointer approach:\n\n- **Time: O(n)** — you visit each character at most once. The two pointers together scan through the string a single time.\n- **Space: O(1)** — you only use two pointer variables (left and right). No new strings or arrays are created.\n\nFor the simpler clean-and-reverse approach:\n- **Time: O(n)** — still linear (building cleaned string + reversing + comparing)\n- **Space: O(n)** — you allocate a new string for the cleaned version\n\nBoth are O(n) time, but the two-pointer version wins on space. In interviews, two-pointer is the expected answer.",
  },
  {
    question: "Should I clean the string first or use two pointers?",
    response: "Both are valid! Here's the trade-off:\n\n**Clean first (simpler):**\n- Easier to reason about and debug\n- Uses extra memory for the cleaned string\n- Fine for most practical purposes\n\n**Two pointers (optimal):**\n- Slightly trickier logic (need to skip non-alphanumeric on both sides)\n- O(1) space — no extra memory\n- Better for interviews and memory-constrained environments\n\n**Recommendation:** Start with the cleaner approach to verify your understanding, then optimize to two pointers. In an interview, mention both and explain why two pointers is better.",
  },
  {
    question: "What happens with an empty string or just spaces?",
    response: "An empty string `\"\"` or a string with only spaces/special characters like `\"   !!!\"` should return **true**.\n\nHere's why: After filtering out non-alphanumeric characters, you're left with an empty string. An empty string reads the same forwards and backwards — it's **vacuously** a palindrome.\n\nIn the two-pointer approach, this is naturally handled: if there are no alphanumeric characters, the `left` pointer keeps moving right past all of them, and the loop condition `left < right` becomes false before any comparison is made — so you fall through to `true`.",
  },
  {
    question: "How do I handle case sensitivity?",
    response: "Case sensitivity is handled by converting all characters to lowercase (or uppercase) before comparing.\n\n**In Python:** `char.lower()`\n**In JavaScript:** `char.toLowerCase()`\n**In Java:** `Character.toLowerCase(ch)`\n**In C++:** `tolower(char)`\n\nSo when comparing, you do: `if (leftChar.toLowerCase() !== rightChar.toLowerCase()) → not a palindrome`\n\nThis ensures that 'A' matches 'a', 'B' matches 'b', etc.",
  },
  {
    question: "Can you show me a simple solution in Python?",
    response: "Here's the simplest clean solution:\n\n```python\nimport sys\n\ndef main():\n    s = sys.stdin.readline().strip()\n    cleaned = [c.lower() for c in s if c.isalnum()]\n    if cleaned == cleaned[::-1]:\n        print('true')\n    else:\n        print('false')\n\nmain()\n```\n\nThis works in 3 lines:\n1. Read the input\n2. Build a list of lowercase alphanumeric chars\n3. Compare the list with its reverse (`[::-1]`)\n\nTime: O(n), Space: O(n). Simple and correct. For an interview, you'd also want to show the two-pointer O(1) space version.",
  },
];

function sha256Hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function main() {
  console.log('🌱 Seeding — 1 pattern, 1 problem, pre-seeded EXPLORE cache...\n');

  // ── 1. Create one pattern ──
  const pattern = await prisma.pattern.upsert({
    where: { name: 'Two Pointers' },
    update: { description: 'Use two indices moving towards each other.' },
    create: { name: 'Two Pointers', description: 'Use two indices moving towards each other.' },
  });
  console.log(`✓ Pattern: ${pattern.name} (${pattern.id})`);

  // ── 2. Create one problem ──
  const problem = await prisma.problem.upsert({
    where: { slug: 'valid-palindrome' },
    update: {},
    create: {
      slug: 'valid-palindrome',
      title: 'Valid Palindrome',
      statementMd: `# Valid Palindrome\n\nGiven a string **s**, determine if it is a palindrome considering only alphanumeric characters and ignoring case.\n\n## Input\nA single line string s.\n\n## Output\nPrint "true" if s is a palindrome, otherwise "false".`,
      constraintsMd: '1 ≤ |s| ≤ 2*10^5',
      difficulty: 'EASY',
      isPublished: true,
      tags: ['string', 'warmup'],
    },
  });
  console.log(`✓ Problem: ${problem.title} (${problem.slug})`);

  // ── 3. Link problem to pattern ──
  await prisma.problemPattern.upsert({
    where: { problemId_patternId: { problemId: problem.id, patternId: pattern.id } },
    update: {},
    create: { problemId: problem.id, patternId: pattern.id },
  });
  console.log(`✓ Linked to pattern: ${pattern.name}`);

  // ── 4. Create hints ──
  await prisma.hint.deleteMany({ where: { problemId: problem.id } });
  await prisma.hint.createMany({
    data: [
      { problemId: problem.id, order: 1, textMd: 'Use two pointers from both ends of the string. Skip non-alphanumeric characters.', hintType: 'strategy', escalationLevel: 1 },
      { problemId: problem.id, order: 2, textMd: 'Compare characters at both pointers after converting to lowercase. If they differ, it\'s not a palindrome.', hintType: 'detail', escalationLevel: 2 },
      { problemId: problem.id, order: 3, textMd: 'Edge cases: empty strings and single characters are palindromes. Use `.isalnum()` to filter characters.', hintType: 'edge_case', escalationLevel: 3 },
    ],
  });
  console.log('✓ Hints (3 levels)');

  // ── 5. Create test cases ──
  await prisma.testCase.deleteMany({ where: { problemId: problem.id } });
  await prisma.testCase.createMany({
    data: [
      { problemId: problem.id, order: 1, input: 'A man, a plan, a canal: Panama\n', expected: 'true\n', isHidden: false },
      { problemId: problem.id, order: 2, input: 'race a car\n', expected: 'false\n', isHidden: false },
      { problemId: problem.id, order: 3, input: '0P\n', expected: 'false\n', isHidden: true },
    ],
  });
  console.log('✓ Test cases (2 public, 1 hidden)');

  // ── 6. Pre-seed CacheEntry records for EXPLORE stage ──
  // These act as "system-level" cache entries that any user can hit.
  // We use a special user ID so they're shared across all users.
  const SYSTEM_USER = 'system';

  // Clear old cache for this problem
  await prisma.cacheEntry.deleteMany({ where: { problemId: problem.id } });
  console.log(`\n📦 Seeding ${exploreQuestions.length} pre-built Q&A cache entries...\n`);

  // Lazy load the embedding pipeline
  let pipeline = null;
  async function getEmbeddingVector(text) {
    if (!pipeline) {
      const { pipeline: p } = await import("@xenova/transformers");
      pipeline = await p("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    const result = await pipeline(text, { pooling: "mean", normalize: true });
    const tensor = result.embeddings || result.last_hidden_state?.data || result.data;
    return Array.from(tensor);
  }

  for (let i = 0; i < exploreQuestions.length; i++) {
    const qa = exploreQuestions[i];
    const questionMd5 = sha256Hash(qa.question);

    // Generate a real 384-d embedding
    let realEmbedding;
    try {
      realEmbedding = await getEmbeddingVector(qa.question);
      const nonzero = realEmbedding.filter(v => Math.abs(v) > 0.0001).length;
      console.log(`  [${i + 1}/${exploreQuestions.length}] "${qa.question.slice(0, 55)}..." (${realEmbedding.length}D, ${nonzero} nonzero)`);
    } catch (e) {
      console.warn(`  ⚠️ Embedding failed for "${qa.question}":`, e.message);
      realEmbedding = new Array(384).fill(0).map((_, idx) => Math.sin(idx * 137.508 + i * 271.33) * 0.01);
    }

    await prisma.cacheEntry.create({
      data: {
        problemId: problem.id,
        questionMd5,
        embedding: realEmbedding,
        response: qa.response,
        stage: 'EXPLORE',
        rung: 1,
        usedCount: 0,
      },
    });
  }

  console.log(`\n✅ Seed complete!\n   Problem: ${problem.title}\n   Pattern: ${pattern.name}\n   Hints: 3 levels\n   Test cases: 3\n   Pre-seeded Q&A: ${exploreQuestions.length} entries\n\nYou can now test the mentor EXPLORE stage with questions like:\n  - "What is this problem asking?"\n  - "What's a palindrome?"\n  - "What are the edge cases?"\n  - "How do I optimize this?"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
