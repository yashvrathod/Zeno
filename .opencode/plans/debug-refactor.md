# Debug Analysis Engine — Modular Refactor Plan

## Goal
Break `lib/mentor/enhancedDebuggingAssistant.ts` (1099 lines, one file) into ~20 focused files under `lib/debug/`. Add 3 new bug detectors, Big-O complexity analysis, and expand ESLint rules from 11→30.

## Files to Create (20 files)

### 1. `lib/debug/types.ts` — All interfaces
- Move all 15+ interfaces from the monolith
- Add `BugDetector` plugin interface: `detect(code, ast, parsed) → BugHypothesis[]`
- Add `SmellDetector` plugin interface: `detect(code, ast, parsed) → CodeSmell[]`
- Add `ComplexityInfo` type

### 2. `lib/debug/parser.ts` — AST parsing
- `loadDeps()` — lazy-load @typescript-eslint/parser, eslint, acorn, acorn-walk
- `getAST(code, lang)` — try TS parser first, fall back to acorn
- `parseCode(code, lang)` → ParsedCode with real functions, loops, variables from AST
- `codeSlice(node)` — extract source text from AST node range
- Helper extractors: `extractFunctionsFromAST`, `extractLoopsFromAST`, `extractVariablesFromAST`

### 3. `lib/debug/detectors/registry.ts` — Plugin registry
```ts
export interface BugDetector {
  id: string;
  detect(code: string, ast: any, parsed: ParsedCode): BugHypothesis[];
}
export const DETECTORS: BugDetector[];
```

### 4. `lib/debug/detectors/eslint.ts` — ESLint (30 rules)
- Use `new Linter().verify()` 
- Map 30 rules (existing 11 + 19 new): `no-eval`, `radix`, `require-await`, `no-await-in-loop`, `no-constant-binary-expression`, `no-dupe-else-if`, `no-promise-executor-return`, `no-constructor-return`, `prefer-promise-reject-errors`, `no-return-await`, `no-param-reassign`, `no-sequences`, `no-throw-literal`, `no-useless-catch`, `no-useless-escape`, `prefer-const`, `no-extra-boolean-cast`, `no-implicit-coercion`, `no-var`

### 5. `lib/debug/detectors/off-by-one.ts` — `<= array.length` in for-loops
- Walk `ForStatement` nodes, check `test.operator === '<='` AND `test.right.property.name === 'length'`

### 6. `lib/debug/detectors/infinite-loop.ts` — `while(true)` without break, condition vars never modified
- Walk `WhileStatement`, check `test.value === true` and no `break` in body
- Check condition variable names vs modified names in body

### 7. `lib/debug/detectors/state-reset.ts` — Outer vars modified inside loops
- Walk loops, collect vars assigned inside, check if any declared outside

### 8. `lib/debug/detectors/null-pointer.ts` — Property access on null-assigned vars
- Track `VariableDeclarator` with `null` init and `AssignmentExpression` with `null` right
- Check `MemberExpression.object.name` against tracked null vars

### 9. `lib/debug/detectors/assignment-in-condition.ts` (NEW)
- Walk `IfStatement.test`, `WhileStatement.test`, `ForStatement.test`
- If test is `AssignmentExpression`, flag as `logic_error` with confidence 0.9
- ~30 lines of code

### 10. `lib/debug/detectors/missing-return.ts` (NEW)
- Walk `ArrowFunctionExpression` with `BlockStatement` body (`{ }`)
- Check if last statement in body is not `ReturnStatement`
- But only flag if function has expression-like statements (not void calls)
- ~40 lines

### 11. `lib/debug/detectors/array-mutation.ts` (NEW)
- Walk `ForStatement`/`WhileStatement` bodies
- Find `CallExpression` with `callee.property.name` in ['splice','push','pop','shift','unshift']
- Check if callee object matches the array used in loop condition
- ~50 lines

### 12. `lib/debug/smells/registry.ts` — Smell plugin registry

### 13. `lib/debug/smells/function-size.ts`
- Long functions (>30 lines from AST), deep nesting (>3)

### 14. `lib/debug/smells/magic-numbers.ts`
- Count 3+ digit literals (exclude 0,1,-1,2)

### 15. `lib/debug/smells/todo-comments.ts`
- Regex for TODO/FIXME/HACK/XXX

### 16. `lib/debug/smells/duplicate-code.ts`
- Hash-based block comparison

### 17. `lib/debug/complexity.ts` (NEW)
- Walk AST, count nested loop depth → infer O(n), O(n²), O(n log n)
- Detect hash map usage → suggest improvement
- ~60 lines

### 18. `lib/debug/test-generator.ts` — Move from monolith
### 19. `lib/debug/fix-generator.ts` — Move from monolith
### 20. `lib/debug/root-cause.ts` — Move from monolith
### 21. `lib/debug/next-steps.ts` — Move from monolith
### 22. `lib/debug/trace-generator.ts` — Move from monolith

### 23. `lib/debug/runner.ts` — Orchestrator
- `analyzeCodeForDebugging()` — the single entry point
- Calls: parse → run all detectors → generate tests/fixes/root-cause/steps/complexity
- Deduplicates bugs by type+line
- ~70 lines

### 24. `lib/debug/index.ts` — Public API
```ts
export { analyzeCodeForDebugging } from './runner';
export type { DebugAnalysis, BugHypothesis, ... } from './types';
```

## File to Modify (1 file)

### `lib/mentor/enhancedDebuggingAssistant.ts`
- Replace current 1099 lines with:
```ts
export { analyzeCodeForDebugging } from '@/lib/debug';
export type { DebugAnalysis, BugHypothesis, ... } from '@/lib/debug/types';
```

## No Changes Needed
- `app/api/mentor/debug-analysis/route.ts` — imports `analyzeCodeForDebugging` from the same path, will get the new implementation
- `lib/mentor/orchestrator.ts` — same
- `lib/mentor/services/handlers/aiHandler.ts` — same
- `lib/mentor/interactiveVisualization.ts` — same
- `components/DebugAnalysisPanel.tsx` — consumes the same `DebugAnalysis` shape

## Execution Order
1. Create dirs (done)
2. Write `types.ts`
3. Write `parser.ts`
4. Write all 8 detector files
5. Write all 5 smell files
6. Write `complexity.ts`
7. Write `test-generator.ts`, `fix-generator.ts`, `root-cause.ts`, `next-steps.ts`, `trace-generator.ts`
8. Write `runner.ts` then `index.ts`
9. Replace `enhancedDebuggingAssistant.ts` with re-export
10. Run `npx tsc --noEmit` to verify
