There are 3 major bugs in your current implementation.

MAIN BUG #1 — INVALID TRACE INSERTION INSIDE CONTROL STATEMENTS

This is the biggest issue.

Right now you do:

instrumented.push(line);

if (shouldTraceAfter(line, language)) {
   instrumented.push(traceStmt);
}

This breaks for lines like:

if (x > 5)

because you generate:

if (x > 5)
std::cout << "[TRACE]" << std::endl;

INVALID C++.

Same for:

loops
conditionals
function declarations
FIX

ONLY inject trace statements after:

assignments
mutations
declarations
returns

NOT after control structure headers.

Replace This
if (/^(for|while|do)\s*[\(:]/.test(trimmed)) return true;
if (/^\s*if\s*[\(:]/.test(trimmed)) return true;
if (/^\s*elif\s/.test(trimmed)) return true;
if (/^\s*else\s*[:\{]/.test(trimmed)) return true;

WITH:

// DO NOT TRACE CONTROL HEADERS
if (/^(for|while|do|if|else|switch|catch)\b/.test(trimmed)) {
   return false;
}
MAIN BUG #2 — YOUR TRACE JSON FORMAT IS INCONSISTENT

For C++ you emit:

std::cout << "[TRACE] line=" << ...

But your parser FIRST expects:

{"line":...}

and ONLY falls back later.

This inconsistency causes silent failures.

FIX

Make ALL languages emit PURE JSON.

GOOD C++ TRACE

Replace:

return `std::cout << "[TRACE] line=" << ${lineNum}`

with:

return `
std::cout << "[TRACE]{\\"line\\":${lineNum},\\"vars\\":{${unique
  .map((v) => `\\"${v}\\":\\" << ${v} << \\"`)
  .join(',')}}}" << std::endl;
`;

But honestly:

THIS IS STILL FRAGILE.

BETTER SOLUTION

Instead of fake JSON construction:

Use delimiter-based parsing.

Example:

[TRACE]|5|x=10|y=20

WAY more stable.

MAIN BUG #3 — YOUR VARIABLE DETECTION IS TOO WEAK

This regex:

(?:^|\s|[,(])(\w+)\s*=(?!=)

fails for:

sum += sq;
arr[i] = 5;
obj.x = 10;
FIX

Use broader assignment detection.

Example:

const assignMatches = [
  ...trimmed.matchAll(/\b([a-zA-Z_]\w*)\b\s*[\+\-\*\/]?=/g)
];
HUGE ARCHITECTURAL ISSUE

Right now your debugger is:

SOURCE-INSTRUMENTATION BASED

NOT runtime-debugger based.

That means:

no real stepping
no true stack
no heap inspection
no breakpoints
no runtime introspection

BUT...

For an educational MVP?

This is actually GOOD.

Because:

fast
sandbox-safe
portable
easy to scale
works on Piston

So don't throw this away.

What You SHOULD Do

Use TWO MODES.

MODE 1 — Lightweight Educational Tracer (Current)

Uses:

instrumentation
console traces

Purpose:

beginner visualization
variable tracking
educational replay

Fast and scalable.

MODE 2 — True Native Debugger

Uses:

GDB
LLDB
JDI

Purpose:

real debugging
heap
pointers
stepping
breakpoints

Much heavier.

ANOTHER CRITICAL BUG

This:

const vars = [...new Set(varMatches.map((m) => m[1]).filter(Boolean))];

only captures variables assigned ON THAT LINE.

Meaning:

cout << x;

captures NOTHING.

So many frames become empty.

FIX

Maintain variable state over time.

You need:

currentScopeVariables

Then each frame stores:

{
  changed: {...},
  visible: {...}
}

Otherwise your variables panel constantly empties.

YOUR CALL STACK IS FAKE RIGHT NOW

This:

buildCallStackForLine()

is static source analysis.

Not runtime stack tracking.

Meaning recursion will FAIL.

Example:

factorial()
factorial()
factorial()

Your stack won't show nested depth correctly.

MVP FIX

Accept this limitation temporarily.

But rename internally:

estimatedCallStack

so architecture stays honest.

MOST IMPORTANT CHANGE YOU NEED

Right now:

trace AFTER line execution

But debuggers usually show:

BEFORE execution

Otherwise:

x = x + 1;

shows already-mutated state.

Educationally worse.

Better Model

Emit:

BEFORE line
AFTER line

events.

BEST QUICK FIXES

Do these NOW:

1. Stop tracing control headers

Critical.

2. Standardize trace format

Critical.

3. Track persistent variable state

Huge UX improvement.

4. Always emit generic line events

Even without variables.

5. Separate:
changed variables
visible variables

Very important.