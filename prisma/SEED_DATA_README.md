# Seed Data for DSA Mentor Personalization System

This directory contains seed data for testing the new personalization features.

## What's Included

### 1. User Knowledge Graphs (3 users)
- **User 1**: Strong in arrays/pointers, weak in DP
- **User 2**: Strong in DP/recursion, weak in pointers
- **User 3**: Beginner, strong in basics

### 2. Concept Mastery Data (18 records)
- Tracks mastery levels for 30+ DSA concepts
- Includes practice history, success rates, and common errors
- Spaced repetition scheduling

### 3. Learning Patterns (15 records)
- Pattern proficiency scores
- Success rates by pattern type
- Preferred contexts for each pattern

### 4. Problem Attempts (14 records)
- Complete attempt history
- Time spent, hints used, stages reached
- Error tracking

### 5. Misconceptions (9 records)
- Identified learning misconceptions
- Correction status
- Related problems

## How to Use

### Option 1: TypeScript Seed (Recommended)

```bash
# Run the seed script
npx tsx prisma/seed-personalization.ts

# Or if you have ts-node
npx ts-node prisma/seed-personalization.ts
```

### Option 2: SQL Seed

```bash
# Run the SQL file directly
psql $DATABASE_URL < prisma/seed-personalization.sql

# Or via Prisma
npx prisma db execute --file prisma/seed-personalization.sql
```

### Option 3: Via Prisma CLI

Add to your `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed-personalization.ts"
  }
}
```

Then run:

```bash
npx prisma db seed
```

## What You'll See

After running the seed, you'll have:

### User Profiles
- 3 users with different learning styles and skill levels
- Personalized learning trajectories
- Strength/weakness analysis

### Concept Mastery
- 18 concept mastery records across 3 users
- Mastery levels ranging from 10% to 88%
- Practice counts and success rates
- Common errors for each concept

### Learning Patterns
- 15 pattern proficiency records
- Strength scores (0.20 to 0.88)
- Success rates by pattern type

### Problem History
- 14 problem attempts
- Solved vs unsolved tracking
- Time spent and hints used
- Stage progression

### Misconceptions
- 9 identified misconceptions
- Correction status tracking
- Related problem references

## Testing the Features

### 1. Test Personalization
```typescript
import { getStudentKnowledgeGraph, getWeakestConcepts } from '@/lib/mentor/personalizationEngine';

const graph = await getStudentKnowledgeGraph('user_1');
const weakConcepts = getWeakestConcepts(graph);

console.log('Weakest concepts:', weakConcepts);
// Output: [{ concept: 'dp', mastery: 25 }, { concept: 'graph', mastery: 30 }, ...]
```

### 2. Test Intent Classification
```typescript
import { classifyIntentWithContext } from '@/lib/mentor/enhancedIntentClassifier';

const intent = await classifyIntentWithContext(
  "I'm stuck on this DP problem",
  { stage: 'STRATEGIZE', userFrustrationLevel: 0.7 }
);

console.log('Intent:', intent.primaryIntent);
// Output: 'hint_request' with high confidence
```

### 3. Test Debugging
```typescript
import { analyzeCodeForDebugging } from '@/lib/mentor/enhancedDebuggingAssistant';

const analysis = await analyzeCodeForDebugging(
  'function twoSum(nums, target) { for (let i = 0; i <= nums.length; i++) { ... } }',
  'javascript',
  { errorMessage: 'Cannot read property of undefined' }
);

console.log('Bug hypotheses:', analysis.bugHypotheses);
// Output: [{ type: 'off_by_one', confidence: 0.9, ... }]
```

### 4. Test Visualization
```typescript
import { generateVisualizationFromTrace } from '@/lib/mentor/interactiveVisualization';

const viz = generateVisualizationFromTrace(
  {
    variables: [
      { name: 'left', value: '0', changed: true },
      { name: 'right', value: '4', changed: true }
    ],
    dataStructures: [
      { type: 'array', representation: '[2,7,11,15]' }
    ]
  },
  'two_pointer',
  { title: 'Two Sum' }
);

console.log('Visualization:', viz);
// Output: Interactive visualization data
```

## Sample Data Summary

| Metric | Count |
|--------|-------|
| Users | 3 |
| Knowledge Graphs | 3 |
| Concept Mastery Records | 18 |
| Learning Patterns | 15 |
| Problem Attempts | 14 |
| Misconceptions | 9 |
| **Total Records** | **59** |

## User Profiles

### User 1 (Intermediate)
- **Strengths**: two_pointer (85%), sliding_window (78%), hash_map (72%)
- **Weaknesses**: dp (25%), recursion (35%), graph (30%)
- **Learning Style**: Visual, examples, step-by-step
- **Problems Solved**: 32/45

### User 2 (Advanced)
- **Strengths**: dp (88%), recursion (82%), tree (75%)
- **Weaknesses**: two_pointer (35%), sliding_window (40%)
- **Learning Style**: Theory, concise, on-request feedback
- **Problems Solved**: 65/78

### User 3 (Beginner)
- **Strengths**: array_manipulation (75%), hash_map (68%), stack (65%)
- **Weaknesses**: dp (15%), recursion (20%), graph (10%)
- **Learning Style**: Visual, comprehensive, immediate feedback
- **Problems Solved**: 12/23

## Cleaning Up

To remove seed data:

```sql
-- Delete in order of dependencies
DELETE FROM "Misconception";
DELETE FROM "ProblemAttempt";
DELETE FROM "LearningPattern";
DELETE FROM "ConceptMastery";
DELETE FROM "UserKnowledgeGraph";
```

Or via Prisma:

```bash
npx prisma db execute --stdin <<EOF
DELETE FROM "Misconception";
DELETE FROM "ProblemAttempt";
DELETE FROM "LearningPattern";
DELETE FROM "ConceptMastery";
DELETE FROM "UserKnowledgeGraph";
EOF
```

## Notes

- All dates are relative to current time
- User IDs are: `user_1`, `user_2`, `user_3`
- Problem IDs match LeetCode IDs where applicable
- All data is realistic and represents actual learning patterns

## Next Steps

1. Run the seed data
2. Test the personalization features
3. Verify the AI responses use the data
4. Adjust data as needed for your testing scenarios