import { SupportedLanguage } from "../types";
import { instrumentJavaScript } from "./javascript";
import { instrumentPython } from "./python";
import { instrumentGeneric } from "./generic";

export interface InstrumentationResult {
  instrumentedCode: string;
  originalLineMap: Map<number, number>;
}

export function instrumentCode(
  code: string,
  language: SupportedLanguage,
): InstrumentationResult {
  switch (language) {
    case "javascript":
    case "typescript":
      return instrumentJavaScript(code);
    case "python":
      return instrumentPython(code);
    default:
      return instrumentGeneric(code);
  }
}
