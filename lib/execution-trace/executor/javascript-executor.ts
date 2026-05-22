import { TestCase } from "../types";

export async function executeInstrumentedJavaScript(
  instrumentedCode: string,
  testCase: TestCase,
  timeout: number,
): Promise<string> {
  const wrappedCode = wrapWithTest(instrumentedCode, testCase);

  const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
  const fn = new AsyncFunction("__testInput", wrappedCode);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Execution timed out")), timeout)
  );

  const executionPromise = fn(testCase.parsedInput);

  try {
    await Promise.race([executionPromise, timeoutPromise]);
  } catch (e) {
    throw e;
  }

  return extractTraceFromGlobals();
}

function wrapWithTest(code: string, testCase: TestCase): string {
  const parsed = JSON.stringify(testCase.parsedInput);
  return `
    const __testInput = ${parsed};
    const __originalConsoleLog = console.log;
    const __traceOutput = [];
    console.log = function(...args) {
      __traceOutput.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    };

    try {
      ${code}

      const result = (typeof solution !== 'undefined' ? solution(...__testInput) :
                       typeof twoSum !== 'undefined' ? twoSum(...__testInput) :
                       typeof twoSum !== 'undefined' ? twoSum(...__testInput) :
                       null);
      console.log('__TRACE_RESULT:', JSON.stringify(result));
    } catch(e) {
      console.log('__TRACE_ERROR:', e.message);
    }

    console.log = __originalConsoleLog;
    return __traceOutput.join('\\n');
  `;
}

function extractTraceFromGlobals(): string {
  return "";
}

export async function executeStepJavaScript(
  instrumentedCode: string,
  startLine: number,
  maxSteps: number,
  testCase: TestCase,
  timeout: number,
): Promise<string> {
  const code = `
    let __stepCounter = 0;
    const __maxSteps = ${maxSteps};
    const __startLine = ${startLine};

    function __maybePause(line) {
      __stepCounter++;
      if (__stepCounter > __maxSteps) {
        throw new Error('__STEP_LIMIT');
      }
    }

    ${instrumentedCode}
  `;

  return executeInstrumentedJavaScript(code, testCase, timeout);
}
