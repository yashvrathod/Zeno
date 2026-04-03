import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getEmbedding } from "../lib/embeddings";
import crypto from "crypto";

const prisma = new PrismaClient();

async function md5Hash(text: string): Promise<string> {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * Pre-populated Q&A for common DSA problems.
 * These seed the global cache so the first user asking a common question
 * still gets a fast response without a fresh AI call.
 */
const PROBLEM_SEED_DATA: Record<string, Array<{ question: string; answer: string; stage: string }>> = {
  "sum-of-two-integers": [
    {
      question: "How do I solve this problem?",
      answer: "This is a simple addition problem! You need to read two integers from the input and print their sum. For example, if the input is '5 10', your code should output '15'.",
      stage: "EXPLORE",
    },
    {
      question: "What should I do if the numbers are negative?",
      answer: "The same addition rules apply! Adding a negative number is like subtraction. For example, '10 + (-5)' is '5'. Your programming language handles this automatically with the '+' operator.",
      stage: "EXPLORE",
    },
    {
      question: "Can you explain the input format?",
      answer: "Sure! The input gives you two integers on a single line, separated by a space. You should parse them as integers and then add them together.",
      stage: "EXPLORE",
    },
    {
      question: "What's the best approach for this?",
      answer: "Since it's a basic arithmetic problem, the best approach is direct calculation. Read the inputs 'a' and 'b', and simply compute 'a + b'. No complex data structures are needed here.",
      stage: "STRATEGIZE",
    },
  ],
  "two-sum": [
    {
      question: "What does this problem actually ask?",
      answer: "You're given an array of numbers and a target value. Find two numbers in the array that add up to the target, and return their indices. Each input has exactly one solution, and you can't use the same element twice.",
      stage: "EXPLORE",
    },
    {
      question: "Can I use a brute force approach?",
      answer: "You could check every pair with nested loops — that would be O(n²). But think about it: for each number, you're really asking 'has the complement (target - this number) already appeared?' What data structure lets you answer that question in O(1) time?",
      stage: "STRATEGIZE",
    },
    {
      question: "I'm thinking of using a hash map",
      answer: "Great instinct! A hash map is exactly what you need. The idea: as you iterate through the array, store each number and its index. For each new number, check if its complement (target - number) is already in the map. If yes, you found your pair. If no, add the current number to the map and continue.",
      stage: "STRATEGIZE",
    },
    {
      question: "What edge cases should I consider?",
      answer: "Think about: (1) Array with negative numbers — can the target be negative? (2) Duplicate values — what if [3, 3] and target is 6? (3) Very large input — is O(n²) acceptable? The hash map approach handles all these in O(n) time and O(n) space.",
      stage: "EXPLORE",
    },
  ],
  "valid-parentheses": [
    {
      question: "What does this problem actually ask?",
      answer: "You're given a string of parentheses characters: '(', ')', '{', '}', '[', ']'. Determine if the string is valid — meaning every opening bracket has a matching closing bracket in the correct order. For example, '()[]{}' is valid but '(]' is not.",
      stage: "EXPLORE",
    },
    {
      question: "What's the best approach?",
      answer: "Think about what happens when you read from left to right: every time you see an opening bracket, you need to remember it. When you see a closing bracket, you need to match it with the MOST RECENT opening bracket. What data structure remembers the most recent item?",
      stage: "STRATEGIZE",
    },
    {
      question: "How do I implement the stack approach?",
      answer: "Push every opening bracket onto a stack. When you encounter a closing bracket, pop from the stack and check if it matches. If the stack is empty when you try to pop, or the popped bracket doesn't match — invalid. After processing the entire string, the stack should be empty.",
      stage: "STRATEGIZE",
    },
  ],
};

async function seedFrequentQuestions() {
  console.log("🚀 Seeding frequent questions with real embeddings (GLOBAL CACHE)...");

  for (const [slug, qaList] of Object.entries(PROBLEM_SEED_DATA)) {
    const problem = await prisma.problem.findUnique({ where: { slug } });

    if (!problem) {
      console.log(`⏭️ Problem '${slug}' not found, skipping...`);
      continue;
    }

    console.log(`\n📝 Seeding ${qaList.length} Q&A for: ${problem.title}`);

    for (const qa of qaList) {
      const embedding = await getEmbedding(qa.question);
      const questionMd5 = crypto.createHash("sha256").update(qa.question).digest("hex");

      const existing = await prisma.cacheEntry.findUnique({
        where: { problemId_questionMd5: { problemId: problem.id, questionMd5 } },
      });

      if (existing) {
        console.log(`  ✓ Already cached: "${qa.question.slice(0, 50)}..."`);
        continue;
      }

      await prisma.cacheEntry.create({
        data: {
          problemId: problem.id,
          questionMd5,
          embedding: embedding as any,
          response: qa.answer,
          stage: qa.stage,
          rung: 1,
          usedCount: 0,
        },
      });

      console.log(`  ✅ New cache entry: "${qa.question.slice(0, 50)}..."`);
    }
  }

  console.log("\n✨ Seed complete! Global cache is pre-populated.");
}

seedFrequentQuestions()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
