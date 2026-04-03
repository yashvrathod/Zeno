# Stage Engine + Debug Guide

## What Was Done

This document covers everything that was added/fixed in the mentor system. Read this if you want to understand how the pieces fit together or debug issues.

---

## 1. Prisma Schema Changes

### New Models Added to `prisma/schema.prisma`

**`CacheEntry`** — Stores cached AI responses keyed by semantic similarity
```
userId + problemId + questionMd5 = unique key
embedding = 128-dim vector for similarity search
```
Why: `interactionRouter.ts` calls `prisma.cacheEntry.findMany()` but the model didn't exist.

**`MentorSession`** — Tracks the current stage for each user+problem pair
```
userId + problemId = unique (one session per problem)
stage = starts at "UNDERSTAND", progresses through APPROACH → CODE → COMPLETE
```
Why: The StageEngine needs to persist which stage a student is on so it survives page refreshes.

**`MentorMessage`** — Individual messages within a session
```
sessionId → which session this belongs to
role = "user" | "assistant" | "system"
stage = what stage the student was in when this message was saved
```
Why: Replaces the older `MentorConversationMessage` model (still exists in schema) with a session-scope version that ties messages to the state machine.

### Run After Schema Changes
```bash
npx prisma migrate dev --name add_stage_engine_models
npx prisma generate
```

---

## 2. Stage Engine (`lib/mentor/stageEngine.ts`)

### What It Does

Think of this as a strict gatekeeper. Unlike the reactive stage detection in `mentorContext.ts` (which guesses the stage from user behavior), the StageEngine enforces **exact transition rules**:

```
UNDERSTAND ──────→ APPROACH ──────→ CODE ─┐
  (first stage)    (understand)    (code)  │
                                           ↓
                                    ┌── COMPLETE
                                    │
                                    └── CODE (retry for optimization)
```

### The Rules Table

| From | To | Required Context | Allowed? |
|------|-----|-----------------|----------|
| UNDERSTAND | APPROACH | none | Always |
| APPROACH | CODE | `approachCorrect: true` | Only if approach is validated |
| CODE | COMPLETE | `codeCorrect: true` AND `isOptimal: true` | Only if correct AND optimal |
| CODE | CODE | `codeCorrect: true` AND `isOptimal: false` | Correct but needs optimization |
| CODE → APPROACH | | | **Blocked** — can't regress |
| UNDERSTAND → CODE | | | **Blocked** — can't skip |

### How to Use

```typescript
import { canTransition, getOrCreateSession, tryAdvanceStage, saveMessage, getSessionStats } from '@/lib/mentor/stageEngine';

// 1. Get or create session for this user+problem
const session = await getOrCreateSession(userId, problemId);

// 2. Check if a transition is valid BEFORE attempting it
const canMove = await canTransition(session.stage, "APPROACH");
if (!canMove.allowed) {
  console.log("Can't move:", canMove.reason);
}

// 3. Actually advance (validates + persists)
const result = await tryAdvanceStage(session.id, "APPROACH", {
  approachCorrect: true
});

// 4. Save messages (automatic dedup)
await saveMessage(session.id, "user", "How do I use two pointers?", "APPROACH");

// 5. Get stats
const stats = await getSessionStats(userId);
// { totalAttempted: 5, totalSolved: 3, averageHintsPerProblem: 12.5, currentStreak: 3 }
```

### Debug Mode

The StageEngine has debug logging enabled by default:
```bash
# Enable verbose logging
DEBUG_STAGE=1  # (default: on)

# Silence all stage logs
DEBUG_STAGE=0
```

Every operation logs like:
```
[STAGE] canTransition check: { from: 'APPROACH', to: 'CODE', context: { approachCorrect: true } }
[STAGE]   ✅ Allowed: APPROACH → CODE
```

To print the full transition rules table:
```typescript
import { printTransitionRules } from '@/lib/mentor/stageEngine';
printTransitionRules();
// Prints all rules with their rejection reasons
```

### Common Debugging Scenarios

**Session always creates new** → Check that (userId, problemId) are consistent. If they generate different IDs each request, the unique constraint never matches.

**"Invalid transition" error** → The student is trying to skip stages. The error message lists valid transitions from the current stage.

**Messages appear duplicated** → The deduplication window is 5 seconds. If requests are >5s apart, they're saved as separate messages. This is expected for real user typing.

**totalSolved > totalAttempted** → Data integrity issue. Should not happen unless records were manually inserted.

