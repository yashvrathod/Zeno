-- Seed Data for DSA Mentor Personalization System
-- Run this after running migrations: npx prisma migrate dev

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. User Knowledge Graphs
-- ─────────────────────────────────────────────────────────────────────────────

-- User 1: Strong in arrays/pointers, weak in DP
INSERT INTO "UserKnowledgeGraph" (id, "userId", "learningStyle", "strengths", "weaknesses", "learningTrajectory", "createdAt", "updatedAt")
VALUES (
  'kg_user_1',
  'user_1',
  '{"prefersVisual":true,"prefersExamples":true,"prefersTheory":false,"learnsByDoing":true,"needsStepByStep":true,"prefersAnalogy":true,"hintLevelPreference":1,"explanationDensity":"detailed","feedbackTiming":"immediate"}'::jsonb,
  ARRAY['two_pointer', 'sliding_window', 'hash_map'],
  ARRAY['dp', 'recursion', 'graph'],
  '{"startedAt":"2024-01-15","totalProblemsAttempted":45,"totalProblemsSolved":32,"averageTimePerProblem":25,"preferredDifficulty":"medium"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- User 2: Strong in DP/recursion, weak in pointers
INSERT INTO "UserKnowledgeGraph" (id, "userId", "learningStyle", "strengths", "weaknesses", "learningTrajectory", "createdAt", "updatedAt")
VALUES (
  'kg_user_2',
  'user_2',
  '{"prefersVisual":false,"prefersExamples":true,"prefersTheory":true,"learnsByDoing":false,"needsStepByStep":false,"prefersAnalogy":false,"hintLevelPreference":2,"explanationDensity":"concise","feedbackTiming":"on_request"}'::jsonb,
  ARRAY['dp', 'recursion', 'tree'],
  ARRAY['two_pointer', 'sliding_window', 'graph'],
  '{"startedAt":"2024-02-01","totalProblemsAttempted":78,"totalProblemsSolved":65,"averageTimePerProblem":18,"preferredDifficulty":"hard"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- User 3: Beginner, strong in basics
INSERT INTO "UserKnowledgeGraph" (id, "userId", "learningStyle", "strengths", "weaknesses", "learningTrajectory", "createdAt", "updatedAt")
VALUES (
  'kg_user_3',
  'user_3',
  '{"prefersVisual":true,"prefersExamples":false,"prefersTheory":true,"learnsByDoing":true,"needsStepByStep":true,"prefersAnalogy":true,"hintLevelPreference":0,"explanationDensity":"comprehensive","feedbackTiming":"immediate"}'::jsonb,
  ARRAY['array_manipulation', 'hash_map', 'stack'],
  ARRAY['dp', 'graph', 'recursion'],
  '{"startedAt":"2024-03-10","totalProblemsAttempted":23,"totalProblemsSolved":12,"averageTimePerProblem":35,"preferredDifficulty":"easy"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Concept Mastery Data
-- ─────────────────────────────────────────────────────────────────────────────

-- User 1 - Strong in arrays/pointers
INSERT INTO "ConceptMastery" ("userId", "conceptId", "mastery", "lastPracticed", "practiceCount", "successRate", "averageTimeToSolve", "commonErrors", "prerequisites", "dependents", "nextReviewDue", "difficultyRating", "confidenceRating", "createdAt", "updatedAt")
VALUES
  ('user_1', 'two_pointer', 85, NOW() - INTERVAL '5 days', 12, 0.92, 900, '[{"type":"off_by_one","message":"Pointer index out of bounds","occurrences":1}]'::jsonb, ARRAY['array_manipulation'], ARRAY['sliding_window'], NOW() + INTERVAL '2 days', 2, 4, NOW(), NOW()),
  ('user_1', 'sliding_window', 78, NOW() - INTERVAL '3 days', 8, 0.88, 1200, '[{"type":"edge_case_missed","message":"Window size not handled correctly","occurrences":2}]'::jsonb, ARRAY['two_pointer'], ARRAY[], NOW() + INTERVAL '3 days', 3, 4, NOW(), NOW()),
  ('user_1', 'hash_map', 72, NOW() - INTERVAL '7 days', 10, 0.85, 800, '[]'::jsonb, ARRAY['array_manipulation'], ARRAY[], NOW() + INTERVAL '4 days', 3, 3, NOW(), NOW()),
  ('user_1', 'dp', 25, NOW() - INTERVAL '14 days', 5, 0.40, 2400, '[{"type":"wrong_algorithm","message":"Using greedy instead of DP","occurrences":3},{"type":"state_not_reset","message":"DP state not properly initialized","occurrences":2}]'::jsonb, ARRAY['recursion'], ARRAY[], NOW() + INTERVAL '8 days', 5, 1, NOW(), NOW()),
  ('user_1', 'recursion', 35, NOW() - INTERVAL '10 days', 4, 0.50, 1800, '[{"type":"infinite_loop","message":"Missing base case","occurrences":2}]'::jsonb, ARRAY[], ARRAY['dp', 'tree'], NOW() + INTERVAL '7 days', 4, 2, NOW(), NOW()),
  ('user_1', 'graph', 30, NOW() - INTERVAL '20 days', 3, 0.33, 3000, '[{"type":"wrong_algorithm","message":"Using wrong traversal type","occurrences":2}]'::jsonb, ARRAY['array_manipulation'], ARRAY['bfs', 'dfs'], NOW() + INTERVAL '8 days', 5, 1, NOW(), NOW())
ON CONFLICT ("userId", "conceptId") DO NOTHING;

-- User 2 - Strong in DP/recursion
INSERT INTO "ConceptMastery" ("userId", "conceptId", "mastery", "lastPracticed", "practiceCount", "successRate", "averageTimeToSolve", "commonErrors", "prerequisites", "dependents", "nextReviewDue", "difficultyRating", "confidenceRating", "createdAt", "updatedAt")
VALUES
  ('user_2', 'dp', 88, NOW() - INTERVAL '2 days', 15, 0.93, 600, '[]'::jsonb, ARRAY['recursion'], ARRAY[], NOW() + INTERVAL '2 days', 2, 5, NOW(), NOW()),
  ('user_2', 'recursion', 82, NOW() - INTERVAL '4 days', 12, 0.92, 450, '[]'::jsonb, ARRAY[], ARRAY['dp', 'tree'], NOW() + INTERVAL '2 days', 2, 4, NOW(), NOW()),
  ('user_2', 'tree', 75, NOW() - INTERVAL '6 days', 8, 0.88, 900, '[{"type":"null_pointer","message":"Null child not handled","occurrences":1}]'::jsonb, ARRAY['recursion'], ARRAY[], NOW() + INTERVAL '3 days', 3, 4, NOW(), NOW()),
  ('user_2', 'two_pointer', 35, NOW() - INTERVAL '15 days', 4, 0.50, 1500, '[{"type":"off_by_one","message":"Pointer index out of bounds","occurrences":2}]'::jsonb, ARRAY['array_manipulation'], ARRAY['sliding_window'], NOW() + INTERVAL '7 days', 4, 2, NOW(), NOW()),
  ('user_2', 'sliding_window', 40, NOW() - INTERVAL '12 days', 5, 0.60, 1800, '[{"type":"edge_case_missed","message":"Window size not handled correctly","occurrences":2}]'::jsonb, ARRAY['two_pointer'], ARRAY[], NOW() + INTERVAL '6 days', 4, 2, NOW(), NOW())
ON CONFLICT ("userId", "conceptId") DO NOTHING;

-- User 3 - Beginner
INSERT INTO "ConceptMastery" ("userId", "conceptId", "mastery", "lastPracticed", "practiceCount", "successRate", "averageTimeToSolve", "commonErrors", "prerequisites", "dependents", "nextReviewDue", "difficultyRating", "confidenceRating", "createdAt", "updatedAt")
VALUES
  ('user_3', 'array_manipulation', 75, NOW() - INTERVAL '5 days', 10, 0.80, 1000, '[]'::jsonb, ARRAY[], ARRAY['two_pointer', 'sliding_window', 'hash_map', 'stack', 'queue', 'heap', 'graph'], NOW() + INTERVAL '3 days', 2, 3, NOW(), NOW()),
  ('user_3', 'hash_map', 68, NOW() - INTERVAL '7 days', 8, 0.75, 1200, '[]'::jsonb, ARRAY['array_manipulation'], ARRAY[], NOW() + INTERVAL '4 days', 2, 3, NOW(), NOW()),
  ('user_3', 'stack', 65, NOW() - INTERVAL '8 days', 6, 0.83, 1100, '[{"type":"wrong_termination","message":"Stack empty check missing","occurrences":1}]'::jsonb, ARRAY['array_manipulation'], ARRAY[], NOW() + INTERVAL '4 days', 2, 3, NOW(), NOW()),
  ('user_3', 'queue', 60, NOW() - INTERVAL '10 days', 5, 0.80, 1300, '[]'::jsonb, ARRAY['array_manipulation'], ARRAY[], NOW() + INTERVAL '5 days', 2, 3, NOW(), NOW()),
  ('user_3', 'dp', 15, NOW() - INTERVAL '20 days', 2, 0.00, 3000, '[{"type":"wrong_algorithm","message":"Using greedy instead of DP","occurrences":2}]'::jsonb, ARRAY['recursion'], ARRAY[], NOW() + INTERVAL '10 days', 5, 1, NOW(), NOW()),
  ('user_3', 'recursion', 20, NOW() - INTERVAL '18 days', 3, 0.33, 2500, '[{"type":"infinite_loop","message":"Missing base case","occurrences":2}]'::jsonb, ARRAY[], ARRAY['dp', 'tree'], NOW() + INTERVAL '9 days', 5, 1, NOW(), NOW())
ON CONFLICT ("userId", "conceptId") DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Learning Pattern Data
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "LearningPattern" ("userId", "patternType", "strength", "lastUsed", "successRate", "preferredContext", "createdAt", "updatedAt")
VALUES
  -- User 1
  ('user_1', 'two_pointer', 0.85, NOW() - INTERVAL '3 days', 0.92, ARRAY['array', 'sorting'], NOW(), NOW()),
  ('user_1', 'sliding_window', 0.78, NOW() - INTERVAL '5 days', 0.88, ARRAY['array', 'subarray'], NOW(), NOW()),
  ('user_1', 'hash_map', 0.72, NOW() - INTERVAL '7 days', 0.85, ARRAY['lookup', 'counting'], NOW(), NOW()),
  ('user_1', 'dp', 0.35, NOW() - INTERVAL '14 days', 0.40, ARRAY['optimization'], NOW(), NOW()),
  ('user_1', 'recursion', 0.40, NOW() - INTERVAL '10 days', 0.50, ARRAY['tree', 'divide'], NOW(), NOW()),

  -- User 2
  ('user_2', 'dp', 0.88, NOW() - INTERVAL '2 days', 0.93, ARRAY['optimization', 'subproblems'], NOW(), NOW()),
  ('user_2', 'recursion', 0.82, NOW() - INTERVAL '4 days', 0.92, ARRAY['tree', 'divide'], NOW(), NOW()),
  ('user_2', 'tree', 0.75, NOW() - INTERVAL '6 days', 0.88, ARRAY['hierarchy', 'traversal'], NOW(), NOW()),
  ('user_2', 'two_pointer', 0.45, NOW() - INTERVAL '15 days', 0.50, ARRAY['array'], NOW(), NOW()),
  ('user_2', 'sliding_window', 0.50, NOW() - INTERVAL '12 days', 0.60, ARRAY['subarray'], NOW(), NOW()),

  -- User 3
  ('user_3', 'array_manipulation', 0.75, NOW() - INTERVAL '5 days', 0.80, ARRAY['iteration', 'indexing'], NOW(), NOW()),
  ('user_3', 'hash_map', 0.68, NOW() - INTERVAL '7 days', 0.75, ARRAY['lookup'], NOW(), NOW()),
  ('user_3', 'stack', 0.65, NOW() - INTERVAL '8 days', 0.83, ARRAY['lifo', 'nesting'], NOW(), NOW()),
  ('user_3', 'queue', 0.60, NOW() - INTERVAL '10 days', 0.80, ARRAY['fifo', 'ordering'], NOW(), NOW()),
  ('user_3', 'dp', 0.20, NOW() - INTERVAL '20 days', 0.00, ARRAY[], NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Problem Attempt Data
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "ProblemAttempt" ("userId", "problemId", "problemSlug", "concepts", "patterns", "attempts", "solved", "timeSpent", "firstAttemptSuccess", "hintCount", "stageReached", "rungReached", "date", "errors", "createdAt")
VALUES
  -- User 1 attempts
  ('user_1', '1', 'two-sum', ARRAY['hash_map', 'array_manipulation'], ARRAY['hash_map'], 3, true, 1200, false, 1, 'REFLECT', 6, NOW() - INTERVAL '10 days', '[{"type":"off_by_one","message":"Index error","timestamp":"2024-04-20"}]'::jsonb, NOW()),
  ('user_1', '167', 'two-sum-ii', ARRAY['two_pointer', 'array_manipulation'], ARRAY['two_pointer'], 2, true, 900, true, 0, 'REFLECT', 6, NOW() - INTERVAL '8 days', '[]'::jsonb, NOW()),
  ('user_1', '3', 'longest-substring', ARRAY['sliding_window', 'hash_map'], ARRAY['sliding_window'], 4, true, 1800, false, 2, 'REFLECT', 5, NOW() - INTERVAL '15 days', '[{"type":"edge_case_missed","message":"Window shrink","timestamp":"2024-04-15"}]'::jsonb, NOW()),
  ('user_1', '704', 'binary-search', ARRAY['binary_search', 'array_manipulation'], ARRAY['binary_search'], 2, true, 600, true, 0, 'REFLECT', 6, NOW() - INTERVAL '5 days', '[]'::jsonb, NOW()),
  ('user_1', '300', 'longest-increasing-subsequence', ARRAY['dp', 'binary_search'], ARRAY['dp'], 5, false, 2400, false, 3, 'STUCK', 3, NOW() - INTERVAL '20 days', '[{"type":"wrong_algorithm","message":"Greedy approach","timestamp":"2024-04-10"}]'::jsonb, NOW()),

  -- User 2 attempts
  ('user_2', '70', 'climbing-stairs', ARRAY['dp', 'recursion'], ARRAY['dp'], 1, true, 300, true, 0, 'REFLECT', 6, NOW() - INTERVAL '3 days', '[]'::jsonb, NOW()),
  ('user_2', '198', 'house-robber', ARRAY['dp', 'recursion'], ARRAY['dp'], 2, true, 480, true, 0, 'REFLECT', 6, NOW() - INTERVAL '5 days', '[]'::jsonb, NOW()),
  ('user_2', '322', 'coin-change', ARRAY['dp', 'recursion'], ARRAY['dp'], 3, true, 900, false, 1, 'REFLECT', 5, NOW() - INTERVAL '7 days', '[{"type":"state_not_reset","message":"DP init","timestamp":"2024-04-18"}]'::jsonb, NOW()),
  ('user_2', '104', 'maximum-depth-of-binary-tree', ARRAY['tree', 'recursion'], ARRAY['recursion'], 1, true, 240, true, 0, 'REFLECT', 6, NOW() - INTERVAL '2 days', '[]'::jsonb, NOW()),
  ('user_2', '15', '3sum', ARRAY['two_pointer', 'array_manipulation'], ARRAY['two_pointer'], 4, false, 1800, false, 2, 'STUCK', 3, NOW() - INTERVAL '12 days', '[{"type":"off_by_one","message":"Pointer bounds","timestamp":"2024-04-12"}]'::jsonb, NOW()),

  -- User 3 attempts
  ('user_3', '1', 'two-sum', ARRAY['hash_map', 'array_manipulation'], ARRAY['hash_map'], 5, true, 1800, false, 3, 'REFLECT', 4, NOW() - INTERVAL '7 days', '[{"type":"wrong_algorithm","message":"Brute force","timestamp":"2024-04-22"}]'::jsonb, NOW()),
  ('user_3', '217', 'contains-duplicate', ARRAY['array_manipulation', 'hash_map'], ARRAY['hash_map'], 3, true, 900, true, 0, 'REFLECT', 5, NOW() - INTERVAL '10 days', '[]'::jsonb, NOW()),
  ('user_3', '242', 'valid-anagram', ARRAY['array_manipulation', 'hash_map'], ARRAY['hash_map'], 2, true, 480, true, 0, 'REFLECT', 6, NOW() - INTERVAL '12 days', '[]'::jsonb, NOW()),
  ('user_3', '20', 'valid-parentheses', ARRAY['stack', 'array_manipulation'], ARRAY['stack'], 4, true, 1200, false, 2, 'REFLECT', 4, NOW() - INTERVAL '14 days', '[{"type":"wrong_termination","message":"Stack check","timestamp":"2024-04-16"}]'::jsonb, NOW()),
  ('user_3', '232', 'implement-queue-using-stacks', ARRAY['stack', 'queue'], ARRAY['stack'], 6, false, 2400, false, 4, 'STUCK', 2, NOW() - INTERVAL '18 days', '[{"type":"logic_error","message":"Wrong order","timestamp":"2024-04-10"}]'::jsonb, NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Misconception Data
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO "Misconception" ("userId", "conceptId", "description", "detectedDate", "corrected", "correctionDate", "relatedProblems", "createdAt")
VALUES
  -- User 1
  ('user_1', 'dp', 'Thinks DP always requires O(n²) space', '2024-02-15', false, NULL, ARRAY['300', '322'], NOW()),
  ('user_1', 'recursion', 'Confuses base case with recursive case', '2024-03-01', false, NULL, ARRAY['104', '226'], NOW()),
  ('user_1', 'two_pointer', 'Thinks pointers always move in same direction', '2024-01-20', true, '2024-01-25', ARRAY['167', '11'], NOW()),

  -- User 2
  ('user_2', 'two_pointer', 'Forgets to sort array before using two pointers', '2024-02-20', false, NULL, ARRAY['15', '11'], NOW()),
  ('user_2', 'sliding_window', 'Doesn\'t handle window shrinking correctly', '2024-03-05', false, NULL, ARRAY['3', '209'], NOW()),
  ('user_2', 'graph', 'Confuses BFS with DFS for shortest path', '2024-02-28', true, '2024-03-02', ARRAY['127', '733'], NOW()),

  -- User 3
  ('user_3', 'dp', 'Tries to solve DP problems with greedy approach', '2024-03-15', false, NULL, ARRAY['70', '198'], NOW()),
  ('user_3', 'recursion', 'Doesn\'t understand memoization necessity', '2024-03-18', false, NULL, ARRAY['509', '70'], NOW()),
  ('user_3', 'stack', 'Uses stack when queue is needed', '2024-03-10', true, '2024-03-12', ARRAY['232', '641'], NOW());

-- ─────────────────────────────────────────────────────────────────────────────
-- Summary
-- ─────────────────────────────────────────────────────────────────────────────

-- Created:
-- - 3 User Knowledge Graphs
-- - 18 Concept Mastery records
-- - 15 Learning Pattern records
-- - 14 Problem Attempt records
-- - 9 Misconception records