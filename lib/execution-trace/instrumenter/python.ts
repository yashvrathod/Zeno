import { InstrumentationResult } from ".";

export function instrumentPython(code: string): InstrumentationResult {
  const lines = code.split("\n");
  const instrumentedLines: string[] = [];
  const lineMap = new Map<number, number>();
  let traceVar = "___trace";

  const header = `
${traceVar} = []
___var_history = {}
def ___track(name, value, line):
    prev = ___var_history.get(name)
    ___var_history[name] = {"name": name, "value": value, "previousValue": prev["value"] if prev else None, "changed": prev is not None and prev["value"] != value, "line": line}
    ${traceVar}.append({"step": len(${traceVar}) + 1, "line": line, "type": "assignment", "data": {"name": name, "value": repr(value)}})
def ___trace_step(line, typ, data=None):
    ${traceVar}.append({"step": len(${traceVar}) + 1, "line": line, "type": typ, "data": data or {}, "variables": dict(___var_history)})
`;

  const headerLines = header.trim().split("\n");
  for (const h of headerLines) {
    instrumentedLines.push(h);
  }

  for (let i = 0; i < lines.length; i++) {
    const originalLine = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    if (shouldSkipPython(trimmed) || trimmed.startsWith("___")) {
      instrumentedLines.push(raw);
      lineMap.set(instrumentedLines.length, originalLine);
      continue;
    }

    const indent = raw.match(/^\s*/)?.[0] || "";
    instrumentedLines.push(raw);
    lineMap.set(instrumentedLines.length, originalLine);

        if (isPythonAssignment(trimmed) && !trimmed.startsWith("def ") && !trimmed.startsWith("class ")) {
      const varName = extractPythonVarName(trimmed);
      if (varName) {
        instrumentedLines.push(`${indent}___track("${varName}", ${varName}, ${originalLine})`);
        lineMap.set(instrumentedLines.length, originalLine);
      }
    }

    if (/^return\b/.test(trimmed)) {
      instrumentedLines.push(`${indent}___trace_step(${originalLine}, "return")`);
      lineMap.set(instrumentedLines.length, originalLine);
    }

    if (/^(for|while)\b/.test(trimmed)) {
      instrumentedLines.push(`${indent}___trace_step(${originalLine}, "loop_iteration")`);
      lineMap.set(instrumentedLines.length, originalLine);
    }

    if (/\.(append|pop|insert|sort|reverse)\(/.test(trimmed)) {
      instrumentedLines.push(`${indent}___trace_step(${originalLine}, "array_mutation")`);
      lineMap.set(instrumentedLines.length, originalLine);
    }
  }

  return {
    instrumentedCode: instrumentedLines.join("\n"),
    originalLineMap: lineMap,
  };
}

function shouldSkipPython(line: string): boolean {
  if (!line) return true;
  if (line.startsWith("#") || line.startsWith('"""') || line.startsWith("'''")) return true;
  if (line.startsWith("import ") || line.startsWith("from ")) return true;
  return false;
}

function isPythonAssignment(line: string): boolean {
  return /^\w+\s*=/.test(line) && !/^(def |class |import |from |return |if |elif |else |for |while |try |except |with |raise |pass |break |continue |lambda )/.test(line);
}

function extractPythonVarName(line: string): string | null {
  const match = line.match(/^(\w+)\s*=/);
  return match ? match[1] : null;
}