---

## 3. Integration Router Fix (`lib/mentor/interactionRouter.ts`)

### MD5 → SHA-256

**Before:**
```typescript
const hashBuffer = await crypto.subtle.digest("MD5", data);
```

**After:**
```typescript
const hashBuffer = await crypto.subtle.digest("SHA-256", data);
```

**Why:** `crypto.subtle` (Web Crypto API) does NOT support MD5. This throws:
```
OperationError: Algorithm: Unrecognized name 'MD5'
```

SHA-256 is universally supported and has the same deduplication quality for our use case. We don't need cryptographic MD5 specifically — we just need a stable hash for string comparison.

---

## 4. Groq SDK Dependency (`package.json`)

Added `groq-sdk@1.1.2` to dependencies. `lib/groq.ts` dynamically imports `@groq/sdk` but the package wasn't installed.

```bash
npm install  # Installs groq-sdk
```

The dynamic import in `lib/groq.ts` has a fallback: if `groq-sdk` isn't installed, it creates a fetch-based client that talks to Groq's OpenAI-compatible API. So it works with or without the package — but having it installed is cleaner.

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────────────┐
                    │                 Mentor API                      │
                    │         app/api/mentor/route.ts                 │
                    └────────────────┬────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────────────────────┐
                    │                │                                │
          ┌─────────▼──────┐  ┌─────▼─────────┐        ┌────────────▼──────────┐
          │  Context Layer  │  │  Question Layer│        │    AI Provider Layer  │
          │ mentorContext.ts│  │mentorQuestions │        │      lib/groq.ts      │
          │                 │  │                │        │                       │
          │ - Teaching Stage│  │- Guide questions│        │ - streamCompletion    │
          │ - Learning Rung │  │- Problem context│        │ - jsonCompletion      │
          │ - Tone detect   │  │                 │        │ - withRetry           │
          │ - Temperature   │  │                 │        │ - getBestClient       │
          └─────────────────┘  └─────────────────┘        └───────────────────────┘
                                                                 │
                    ┌──────────────────────────┐
                    │   State Machine Layer     │
                    │ lib/mentor/stageEngine.ts │◄── NEW
                    │                          │
                    │ - canTransition           │
                    │ - tryAdvanceStage         │
                    │ - getOrCreateSession      │
                    │ - saveMessage (dedup)     │
                    │ - getSessionStats         │
                    └────────┬─────────────────┘
                             │
                    ┌────────┼──────────────────┐
                    │        │                  │
          ┌─────────▼─────┐  │         ┌────────▼──────────┐
          │ Interaction    │  │         │   Embedding Layer │
          │ Router         │  │         │  lib/embeddings.ts│
          │                │  │         │                   │
          │ - routeInteraction│         │ - getEmbedding    │
          │ - saveToCache  │  │         │ - storeEmbedding  │
          │ - cache lookup │  │         │ - Redis + DB      │
          └───────┬───────┘  │         └───────────────────┘
                  │          │
          ┌───────▼──────────▼───────┐
          │       Prisma Client       │
          │                           │
          │ - MentorSession           │◄── ADDED
          │ - MentorMessage           │◄── ADDED
          │ - CacheEntry             │◄── ADDED
          │ - MentorConversation*     │  existing
          │ - UserProblemStats        │  existing
          └───────────────────────────┘
```

---

## Environment Variables (relevant to this work)

| Variable | Required For | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | Server-side Groq calls | `gsk_...` |
| `GROQ_MODEL` | Which model to use | `llama-3.3-70b-versatile` |
| `OPENROUTER_API_KEY` | OpenRouter fallback | `sk-or-...` |
| `REDIS_URL` | Embedding cache (optional) | `redis://localhost:6379` |
| `DEBUG_GROQ` | Groq debug logs | `true` |
| `DEBUG_EMBEDDINGS` | Embedding debug logs | `true` |
| `DEBUG_STAGE` | Stage engine logs | `0` to disable |
| `DATABASE_URL` | Prisma (required) | `postgresql://...` |

---

## Next Steps

1. Run migration: `npx prisma migrate dev --name add_stage_engine_models`
2. Test the StageEngine: Create a test endpoint or integrate with existing `/api/mentor` route
3. Wire `stageEngine` into the mentor API so that instead of reactive stage detection, the route uses the state machine
4. Add streaming: `lib/groq.ts` supports `streamCompletion()` but the mentor API currently uses non-streaming `groqFetchWithRetry()`
