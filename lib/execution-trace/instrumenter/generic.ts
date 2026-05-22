import { InstrumentationResult } from ".";

export function instrumentGeneric(code: string): InstrumentationResult {
  const lines = code.split("\n");
  const instrumentedLines: string[] = [];
  const lineMap = new Map<number, number>();
  let printVar = 0;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      instrumentedLines.push(raw);
      lineMap.set(instrumentedLines.length, originalLine);
      continue;
    }

    const indent = raw.match(/^\s*/)?.[0] || "";
    instrumentedLines.push(raw);
    lineMap.set(instrumentedLines.length, originalLine);

    printVar++;

    if (/^\w+\s*=/.test(trimmed) && !/^(if|for|while|switch|catch|public|private|protected|class|struct|template)/.test(trimmed)) {
      const varName = trimmed.match(/^(\w+)/)?.[1] || "";
      instrumentedLines.push(`${indent}System.out.println("__TRACE_VAR:${varName}=" + ${varName});`);
    }

    if (/^return\b/.test(trimmed)) {
      instrumentedLines.push(`${indent}System.out.println("__TRACE_RETURN:${originalLine}");`);
    }

    if (/\.(push|pop|sort|reverse)\(/.test(trimmed)) {
      instrumentedLines.push(`${indent}System.out.println("__TRACE_MUTATION:${originalLine}");`);
    }

    lineMap.set(instrumentedLines.length, originalLine);
  }

  return {
    instrumentedCode: instrumentedLines.join("\n"),
    originalLineMap: lineMap,
  };
}
