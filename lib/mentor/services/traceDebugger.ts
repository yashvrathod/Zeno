/**
 * Trace-it-Out Interactive Debugger
 *
 * Integrates Piston execution with the Mentor to enable line-by-line debugging.
 * The AI can pause execution and ask students to predict variable values.
 */

import { runOnPiston } from "@/lib/piston";

export type TraceFrame = {
  line: number;
  variables: Record<string, unknown>;
  stdout: string;
  callStack: string[];
};

export type ExecutionTrace = {
  frames: TraceFrame[];
  finalOutput: string;
  error?: string;
  totalLines: number;
};

export type PausePoint = {
  line: number;
  prompt: string;
  expectedVariable?: string;
  expectedValue?: unknown;
};

/**
 * Analyzes code to find good pause points for the debugger.
 * Returns lines where key variables change (loop entries, conditionals, etc.)
 */
export function findPausePoints(code: string, language: string): PausePoint[] {
  const lines = code.split("\n");
  const pausePoints: PausePoint[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNum = i + 1;

    // Loop entry points
    if (/^(for|while)\s*\(/.test(line)) {
      pausePoints.push({
        line: lineNum,
        prompt: `We're about to enter this loop. What will be the initial value of the loop variable?`,
      });
    }

    // Variable assignments in loops (good for tracing)
    if (/^\s*(let|var|const)?\s*\w+\s*=/.test(line) && i > 0) {
      const prevLines = lines.slice(0, i).join("\n");
      if (/for\s*\(|while\s*\(/.test(prevLines)) {
        const varName = line.match(/^(?:\s*(?:let|var|const)\s+)?(\w+)/)?.[1];
        if (varName) {
          pausePoints.push({
            line: lineNum,
            prompt: `At line ${lineNum}, what is the value of \`${varName}\` right now?`,
            expectedVariable: varName,
          });
        }
      }
    }

    // Key conditionals
    if (/^\s*if\s*\(/.test(line)) {
      pausePoints.push({
        line: lineNum,
        prompt: `We're at this conditional. Will this condition evaluate to true or false?`,
      });
    }

    // Return statements
    if (/^\s*return\s+/.test(line)) {
      pausePoints.push({
        line: lineNum,
        prompt: `We're about to return. What value will be returned?`,
      });
    }
  }

  return pausePoints.slice(0, 5); // Max 5 pause points to not overwhelm
}

/**
 * Simulates execution trace by instrumenting code with print statements.
 * This is a lightweight approach that doesn't require a full debugger.
 */
export async function traceExecution(
  code: string,
  language: string,
  input: string
): Promise<ExecutionTrace> {
  // Instrument code with trace statements
  const instrumentedCode = instrumentCodeForTracing(code, language);

  try {
    const result = await runOnPiston({
      code: instrumentedCode,
      language: language as keyof typeof import("@/lib/piston").LANGUAGE_CONFIG,
      stdin: input,
    });

    // Parse trace output
    const frames = parseTraceOutput(result.output);

    return {
      frames,
      finalOutput: extractFinalOutput(result.output),
      totalLines: code.split("\n").length,
    };
  } catch (error) {
    return {
      frames: [],
      finalOutput: "",
      error: error instanceof Error ? error.message : "Execution failed",
      totalLines: code.split("\n").length,
    };
  }
}

/**
 * Instruments code with print statements to capture variable states.
 */
function instrumentCodeForTracing(code: string, language: string): string {
  const lines = code.split("\n");
  const instrumented: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // Add original line
    instrumented.push(line);

    // Add trace after lines that modify variables
    if (shouldTraceAfter(line, language)) {
      const traceStmt = generateTraceStatement(line, lineNum, language);
      if (traceStmt) {
        instrumented.push(traceStmt);
      }
    }
  }

  return instrumented.join("\n");
}

function shouldTraceAfter(line: string, language: string): boolean {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("#")) {
    return false;
  }
  // Trace after assignments, loop iterations, conditionals
  return (
    /^(let|var|const|int|float|double|string|char|bool)\s+\w+\s*=/.test(trimmed) ||
    /^\w+\s*[=+\-*/]=?\s*/.test(trimmed) ||
    /^(for|while)\s*\(/.test(trimmed) ||
    /^\s*if\s*\(/.test(trimmed) ||
    /^\s*return\s+/.test(trimmed)
  );
}

function generateTraceStatement(line: string, lineNum: number, language: string): string | null {
  // Extract variable names from the line
  const varMatches = line.matchAll(/(\w+)\s*=/g);
  const vars = [...varMatches].map((m) => m[1]).filter(Boolean);

  if (vars.length === 0) return null;

  const traceObj = {
    __trace: true,
    line: lineNum,
    vars: vars.reduce((acc, v) => ({ ...acc, [v]: `__VAL_${v}` }), {}),
  };

  switch (language) {
    case "javascript":
    case "typescript":
      return `console.log('[TRACE]', JSON.stringify({line:${lineNum},vars:{${vars.map((v) => `${v}:${v}`).join(",")}}}));`;
    case "python":
      return `print(f'[TRACE] line=${lineNum} ${vars.map((v) => `${v}={${v}}`).join(" ")}')`;
    case "java":
      return `System.out.println("[TRACE] line=" + ${lineNum} + ${vars.map((v) => ` + " ${v}=" + ${v}`).join("")});`;
    case "cpp":
      return `std::cout << "[TRACE] line=" << ${lineNum} ${vars.map((v) => ` << " ${v}=" << ${v}`).join("")} << std::endl;`;
    default:
      return null;
  }
}

function parseTraceOutput(stdout: string): TraceFrame[] {
  const frames: TraceFrame[] = [];
  const lines = stdout.split("\n");

  for (const line of lines) {
    if (line.includes("[TRACE]")) {
      try {
        const jsonMatch = line.match(/\{.*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          frames.push({
            line: data.line,
            variables: data.vars || {},
            stdout: "",
            callStack: [],
          });
        }
      } catch {
        // Parse Python-style trace
        const match = line.match(/line=(\d+)(.*)/);
        if (match) {
          const lineNum = parseInt(match[1]!);
          const vars: Record<string, unknown> = {};
          const varMatches = match[2]!.matchAll(/(\w+)=([^\s]+)/g);
          for (const m of varMatches) {
            vars[m[1]!] = m[2]!;
          }
          frames.push({
            line: lineNum,
            variables: vars,
            stdout: "",
            callStack: [],
          });
        }
      }
    }
  }

  return frames;
}

function extractFinalOutput(stdout: string): string {
  return stdout
    .split("\n")
    .filter((l) => !l.includes("[TRACE]"))
    .join("\n")
    .trim();
}

/**
 * Generates a Socratic question for a specific pause point.
 */
export function generateDebuggerPrompt(
  pausePoint: PausePoint,
  frame: TraceFrame,
  userGuess?: string
): string {
  const actualValue = frame.variables[pausePoint.expectedVariable || ""];

  if (userGuess === undefined) {
    return pausePoint.prompt;
  }

  // Check if user's guess was correct
  const guessStr = userGuess.trim().toLowerCase();
  const actualStr = String(actualValue).toLowerCase();

  if (guessStr === actualStr) {
    return `✓ Correct! \`${pausePoint.expectedVariable}\` is indeed \`${actualValue}\`. Let's continue...`;
  } else {
    return `Not quite. You guessed "${userGuess}", but \`${pausePoint.expectedVariable}\` is actually \`${actualValue}\`. Let's trace through why...`;
  }
}
