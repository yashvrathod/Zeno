You're right to push back on the UI — the product had a backend that reads like a Series A AI edtech platform and a frontend that still felt like a themed demo. Here's an honest audit and what I changed.

Why the UI felt wrong
Problem	What was happening
Too much fiction
"THE ARCHITECT", "NEURAL PROMPT", "Whisper your logic", "NEURAL_LOAD: 0.04ms" — sounds cool, reads as fake
Inconsistent design
Dashboard = violet glass panels; Problems = teal + serif 4.8rem headings; Problem IDE = cyberpunk black — three different products
Typography overload
Massive serif headlines, ALL CAPS labels everywhere, tracking-widest on everything
Decorative noise
Ambient orbs, gradient blurs, pulse animations — visual clutter without information
Broken trust
Fake streak charts (profile), random learning velocity (dashboard), static community stats
Design direction I applied: clean dark SaaS — readable type, one accent (violet), cards with subtle borders, labels that describe real things.

UI changes made
/problems — Rebuilt as a focused curriculum page: compact header, stat pills, accordion modules, difficulty badges, no marketing hero.

/problems/[id] — Stripped cyberpunk chrome: simple top bar, readable problem statement, cleaner mentor chat ("AI Mentor" not "The Architect"), compact editor tabs, smaller Run/Submit buttons.

/dashboard — Removed ambient blur orbs, tightened hero card, renamed "AI Mentor Analysis" → "Learning insights" (it's rule-based, not LLM-generated — honest labeling matters).

Critical AI fix: Mentor now receives userCode from the editor — previously the AI was advising without seeing your code, which is the #1 reason mentor answers felt useless.

Where AI fails today (senior dev audit)
P0 — Product-breaking
Mentor was blind — No userCode sent from the problem page (now fixed). /mentor still sends starter Python code, not live editor code.

Problem ID mismatch — Orchestrator looks up by slug only; some flows pass UUID → 404 or fragmented history.

Personalization disconnected — Main UX uses /api/execute, but stats/mastery updates only happen on /api/problems/[slug]/run|submit. updateAfterSolve and updateAfterMentorInteraction are never called.

Fake architect scores — On LLM parse failure, backend returns hardcoded 75/100; frontend can show random category scores. Users think they're getting real review.

Submit route bug — passedCount wasn't incremented (fixed earlier), so acceptance tracking was wrong.

P1 — Trust & quality
Mock dashboard data — Learning velocity chart uses Math.random() when no real trajectory exists.

Fake profile/community — Random streak grids, hardcoded "2,847 members" discussions.

No streaming — API supports SSE; UI waits for full response → feels slow.

Hardcoded concepts on submit — Every problem tagged binary_search, two_pointer, sliding_window regardless of actual content.

Architect review worker broken — Wrong function signature in queue worker; async reviews may never complete.

P2 — Infrastructure
Idempotency store is in-memory only (breaks multi-instance deploy)
Trace generation fails silently (empty catch blocks)
Debug analysis only runs when message matches /error|bug/i
Rate limits exist but aren't enforced on mentor route
What would make this an amazing startup
The wedge (pick ONE and nail it)
"AI mentor that actually sees your code and teaches like a senior engineer — not a hint bot."

You're not competing with LeetCode on problem count. You're competing on learning outcome per hour. That means:

Code → Run results → Mentor context → Personalized next step → Mastery update
That loop is partially built but not wired end-to-end. Fix that before adding more pages.

Top 10 priorities (ordered)
#	Action	Why
1
Wire the context pipeline — code, test results, errors, language → every mentor call
Without this, AI is a generic ChatGPT wrapper
2
One execution path — merge /api/execute with run/submit + personalization
Dashboard/concept mastery stay empty otherwise
3
Kill all fake data — hide sections until real, never random charts
One fake metric destroys trust forever
4
Streaming mentor UI
2–3s perceived latency win with existing SSE
5
Slug canonicalization everywhere
Fixes history, stats, mentor 404s
6
Honest architect review — "unavailable" not fake 75/100
Legal/reputation risk on fake grading
7
Daily loop — challenge + streak + "continue where you left off" with real slug links
Retention mechanic
8
Remove or rebuild /community
Placeholder pages hurt credibility
9
Persist mentor logs to DB
You can't improve AI you can't measure
10
Mobile-responsive problem IDE
Currently editor hidden on small screens (hidden lg:flex)
What to cut (for now)
Separate /mentor page (duplicate of problem IDE chat)
Trace/debug/analyze tabs until core loop works — they're impressive but distract from the wedge
Roadmap/community pages until content is real
"Interview readiness %" until the formula is explainable and auditable
What to double down on
Socratic stage engine (lib/mentor/orchestrator.ts) — this is genuinely differentiated
AST debug detectors — fast, no LLM cost, real value
Pattern-based curriculum — clear learning path vs LeetCode's flat list
Daily challenge API — real DB-backed, good retention hook
Recommended product narrative
"Code.Zone — practice DSA with an AI senior engineer who watches you code, catches your mistakes before you submit, and tells you exactly what to study next."

Not: "Neural scaffolding forged by the Architect."

Next steps I'd take if you want me to continue
Full dashboard simplification — bento layout, fewer sections, real data only
Unify problem workspace — merge /mentor into /problems/[id], delete duplicate
Wire personalization pipeline — execute → mastery → dashboard in one PR
Streaming mentor chat — use existing SSE endpoint
Remove fake data from profile + community + velocity chart
Tell me which of these you want prioritized and I'll implement it.
