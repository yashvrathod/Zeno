import { z } from 'zod';

const DifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const TestCaseInputSchema = z.object({
  input: z.string().default(''),
  expected: z.string().default(''),
  isHidden: z.boolean().optional().default(false),
});

export const CreateProblemSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  statementMd: z.string().min(1),
  constraintsMd: z.string().nullable().optional(),
  difficulty: DifficultySchema.optional().default('EASY'),
  isPublished: z.boolean().optional().default(false),
  tags: z.array(z.string()).optional(),
  patternIds: z.array(z.string()).optional().default([]),
  hints: z.array(z.string()).optional().default([]),
  starterCode: z.record(z.string(), z.string()).optional().default({}),
  testCases: z.array(TestCaseInputSchema).optional().default([]),
});

export const UpdateProblemSchema = CreateProblemSchema.partial().extend({
  constraintsMd: z.string().nullable().optional(),
});

export type CreateProblemInput = z.infer<typeof CreateProblemSchema>;
export type UpdateProblemInput = z.infer<typeof UpdateProblemSchema>;

export function normalizeTestCases(testCases: Array<z.infer<typeof TestCaseInputSchema>>) {
  const publicOnes = testCases.filter((t) => !t.isHidden);
  const hiddenOnes = testCases.filter((t) => t.isHidden);

  const normalized = [
    ...publicOnes.map((tc, idx) => ({ ...tc, isHidden: false, order: idx + 1 })),
    ...hiddenOnes.map((tc, idx) => ({ ...tc, isHidden: true, order: idx + 1 })),
  ];

  // Ensure trimmed strings (avoid accidental whitespace-only mismatches)
  return normalized.map((tc) => ({
    ...tc,
    input: tc.input ?? '',
    expected: tc.expected ?? '',
  }));
}
