import { SupportedLanguage, TestCase } from "../types";

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  java: "java",
  cpp: "c++",
};

export async function executeInstrumentedRemote(
  instrumentedCode: string,
  language: SupportedLanguage,
  testCase: TestCase,
  timeout: number,
): Promise<string> {
  const pistonLang = LANGUAGE_MAP[language] || language;
  const wrapped = wrapRemoteCode(instrumentedCode, language, testCase);

  const response = await fetch(PISTON_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: pistonLang,
      version: "*",
      files: [{ name: getFileName(language), content: wrapped }],
      stdin: "",
      args: [],
      compile_timeout: Math.min(timeout, 10000),
      run_timeout: Math.min(timeout, 10000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Piston API error: ${response.status}`);
  }

  const result = await response.json();
  const output: string = result?.run?.stdout || "";
  const stderr: string = result?.run?.stderr || "";

  if (stderr && !output) {
    throw new Error(stderr.slice(0, 500));
  }

  return output;
}

function wrapRemoteCode(code: string, language: SupportedLanguage, testCase: TestCase): string {
  const input = JSON.stringify(testCase.parsedInput);

  switch (language) {
    case "python":
      return `
import json, sys
${code}
_input = json.loads('''${input}''')
_result = solution(*_input) if 'solution' in dir() else None
print("__TRACE_RESULT:", json.dumps(_result))
`;
    case "java":
      return `
public class Main {
    public static void main(String[] args) {
        ${code}
    }
}
`;
    default:
      return code;
  }
}

function getFileName(language: SupportedLanguage): string {
  switch (language) {
    case "javascript":
    case "typescript":
      return "code.js";
    case "python":
      return "code.py";
    case "java":
      return "Main.java";
    case "cpp":
      return "code.cpp";
    default:
      return "code.txt";
  }
}
