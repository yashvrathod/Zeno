# TestCase format migration

This document describes how to migrate `TestCase.input` / `TestCase.expected`
(string fields from the legacy stdin/stdout harness) into the new
`TestCase.args` / `TestCase.expectedJson` (Json fields) consumed by
`lib/judge`.

This migration ships with PR 1 (infrastructure) but the data is not **used**
until PR 2 (product flip). The schema change is additive and non-destructive.

## What changed

The `TestCase` model grew two nullable fields:

```prisma
model TestCase {
  // ... existing fields ...
  input      String   // legacy, kept for PR 1; dropped in a follow-up
  expected   String   // legacy, kept for PR 1; dropped in a follow-up
  args         Json?  // NEW: structured args array for the new judge
  expectedJson Json?  // NEW: structured expected output for the new judge
  // ...
}
```

A new `ProblemSignature` model was added (1:1 with `Problem`) for
LeetCode-style method/class metadata. PR 1 ships the model only; the rows
are seeded per-problem in PR 2 (the seeds know the canonical signature
for each problem slug).

## Safety

The migration script (`prisma/migrate-test-format.ts`) is **read-only by
default**. It only writes to the database when invoked with `--apply`.
Always run the dry-run first.

## Procedure

1. **Back up the database.** Non-negotiable before any production migration.

   ```sh
   pg_dump "$DATABASE_URL" > backups/test-format-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Apply the schema change.** Generate a Prisma migration for the new
   fields.

   ```sh
   npx prisma migrate dev --create-only --name add_judge_json_fields
   npx prisma migrate deploy
   ```

   Review the generated SQL before deploying. The schema change is
   additive (nullable columns), so it is safe to apply on a populated
   table.

3. **Dry-run the data migration.**

   ```sh
   npx tsx prisma/migrate-test-format.ts
   ```

   Expected output:
   - Total test case count
   - "parsed ok" count and "parse failed" count
   - A sample of the first 3 rows showing the post-migration JSON shape
   - "DRY RUN" notice

   If the parse-failed count is > 0, **stop** and fix the offending rows
   manually. Common causes:
   - Stored as plain text like `"2 7 11 15, 9"` (legacy comma-separated)
     — convert to JSON manually.
   - Stored as a `stdin` template with `{{var}}` placeholders — convert
     to a JSON array of args and substitute the values.

4. **Smoke test on a slice.**

   ```sh
   npx tsx prisma/migrate-test-format.ts --limit 20
   ```

   Inspect the printed sample. Confirm the JSON shapes look right.

5. **Apply the data migration.**

   ```sh
   npx tsx prisma/migrate-test-format.ts --apply
   ```

   The script will refuse to apply if any row failed to parse. It prints
   the count of rows updated on success.

6. **Smoke test the new judge in staging.**

   Hit a problem page in staging, run a known-good submission, confirm
   the new `args` / `expectedJson` fields are being used (look for
   `__RESULT__:` in the run logs, not the legacy harness). A targeted
   verification:

   ```sh
   npx tsx prisma/migrate-test-format.ts --limit 5   # read-only, safe
   ```

7. **Schedule the drop of `input` / `expected`.** This is the only
   destructive change and is intentionally **not** part of PR 1. Once
   staging is green for ≥ 1 week, run:

   ```sh
   npx prisma migrate dev --create-only --name drop_legacy_test_case_strings
   npx prisma migrate deploy
   ```

   and update the Prisma client. At that point the new judge (PR 2) can
   drop the migration script from the deploy runbook.

## Rollback

If the migration needs to be rolled back:

- Schema change: the new columns are nullable and have no constraints,
  so dropping them is safe (`ALTER TABLE "TestCase" DROP COLUMN "args";`).
  Prisma's `--create-only` migration can be edited to do this.
- Data change: `args` and `expectedJson` are derived from `input` /
  `expected`, so re-running the migration regenerates them. There is no
  data loss in the legacy columns until the drop step.

## Notes

- The script uses Prisma's `Json` type which is stored as native
  `jsonb` in PostgreSQL. The shape is `{ args: unknown[]; expected:
  unknown }` per row.
- `paramTypes` in `ProblemSignature` is also `Json` and is an array of
  `{ name: string; type: string }`. This is a 1:1 with `Problem`.
- The script is idempotent: re-running it overwrites the new fields
  with the same derived values.
