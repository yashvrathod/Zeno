# Global Cache — What Changed & How to Check

## Summary

Removed the `userId` column from `CacheEntry`. Every AI response to every user on every problem is now stored in a **global shared cache**. When user A asks a question and gets an AI answer, user B asking the same question gets the cached answer — zero API cost.

## How the Caching Works Now

```
User asks question
    ↓
1. Hash the question + find in cache by [problemId, questionMd5]
   → exact match OR semantic similarity > 0.88
    ↓ YES → return cached answer (no AI call)
    ↓
2. No match? Call AI → save response to global cache
3. Next user with same question → cache hit (step 1)
```

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Removed `userId` field & constraint from `CacheEntry` |
| `prisma/migrations/20260401092945_make_cache_global/` | New migration |
| `lib/mentor/interactionRouter.ts` | Cache lookup now global-only, `saveToCache` no longer takes userId, `clearCacheForSession` takes only problemId |
| `app/api/mentor/route.ts` | `saveToCache()` call updated (removed userId) |
| `app/api/mentor/approach/route.ts` | `saveToCache()` call updated (removed userId) |

---

## How to Check It Works

### 1. Verify the DB schema changed

```bash
npx prisma studio
```

- Open the `CacheEntry` table
- Confirm there is **no `userId` column**
- Existing rows are preserved but without the userId field

### 2. Check the migration applied

```bash
npx prisma migrate status
```

Should show all migrations applied ✓

### 3. Test cross-user caching manually

**Tab A (User 1):**
- Log in as any user
- Open a coding problem
- Open the mentor chat
- Type: `"what does this problem actually ask?"`
- Check your console terminal — you should see:
  ```
  CACHE MISS (or AI_NEEDED — first time, no cache entry exists)
  ```

**Tab B (User 2):**
- Log in as a **different** user (or incognito window)
- Open the **same** problem
- Open the mentor chat
- Type the **same question**: `"what does this problem actually ask?"`
- Check your console terminal — you should see:
  ```
  [CACHE] CACHE HIT — exact MD5 match
  ```

**Result:** Tab B gets the answer instantly, no AI API call made.

### 4. Verify shared cache in Prisma Studio

```bash
npx prisma studio
```

- Go to `CacheEntry`
- Find the entry with the question hash for `"what does this problem actually ask?"`
- `usedCount` should be **≥ 1** (incremented each time any user hits the cache)

### 5. Check the cache hit rate over time

Run this in Prisma Studio or a terminal:

```bash
npx prisma db execute --stdin
```

Then paste this SQL to see your cache hit rate:

```sql
SELECT 
  COUNT(*) as total_cache_entries,
  SUM(CASE WHEN usedCount > 0 THEN 1 ELSE 0 END) as reused_entries,
  ROUND(100.0 * SUM(CASE WHEN usedCount > 0 THEN 1 ELSE 0 END) / COUNT(*), 1) as reuse_pct,
  SUM(usedCount) as total_cache_hits
FROM "CacheEntry";
```

A healthy cache will show 50-80% of entries being reused (reuse_pct ≥ 50%).

### 6. Verify the approach route works

```bash
# Start the dev server
npm run dev
# In the UI, navigate to a problem and submit an approach/strategy
# It should work as before — the cached approach validations are now global
```
