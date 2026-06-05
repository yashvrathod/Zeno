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
  if (input.mode === "per-test") {
    if (input.testCases.length !== 1) {
      throw new Error(
        `per-test mode requires exactly 1 test case, got ${input.testCases.length}`,
      );
    }
    const tc = input.testCases[0]!;
    const stdinJson = JSON.stringify(tc.args);
    const code = buildHarnessForLanguage({
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
  const code = buildHarnessForLanguage({
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

type JavaOrCppInput = {
  language: "java" | "cpp";
  userCode: string;
  signature: ProblemSignature;
  mode: HarnessMode;
};

function buildHarnessForLanguage(input: HarnessForLangInput): string {
  if (input.language === "javascript" || input.language === "typescript") {
    const dyn = input as DynamicHarnessInput;
    return input.mode === "per-test" ? buildJsPerTest(dyn) : buildJsSingleExec(dyn);
  }
  if (input.language === "python") {
    const dyn = input as DynamicHarnessInput;
    return input.mode === "per-test" ? buildPythonPerTest(dyn) : buildPythonSingleExec(dyn);
  }
  if (input.language === "java") {
    const jc = input as JavaOrCppInput;
    return input.mode === "per-test" ? buildJavaPerTest(jc) : buildJavaSingleExec(jc);
  }
  const cpp = input as JavaOrCppInput;
  return input.mode === "per-test" ? buildCppPerTest(cpp) : buildCppSingleExec(cpp);
}

type HarnessForLangInput = {
  language: Language;
  userCode: string;
  signature: ProblemSignature;
  mode: HarnessMode;
};

function callExpression(language: "javascript" | "typescript" | "python", sig: ProblemSignature, argsExpr: string): string {
  if (sig.className) {
    if (language === "python") {
      return `${sig.className}().${sig.methodName}(${argsExpr})`;
    }
    return `new ${sig.className}().${sig.methodName}(${argsExpr})`;
  }
  return `${sig.methodName}(${argsExpr})`;
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

const JAVA_HARNESS_PARSER = `class __HarnessParser {
    private final String s;
    private int i;
    __HarnessParser(String s) { this.s = s; this.i = 0; }
    Object parse() { skipWs(); return parseValue(); }
    private Object parseValue() {
        skipWs(); char c = s.charAt(i);
        if (c == '"') return parseString();
        if (c == '[') return parseArray();
        if (c == '{') return parseObject();
        if (c == 't' || c == 'f') return parseBoolean();
        if (c == 'n') { expect("null"); return null; }
        return parseNumber();
    }
    private String parseString() {
        i++; StringBuilder sb = new StringBuilder();
        while (i < s.length() && s.charAt(i) != '"') {
            char c = s.charAt(i);
            if (c == '\\\\' && i + 1 < s.length()) {
                char n = s.charAt(i + 1);
                if (n == 'n') sb.append('\\n');
                else if (n == 't') sb.append('\\t');
                else if (n == 'r') sb.append('\\r');
                else if (n == '\\\\') sb.append('\\\\');
                else if (n == '"') sb.append('"');
                else sb.append(n);
                i += 2;
            } else { sb.append(c); i++; }
        }
        i++;
        return sb.toString();
    }
    private java.util.List<Object> parseArray() {
        i++; java.util.List<Object> out = new java.util.ArrayList<>();
        skipWs();
        if (i < s.length() && s.charAt(i) == ']') { i++; return out; }
        while (i < s.length()) {
            out.add(parseValue());
            skipWs();
            if (i < s.length() && s.charAt(i) == ',') { i++; continue; }
            if (i < s.length() && s.charAt(i) == ']') { i++; return out; }
        }
        return out;
    }
    private java.util.Map<String, Object> parseObject() {
        i++; java.util.Map<String, Object> out = new java.util.HashMap<>();
        skipWs();
        if (i < s.length() && s.charAt(i) == '}') { i++; return out; }
        while (i < s.length()) {
            skipWs(); String k = parseString();
            skipWs(); expect(":"); skipWs();
            out.put(k, parseValue());
            skipWs();
            if (i < s.length() && s.charAt(i) == ',') { i++; continue; }
            if (i < s.length() && s.charAt(i) == '}') { i++; return out; }
        }
        return out;
    }
    private Boolean parseBoolean() {
        if (s.startsWith("true", i)) { i += 4; return Boolean.TRUE; }
        if (s.startsWith("false", i)) { i += 5; return Boolean.FALSE; }
        throw new RuntimeException("invalid boolean at " + i);
    }
    private Number parseNumber() {
        int start = i;
        if (i < s.length() && s.charAt(i) == '-') i++;
        boolean isFloat = false;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (Character.isDigit(c)) i++;
            else if (c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-') { isFloat = true; i++; }
            else break;
        }
        String num = s.substring(start, i);
        if (isFloat) return Double.parseDouble(num);
        try { return Long.parseLong(num); } catch (Exception e) { return Double.parseDouble(num); }
    }
    private void expect(String tok) {
        if (i + tok.length() > s.length() || !s.startsWith(tok, i)) {
            throw new RuntimeException("expected '" + tok + "' at " + i);
        }
        i += tok.length();
    }
    private void skipWs() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }
}`;

function javaType(t: string): string {
  if (t === "number[]") return "int[]";
  if (t === "number[][]") return "int[][]";
  if (t === "string[]") return "String[]";
  if (t === "boolean") return "boolean";
  if (t === "number") return "int";
  if (t === "string") return "String";
  return "Object";
}

function javaArgsToCallExpr(sig: ProblemSignature): string {
  return sig.paramTypes
    .map((p, i) => {
      const accessor = `(__args[${i}])`;
      if (p.type === "number") return `((Number) ${accessor}).intValue()`;
      if (p.type === "string") return `(String) ${accessor}`;
      if (p.type === "boolean") return `(Boolean) ${accessor}`;
      if (p.type === "number[]") return `__toIntArray(${accessor})`;
      if (p.type === "number[][]") return `__toIntMatrix(${accessor})`;
      if (p.type === "string[]") return `__toStringArray(${accessor})`;
      return accessor;
    })
    .join(", ");
}

function buildJavaPerTest(input: JavaOrCppInput): string {
  const sig = input.signature;
  const callArgs = javaArgsToCallExpr(sig);
  const call = sig.className
    ? `new ${sig.className}().${sig.methodName}(${callArgs})`
    : `Main.${sig.methodName}(${callArgs})`;
  return `import java.util.*;
${JAVA_HARNESS_PARSER}
${input.userCode}
class __Harness {
    static int[] __toIntArray(Object o) {
        java.util.List<Object> l = (java.util.List<Object>) o;
        int[] a = new int[l.size()];
        for (int __i = 0; __i < l.size(); __i++) a[__i] = ((Number) l.get(__i)).intValue();
        return a;
    }
    static int[][] __toIntMatrix(Object o) {
        java.util.List<Object> l = (java.util.List<Object>) o;
        int[][] m = new int[l.size()][];
        for (int __i = 0; __i < l.size(); __i++) m[__i] = __toIntArray(l.get(__i));
        return m;
    }
    static String[] __toStringArray(Object o) {
        java.util.List<Object> l = (java.util.List<Object>) o;
        String[] a = new String[l.size()];
        for (int __i = 0; __i < l.size(); __i++) a[__i] = (String) l.get(__i);
        return a;
    }
    static String __toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof Boolean) return o.toString();
        if (o instanceof Number) return o.toString();
        if (o instanceof String) return "\\"" + ((String) o).replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
        if (o instanceof java.util.List) {
            StringBuilder sb = new StringBuilder("[");
            java.util.List<Object> l = (java.util.List<Object>) o;
            for (int __i = 0; __i < l.size(); __i++) {
                if (__i > 0) sb.append(",");
                sb.append(__toJson(l.get(__i)));
            }
            sb.append("]");
            return sb.toString();
        }
        return "\\"" + o.toString() + "\\"";
    }
    public static void main(String[] args) {
        try {
            StringBuilder sb = new StringBuilder();
            Scanner sc = new Scanner(System.in);
            while (sc.hasNextLine()) sb.append(sc.nextLine()).append("\\n");
            String stdin = sb.toString();
            Object parsed = new __HarnessParser(stdin).parse();
            java.util.List<Object> __args;
            if (parsed instanceof java.util.List) __args = (java.util.List<Object>) parsed;
            else { __args = new java.util.ArrayList<>(); __args.add(parsed); }
            long __t0 = System.nanoTime();
            Object __result = ${call};
            long __t1 = System.nanoTime();
            double __execMs = (__t1 - __t0) / 1e6;
            System.out.println(${RESULT_PREFIX_LIT} + __toJson(__result));
            System.err.println(${EXEC_MS_PREFIX_LIT} + String.format("%.3f", __execMs));
        } catch (Throwable __e) {
            System.err.println(${ERROR_PREFIX_LIT} + __e.getClass().getName() + ": " + __e.getMessage());
        }
    }
}`;
}

function buildJavaSingleExec(input: JavaOrCppInput): string {
  const sig = input.signature;
  const callArgs = javaArgsToCallExpr(sig);
  const call = sig.className
    ? `new ${sig.className}().${sig.methodName}(${callArgs})`
    : `Main.${sig.methodName}(${callArgs})`;
  return `import java.util.*;
${JAVA_HARNESS_PARSER}
${input.userCode}
class __Harness {
    static int[] __toIntArray(Object o) {
        java.util.List<Object> l = (java.util.List<Object>) o;
        int[] a = new int[l.size()];
        for (int __i = 0; __i < l.size(); __i++) a[__i] = ((Number) l.get(__i)).intValue();
        return a;
    }
    static int[][] __toIntMatrix(Object o) {
        java.util.List<Object> l = (java.util.List<Object>) o;
        int[][] m = new int[l.size()][];
        for (int __i = 0; __i < l.size(); __i++) m[__i] = __toIntArray(l.get(__i));
        return m;
    }
    static String[] __toStringArray(Object o) {
        java.util.List<Object> l = (java.util.List<Object>) o;
        String[] a = new String[l.size()];
        for (int __i = 0; __i < l.size(); __i++) a[__i] = (String) l.get(__i);
        return a;
    }
    static String __toJson(Object o) {
        if (o == null) return "null";
        if (o instanceof Boolean) return o.toString();
        if (o instanceof Number) return o.toString();
        if (o instanceof String) return "\\"" + ((String) o).replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
        if (o instanceof java.util.List) {
            StringBuilder sb = new StringBuilder("[");
            java.util.List<Object> l = (java.util.List<Object>) o;
            for (int __i = 0; __i < l.size(); __i++) {
                if (__i > 0) sb.append(",");
                sb.append(__toJson(l.get(__i)));
            }
            sb.append("]");
            return sb.toString();
        }
        return "\\"" + o.toString() + "\\"";
    }
    public static void main(String[] args) {
        try {
            StringBuilder sb = new StringBuilder();
            Scanner sc = new Scanner(System.in);
            while (sc.hasNextLine()) sb.append(sc.nextLine()).append("\\n");
            String stdin = sb.toString();
            Object parsed = new __HarnessParser(stdin).parse();
            java.util.List<Object> __cases = (java.util.List<Object>) parsed;
            java.util.List<Object> __results = new java.util.ArrayList<>();
            long __t0 = System.nanoTime();
            for (int __i = 0; __i < __cases.size(); __i++) {
                java.util.Map<String, Object> __case = (java.util.Map<String, Object>) __cases.get(__i);
                java.util.List<Object> __args = (java.util.List<Object>) __case.get("args");
                long __tCase0 = System.nanoTime();
                Object __result = null;
                String __err = null;
                try {
                    __result = ${call};
                } catch (Throwable __e) {
                    StringWriter sw = new StringWriter();
                    __e.printStackTrace(new PrintWriter(sw));
                    __err = sw.toString();
                }
                long __tCase1 = System.nanoTime();
                java.util.Map<String, Object> __row = new java.util.LinkedHashMap<>();
                __row.put("index", __i);
                __row.put("result", __err == null ? __toJson(__result) : null);
                __row.put("execMs", (__tCase1 - __tCase0) / 1e6);
                __row.put("error", __err);
                __results.add(__row);
                if (__err != null) break;
            }
            long __t1 = System.nanoTime();
            StringBuilder __out = new StringBuilder("[");
            for (int __i = 0; __i < __results.size(); __i++) {
                if (__i > 0) __out.append(",");
                java.util.Map<String, Object> __r = (java.util.Map<String, Object>) __results.get(__i);
                __out.append("{\\"index\\":").append(__r.get("index"))
                    .append(",\\"result\\":").append(__r.get("result") == null ? "null" : __r.get("result"))
                    .append(",\\"execMs\\":").append(__r.get("execMs"))
                    .append(",\\"error\\":").append(__r.get("error") == null ? "null" : "\\"" + ((String) __r.get("error")).replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"")
                    .append("}");
            }
            __out.append("]");
            System.out.println(${RESULTS_PREFIX_LIT} + __out);
            System.err.println(${EXEC_MS_PREFIX_LIT} + String.format("%.3f", (__t1 - __t0) / 1e6));
        } catch (Throwable __e) {
            System.err.println(${ERROR_PREFIX_LIT} + __e.getClass().getName() + ": " + __e.getMessage());
        }
    }
}`;
}

const CPP_HARNESS_PARSER = `class __JsonValue {
public:
    enum Kind { NULL_VAL, BOOL_VAL, NUM_VAL, STR_VAL, ARR_VAL, OBJ_VAL };
    Kind kind = NULL_VAL;
    bool b = false;
    double n = 0;
    std::string s;
    std::vector<__JsonValue> arr;
    std::vector<std::pair<std::string, __JsonValue>> obj;
    bool isArr() const { return kind == ARR_VAL; }
    bool isObj() const { return kind == OBJ_VAL; }
    long long asInt() const { return (long long) n; }
    double asNum() const { return n; }
    const std::string& asStr() const { return s; }
    bool asBool() const { return b; }
};

class __JsonParser {
    const std::string& src;
    size_t pos = 0;
public:
    __JsonParser(const std::string& s) : src(s) {}
    __JsonValue parse() { skipWs(); return parseValue(); }
private:
    __JsonValue parseValue() {
        skipWs();
        if (pos >= src.size()) throw std::runtime_error("unexpected end");
        char c = src[pos];
        if (c == '"') return parseString();
        if (c == '[') return parseArray();
        if (c == '{') return parseObject();
        if (c == 't' || c == 'f') return parseBool();
        if (c == 'n') { expect("null"); __JsonValue v; return v; }
        return parseNumber();
    }
    __JsonValue parseString() {
        pos++;
        std::string out;
        while (pos < src.size() && src[pos] != '"') {
            char c = src[pos];
            if (c == '\\\\' && pos + 1 < src.size()) {
                char n = src[pos + 1];
                if (n == 'n') out += '\\n';
                else if (n == 't') out += '\\t';
                else if (n == 'r') out += '\\r';
                else if (n == '\\\\') out += '\\\\';
                else if (n == '"') out += '"';
                else out += n;
                pos += 2;
            } else { out += c; pos++; }
        }
        pos++;
        __JsonValue v; v.kind = __JsonValue::STR_VAL; v.s = out; return v;
    }
    __JsonValue parseArray() {
        pos++;
        __JsonValue v; v.kind = __JsonValue::ARR_VAL;
        skipWs();
        if (pos < src.size() && src[pos] == ']') { pos++; return v; }
        while (pos < src.size()) {
            v.arr.push_back(parseValue());
            skipWs();
            if (pos < src.size() && src[pos] == ',') { pos++; continue; }
            if (pos < src.size() && src[pos] == ']') { pos++; return v; }
        }
        return v;
    }
    __JsonValue parseObject() {
        pos++;
        __JsonValue v; v.kind = __JsonValue::OBJ_VAL;
        skipWs();
        if (pos < src.size() && src[pos] == '}') { pos++; return v; }
        while (pos < src.size()) {
            skipWs();
            __JsonValue k = parseString();
            skipWs(); expect(":");
            v.obj.push_back({k.s, parseValue()});
            skipWs();
            if (pos < src.size() && src[pos] == ',') { pos++; continue; }
            if (pos < src.size() && src[pos] == '}') { pos++; return v; }
        }
        return v;
    }
    __JsonValue parseBool() {
        __JsonValue v;
        if (src.compare(pos, 4, "true") == 0) { pos += 4; v.kind = __JsonValue::BOOL_VAL; v.b = true; return v; }
        if (src.compare(pos, 5, "false") == 0) { pos += 5; v.kind = __JsonValue::BOOL_VAL; v.b = false; return v; }
        throw std::runtime_error("invalid bool");
    }
    __JsonValue parseNumber() {
        size_t start = pos;
        if (pos < src.size() && src[pos] == '-') pos++;
        bool isFloat = false;
        while (pos < src.size()) {
            char c = src[pos];
            if (isdigit((unsigned char) c)) pos++;
            else if (c == '.' || c == 'e' || c == 'E' || c == '+' || c == '-') { isFloat = true; pos++; }
            else break;
        }
        std::string num = src.substr(start, pos - start);
        __JsonValue v; v.kind = __JsonValue::NUM_VAL;
        v.n = isFloat ? std::stod(num) : (double) std::stoll(num);
        return v;
    }
    void expect(const std::string& tok) {
        if (pos + tok.size() > src.size() || src.compare(pos, tok.size(), tok) != 0) {
            throw std::runtime_error("expected " + tok);
        }
        pos += tok.size();
    }
    void skipWs() { while (pos < src.size() && isspace((unsigned char) src[pos])) pos++; }
};

std::string __toJsonString(const __JsonValue& v) {
    switch (v.kind) {
        case __JsonValue::NULL_VAL: return "null";
        case __JsonValue::BOOL_VAL: return v.b ? "true" : "false";
        case __JsonValue::NUM_VAL: {
            std::ostringstream ss;
            long long iv = (long long) v.n;
            if ((double) iv == v.n) ss << iv; else ss << v.n;
            return ss.str();
        }
        case __JsonValue::STR_VAL: return "\\"" + v.s + "\\"";
        case __JsonValue::ARR_VAL: {
            std::string out = "[";
            for (size_t i = 0; i < v.arr.size(); i++) {
                if (i > 0) out += ",";
                out += __toJsonString(v.arr[i]);
            }
            out += "]";
            return out;
        }
        case __JsonValue::OBJ_VAL: {
            std::string out = "{";
            for (size_t i = 0; i < v.obj.size(); i++) {
                if (i > 0) out += ",";
                out += "\\"" + v.obj[i].first + "\\":" + __toJsonString(v.obj[i].second);
            }
            out += "}";
            return out;
        }
    }
    return "null";
}

__JsonValue __intToJson(long long v) { __JsonValue j; j.kind = __JsonValue::NUM_VAL; j.n = (double) v; return j; }
__JsonValue __boolToJson(bool v) { __JsonValue j; j.kind = __JsonValue::BOOL_VAL; j.b = v; return j; }
__JsonValue __strToJson(const std::string& v) { __JsonValue j; j.kind = __JsonValue::STR_VAL; j.s = v; return j; }
__JsonValue __intVecToJson(const std::vector<int>& v) {
    __JsonValue j; j.kind = __JsonValue::ARR_VAL;
    for (int x : v) j.arr.push_back(__intToJson(x));
    return j;
}
__JsonValue __intMatrixToJson(const std::vector<std::vector<int>>& v) {
    __JsonValue j; j.kind = __JsonValue::ARR_VAL;
    for (const auto& row : v) j.arr.push_back(__intVecToJson(row));
    return j;
}
__JsonValue __strVecToJson(const std::vector<std::string>& v) {
    __JsonValue j; j.kind = __JsonValue::ARR_VAL;
    for (const auto& x : v) j.arr.push_back(__strToJson(x));
    return j;
}`;

function cppType(t: string): string {
  if (t === "number[]") return "std::vector<int>";
  if (t === "number[][]") return "std::vector<std::vector<int>>";
  if (t === "string[]") return "std::vector<std::string>";
  if (t === "boolean") return "bool";
  if (t === "number") return "int";
  if (t === "string") return "std::string";
  return "auto";
}

function cppArgsToCallExpr(sig: ProblemSignature): string {
  return sig.paramTypes
    .map((p, i) => {
      const accessor = `__args[${i}]`;
      if (p.type === "number") return `${accessor}.asInt()`;
      if (p.type === "string") return `${accessor}.asStr()`;
      if (p.type === "boolean") return `${accessor}.asBool()`;
      if (p.type === "number[]") return `__toIntVector(${accessor})`;
      if (p.type === "number[][]") return `__toIntMatrix(${accessor})`;
      if (p.type === "string[]") return `__toStringVector(${accessor})`;
      return `__toJsonString(${accessor})`;
    })
    .join(", ");
}

function cppResultToJson(returnType: string): string {
  switch (returnType) {
    case "number": return "__intToJson(__result)";
    case "boolean": return "__boolToJson(__result)";
    case "string": return "__strToJson(__result)";
    case "number[]": return "__intVecToJson(__result)";
    case "number[][]": return "__intMatrixToJson(__result)";
    case "string[]": return "__strVecToJson(__result)";
    default: return '__strToJson("unknown")';
  }
}

function buildCppPerTest(input: JavaOrCppInput): string {
  const sig = input.signature;
  const callArgs = cppArgsToCallExpr(sig);
  const call = sig.className
    ? `__inst.${sig.methodName}(${callArgs})`
    : `${sig.methodName}(${callArgs})`;
  const resultJson = cppResultToJson(sig.returnType);
  return `#include <bits/stdc++.h>
using namespace std;
${CPP_HARNESS_PARSER}
std::vector<int> __toIntVector(const __JsonValue& v) {
    std::vector<int> out;
    for (const auto& x : v.arr) out.push_back(x.asInt());
    return out;
}
std::vector<std::vector<int>> __toIntMatrix(const __JsonValue& v) {
    std::vector<std::vector<int>> out;
    for (const auto& row : v.arr) out.push_back(__toIntVector(row));
    return out;
}
std::vector<std::string> __toStringVector(const __JsonValue& v) {
    std::vector<std::string> out;
    for (const auto& x : v.arr) out.push_back(x.asStr());
    return out;
}
${input.userCode}
int main() {
    try {
        std::string __stdin, __line;
        while (std::getline(std::cin, __line)) __stdin += __line + "\\n";
        __JsonParser __parser(__stdin);
        __JsonValue __parsed = __parser.parse();
        std::vector<__JsonValue> __args;
        if (__parsed.isArr()) __args = __parsed.arr;
        else __args.push_back(__parsed);
        auto __t0 = std::chrono::high_resolution_clock::now();
        auto __result = ${call};
        auto __t1 = std::chrono::high_resolution_clock::now();
        double __execMs = std::chrono::duration<double, std::milli>(__t1 - __t0).count();
        std::cout << ${RESULT_PREFIX_LIT} << __toJsonString(${resultJson}) << std::endl;
        std::cerr << ${EXEC_MS_PREFIX_LIT} << std::fixed << std::setprecision(3) << __execMs << std::endl;
    } catch (const std::exception& __e) {
        std::cerr << ${ERROR_PREFIX_LIT} << __e.what() << std::endl;
    }
    return 0;
}`;
}

function buildCppSingleExec(input: JavaOrCppInput): string {
  const sig = input.signature;
  const callArgs = cppArgsToCallExpr(sig);
  const call = sig.className
    ? `__inst.${sig.methodName}(${callArgs})`
    : `${sig.methodName}(${callArgs})`;
  const resultJson = cppResultToJson(sig.returnType);
  return `#include <bits/stdc++.h>
using namespace std;
${CPP_HARNESS_PARSER}
std::vector<int> __toIntVector(const __JsonValue& v) {
    std::vector<int> out;
    for (const auto& x : v.arr) out.push_back(x.asInt());
    return out;
}
std::vector<std::vector<int>> __toIntMatrix(const __JsonValue& v) {
    std::vector<std::vector<int>> out;
    for (const auto& row : v.arr) out.push_back(__toIntVector(row));
    return out;
}
std::vector<std::string> __toStringVector(const __JsonValue& v) {
    std::vector<std::string> out;
    for (const auto& x : v.arr) out.push_back(x.asStr());
    return out;
}
${input.userCode}
int main() {
    try {
        std::string __stdin, __line;
        while (std::getline(std::cin, __line)) __stdin += __line + "\\n";
        __JsonParser __parser(__stdin);
        __JsonValue __parsed = __parser.parse();
        std::vector<__JsonValue> __cases = __parsed.arr;
        std::string __rowsJson = "[";
        auto __t0 = std::chrono::high_resolution_clock::now();
        for (size_t __i = 0; __i < __cases.size(); __i++) {
            std::vector<__JsonValue> __args = __cases[__i].arr;
            auto __tCase0 = std::chrono::high_resolution_clock::now();
            __JsonValue __resultJson;
            bool __hasErr = false;
            std::string __err;
            try {
                auto __result = ${call};
                __resultJson = ${resultJson};
            } catch (const std::exception& __e) {
                __hasErr = true;
                __err = __e.what();
            }
            auto __tCase1 = std::chrono::high_resolution_clock::now();
            double __execMs = std::chrono::duration<double, std::milli>(__tCase1 - __tCase0).count();
            if (__i > 0) __rowsJson += ",";
            __rowsJson += "{\\"index\\":" + std::to_string(__i) +
                          ",\\"result\\":" + (__hasErr ? "null" : __toJsonString(__resultJson)) +
                          ",\\"execMs\\":" + std::to_string(__execMs) +
                          ",\\"error\\":" + (__hasErr ? "\\"" + __err + "\\"" : "null") + "}";
            if (__hasErr) break;
        }
        auto __t1 = std::chrono::high_resolution_clock::now();
        double __totalMs = std::chrono::duration<double, std::milli>(__t1 - __t0).count();
        __rowsJson += "]";
        std::cout << ${RESULTS_PREFIX_LIT} << __rowsJson << std::endl;
        std::cerr << ${EXEC_MS_PREFIX_LIT} << std::fixed << std::setprecision(3) << __totalMs << std::endl;
    } catch (const std::exception& __e) {
        std::cerr << ${ERROR_PREFIX_LIT} << __e.what() << std::endl;
    }
    return 0;
}`;
}

export function detectUndefinedMethod(
  userCode: string,
  methodName: string,
  language: Language,
): string | null {
  if (language === "javascript" || language === "typescript") {
    const re = new RegExp(
      `\\b(function\\s+${methodName}\\b|const\\s+${methodName}\\s*=|let\\s+${methodName}\\s*=|var\\s+${methodName}\\s*=|class\\s+${methodName}\\b)`,
    );
    return re.test(userCode)
      ? null
      : `No top-level definition of '${methodName}' found. Define \`function ${methodName}(...)\` or \`const ${methodName} = ...\`.`;
  }
  if (language === "python") {
    const re = new RegExp(`\\bdef\\s+${methodName}\\s*\\(`);
    return re.test(userCode)
      ? null
      : `No \`def ${methodName}(...)\` found. Define \`def ${methodName}(...):\`.`;
  }
  if (language === "java") return null;
  if (language === "cpp") {
    const re = new RegExp(`\\b${methodName}\\s*\\(`);
    return re.test(userCode) ? null : `No function named '${methodName}' found.`;
  }
  return null;
}

export function buildExpectedCallSummary(
  sig: ProblemSignature,
  mode: HarnessMode,
  language: Language,
): string {
  const call = sig.className
    ? language === "python"
      ? `${sig.className}().${sig.methodName}(...)`
      : `new ${sig.className}().${sig.methodName}(...)`
    : language === "java"
      ? `Main.${sig.methodName}(...)`
      : `${sig.methodName}(...)`;

  if (language === "python") {
    return mode === "per-test"
      ? `__result = ${call.replace("(...)", "(*__args)")}`
      : `__result = ${call.replace("(...)", "(__parse_stdin(sys.stdin.read()))")}`;
  }
  if (language === "javascript" || language === "typescript") {
    return mode === "per-test"
      ? `const __result = ${call.replace("(...)", "(...__args)")}`
      : `__result = ${call.replace("(...)", "(...__args)")}`;
  }
  if (language === "java") {
    return `Object __result = ${call.replace("(...)", "(__toXxxArgs(...))")}`;
  }
  return `auto __result = ${call.replace("(...)", "(__toXxxArgs(...))")}`;
}

const HARNESS_HEADER_JS = `// auto-generated harness (lib/judge/harness.ts) v${HARNESS_VERSION}`;

const ERROR_PREFIX_LIT = JSON.stringify(ERROR_PREFIX);
const RESULT_PREFIX_LIT = JSON.stringify(RESULT_PREFIX);
const EXEC_MS_PREFIX_LIT = JSON.stringify(EXEC_MS_PREFIX);
const RESULTS_PREFIX_LIT = JSON.stringify(RESULTS_PREFIX);
