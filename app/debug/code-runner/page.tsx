"use client";

import React, { useState, useRef, useEffect } from "react";

const LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
] as const;

type ApiCallLog = {
  id: number;
  type: "info" | "success" | "error" | "warn";
  timestamp: string;
  message: string;
  url?: string;
  endpoint?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  requestBody?: unknown;
  responsePreview?: string;
  err?: string;
};

type LogEntry = {
  id: number;
  timestamp: string;
  type: "call" | "response" | "info" | "error" | "success" | "warn";
  message: string;
  detail?: string;
};

export default function CodeRunnerDebugPage() {
  const [code, setCode] = useState(`print("hello, world!")`);
  const [language, setLanguage] = useState<string>("python");
  const [stdin, setStdin] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<any>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (type: LogEntry["type"], message: string, detail?: string) => {
    setLogs((prev) => [
      ...prev,
      { id: logIdRef.current++, timestamp: new Date().toLocaleTimeString(), type, message, detail },
    ]);
  };

  // Default code templates
  const defaultCode: Record<string, string> = {
    python: `print("hello, world!")`,
    java: `public class Main {
  public static void main(String[] args) {
    System.out.println("hello, world!");
  }
}`,
    cpp: `#include <iostream>
using namespace std;
int main() {
  cout << "hello, world!" << endl;
  return 0;
}`,
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (code === defaultCode[language] || code.trim() === `print("hello, world!")` || code.includes("hello, world!")) {
      setCode(defaultCode[lang] ?? "");
    }
  };

  const handleRun = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    setLogs([]);
    logIdRef.current = 0;

    addLog("info", `Starting code-runner debug trace...`);
    addLog("info", `Language: ${language}, Code: ${code.length} chars`);

    try {
      const res = await fetch("/api/debug/code-runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, stdin, compileTimeoutMs: 25000, runTimeoutMs: 15000 }),
      });
      const data = await res.json();

      // Show API call logs from the server
      if (data.logs && Array.isArray(data.logs)) {
        for (const entry of data.logs as ApiCallLog[]) {
          const serverType = entry.type === "success" ? "success" : entry.type === "error" ? "error" : entry.type === "warn" ? "warn" : "call";
          let detail = "";
          if (entry.durationMs !== undefined) detail += `⏱ ${entry.durationMs}ms`;
          if (entry.statusCode !== undefined) detail += ` [${entry.statusCode}]`;
          if (entry.url) detail += `\nURL: ${entry.url}`;
          if (entry.responsePreview) detail += `\nResponse: ${entry.responsePreview}`;
          if (entry.err) detail += `\nError: ${entry.err}`;

          addLog(serverType, entry.message, detail || undefined);
        }
      }

      addLog("info", `Total time: ${data.totalMs}ms`);

      if (data.ok && data.result) {
        setResult(data.result);
        addLog("success", `Execution succeeded on: ${data.result.servedBy}`);
        const signalMsg = data.result.signal ? `, signal: ${data.result.signal}` : "";
        addLog("info", `Exit code: ${data.result.exitCode}${signalMsg}`);
      } else {
        addLog("error", data.error || "Execution failed");
      }
    } catch (e) {
      addLog("error", `Request failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLogs([]);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#c5c8cc] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="border-b border-[#1a1a2e] pb-4">
          <h1 className="text-2xl font-mono font-bold text-[#e4e4e7]">
            Code Runner Debug
          </h1>
          <p className="text-sm text-[#71717a] mt-1">
            Write code and see exactly which APIs are called (Piston runtimes probe, execute POST, etc.)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── LEFT: Code Editor ── */}
          <div className="space-y-3">
            <div className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4 space-y-3">
              {/* Language selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#71717a]">Language:</span>
                <div className="flex gap-1">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleLanguageChange(l.id)}
                      className={`px-3 py-1 text-xs font-mono rounded border transition-colors ${
                        language === l.id
                          ? "bg-[#10b981]/10 border-[#10b981] text-[#10b981]"
                          : "border-[#27272a] text-[#71717a] hover:border-[#3f3f46]"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code editor */}
              <div>
                <label className="text-xs font-mono text-[#71717a] mb-1 block">Code</label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#27272a] rounded-md px-3 py-2 text-sm font-mono text-[#c5c8cc] focus:border-[#10b981] outline-none resize-none"
                  rows={12}
                  placeholder="Write your code here..."
                  spellCheck={false}
                />
              </div>

              {/* Stdin */}
              <div>
                <label className="text-xs font-mono text-[#71717a] mb-1 block">Stdin (optional)</label>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#27272a] rounded-md px-3 py-2 text-xs font-mono text-[#c5c8cc] focus:border-[#3b82f6] outline-none resize-none"
                  rows={2}
                  placeholder="Input to pass to the program..."
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="px-5 py-2 bg-[#10b981] text-[#0a0a0f] font-mono text-sm font-bold rounded-md hover:bg-[#34d399] transition-colors disabled:opacity-50"
                >
                  {loading ? "Running..." : "Run Code"}
                </button>
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 border border-[#27272a] text-[#71717a] font-mono text-xs rounded-md hover:border-[#3f3f46] hover:text-[#c5c8cc] transition-colors"
                >
                  Clear Logs
                </button>
              </div>
            </div>

            {/* Result output */}
            {result && (
              <div className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#71717a]">OUTPUT</span>
                  <span className="text-[10px] font-mono text-[#3f3f46]">
                    served by: {result.servedBy}
                  </span>
                </div>
                <pre className="text-sm font-mono text-[#c5c8cc] whitespace-pre-wrap bg-[#0a0a0f] rounded-md p-3 max-h-48 overflow-y-auto">
                  {result.stdout || "(no stdout)"}
                </pre>
                {result.stderr && (
                  <>
                    <span className="text-xs font-mono text-[#ef4444]">STDERR</span>
                    <pre className="text-sm font-mono text-[#ef4444] whitespace-pre-wrap bg-[#0a0a0f] rounded-md p-3 max-h-32 overflow-y-auto">
                      {result.stderr}
                    </pre>
                  </>
                )}
                {result.compileOutput && (
                  <>
                    <span className="text-xs font-mono text-[#f59e0b]">COMPILE OUTPUT</span>
                    <pre className="text-xs font-mono text-[#f59e0b] whitespace-pre-wrap bg-[#0a0a0f] rounded-md p-3 max-h-32 overflow-y-auto">
                      {JSON.stringify(result.compileOutput, null, 2)}
                    </pre>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: API Call Log ── */}
          <div className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-[#71717a]">
                API CALL TRACE
              </span>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] font-mono text-[#52525b] hover:text-[#71717a]"
              >
                CLEAR
              </button>
            </div>
            <div
              ref={logRef}
              className="h-[600px] overflow-y-auto space-y-1 font-mono text-xs bg-[#050508] rounded-md p-2"
            >
              {logs.length === 0 && (
                <span className="text-[#27272a]">
                  No API calls yet. Write code and hit Run to see the trace.
                </span>
              )}
              {logs.map((entry) => (
                <div key={entry.id} className="group">
                  <div className="flex gap-2 items-start">
                    <span className="text-[#3f3f46] shrink-0 whitespace-nowrap">
                      [{entry.timestamp}]
                    </span>
                    <span
                      className={`shrink-0 font-bold ${
                        entry.type === "error"
                          ? "text-[#ef4444]"
                          : entry.type === "success"
                            ? "text-[#10b981]"
                            : entry.type === "warn"
                              ? "text-[#f59e0b]"
                              : entry.type === "call"
                                ? "text-[#3b82f6]"
                                : entry.type === "response"
                                  ? "text-[#a78bfa]"
                                  : "text-[#71717a]"
                      }`}
                    >
                      {entry.type === "error"
                        ? "ERR "
                        : entry.type === "success"
                          ? "OK  "
                          : entry.type === "warn"
                            ? "WARN"
                            : entry.type === "call"
                              ? ">>> "
                              : entry.type === "response"
                                ? "<<< "
                                : "    "}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[#a1a1aa] break-words">
                        {entry.message}
                      </span>
                      {entry.detail && (
                        <pre className="text-[#52525b] text-[10px] mt-0.5 whitespace-pre-wrap hidden group-hover:block">
                          {entry.detail}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
