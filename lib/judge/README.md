# `lib/judge` — function-call judge

The new LeetCode-style judge for the DSA platform. It accepts a user's
function or class, wraps it in a harness, and runs it against the
problem's test cases via Piston. Verdict, runtime, and any errors are
returned as structured JSON.

This module is **infrastructure-only** in PR 1. It is not yet wired up
to the `/api/execute` route — that flip happens in PR 2. In PR 1 the
legacy `lib/executor/*` path stays live.

## Pipeline

```
                    ┌────────────────────────┐
 user code          │  lib/judge/harness.ts  │  wraps user code
  +  ─────────────► │  - per-test mode       │  ───────────────┐
 signature          │  - single-exec mode    │                 │
 test cases         │  (JS/TS/Python only;   │                 │
 time limit         │   Java/C++ throw       │                 │
                    │   UnsupportedLanguage) │                 │
                    └────────────────────────┘                 │
                                                                ▼
                    ┌────────────────────────┐    ┌────────────────────────┐
                    │  lib/judge/runner.ts   │    │  Piston                │
                    │  - runJudge(input)     │ ─► │  http://localhost:2000 │
                    │  - parses __RESULT__   │    │  /api/v2/execute       │
                    │  - maps to 6 verdicts  │    └────────────────────────┘
                    │  - applies checker     │
                    └────────────────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │  JudgeOutput           │
                    │  - aggregate: Verdict  │
                    │  - results[]:          │
                    │    per-test outcomes   │
                    │  - compileError?       │
                    │  - mode, servedBy,     │
                    │    wallClockMs         │
                    └────────────────────────┘
```

## Verdict union

Six codes, no `memory_limit_exceeded` (Piston SIGKILL is too ambiguous
to disambiguate from TLE; we map it to `runtime_error` with an honest
message):

| Verdict | When |
| --- | --- |
| `accepted` | All test cases passed. |
| `wrong_answer` | Code ran but actual ≠ expected (or fails a custom checker). |
| `time_limit_exceeded` | `__EXEC_MS__` > `timeLimitMs`, or Piston signal is `SIGKILL` / `SIGXCPU`. |
| `runtime_error` | Non-zero exit, signal, or thrown exception that isn't a compile error. |
| `compile_error` | Exit ≠ 0 with a syntax-error / cannot-find-symbol / parse-error pattern. |
| `output_limit_exceeded` | `stdout` byte count > 64KB (configurable via `outputLimitKb`). |

## Harness modes

`per-test` (default in PR 2):
- One Piston call per test case.
- Stops on the first non-`accepted` verdict.
- Total Piston latency = N × single-call latency.
- Best for problems where each test case is independent (most LeetCode).

`single-exec` (built in PR 1, ships in PR 2 as opt-in):
- One Piston call for all test cases; the harness iterates and emits an
  array of `{index, result, execMs, error}`.
- Faster for problems with many test cases; loses the per-case
  isolation (a single hang in case 5 will block cases 1–4 from
  reporting their outcome).

Both modes are implemented in `harness.ts`. The runner dispatches based
on `input.mode`.

## Adding a new language

1. Add the language to `LANGUAGE_CONFIG` in `lib/piston.ts`.
2. Add a builder in `lib/judge/harness.ts` (`build<Lang>PerTest` and
   `build<Lang>SingleExec`).
3. Add the language to `DYNAMIC_LANGUAGES` or
   `COMPILED_LANGUAGES` in `verdict.ts` and update `isDynamicLanguage`
   / `isSupportedLanguage`.
4. Add tests to `__tests__/harness.test.ts` and
   `__tests__/runner.test.ts`.
5. If the language is compiled, ensure `compile_timeout` is plumbed
   through `runOnPiston` (it is, see `compileTimeoutMs` param).
6. Add a custom checker to `checkers/` if problems in this language
   need order-insensitive comparison (e.g., Two Sum).

## Adding a custom checker

Checkers let a problem accept multiple correct outputs. For example,
Two Sum can return `[0, 1]` or `[1, 0]` — the user's indices are
right, just reversed. Without a checker, both fail.

Checkers are keyed by `signature.methodName`. The runner calls
`getChecker(methodName)` and, if found, uses it for equality
instead of `deepEqual`.

```ts
// lib/judge/checkers/two-sum.ts
registerChecker("two-sum", (actual, expected) => {
  // actual is the user's return value
  // expected is the test case's expectedJson
  // return true if they match in any sense the problem allows
});
```

The Two Sum checker is the canonical example: it treats `[0, 1]`,
`[1, 0]`, and `[[0, 1], [1, 0]]` as all equivalent.

## Running tests

```sh
npm test -- lib/judge
```

The integration test (`__tests__/integration.test.ts`) talks to a real
Piston at `http://localhost:2000`. It is skipped by default; opt in
with:

```sh
RUN_INTEGRATION=1 npm test -- lib/judge
```

PR 1 does not need Piston to be up to land; PR 2 should not be
merged until the integration test is green on staging.

## Files in this directory

- `verdict.ts` — Verdict union, HarnessMode, Language, helpers.
- `verdictLabel.ts` — friendly labels for UI.
- `verdictStyle.ts` — Tailwind color/icon map.
- `types.ts` — ProblemSignature, JudgeTestCase, PerTestResult, JudgeInput, JudgeOutput.
- `harness.ts` — per-test + single-exec harness builders; UnsupportedLanguageError.
- `runner.ts` — runJudge orchestrator; verdict mapping.
- `checkers/index.ts` — registry.
- `checkers/two-sum.ts` — order-insensitive pair checker.
- `__tests__/verdict.test.ts` — labels + styles.
- `__tests__/checkers.test.ts` — Two Sum checker.
- `__tests__/harness.test.ts` — wrapped code shape, all languages × both modes.
- `__tests__/runner.test.ts` — verdict mapping, Piston mocked.
- `__tests__/integration.test.ts` — Piston-backed, gated by `RUN_INTEGRATION=1`.
