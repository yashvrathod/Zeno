import { InstrumentationResult } from ".";

interface LineMapping {
  instrumentedLine: number;
  originalLine: number;
}

export function instrumentJavaScript(code: string): InstrumentationResult {
  const lines = code.split("\n");
  const instrumentedLines: string[] = [];
  const lineMap = new Map<number, number>();

  let scopeDepth = 0;
  let varCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    if (shouldSkip(trimmed)) {
      instrumentedLines.push(raw);
      lineMap.set(instrumentedLines.length, originalLine);
      continue;
    }

    const indent = raw.match(/^\s*/)?.[0] || "";

    instrumentedLines.push(raw);
    lineMap.set(instrumentedLines.length, originalLine);

    if (trimmed.endsWith("{")) {
      scopeDepth++;
      const stepIndex = instrumentedLines.length;
      instrumentedLines.push(`${indent}  __trace(${stepIndex}, ${originalLine}, 'block_start', {depth: ${scopeDepth}});`);
      lineMap.set(instrumentedLines.length, originalLine);
      continue;
    }

    if (trimmed === "}") {
      const stepIndex = instrumentedLines.length;
      instrumentedLines.push(`${indent}__trace(${stepIndex}, ${originalLine}, 'block_end', {depth: ${scopeDepth}});`);
      lineMap.set(instrumentedLines.length, originalLine);
      scopeDepth = Math.max(0, scopeDepth - 1);
      continue;
    }

    if (isVariableDeclaration(trimmed)) {
      const vars = extractVariables(trimmed);
      for (const v of vars) {
        varCounter++;
        const stepIndex = instrumentedLines.length;
        instrumentedLines.push(
          `${indent}__track_var('${v.name}', ${v.initExpr || 'undefined'}, '${v.name}', ${originalLine});`
        );
        lineMap.set(instrumentedLines.length, originalLine);
      }
    }

    if (isAssignment(trimmed)) {
      const assign = parseAssignment(trimmed);
      if (assign) {
        const stepIndex = instrumentedLines.length;
        instrumentedLines.push(
          `${indent}__track_var('${assign.target}', ${assign.target}, '${assign.target}', ${originalLine});`
        );
        lineMap.set(instrumentedLines.length, originalLine);
      }
    }

    if (isReturnStatement(trimmed)) {
      const stepIndex = instrumentedLines.length;
      const returnValue = trimmed.replace(/^return\s*/, "").replace(/;\s*$/, "").trim() || "undefined";
      instrumentedLines.push(
        `${indent}__trace(${stepIndex}, ${originalLine}, 'return', {value: ${returnValue}});`
      );
      lineMap.set(instrumentedLines.length, originalLine);
    }

    if (isLoop(trimmed)) {
      const stepIndex = instrumentedLines.length;
      instrumentedLines.push(
        `${indent}__trace(${stepIndex}, ${originalLine}, 'loop_iteration', {loopType: detectLoopType(trimmed)});`
      );
      lineMap.set(instrumentedLines.length, originalLine);
    }

    if (isArrayMutation(trimmed)) {
      const stepIndex = instrumentedLines.length;
      instrumentedLines.push(
        `${indent}__track_array_mutation(${originalLine});`
      );
      lineMap.set(instrumentedLines.length, originalLine);
    }
  }

  const header = generateHeader();
  instrumentedLines.unshift(...header.split("\n"));

  return {
    instrumentedCode: instrumentedLines.join("\n"),
    originalLineMap: lineMap,
  };
}

function generateHeader(): string {
  return `
// __trace instrumentation
const __traceLog = [];
const __varHistory = {};
function __trace(step, line, type, data) {
  __traceLog.push({ step, line, type, data: JSON.parse(JSON.stringify(data)), variables: { ...__varHistory }, timestamp: Date.now() });
}
function __track_var(name, value, originalName, line) {
  const prev = __varHistory[name];
  __varHistory[name] = { name: originalName, value: JSON.parse(JSON.stringify(value)), previousValue: prev?.value, changed: prev !== undefined && JSON.stringify(prev.value) !== JSON.stringify(value), line };
  __trace(__traceLog.length + 1, line, 'assignment', { name: originalName, value: JSON.parse(JSON.stringify(value)) });
}
function __track_array_mutation(line) {
  const arrayVars = Object.entries(__varHistory).filter(([_, v]) => Array.isArray(v.value));
  for (const [name, info] of arrayVars) {
    __varHistory[name] = { ...info, value: JSON.parse(JSON.stringify(info.value)), changed: true };
  }
  __trace(__traceLog.length + 1, line, 'array_mutation', { arrays: arrayVars.map(([n]) => n) });
}
`;
}

function shouldSkip(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return true;
  if (trimmed.startsWith("import") || trimmed.startsWith("export") || trimmed.startsWith("from")) return true;
  if (trimmed.startsWith("__trace") || trimmed.startsWith("__track")) return true;
  return false;
}

function isVariableDeclaration(line: string): boolean {
  return /^(let|const|var)\s/.test(line);
}

function extractVariables(line: string): Array<{ name: string; initExpr: string | null }> {
  const match = line.match(/^(?:let|const|var)\s+(\w+)\s*(?:=\s*(.*))?$/);
  if (match) return [{ name: match[1], initExpr: match[2] || "undefined" }];

  const multi = line.match(/^(?:let|const|var)\s+(.+)$/);
  if (!multi) return [];

  const parts = multi[1].split(",").map(p => p.trim());
  return parts.map(p => {
    const [name, ...rest] = p.split("=").map(s => s.trim());
    return { name, initExpr: rest.length > 0 ? rest.join("=") : null };
  });
}

function isAssignment(line: string): boolean {
  if (isVariableDeclaration(line)) return false;
  return /^\w+(?:\.\w+)*\[\d*\]?\s*(?:\+=|-=|\*=|\/=|%=|=)\s/.test(line);
}

function parseAssignment(line: string): { target: string; value: string } | null {
  const match = line.match(/^(\w+(?:\[\d+\])?)\s*(?:=(?!=)|[-+*/%]=)\s*(.*)/);
  if (match) return { target: match[1], value: match[2] };
  return null;
}

function isReturnStatement(line: string): boolean {
  return /^return\b/.test(line);
}

function isLoop(line: string): boolean {
  return /^(for|while|do)\b/.test(line);
}

function detectLoopType(line: string): string {
  if (/^for\b/.test(line)) return "for";
  if (/^while\b/.test(line)) return "while";
  if (/^do\b/.test(line)) return "do-while";
  return "unknown";
}

function isArrayMutation(line: string): boolean {
  return /\.push\(|\.pop\(\)|\.shift\(\)|\.unshift\(|\.splice\(|\.sort\(/.test(line);
}
