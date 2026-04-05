What's genuinely impressive

  - Socratic approach is well-designed — Not giving solutions, asking questions, adaptive to rung. This is the right    
  philosophy for education.
  - Multi-layer architecture — Cache, rate limiting, key pooling, stage engine. You've thought about scale and cost.    
  - Contextual awareness — Tracks stats, syntax errors, loop detection, rolling summaries. That's real effort.

  Real flaws (from a student's perspective)

  1. Cache system can deliver stale/wrong answers

  The cache returns previous responses from ANY user (not just this student's conversation). If someone asked "what's a 
  hash map?" and got a Rung 6 (mastery-level) answer, a brand-new student asking a similar question gets that same      
  answer. The detectLearningRung is called but the cache hit (routeInteraction) doesn't filter by rung compatibility —  
  the cached response might be totally wrong for where this student actually is.

  2. detectLearningRung() is fragile

  - Students can write "maybe two pointers" → instantly Rung 2, or confidently "binary search" → Rung 3. A single       
  keyword triggers huge behavior shifts.
  - Default fallback: return history.length < 4 ? 1 : 2 — After 4 messages, permanently stuck at Rung 2 unless code     
  exists.
  - previousRung is passed in but mostly ignored — it's only used as a baseline floor, not for preventing backwards     
  jumps.

  3. The prompt is bloated and redundant

  mentorSystemPrompt.ts is ~350 lines. Then you build another system prompt on top of it in buildMentorSystemPrompt     
  (~467 lines in route.ts). These two compete with each other. The AI gets told "Max 3 lines of code" twice, "Never give   solutions" 4x, etc. This wastes prompt tokens AND confuses the model with potential contradictions.

  The actual system prompt sent to the AI (buildMentorSystemPrompt) doesn't even call getMentorSystemPrompt(). The      
  350-line carefully crafted SAGE prompt is dead code — it's never used. The AI gets a much thinner, less detailed      
  prompt.

  4. Students will get frustrated

  The hard rules ("one question per response", "max 3 lines of code", "never fix code") are pedagogically correct but   
  unrealistic for weaker students. Someone who genuinely doesn't know recursion will ask "what's recursion?" and get a  
  philosophical question back instead of a simple explanation. The prompt says to handle this (line 174-178), but the   
  system prompt contradiction ("one question per response, always") fights against it.

  5. No token usage tracking

  As we discussed earlier — you're burning tokens on every call with no visibility. With the full context (problem      
  statement up to 8000 chars, code up to 8000, history, guidance, etc.), each call could easily be 3000-8000 input      
  tokens per request. Without tracking, you can't optimize or know your costs.

  6. EXPLORE stage breakdown is generic

  First message for ANY problem: "Let's break down '{title}' together. What part of the problem statement is most       
  confusing to you right now?" — This is always the same static string. First impressions matter, and this feels like a 
  placeholder, not a real mentor greeting.

  7. The "stage gate" catches too many phrases

  Phrases like "show me how to solve" and "what code should i write" are treated as solution-skipping attempts. But a   
  genuinely stuck student saying "I don't know what code should I write here, I'm trying to handle the edge case" would 
  trigger a reprimand instead of help.

  8. No progress feedback to the student

  The system tracks rung, stage, stats — but the student never sees where they are. A user on Rung 4 of a problem has no   idea they're "at implementation, good progress." They just get text responses with no sense of progression. A simple 
  "You're at step 4/6 — you've got the approach, now let's get the code working" would be motivating.

  9. Two AI calls per conversation cycle

  One for the mentor response (callAIWithKeyRotation) and one for the rolling summary (rewriteRollingSummary). That     
  doubles token cost. And the summary runs every 4 messages but doesn't actually use its content in the mentor response 
  — it's just stored.

  Verdict

  The architecture is strong for a startup — better than most AI wrapper products you'll see. The real gaps are: (1) the   cache system can serve wrong-level answers, (2) the detailed SAGE prompt is never actually used, (3) rung detection  
  is keyword-based and brittle, and (4) the student gets zero feedback about their own progress.