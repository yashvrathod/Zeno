# How The AI Mentor Works

A complete guide to the flow, features, and behavior of your DSA Mentor platform.

---

## 🎯 Core Philosophy

**"Use AI as little as possible. Intelligence comes from structure and logic first, AI second."**

The mentor is designed to be a **Socratic teacher** — never giving direct answers, but guiding you through discovery.

---

## 📊 User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│  USER opens problem page                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  STAGE: EXPLORE (First time)                                            │
│  AI: "Let's understand this problem. What do you think the input      │
│       constraints are telling us?"                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  USER: "Looks like we need to find a subarray"                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  [ROUTER] Static Check: None                                            │
│  [ROUTER] Cache Check: "Is this question similar to past ones?"        │
│           ↓ Embedding generated (768-dimension vector)                 │
│           ↓ pgvector similarity search (~10ms)                         │
│           → No match → Proceed to AI                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  [AI CALL] Groq/OpenRouter called                                       │
│  System Prompt: "You are a Socratic mentor. Current stage: EXPLORE"   │
│  + Problem context + User's code + Conversation history               │
│  + Weakness map: "User often misses edge cases"                         │
│  + Guardrails: "Never give full solutions"                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  AI RESPONSE: "Good observation. What properties would a valid         │
│  subarray need to have? Think about the sum..."                        │
│  ↓ Response saved to cache with embedding                              │
│  ↓ Stage remains EXPLORE (rung 1)                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  USER writes code, clicks "Run"                                          │
│  Code: `function maxSubArray(nums) { return 0; }`                       │
│  Result: Wrong Answer on test case 2                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  [PATTERN TRACKER] Detects: "missed-edge-case"                          │
│  → Increment count in user's skill tree                                  │
│  → Now shows as "weak" in /profile/skills                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  USER: "Why did my solution fail?"                                      │
│  (or types: "give me the answer")                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  [ROUTER] Static Check: Stage gate triggered!                          │
│  → "I can't give you the solution directly. Let's think about this      │
│     together. What if the array has all negative numbers?"            │
│  → No AI call made (saved cost & latency)                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  USER: "Oh I need to handle all negatives"                              │
│  [Progress detected → STAGE ADVANCE to IDEATE]                          │
│  AI: "Exactly! Now, how would you track the maximum sum?"             │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  USER: "Can you trace my code line by line?"                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  [TRACE DEBUGGER] Activates                                             │
│  AI: "Let's trace with input [-2,1,-3,4,-1,2,1,-5,4]"                   │
│       "At i=0, sum = -2. Since -2 < 0, we start fresh..."              │
│  → Pauses at key lines, asks "What is the value of `sum` now?"          │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  USER solves problem, clicks "Submit"                                    │
│  All test cases pass!                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  [SENIOR ARCHITECT REVIEW] Triggered                                    │
│  AI analyzes code: "Your solution works (O(n)), but consider:         │
│  1. Variable naming could be clearer                                    │
│  2. Add comments explaining Kadane's logic                             │
│  3. Handle edge case: empty array                                      │
│  Grade: B+ (production-ready but could be cleaner)"                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  [VISUAL SCAFFOLDING] User asks: "Show me how Kadane's works"         │
│  ASCII Diagram generated:                                               │
│  ```                                                                    │
│  nums:  [-2, 1, -3, 4, -1, 2, 1, -5, 4]                                │
│  sum:   [-2, 1, -2, 4,  3, 5, 6,  1, 5] ← current max ending here      │
│  max:      1, 1,  4, 4,  5, 6,  6,  6   ← global max                    │
│          ↑ start new subarray when sum goes negative                      │
│  ```                                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 The 6 Teaching Stages

| Stage | Purpose | What AI Does | Example Prompt |
|-------|---------|--------------|----------------|
| **EXPLORE** | Understand the problem | Asks clarifying questions | "What do you notice about the constraints?" |
| **IDEATE** | Brainstorm approaches | Guides toward algorithm selection | "Could we use a sliding window here?" |
| **BREAKDOWN** | Plan the solution | Helps structure the code | "What variables do we need to track?" |
| **WRITE** | Implement the code | Gives hints on syntax | "Try using a for loop to iterate" |
| **REFLECT** | Review after solving | Code review, optimization | "Can we do this in O(1) space?" |
| **REINFORCE** | Solidify learning | Similar problems, patterns | "This is Kadane's Algorithm. Try problem #53 next" |

**Stage Gates:** You cannot skip ahead. Asking "just give me the code" in EXPLORE triggers a gentle redirect.

---

## 🔄 The Routing System (Brain of the Mentor)

Every user message goes through this decision tree:

