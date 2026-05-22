 
1. Idempotency — prevent duplicate messages on retry
[x] Wired `setIdempotentResponse()` at every return path in `orchestrator.ts`
2. LLM timeout — abort hanging provider calls
[x] Added AbortError handling + signal check in `callLlmStream` read loop in `llmClient.ts`
3. Streaming — token-by-token UX for mentor chat
[x] Threaded `onChunk` through execute → handleAiNeeded → callLlmWithGuardrails → callLlmAndExtract → callLlmStream; added SSE streaming support with `body.stream: true` in `app/api/mentor/route.ts`
4. Structured telemetry — provider latency/success metrics
[x] Created `GET /api/mentor/telemetry` endpoint exposing in-memory telemetry buffer with provider grouping
5. Cache desync fix — post-guardrails text in cache
[x] `callLlmWithGuardrails` now returns `rawMessage` (pre-guardrails); `persistSession` saves raw text to cache, guardrail-processed text to user
6. Priority-aware prompt trimming — trim low-value sections first
[x] `buildMentorSystemPrompt` now builds prioritized sections (lowest value trimmed first: animation → loop → memory → guidance → stats → history → guide → code → problem → context → base)
7. Architect review dedup — skip if code unchanged
[x] Added `codeHash` parameter to `triggerArchitectReview`; stores hash with review; skips LLM call if same code hash found in `MentorConversationSummary`