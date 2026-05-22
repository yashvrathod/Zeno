# Multi-Language Execution Trace — Implementation Plan

## Current State

We have **two trace systems** running in parallel:

| System | Languages | Speed | Server Required |
|--------|-----------|-------|----------------|
| `enhanced-executor.ts` (client-side) | JS/TS only | Instant | No |
| `execution-trace/` (server-side via Piston) | All (JS, TS, Python, Java, C++) | 1-5s | Yes (Piston API) |

The client-side executor is what the trace tab uses today. For non-JS/TS, it shows an error.

## The Gap

The server-side system (`lib/execution-trace/`) already:
- Defines trace types for all languages
- Has an API endpoint at `POST /api/trace/execute`
- Integrates with Piston for execution
- Generates visualization data

But it's **disconnected** from the UI trace tab. The `ExecutionTracePanel` only calls the client-side executor.

## Implementation Plan

### Phase 1: Unify the Trace Endpoint (2 files, ~1 hour)

**Create `app/api/trace/unified/route.ts`** — a single endpoint that:

1. For JS/TS → runs `enhancedClientTrace()` server-side (or client-side if available)
2. For Python/Java/C++ → instruments code with trace statements, runs on Piston, parses output
3. Returns the same `EnhancedTraceEvent[]` format the UI already consumes

The `traceDebugger.ts` already has:
- Code instrumentation for JS, Python, Java, C++ (lines 164-190)
- Piston execution (line 99)
- Output parsing (lines 192-231)

Just need to map its `TraceFrame[]` → `EnhancedTraceEvent[]` format.

### Phase 2: Update ExecutionTracePanel (1 file, ~30 min)

In `components/trace/ExecutionTracePanel.tsx`:
- For JS/TS: keep client-side execution (instant, zero network)
- For Python/C++/Java: call the unified API endpoint, show a "Tracing..." loading state
- Both paths feed the same `events[]` state → all 4 tabs work identically

### Phase 3: Add Loading UX (1 file, ~15 min)

Since server-side tracing takes 1-5 seconds (compile + execute on Piston):
- Show a progress indicator during trace
- Show "Compiling..." / "Running..." / "Parsing trace..." stages
- Handle timeout errors gracefully

## Why This is Beneficial

| Metric | Before | After |
|--------|--------|-------|
| Languages supported | JS/TS only | JS, TS, Python, Java, C++ |
| Users covered | ~40% | 100% |
| Trace detail level | Stack + Heap + Vars | Stack + Vars (heap coming) |
| Response time (JS/TS) | Instant | Instant (same as now) |
| Response time (other) | Error | 1-5 seconds |

## No New Dependencies

Everything needed already exists in the codebase:
- `lib/piston.ts` — execution engine (already used for run/submit)
- `lib/mentor/services/traceDebugger.ts` — instrumentation + parsing
- `lib/execution-trace/` — trace types and processing
- `app/api/trace/execute/route.ts` — server endpoint pattern to follow

## Effort

- Phase 1: ~60 min (create unified API endpoint)
- Phase 2: ~30 min (update ExecutionTracePanel)
- Phase 3: ~15 min (loading UX)

**Total: ~2 hours**

Want me to proceed with Phase 1 (the unified API endpoint)?