```
User Message
     ↓
[STEP 1] STATIC CHECKS (0ms)
  ├─ First message in EXPLORE? → Show problem breakdown
  ├─ Duplicate question? → "You already asked this"
  ├─ "Give me solution"? → Stage gate redirect
  ↓ No match
[STEP 2] CACHE CHECK (~10ms with pgvector)
  ├─ Exact MD5 match? → Return cached response
  ├─ Similar embedding? (cosine > 0.85) → Return cached
  ↓ No match
[STEP 3] AI CALL (~500-2000ms)
  → Call Groq/OpenRouter
  → Apply guardrails
  → Save to cache with embedding
```

**Cache Hit Rate Target:** 40-60% of common questions should be cached.

---

## 📦 Embeddings & pgvector Explained

### What is an Embedding?

An embedding is a **768-dimensional vector** (array of 768 numbers) that represents the meaning of text.

```
"How do I solve this?"
    ↓
[0.023, -0.156, 0.891, ... 768 numbers total]
    ↓
Semantically similar questions have similar vectors
```

### How It Works in Practice

| User Types | Embedding | Cached Question | Similarity | Action |
|------------|-----------|-----------------|------------|--------|
| "How do I solve this?" | Vector A | "How to solve?" | 0.98 | **CACHE HIT** |
| "Explain the approach" | Vector B | "What's the approach?" | 0.94 | **CACHE HIT** |
| "Give me code now" | Vector C | "How to solve?" | 0.62 | **AI CALL** |

### pgvector Speed

| Method | Latency | Scale |
|--------|---------|-------|
| In-memory (old) | ~500ms | Limited by RAM |
| **pgvector (new)** | **~10ms** | Millions of entries |

**SQL Query Used:**
```sql
SELECT response, 1 - (embedding_vector <=> query_vector) as similarity
FROM "CacheEntry"
WHERE 1 - (embedding_vector <=> query_vector) > 0.85
ORDER BY embedding_vector <=> query_vector
LIMIT 5;
```

---

## 🎓 The 4 Advanced Features

### 1. Pattern Recognition / Skill Tree

**What it tracks:**
- missed-edge-case
- off-by-one
- infinite-loop-risk
- wrong-complexity
- null-check-missing
- etc.

**How it works:**
```
User submits wrong answer
        ↓
Pattern tracker analyzes error
        ↓
Increments count in StudentProfile.weakPatterns
        ↓
Shows in /profile/skills as red/yellow/green
        ↓
AI sees this in context: "User often misses edge cases"
```

**User sees:**
- Skill tree with 8 patterns
- Click for detailed "How to Fix" advice
- Progress over time

---

### 2. Trace-it-Out Debugger

**When it activates:** User asks "trace my code" or seems stuck on execution

**How it works:**
```
User: "Trace line 12"
        ↓
AI: "At line 12, `sum = current + nums[i]`"
    "With current=5, nums[3]=-2"
    "What is `sum` now?"
        ↓
User answers → AI continues or corrects
        ↓
Builds understanding of execution flow
```

---

### 3. Dynamic Visual Scaffolding

**When it activates:** User needs to understand an algorithm visually

**Types:**
- **ASCII diagrams** for arrays, trees, graphs
- **SVG animations** for linked list operations
- **Step-by-step highlights** showing pointer movement

**Example for Two Pointers:**
```
nums: [1, 2, 3, 4, 6], target = 6
       L           R
       ↓           ↓
       1 + 6 = 7 > 6 → Move R left

nums: [1, 2, 3, 4, 6], target = 6
       L     R
       ↓     ↓
       1 + 4 = 5 < 6 → Move L right
```

---

### 4. Senior Architect Code Review

**When it triggers:** After successful submission (all test cases pass)

**What it analyzes:**
- Time/Space complexity
- Edge case handling
- Code style and naming
- Production readiness
- Optimization opportunities

**Output format:**
```
┌─────────────────────────────────────────┐
│  SENIOR ARCHITECT REVIEW                │
├─────────────────────────────────────────┤
│  Grade: B+                              │
│  Time: O(n) ✅                          │
│  Space: O(1) ✅                         │
│                                         │
│  Improvements:                          │
│  1. Rename `x` to `maxEndingHere`     │
│  2. Add comment explaining Kadane's     │
│  3. Handle empty array edge case        │
│                                         │
│  Production Ready: Yes, with notes    │
└─────────────────────────────────────────┘
```

---

## 💬 Example Conversations

### Scenario 1: First-Time User

**User:** opens "Maximum Subarray" problem  
**AI:** "Welcome! Before we dive in, what do you notice about the constraints? Any edge cases come to mind?"

**User:** "The array can have up to 10^5 elements"  
**AI:** "Good observation on the size. What does that tell us about the algorithm we need?"

