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

export function findPausePoints(code: string, language: string): PausePoint[] {
  const lines = code.split("\n");
  const pausePoints: PausePoint[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    const lineNum = i + 1;

    if (/^(for|while)\s*[\(:]/.test(line)) {
      pausePoints.push({
        line: lineNum,
        prompt: `We're about to enter this loop. What will be the initial value of the loop variable?`,
      });
    }

    if (/^\s*(let|var|const)?\s*\w+\s*=/.test(line) && i > 0) {
      const prevLines = lines.slice(0, i).join("\n");
      if (/for\s*[\(:]|while\s*[\(:]/.test(prevLines)) {
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

    if (/^\s*if\s*[\(:]/.test(line)) {
      pausePoints.push({
        line: lineNum,
        prompt: `We're at this conditional. Will this condition evaluate to true or false?`,
      });
    }

    if (/^\s*return\s+/.test(line)) {
      pausePoints.push({
        line: lineNum,
        prompt: `We're about to return. What value will be returned?`,
      });
    }
  }

  return pausePoints.slice(0, 5);
}

const CXX_TYPES =
  "int|float|double|char|bool|long|short|size_t|auto|void|unsigned|signed|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t";
const CXX_TYPE_RE = new RegExp(
  `^(?:const\\s+)?(?:unsigned\\s+)?(?:signed\\s+)?(?:long\\s+)?(?:${CXX_TYPES})\\s+\\*?\\s*\\w+\\s*=`
);

export async function traceExecution(
  code: string,
  language: string,
  input: string
): Promise<ExecutionTrace> {
  let effectiveCode = code;
  let lineMapper: (l: number) => number | null = (l) => l;

  if (language === "cpp" && !/\bint\s+main\s*\(/.test(code)) {
    const wrapped = wrapCppCode(code);
    effectiveCode = wrapped.wrapped;
    lineMapper = wrapped.mapToOrig;
  }

  const header = getBoilerplateHeader(effectiveCode, language);
  const footer = language === "cpp" ? "" : getBoilerplateFooter(effectiveCode, language);
  const instrumentedUser = instrumentCodeForTracing(effectiveCode, language);
  const fullCode = header + instrumentedUser + footer;

  try {
    const result = await runOnPiston({
      code: fullCode,
      language: language as keyof typeof import("@/lib/piston").LANGUAGE_CONFIG,
      stdin: input,
    });

    const rawFrames = parseTraceOutput(result.output, effectiveCode, language);

    const frames: TraceFrame[] = [];
    const persistentState: Record<string, unknown> = {};
    for (const f of rawFrames) {
      const origLine = lineMapper(f.line);
      if (origLine === null) continue;
      f.line = origLine;
      f.callStack = buildCallStackForLine(code, f.line, language);
      Object.assign(persistentState, f.variables);
      f.variables = { ...persistentState };
      frames.push(f);
    }

    const stderr = result.output?.includes("error:") || result.output?.includes("Error:") ? result.output : undefined;

    return {
      frames,
      finalOutput: extractFinalOutput(result.output),
      totalLines: code.split("\n").length,
      error: frames.length === 0 ? (stderr ? `Compilation/execution issue: ${stderr.slice(0, 300)}` : "No trace events — code may have completed without variable changes.") : undefined,
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

function getBoilerplateHeader(code: string, language: string): string {
  const trimmed = code.trim();
  if (language === "cpp") {
    const hasInclude = /#include/.test(trimmed);
    const hasCout = /std::cout|cout\s*<</.test(trimmed);
    if (!hasInclude && (hasCout || /return\b/.test(trimmed) || /\w+\s*=\s*\d+/.test(trimmed))) {
      return "#include <iostream>\nusing namespace std;\n";
    }
  }
  return "";
}

function getBoilerplateFooter(code: string, language: string): string {
  const trimmed = code.trim();
  if (language === "cpp") {
    const hasMain = /\bint\s+main\s*\(/.test(trimmed);
    if (!hasMain) {
      return "\nint main() { return 0; }";
    }
  }
  if (language === "java" && trimmed.startsWith("class ")) {
    const hasMain = /public\s+static\s+void\s+main/.test(trimmed);
    if (!hasMain) {
      return "\npublic static void main(String[] args) {}\n}";
    }
  }
  return "";
}

function instrumentCodeForTracing(code: string, language: string): string {
  const lines = code.split("\n");
  const instrumented: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    const isReturnWithExpr = /^\s*return\s+\S/.test(line.trim());

    if (isReturnWithExpr) {
      const traceStmt = generateTraceStatement(line, lineNum, language);
      if (traceStmt) {
        instrumented.push(traceStmt);
      }
    }

    instrumented.push(line);

    if (!isReturnWithExpr && shouldTraceAfter(line, language)) {
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
  if (trimmed === "" || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
    return false;
  }

  if (CXX_TYPE_RE.test(trimmed)) return true;

  if (/^(let|var|const)\s+\w+\s*=/.test(trimmed)) return true;

  if (/^\w+\s*[=+\-*/]=?\s*/.test(trimmed) && !/^(if|elif|else|for|while|switch|catch|public|private|protected|class|struct|template|return|def|import|from)\b/.test(trimmed)) {
    return true;
  }

  if (/^\s*return\s+/.test(trimmed)) return true;
  if (/^\s*def\s/.test(trimmed)) return true;

  return false;
}

function generateTraceStatement(line: string, lineNum: number, language: string): string | null {
  const trimmed = line.trim();

  const varMatches = [...trimmed.matchAll(/\b([a-zA-Z_]\w*)\b\s*[\+\-\*\/%]?=(?!=)/g)];
  const vars = [...new Set(varMatches.map((m) => m[1]).filter(Boolean))];

  if (/^(for|while)\s*[\(:]/.test(trimmed) && vars.length === 0) {
    const forVar = trimmed.match(/for\s*[\(:]\s*(?:\w+\s+)?(\w+)\s*(?:in|=)/);
    if (forVar) vars.push(forVar[1]);
  }

  if (/^\s*return\s+/.test(trimmed) && vars.length === 0) {
    const retExpr = trimmed.replace(/^return\s+/, "").replace(/;?\s*$/, "").trim();
    if (retExpr && retExpr !== ";") {
      const idents = [...retExpr.matchAll(/\b([a-zA-Z_]\w*)\b/g)].map((m) => m[1]);
      for (const id of idents) {
        if (!["int", "float", "double", "char", "bool", "long", "short", "auto", "return", "sizeof", "if", "for", "while"].includes(id)) {
          vars.push(id);
        }
      }
    }
  }

  switch (language) {
    case "python":
      if (vars.length > 0) {
        return `print(f'[TRACE] line=${lineNum} ${[...new Set(vars)].map((v) => `${v}={' + str(${v}) + '}'`).join(" ")}')`;
      }
      return `print(f'[TRACE] line=${lineNum} {}')`;

    case "java":
      if (vars.length > 0) {
        return `System.out.println("[TRACE] line=" + ${lineNum} ${[...new Set(vars)].map((v) => `+ " ${v}=" + ${v}`).join("")});`;
      }
      return `System.out.println("[TRACE] line=" + ${lineNum} + " {}");`;

    case "cpp":
      if (vars.length > 0) {
        const unique = [...new Set(vars)];
        return `std::cout << "[TRACE] line=" << ${lineNum} ${unique.map((v) => `<< " ${v}=" << ${v}`).join("")} << std::endl;`;
      }
      return `std::cout << "[TRACE] line=" << ${lineNum} << " {}" << std::endl;`;

    default:
      return null;
  }
}

const CPP_TYPES = new Set([
  "int", "float", "double", "char", "bool", "void", "long", "short",
  "size_t", "auto", "string", "unsigned", "signed",
  "int8_t", "int16_t", "int32_t", "int64_t",
  "uint8_t", "uint16_t", "uint32_t", "uint64_t",
]);

function isCppType(word: string): boolean {
  return CPP_TYPES.has(word);
}

function findFuncRanges(lines: string[]): { openLine: number; closeLine: number }[] {
  const ranges: { openLine: number; closeLine: number }[] = [];
  let braceDepth = 0;
  let currentOpenLine = -1;
  let inFunc = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    const lineNum = i + 1;

    if (!inFunc && braceDepth === 0) {
      const funcMatch = trimmed.match(/(\w[\w<>]*)\s+(\w+)\s*\([^)]*\)\s*(?:\{|;)/);
      if (
        funcMatch &&
        !/^(if|for|while|catch|switch|return|else)\b/.test(trimmed)
      ) {
        if (isCppType(funcMatch[1]!)) {
          if (trimmed.includes("{")) {
            let bd = 0;
            for (const ch of trimmed) {
              if (ch === "{") bd++;
              else if (ch === "}") bd--;
            }
            if (bd <= 0) {
              ranges.push({ openLine: lineNum, closeLine: lineNum });
            } else {
              inFunc = true;
              currentOpenLine = lineNum;
              braceDepth = bd;
            }
          } else {
            inFunc = true;
            currentOpenLine = lineNum;
          }
        }
      }
    } else if (inFunc) {
      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") {
          braceDepth--;
          if (braceDepth === 0) {
            ranges.push({ openLine: currentOpenLine, closeLine: lineNum });
            inFunc = false;
            currentOpenLine = -1;
          }
        }
      }
    }
  }

  if (inFunc && currentOpenLine > 0) {
    ranges.push({ openLine: currentOpenLine, closeLine: lines.length });
  }

  return ranges;
}

function wrapCppCode(code: string): { wrapped: string; mapToOrig: (l: number) => number | null } {
  const hasMain = /\bint\s+main\s*\(/.test(code);
  if (hasMain) return { wrapped: code, mapToOrig: (l) => l };

  const lines = code.split("\n");

  const funcRanges = findFuncRanges(lines);

  const inFuncRange: boolean[] = new Array(lines.length).fill(false);
  for (const r of funcRanges) {
    for (let i = r.openLine - 1; i < r.closeLine; i++) {
      if (i >= 0 && i < inFuncRange.length) inFuncRange[i] = true;
    }
  }

  const wrapped: string[] = [];
  const mapping: (number | null)[] = [null];

  for (let i = 0; i < lines.length; i++) {
    if (inFuncRange[i]) {
      wrapped.push(lines[i]!);
      mapping.push(i + 1);
    }
  }

  wrapped.push("int main() {");
  mapping.push(null);

  let hasTopLevel = false;
  for (let i = 0; i < lines.length; i++) {
    if (!inFuncRange[i] && lines[i]!.trim() !== "") {
      wrapped.push(lines[i]!);
      mapping.push(i + 1);
      hasTopLevel = true;
    }
  }

  wrapped.push("return 0;");
  mapping.push(null);
  wrapped.push("}");
  mapping.push(null);

  if (!hasTopLevel && funcRanges.length === 0) {
    const origCode = code.trim();
    if (origCode) {
      wrapped.splice(0, wrapped.length);
      mapping.splice(0, mapping.length);
      mapping.push(null);
      wrapped.push("int main() {");
      mapping.push(null);
      wrapped.push(origCode);
      mapping.push(1);
      wrapped.push("return 0;");
      mapping.push(null);
      wrapped.push("}");
      mapping.push(null);
    }
  }

  return {
    wrapped: wrapped.join("\n"),
    mapToOrig: (l: number): number | null => {
      if (l >= 1 && l < mapping.length && mapping[l] !== null) {
        return mapping[l]!;
      }
      return null;
    },
  };
}

function buildCallStackForLine(originalCode: string, lineNumber: number, _language: string): string[] {
  const sourceLines = originalCode.split("\n");
  const detected: { name: string; openLine: number; closeLine: number }[] = [];
  const openStack: { name: string; openLine: number }[] = [];
  let currentFunc: { name: string; openLine: number } | null = null;
  let braceDepth = 0;

  for (let i = 0; i < sourceLines.length; i++) {
    const ln = i + 1;
    const trimmed = sourceLines[i]!.trim();
    let isFuncDecl = false;

    if (trimmed.match(/^\s*def\s+(\w+)\s*\(/)) isFuncDecl = true;

    const funcMatch = trimmed.match(/(\w[\w<>]*)\s+(\w+)\s*\([^)]*\)\s*(?:const\s*)?(?:\{|;)/);
    if (funcMatch && !trimmed.startsWith("if") && !trimmed.startsWith("for") && !trimmed.startsWith("while") && !trimmed.startsWith("catch") && !trimmed.startsWith("switch")) {
      if (["int", "float", "double", "char", "bool", "void", "long", "short", "size_t", "auto", "string", "unsigned", "signed", "int32_t", "int64_t"].includes(funcMatch[1]!) || /^\w+::/.test(trimmed)) {
        isFuncDecl = true;
      }
    }

    const methMatch = trimmed.match(/^\s*(?:public|private|protected)?\s*(?:static\s+)?(?:\w[\w<>]*)\s+(\w+)\s*\(/);
    if (methMatch && !trimmed.startsWith("if") && !trimmed.startsWith("for") && !trimmed.startsWith("while")) {
      isFuncDecl = true;
    }

    if (trimmed.includes("{") && isFuncDecl && currentFunc === null) {
      const name = trimmed.match(/^\s*(?:def|(?:\w[\w<>]*)\s+)?(\w+)\s*\(/)?.[1] || `func_${ln}`;
      currentFunc = { name, openLine: ln };
    }

    for (const ch of trimmed) {
      if (ch === '{') {
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
        if (braceDepth < 0) braceDepth = 0;
      }
    }

    if (braceDepth <= 0 && currentFunc !== null && ln >= currentFunc.openLine) {
      detected.push({ name: currentFunc.name, openLine: currentFunc.openLine, closeLine: ln });
      currentFunc = null;
    }
  }

  if (currentFunc !== null) {
    detected.push({ name: currentFunc.name, openLine: currentFunc.openLine, closeLine: sourceLines.length + 1 });
  }

  const result: string[] = [];
  for (const f of detected) {
    if (f.openLine <= lineNumber && lineNumber <= f.closeLine) {
      result.unshift(f.name);
    }
  }

  return result.length > 0 ? result : ["<global>"];
}

function parseTraceOutput(stdout: string, originalCode?: string, _language?: string): TraceFrame[] {
  const frames: TraceFrame[] = [];
  const lines = stdout.split("\n");

  for (const line of lines) {
    if (!line.includes("[TRACE]")) continue;

    const jsonMatch = line.match(/\{.*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        const vars: Record<string, unknown> = data.vars || {};
        const lineNum = data.line as number;
        const stack = originalCode ? buildCallStackForLine(originalCode, lineNum, _language || "cpp") : [];
        frames.push({ line: lineNum, variables: vars, stdout: "", callStack: stack });
        continue;
      } catch {
        // fall through to regex parser
      }
    }

    const match = line.match(/line=(\d+)(.*)/);
    if (match) {
      const lineNum = parseInt(match[1]!);
      const vars: Record<string, unknown> = {};
      const varMatches = match[2]!.matchAll(/(\w+)=([^\s]+)/g);
      for (const m of varMatches) {
        vars[m[1]!] = m[2]!;
      }
      const stack = originalCode ? buildCallStackForLine(originalCode, lineNum, _language || "cpp") : [];
      frames.push({ line: lineNum, variables: vars, stdout: "", callStack: stack });
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

export function generateDebuggerPrompt(
  pausePoint: PausePoint,
  frame: TraceFrame,
  userGuess?: string
): string {
  const actualValue = frame.variables[pausePoint.expectedVariable || ""];

  if (userGuess === undefined) {
    return pausePoint.prompt;
  }

  const guessStr = userGuess.trim().toLowerCase();
  const actualStr = String(actualValue).toLowerCase();

  if (guessStr === actualStr) {
    return `✓ Correct! \`${pausePoint.expectedVariable}\` is indeed \`${actualValue}\`. Let's continue...`;
  } else {
    return `Not quite. You guessed "${userGuess}", but \`${pausePoint.expectedVariable}\` is actually \`${actualValue}\`. Let's trace through why...`;
  }
}
