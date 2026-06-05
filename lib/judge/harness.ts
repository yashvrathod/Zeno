import { HarnessMode, isDynamicLanguage, Language } from "./verdict";
import { JudgeTestCase, ProblemSignature } from "./types";

export const HARNESS_VERSION = 1;
export const RESULT_PREFIX = "__RESULT__:";
export const RESULTS_PREFIX = "__RESULTS__:";
export const EXEC_MS_PREFIX = "__EXEC_MS__:";
export const ERROR_PREFIX = "__ERROR__:";

export type BuildHarnessInput = {
  userCode: string;
  signature: ProblemSignature;
  testCases: JudgeTestCase[];
  mode: HarnessMode;
  language: Language;
};

export type BuildHarnessResult = {
  code: string;
  language: Language;
  mode: HarnessMode;
  stdinJson: string;
};

export class UnsupportedLanguageError extends Error {
  constructor(language: Language) {
    super(
      `Language "${language}" is not yet supported by the new judge. ` +
        `PR 2 will add full support. Java/C++ currently fall back to the legacy executor.`,
    );
    this.name = "UnsupportedLanguageError";
  }
}

export function buildHarness(input: BuildHarnessInput): BuildHarnessResult {
  if (!isDynamicLanguage(input.language)) {
    throw new UnsupportedLanguageError(input.language);
  }

  if (input.mode === "per-test") {
    if (input.testCases.length !== 1) {
      throw new Error(
        `per-test mode requires exactly 1 test case, got ${input.testCases.length}`,
      );
    }
    const tc = input.testCases[0]!;
    const stdinJson = JSON.stringify(tc.args);
    const code = buildDynamicHarness({
      language: input.language,
      userCode: input.userCode,
      signature: input.signature,
      mode: "per-test",
    });
    return { code, language: input.language, mode: "per-test", stdinJson };
  }

  const stdinJson = JSON.stringify(
    input.testCases.map((tc) => ({
      args: tc.args,
      expected: tc.expectedJson,
      order: tc.order,
    })),
  );
  const code = buildDynamicHarness({
    language: input.language,
    userCode: input.userCode,
    signature: input.signature,
    mode: "single-exec",
  });
  return { code, language: input.language, mode: "single-exec", stdinJson };
}

type DynamicHarnessInput = {
  language: "javascript" | "typescript" | "python";
  userCode: string;
  signature: ProblemSignature;
  mode: HarnessMode;
};

function buildDynamicHarness(input: DynamicHarnessInput): string {
  if (input.language === "javascript" || input.language === "typescript") {
    return input.mode === "per-test"
      ? buildJsPerTest(input)
      : buildJsSingleExec(input);
  }
  return input.mode === "per-test" ? buildPythonPerTest(input) : buildPythonSingleExec(input);
}

function callExpression(language: "javascript" | "typescript" | "python", sig: ProblemSignature, argsExpr: string): string {
  if (sig.className) {
    if (language === "python") {
      return `${sig.className}().${sig.methodName}(${argsExpr})`;
    }
    return `new ${sig.className}().${sig.methodName}(${argsExpr})`;
  }
  if (language === "python") {
    return `solution(${argsExpr})`;
  }
  return `solution(${argsExpr})`;
}

function buildJsPerTest(input: DynamicHarnessInput): string {
  const sig = input.signature;
  const call = callExpression("javascript", sig, "...__args");
  return `${HARNESS_HEADER_JS}
${input.userCode}
const __stdin = require('fs').readFileSync(0, 'utf-8');
let __args;
try {
  __args = JSON.parse(__stdin);
  if (!Array.isArray(__args)) __args = [__args];
} catch (__e) {
  console.error(${ERROR_PREFIX_LIT} + 'Failed to parse stdin as JSON args: ' + __e.message);
  process.exit(1);
}
const __t0 = process.hrtime.bigint();
let __result;
try {
  __result = ${call};
} catch (__e) {
  const __msg = __e && __e.stack ? __e.stack : String(__e);
  console.error(${ERROR_PREFIX_LIT} + __msg);
  process.exit(1);
}
const __t1 = process.hrtime.bigint();
const __execMs = Number(__t1 - __t0) / 1e6;
console.log(${RESULT_PREFIX_LIT} + JSON.stringify(__result));
console.error(${EXEC_MS_PREFIX_LIT} + __execMs.toFixed(3));`;
}

