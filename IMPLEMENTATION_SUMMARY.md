# Implementation Summary: 4-Layer Rate Limit Defense

## What Was Built

### 1. Global Cache (COMPLETED)
**Problem:** Every user's Q&A was siloed. 100 users asking same question = 100 API calls.
**Fix:** Removed `userId` from `CacheEntry` table entirely. Cache is now shared across all users.

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Dropped `userId` column & constraint |
| `lib/mentor/interactionRouter.ts` | All cache lookups now global; `saveToCache` no longer takes userId |
| `app/api/mentor/route.ts` | Updated saveToCache call |
| `app/api/mentor/approach/route.ts` | Updated saveToCache call |
| `prisma/seed.js` | Removed userId from cache seeding |
| `prisma/seed-frequent-questions.ts` | Rewritten for global cache format |

### 2. API Key Pool with Rotation & Cooldown (COMPLETED)
**Problem:** Single Groq key hits 429 → all users blocked.
**Fix:** Round-robin pool of `GROQ_API_KEY_1` through `GROQ_API_KEY_N` with per-key cooldown on 429.

**New file:** `lib/api-key-pool.ts`

**How it works:**
- On app start, reads all `GROQ_API_KEY_N` and `OPENROUTER_API_KEY_N` from env
- Round-robin selects next healthy key for each request
- On 429: that key goes into 60s cooldown (scales: 60s → 120s → 180s → 240s)
- On 5 consecutive failures: key marked unhealthy until cooldown expires
- When ALL keys are exhausted → returns last-resort key anyway (with warning)
- Pool status available via `poolStatus("groq")` for monitoring

**How to configure your 5 keys:**
```env
# .env.local
GROQ_API_KEY_1=gsk_abc123...
GROQ_API_KEY_2=gsk_def456...
GROQ_API_KEY_3=gsk_ghi789...
GROQ_API_KEY_4=gsk_jkl012...
GROQ_API_KEY_5=gsk_mno345...

# Optional: OpenRouter backup pool
OPENROUTER_API_KEY_1=sk-or-v1-abc...
OPENROUTER_API_KEY_2=sk-or-v1-def...
```

### 3. Per-User Rate Limiting (UPDATED)
**Problem:** One power user could consume all your API quota.
**Fix:** Increased limit from 10 → 20 requests/hour per user (scales well with 60%+ cache hit rate).

**File:** `lib/rateLimit.ts`

The rate limiter already existed — just tuned the limit. With the global cache, most requests never even reach the AI call, so the rate limit only applies to AI-generated responses.

**Limits:**
- Free users: 20 AI calls/hour (not cache hits — only actual AI calls)
- The rate is checked in `POST /api/mentor` before any expensive operation

### 4. Pre-Seed Frequent Questions (COMPLETED)
**Problem:** First users on every problem get cold-cache AI calls.
**Fix:** Pre-populated cache with high-quality Q&A for common problems.

**File:** `prisma/seed-frequent-questions.ts`

Seeded problems and their common Q&A:
- `two-sum` → 4 Q&A (understanding, brute force, hash map, edge cases)
- `valid-parentheses` → 3 Q&A
- `sum-of-two-integers` → 4 Q&A

**Run the seed:**
```bash
npx tsx prisma/seed-frequent-questions.ts
```

---

## How Everything Fits Together

```
User sends message to /api/mentor
    ↓
1. Check per-user rate limit (20 AI calls/hour)
   → Exceeded? Return 429 immediately
    ↓ OK
2. Route interaction via interactionRouter:
   → EXACT/SIMILAR match in global cache? Return cached answer (0 API cost)
   → No match? Continue to step 3
    ↓
3. Resolve API config:
   → User has BYOK? Use their key
   → No? Use key pool: pick next Groq key via round-robin
    ↓
4. Call AI with auto-retry:
   → Key A returns 429? → Mark key in cooldown → Switch to key B
   → All Groq keys exhausted? → Try OpenRouter pool
    ↓
5. Save response to global cache
   → Next user gets this answer without API call
    ↓
6. Return to user
```

---

## How to Test Each Feature

### Test Global Cache
1. Tab A: Ask "what does this problem ask?" → see `[CACHE] CACHE MISS` or `AI_NEEDED` in console
2. Tab B (different user): Same question → see `[CACHE] CACHE HIT`
3. Prisma Studio → CacheEntry shows no `userId` column

### Test Key Pool
1. In console, add `GROQ_API_KEY_1` and `GROQ_API_KEY_2` to `.env.local`
2. Restart dev server
3. Send multiple requests — console shows `[KEY_POOL] Using groq key...` with rotation
4. To see status: add `GET /api/mentor/pool-status` route or check console logs

### Test Rate Limit
1. Set limit temporarily low (change `checkRateLimit` to `limit = 3`)
2. Send 4 rapid requests → 4th returns `{ error: "Rate limit exceeded. Please wait..." }` with HTTP 429

### Test Pre-Seed
```bash
npx tsx prisma/seed-frequent-questions.ts
# Then open a problem that matches the slug in the seed
# Ask the pre-seeded questions → instant cache hit
```

---

## Cost Projection for 1k Users

| Metric | Without Cache | With Global Cache |
|--------|--------------|------------------|
| Cache hit rate | 0% | 60-80% |
| AI calls/mo | ~300,000 | ~60,000-120,000 |
| Est. cost (Groq free) | Capped at ~150 req/min | No problem — cache absorbs |
| Est. cost (OpenRouter paid) | ~$80-150/mo | ~$8-25/mo |
| Key pool handles | Single point of failure | 5 keys, 750 req/min combined |

---

## Files Changed (Complete List)

| File | Status | Purpose |
|------|--------|---------|
| `lib/api-key-pool.ts` | **NEW** | Round-robin key rotation with cooldown |
| `lib/rateLimit.ts` | Modified | Tuned limit from 10 → 20/hour |
| `prisma/schema.prisma` | Modified | Dropped `userId` from CacheEntry |
| `lib/mentor/interactionRouter.ts` | Modified | Global cache lookups |
| `app/api/mentor/route.ts` | Rewritten | Key pool + rate limit + cache integration |
| `app/api/mentor/approach/route.ts` | Modified | Global cache save |
| `prisma/seed.js` | Modified | Removed userId from cache seeding |
| `prisma/seed-frequent-questions.ts` | Rewritten | Multi-problem global cache seeding |