**User:** "It needs to be efficient, probably O(n)"  
**AI:** "Exactly! Now, have you heard of Kadane's Algorithm? It's perfect for this..."

### Scenario 2: Stuck User

**User:** "I've been stuck for 20 minutes"  
**AI:** "Let's take a step back. Forget code for a moment. How would YOU find the maximum sum subarray by hand with [1,-2,3,4]?"

**User:** "I'd add up all positive numbers?"  
**AI:** "Close! But what about [-1, 5, -2]? The 5 alone beats -1+5-2..."  
**AI:** 💡 **Hint:** What if we track the best sum ENDING at each position?

### Scenario 3: Skip Attempt

**User:** "Just give me the solution code"  
**AI:** "I know it's tempting, but you won't learn that way. Let's break this down together. What's the simplest subarray you can think of?"

**User:** "A single element"  
**AI:** "Perfect! So the max subarray is either a single element OR...?"

### Scenario 4: Code Tracing

**User:** "Why is my code failing test case 3?"  
**AI:** "Let's trace through it. I see you have `sum += nums[i]`. Walk me through what `sum` equals at i=0, i=1, i=2 for input [-2,1,-3]."

**User:** "At i=0, sum=-2. At i=1, sum=-1. At i=2, sum=-4"  
**AI:** "Good tracing! Now, should we ever keep a negative sum? What happens if we start fresh at i=1?"

---

## 🛡️ Guardrails (Safety Systems)

### Solution Detection
If AI accidentally generates code that looks like a complete solution:
```
[GUARDRAIL] Solution detected in response
Action: Strip code, replace with "Let's think through this together..."
```

### Stage Enforcement
If user tries to ask about implementation during EXPLORE:
```
[GUARDRAIL] Stage mismatch detected
Action: "We're still exploring. Let's understand the problem first before coding."
```

### Loop Detection
If user asks the same question 3+ times:
```
[GUARDRAIL] Loop detected
Action: "I notice we've been going in circles. Let me try a different explanation..."
```

---

## 📊 Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Cache hit rate | >40% | TBD |
| Average response time | <500ms | ~200ms |
| pgvector search | <10ms | ~10ms |
| AI call latency | <2000ms | ~800ms |
| Stage advancement | 80% | TBD |

---

## 🔧 Technical Architecture

```
User Request
    ↓
Next.js API Route (/api/mentor)
    ↓
mentorService.execute()
    ├─ routeInteraction() → STATIC / CACHE_HIT / AI_NEEDED
    ↓
    ├─ STATIC → Return immediate response
    ├─ CACHE_HIT → Return from pgvector cache
    └─ AI_NEEDED → aiHandler.callLLM()
                  ├─ Build context (problem + history + weak patterns)
                  ├─ Call Groq/OpenRouter
                  ├─ Apply guardrails
                  ├─ Save to cache (with embedding)
                  └─ Return response
    ↓
Update session stage (if needed)
    ↓
Return to user
```

---

## 🚀 What's Next (Roadmap)

### P0 (Critical)
- [x] pgvector integration ✅
- [x] Skill Tree UI ✅
- [ ] Interview Mode (timed, no hints)

### P1 (Engagement)
- [ ] Voice with interrupt detection
- [ ] Spaced repetition system
- [ ] Hint system (3 progressive hints)

### P2 (Scale)
- [ ] Mobile responsive UI
- [ ] Submission playback (see your coding over time)
- [ ] Pattern library (curated explanations)

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `lib/mentor/interactionRouter.ts` | Decides STATIC/CACHE/AI for each message |
| `lib/mentor/services/handlers/aiHandler.ts` | Calls LLM, applies guardrails |
| `lib/pgvector.ts` | Fast vector similarity search |
| `lib/mentor/patternTracker.ts` | Tracks user weaknesses |
| `components/SkillTree.tsx` | Visual skill tree UI |
| `app/profile/skills/page.tsx` | Skill tree page |
| `lib/mentor/stageEngine.ts` | Stage progression rules |

---

## 🎯 Summary

**Your AI mentor is:**
1. **Socratic** — Never gives direct answers
2. **Contextual** — Knows your weaknesses and adapts
3. **Efficient** — Uses cache for 40-60% of queries (10ms response)
4. **Visual** — Shows ASCII/SVG diagrams for algorithms
5. **Thorough** — Reviews your code like a senior engineer

**The user experience:**
- Open problem → Get gentle guidance
- Make mistakes → Learn patterns via skill tree
- Ask questions → Get cached instant answers or thoughtful AI responses
- Solve problem → Receive production-ready code review
- Master patterns → See progress in /profile/skills

---

*Last updated: April 2026*