function buildJsSingleExec(input: DynamicHarnessInput): string {
  const sig = input.signature;
  const call = callExpression("javascript", sig, "...__args");
  return `${HARNESS_HEADER_JS}
${input.userCode}
const __stdin = require('fs').readFileSync(0, 'utf-8');
let __cases;
try {
  __cases = JSON.parse(__stdin);
  if (!Array.isArray(__cases)) {
    console.error(${ERROR_PREFIX_LIT} + 'Expected JSON array of test cases on stdin');
    process.exit(1);
  }
} catch (__e) {
  console.error(${ERROR_PREFIX_LIT} + 'Failed to parse stdin: ' + __e.message);
  process.exit(1);
}
const __results = [];
const __t0 = process.hrtime.bigint();
for (let __i = 0; __i < __cases.length; __i++) {
  const __args = __cases[__i].args;
  const __tCase0 = process.hrtime.bigint();
  let __result;
  let __err = null;
  try {
    __result = ${call};
  } catch (__e) {
    __err = __e && __e.stack ? __e.stack : String(__e);
  }
  const __tCase1 = process.hrtime.bigint();
  __results.push({
    index: __i,
    result: __err ? null : __result,
    execMs: Number(__tCase1 - __tCase0) / 1e6,
    error: __err,
  });
  if (__err) break;
}
const __t1 = process.hrtime.bigint();
console.log(${RESULTS_PREFIX_LIT} + JSON.stringify(__results));
console.error(${EXEC_MS_PREFIX_LIT} + (Number(__t1 - __t0) / 1e6).toFixed(3));`;
}

function buildPythonPerTest(input: DynamicHarnessInput): string {
  const sig = input.signature;
  const call = callExpression("python", sig, "*__args");
  return `import sys, json, time
${input.userCode}
__stdin = sys.stdin.read()
try:
    __args = json.loads(__stdin)
    if not isinstance(__args, list):
        __args = [__args]
except Exception as __e:
    print(${ERROR_PREFIX_LIT} + 'Failed to parse stdin: ' + str(__e), file=sys.stderr)
    sys.exit(1)
__t0 = time.perf_counter()
try:
    __result = ${call}
except Exception as __e:
    import traceback
    print(${ERROR_PREFIX_LIT} + traceback.format_exc(), file=sys.stderr)
    sys.exit(1)
__t1 = time.perf_counter()
__exec_ms = (__t1 - __t0) * 1000.0
print(${RESULT_PREFIX_LIT} + json.dumps(__result))
print(${EXEC_MS_PREFIX_LIT} + format(__exec_ms, '.3f'), file=sys.stderr)`;
}

function buildPythonSingleExec(input: DynamicHarnessInput): string {
  const sig = input.signature;
  const call = callExpression("python", sig, "*__args");
  return `import sys, json, time
${input.userCode}
__stdin = sys.stdin.read()
try:
    __cases = json.loads(__stdin)
    if not isinstance(__cases, list):
        print(${ERROR_PREFIX_LIT} + 'Expected JSON array of test cases on stdin', file=sys.stderr)
        sys.exit(1)
except Exception as __e:
    print(${ERROR_PREFIX_LIT} + 'Failed to parse stdin: ' + str(__e), file=sys.stderr)
    sys.exit(1)
__results = []
__t0 = time.perf_counter()
for __i, __case in enumerate(__cases):
    __args = __case['args']
    __t_case0 = time.perf_counter()
    __result = None
    __err = None
    try:
        __result = ${call}
    except Exception as __e:
        import traceback
        __err = traceback.format_exc()
    __t_case1 = time.perf_counter()
    __results.append({
        'index': __i,
        'result': None if __err else __result,
        'execMs': (__t_case1 - __t_case0) * 1000.0,
        'error': __err,
    })
    if __err:
        break
__t1 = time.perf_counter()
print(${RESULTS_PREFIX_LIT} + json.dumps(__results))
print(${EXEC_MS_PREFIX_LIT} + format((__t1 - __t0) * 1000.0, '.3f'), file=sys.stderr)`;
}

const HARNESS_HEADER_JS = `// auto-generated harness (lib/judge/harness.ts) v${HARNESS_VERSION}`;

const ERROR_PREFIX_LIT = JSON.stringify(ERROR_PREFIX);
const RESULT_PREFIX_LIT = JSON.stringify(RESULT_PREFIX);
const EXEC_MS_PREFIX_LIT = JSON.stringify(EXEC_MS_PREFIX);
const RESULTS_PREFIX_LIT = JSON.stringify(RESULTS_PREFIX);
