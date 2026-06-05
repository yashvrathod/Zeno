// One-shot data migration: TestCase.input (string) → TestCase.args (Json)
//                       TestCase.expected (string) → TestCase.expectedJson (Json)
//
// The old shape stored args and expected outputs as raw strings that the legacy
// harness parsed ad-hoc. The new judge (lib/judge) needs structured JSON, so
// we backfill `args` and `expectedJson` from the existing strings.
//
// Usage:
//   tsx prisma/migrate-test-format.ts            # dry run, prints plan
//   tsx prisma/migrate-test-format.ts --apply    # writes to the database
//   tsx prisma/migrate-test-format.ts --limit N  # only process the first N rows (smoke test)
//
// In dry-run mode (the default) NO database writes happen.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

type ParsedTestCase = {
  id: string;
  problemId: string;
  order: number;
  input: string;
  expected: string;
  parsedArgs: unknown;
  parsedExpected: unknown;
  argsOk: boolean;
  expectedOk: boolean;
  argsError: string | null;
  expectedError: string | null;
};

function tryParse(s: string): { value: unknown; ok: boolean; error: string | null } {
  if (s === null || s === undefined) return { value: null, ok: false, error: "null input" };
  const trimmed = s.trim();
  if (trimmed.length === 0) return { value: null, ok: false, error: "empty string" };
  try {
    return { value: JSON.parse(trimmed), ok: true, error: null };
  } catch (e) {
    return {
      value: null,
      ok: false,
      error: e instanceof Error ? e.message : "JSON parse failed",
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined;

  const prisma = createPrismaClient();
  const startedAt = Date.now();

  const totalCount = await prisma.testCase.count();
  console.log(`[migrate-test-format] total test cases: ${totalCount}`);

  const all = await prisma.testCase.findMany({
    orderBy: [{ problemId: "asc" }, { order: "asc" }],
    ...(limit !== undefined ? { take: limit } : {}),
    // Only read the legacy string columns so the dry-run works BEFORE
    // the schema migration is applied. The apply step writes the new
    // Json columns, which only exist after `prisma migrate deploy`.
    select: { id: true, problemId: true, order: true, input: true, expected: true },
  });

  const parsed: ParsedTestCase[] = all.map((tc) => {
    const argsResult = tryParse(tc.input);
    const expectedResult = tryParse(tc.expected);
    return {
      id: tc.id,
      problemId: tc.problemId,
      order: tc.order,
      input: tc.input,
      expected: tc.expected,
      parsedArgs: argsResult.value,
      parsedExpected: expectedResult.value,
      argsOk: argsResult.ok,
      expectedOk: expectedResult.ok,
      argsError: argsResult.error,
      expectedError: expectedResult.error,
    };
  });

  const okCount = parsed.filter((p) => p.argsOk && p.expectedOk).length;
  const badCount = parsed.length - okCount;

  console.log(`[migrate-test-format] parsed ok: ${okCount}`);
  console.log(`[migrate-test-format] parse failed: ${badCount}`);

  if (badCount > 0) {
    console.log("");
    console.log("[migrate-test-format] rows that could not be parsed:");
    for (const p of parsed.filter((x) => !x.argsOk || !x.expectedOk).slice(0, 50)) {
      console.log(
        `  - ${p.problemId}/${p.order} (${p.id})` +
          (p.argsOk ? "" : `  args: ${p.argsError} | input=${truncate(p.input, 80)}`) +
          (p.expectedOk ? "" : `  expected: ${p.expectedError} | value=${truncate(p.expected, 80)}`),
      );
    }
    if (badCount > 50) console.log(`  ... and ${badCount - 50} more`);
  }

  const sample = parsed.slice(0, 3).map((p) => ({
    id: p.id,
    problemId: p.problemId,
    order: p.order,
    args: p.parsedArgs,
    expectedJson: p.parsedExpected,
  }));
  console.log("");
  console.log("[migrate-test-format] sample of first 3 rows (post-migration shape):");
  for (const s of sample) {
    console.log(`  ${s.problemId}/${s.order}  args=${JSON.stringify(s.args)}  expected=${JSON.stringify(s.expectedJson)}`);
  }

  if (!apply) {
    console.log("");
    console.log("[migrate-test-format] DRY RUN — no writes performed.");
    console.log("[migrate-test-format] pass --apply to commit these changes to the database.");
    if (badCount > 0) {
      console.log("[migrate-test-format] WARNING: some rows failed to parse. Review them before applying.");
    }
    await prisma.$disconnect();
    process.exit(badCount > 0 ? 2 : 0);
  }

  if (badCount > 0) {
    console.log("");
    console.log("[migrate-test-format] refusing to --apply because some rows failed to parse.");
    console.log("[migrate-test-format] fix the bad rows first, then re-run with --apply.");
    await prisma.$disconnect();
    process.exit(2);
  }

  let updated = 0;
  for (const p of parsed) {
    await prisma.testCase.update({
      where: { id: p.id },
      data: {
        args: p.parsedArgs as object,
        expectedJson: p.parsedExpected as object,
      },
    });
    updated += 1;
  }

  const elapsedMs = Date.now() - startedAt;
  console.log("");
  console.log(`[migrate-test-format] applied ${updated} updates in ${elapsedMs}ms`);
  await prisma.$disconnect();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return new PrismaClient();
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
