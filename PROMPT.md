You are an expert TypeScript developer. Rewrite `debuggingAssistant.ts` to use 
real static analysis (AST parsing + ESLint) instead of simple regex or AI API calls.

## GOAL
Make `analyzeCodeForDebugging()` actually accurate using:
- @typescript-eslint/parser for AST parsing
- eslint (Linter class, programmatic API) for bug detection
- acorn as fallback parser for plain JavaScript
- No AI API calls, no rate limits, no external services

## PACKAGES TO USE
npm install @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint acorn acorn-walk

## WHAT TO BUILD

### 1. Real AST Parser
Replace the fake `parseCode()` with a real one:

function parseCode(code: string, language: string): ParsedCode {
  - If language is typescript or javascript:
      use @typescript-eslint/parser.parse(code, { loc: true, range: true, tokens: true })
      this gives a real AST with exact line numbers
  - Extract from AST:
      - All function declarations and arrow functions → FunctionInfo[]
        (name, start line, end line, line count, nesting depth)
      - All for/while/do-while loops → LoopInfo[]
        (line number, condition text, parent function name)
      - All variable declarations → VariableInfo[]
        (name, line, type if annotated, whether initialized)
  - Return ParsedCode with real data, not empty arrays
}

### 2. Real Bug Detection using ESLint Programmatic API
Use the ESLint Linter class (NOT the CLI) to run these rules on the code:

const linter = new Linter()
linter.defineParser('@typescript-eslint/parser', tsParser)

Run these rules and map their messages to BugHypothesis:

RULE MAPPINGS:
- no-unused-vars           → type: 'initialization_error',  severity: 'low'
- no-undef                 → type: 'null_pointer',           severity: 'high'
- no-constant-condition    → type: 'infinite_loop',          severity: 'critical'
- no-unreachable           → type: 'wrong_termination',      severity: 'medium'
- array-callback-return    → type: 'edge_case_missed',       severity: 'medium'
- no-loop-func             → type: 'logic_error',            severity: 'medium'
- no-self-assign           → type: 'logic_error',            severity: 'high'
- no-self-compare          → type: 'logic_error',            severity: 'high'
- use-before-define        → type: 'initialization_error',   severity: 'high'
- no-fallthrough           → type: 'logic_error',            severity: 'medium'

Each ESLint message gives you: exact line, column, message, ruleId
Map these directly to BugHypothesis with:
  confidence: 0.85 for errors, 0.6 for warnings
  location: { line: message.line, column: message.column }
  evidence: [message.message]  ← the actual ESLint message text

### 3. Real AST-based Bug Pattern Detection
After ESLint, walk the AST to detect these patterns:

OFF BY ONE:
- Walk all ForStatement nodes
- Check if test is BinaryExpression with operator '<='
- AND right side is MemberExpression with property 'length'
- Pattern: i <= arr.length (should be i < arr.length)
- If found: BugHypothesis type='off_by_one', confidence=0.8
  evidence: quote the exact loop condition from the code

INDEX OUT OF BOUNDS:
- Walk all MemberExpression nodes where computed=true (arr[i])
- Check if index variable is also used in loop condition
- If loop condition uses <= length: flag as potential OOB
- confidence: 0.75

UNINITIALIZED VARIABLES:
- Walk all Identifier nodes
- Check if any variable is referenced before its declaration line
- Use the VariableInfo[] from parseCode to get declaration lines
- confidence: 0.8

STATE NOT RESET:
- Walk all ForStatement/WhileStatement nodes
- Check if any variable declared OUTSIDE the loop
- is ASSIGNED inside the loop body
- but never reset at the loop start
- confidence: 0.65

INFINITE LOOP:
- Walk all WhileStatement nodes
- Check if condition variables are never modified inside loop body
- If no modification found: type='infinite_loop', confidence=0.9

NULL POINTER:
- Walk all MemberExpression nodes (obj.prop)
- Check if object was previously assigned null or undefined
- Or if object comes from a function that can return null
- confidence: 0.7

### 4. Real Code Smell Detection from AST
Use the actual AST data, not regex:

LONG FUNCTION:
- For each FunctionInfo: if (endLine - startLine) > 30 → smell
- Use real line counts from AST, not estimates

DEEP NESTING:
- Walk AST and count actual nesting depth
- Increment counter for: IfStatement, ForStatement, WhileStatement, 
  SwitchStatement, TryStatement
- If depth > 3: smell with exact line number

MAGIC NUMBERS:
- Walk all Literal nodes where value is a number
- Exclude: 0, 1, -1, 2 (commonly acceptable)
- If more than 3 such literals: smell

DUPLICATE CODE:
- Split functions into blocks of 3+ lines
- Hash each block
- If same hash appears twice: duplicate code smell with both line numbers

### 5. Real Test Case Generation
Generate concrete test cases based on what the AST tells you:

- If AST has ArrayExpression or array type annotations:
    generate: [], [1], [1,1], [1,2,3], [-1,0,1]
- If AST has string parameters:
    generate: "", "a", "aa", "abc", " " (space)
- If AST has numeric parameters:
    generate: 0, 1, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER
- If loops found: generate input that makes loop run 0, 1, and many times
- If binary search pattern detected (variables named left/right/mid):
    generate: target at start, middle, end, not present
- If two pointer pattern (left + right moving toward each other):
    generate: sorted array, reverse sorted, all same

### 6. Fix Suggestions from AST
Generate fix code by actually modifying the AST node text:

OFF BY ONE fix:
  - Find the exact '<=' in the loop condition
  - Replace with '<'
  - Show before/after code snippet with line numbers

NULL POINTER fix:
  - Find the MemberExpression node
  - Wrap with optional chaining: obj.prop → obj?.prop
  - Show exact line that changes

UNINITIALIZED fix:
  - Find VariableDeclarator with no init
  - Add default based on inferred type: = 0, = '', = [], = null
  - Show exact line that changes

### 7. Execution Trace (simplified, AST-based)
Walk the AST top-to-bottom and record:
- Each VariableDeclaration: record variable name, initial value, line
- Each AssignmentExpression: record variable, new value, line  
- Each ForStatement: record loop variable, start, condition, line
- Each IfStatement: record condition text, line
- Each ReturnStatement: record return value, line
Build ExecutionTrace[] from these — no actual execution needed

### 8. Keep All Existing TypeScript Types Exactly
Do NOT modify any of these:
BugType, BugHypothesis, CodeLocation, GeneratedTestCase, CodeSmell,
ExecutionTrace, VariableState, CallFrame, MemoryObject, DataStructureState,
StateChange, DebugAnalysis, FixSuggestion, RootCauseAnalysis, DebugStep

### 9. Error Handling
- If @typescript-eslint/parser fails to parse (syntax error in user code):
    catch the error, return it as a BugHypothesis with type='logic_error'
    include the parse error message and line number in evidence[]
- Never throw to the caller
- If AST walk throws: log to console.warn and continue

### 10. Final exported function signature (unchanged)
export async function analyzeCodeForDebugging(
  code: string,
  language: string,
  errorInfo?: {
    errorMessage?: string;
    failingTestCase?: string;
    expectedOutput?: string;
    actualOutput?: string;
  },
  userHistory?: ProblemAttempt[]
): Promise<DebugAnalysis>

The function can be async but does not need to await anything —
all analysis is synchronous. Keep async for API compatibility.

## OUTPUT
Return the complete rewritten debuggingAssistant.ts file only.
No explanation. No markdown. Just the full TypeScript file.