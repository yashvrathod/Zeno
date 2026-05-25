/**
 * Client-side JavaScript/TypeScript execution trace engine.
 * Instruments code with trace statements and runs it in a sandboxed Function.
 * No external API dependency — works entirely in the browser.
 */

export interface TraceFrame {
  line: number;
  variables: Record<string, unknown>;
}

export interface TraceResult {
  frames: TraceFrame[];
  finalOutput: string;
  error?: string;
  totalLines: number;
}

function parseTraceOutput(stdout: string): TraceFrame[] {
  const frames: TraceFrame[] = [];
  for (const line of stdout.split("\n")) {
    if (line.includes("[TRACE]")) {
      try {
        const jsonMatch = line.match(/\{.*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          frames.push({ line: data.line, variables: data.vars || {} });
        }
      } catch {
        const match = line.match(/line=(\d+)(.*)/);
        if (match) {
          const lineNum = parseInt(match[1]!);
          const vars: Record<string, unknown> = {};
          const varMatches = match[2]!.matchAll(/(\w+)=([^\s]+)/g);
          for (const m of varMatches) vars[m[1]!] = m[2]!;
          frames.push({ line: lineNum, variables: vars });
        }
      }
    }
  }
  return frames;
}

function extractFinalOutput(stdout: string): string {
  return stdout.split("\n").filter(l => !l.includes("[TRACE]")).join("\n").trim();
}

function instrumentCode(code: string): string {
  const lines = code.split("\n");
  const instrumented: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    instrumented.push(line);

    const trimmed = line.trim();
    if (
      trimmed === "" ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*")
    ) continue;

    const lineNum = i + 1;
    if (
      /^(let|var|const)\s+\w+\s*=/.test(trimmed) ||
      /^\w+\s*[=+\-*/]=?\s*/.test(trimmed) ||
      /^(for|while)\s*\(/.test(trimmed) ||
      /^\s*if\s*\(/.test(trimmed) ||
      /^\s*return\s+/.test(trimmed)
    ) {
      const varMatches = [...trimmed.matchAll(/(\w+)\s*=/g)].map(m => m[1]).filter(Boolean);
      if (varMatches.length > 0) {
        instrumented.push(
          `console.log('[TRACE]', JSON.stringify({line:${lineNum},vars:{${varMatches.map(v => `${v}:${v}`).join(",")}}}));`
        );
      }
    }
  }

  return instrumented.join("\n");
}

export function clientTraceExecution(code: string, inputStr: string): TraceResult {
  const totalLines = code.split("\n").length;
  const instrumentedCode = instrumentCode(code);

  const logs: string[] = [];
  const mockConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
    },
  };

  // Validate code — block dangerous globals that shouldn't be available in sandbox
  const dangerous = ["process", "require", "import(", "globalThis", "fetch", "XMLHttpRequest", "WebSocket", "localStorage"];
  for (const pattern of dangerous) {
    if (instrumentedCode.includes(pattern)) {
      return {
        frames: [],
        finalOutput: "",
        error: `Execution blocked: use of \`${pattern}\` is not allowed in trace execution`,
        totalLines,
      };
    }
  }

  try {
    const fn = new Function(
      "console",
      `"use strict";\n${instrumentedCode}\n//# sourceURL=__trace__`
    );

    fn(mockConsole);

    const stdout = logs.join("\n");
    const frames = parseTraceOutput(stdout);
    const finalOutput = extractFinalOutput(stdout);

    return { frames, finalOutput, totalLines };
  } catch (err) {
    return {
      frames: [],
      finalOutput: "",
      error: err instanceof Error ? err.message : "Execution failed",
      totalLines,
    };
  }
}
