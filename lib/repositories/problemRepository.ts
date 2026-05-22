import prisma from '@/lib/prisma';

export async function findProblemBySlug(slug: string) {
  return prisma.problem.findUnique({
    where: { slug },
    include: { patterns: { include: { pattern: true } } },
  });
}

export async function findProblemById(id: string) {
  return prisma.problem.findUnique({
    where: { id },
    include: { patterns: { include: { pattern: true } } },
  });
}

export type ProblemWithPatterns = Awaited<ReturnType<typeof findProblemBySlug>>;
