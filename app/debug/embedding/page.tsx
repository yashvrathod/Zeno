"use client";

import React, { useState, useRef, useEffect } from "react";

type Stage = "EXPLORE" | "STRATEGIZE" | "IMPLEMENT" | "DEBUG" | "STUCK" | "REFLECT";
type Tab = "embed" | "store" | "search" | "stored";
type LogEntry = {
  id: number;
  type: "info" | "success" | "error" | "warn";
  message: string;
  timestamp: string;
};
type StoredEntry = {
  id: string;
  questionMd5: string;
  stage: string;
  usedCount: number;
  responsePreview: string;
  createdAt: string;
};

const STAGES: Stage[] = ["EXPLORE", "STRATEGIZE", "IMPLEMENT", "DEBUG", "STUCK", "REFLECT"];

let logId = 0;

export default function EmbeddingDebugPage() {
  const [activeTab, setActiveTab] = useState<Tab>("store");
  const [stage, setStage] = useState<Stage>("EXPLORE");
  const [searchStage, setSearchStage] = useState<string>("");
  const [threshold, setThreshold] = useState(0.6);

  // Inputs
  const [embedText, setEmbedText] = useState("");
  const [storeQuestion, setStoreQuestion] = useState("");
  const [storeAnswer, setStoreAnswer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // State
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [storedEntries, setStoredEntries] = useState<StoredEntry[]>([]);
  const [entryCount, setEntryCount] = useState(0);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [embedResult, setEmbedResult] = useState<any>(null);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const log = (type: LogEntry["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: logId++,
        type,
        message: typeof message === "string" ? message : JSON.stringify(message, null, 2),
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const fetchStored = async () => {
    try {
      const res = await fetch("/api/debug/embedding");
      const data = await res.json();
      setStoredEntries(data.entries || []);
      setEntryCount(data.count || 0);
      log("info", `Loaded ${data.count} stored embeddings (${data.totalMs}ms)`);
    } catch (e) {
      log("error", `Failed to load stored: ${e}`);
    }
  };

  // ── Embed ──
  const handleEmbed = async () => {
    if (!embedText.trim()) { log("warn", "Enter text to embed"); return; }
    setLoading(true);
    log("info", `Generating embedding for: "${embedText.slice(0, 60)}..."`);

    try {
      const res = await fetch("/api/debug/embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "embed", text: embedText, stage }),
      });
      const data = await res.json();
      if (data.ok) {
        setEmbedResult(data);
        log("success", `Embedding: ${data.dimensions}D, ${data.nonzero} nonzero dims, ${data.totalMs}ms`);
        log("info", `Vector: [${data.vectorPreview?.join(", ")}]`);
        log("info", `Top dimensions: ${data.topDimensions}`);
      } else {
        log("error", `Error: ${data.error}`);
      }
    } catch (e) {
      log("error", `Failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Store ──
  const handleStore = async () => {
    if (!storeQuestion.trim() || !storeAnswer.trim()) { log("warn", "Fill both question & answer"); return; }
    setLoading(true);
    log("info", `Storing Q: "${storeQuestion.slice(0, 60)}..." [${stage}]`);

    try {
      const res = await fetch("/api/debug/embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "store", question: storeQuestion, answer: storeAnswer, stage }),
      });
      const data = await res.json();
      if (data.ok) {
        log("success", `Stored! ${data.dimensions}D, ${data.nonzero} nonzero, ${data.totalMs}ms`);
        setStoreQuestion("");
        setStoreAnswer("");
        fetchStored();
      } else {
        log("error", `Error: ${data.error}`);
      }
    } catch (e) {
      log("error", `Failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Search ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) { log("warn", "Enter search query"); return; }
    if (entryCount === 0) { log("warn", "Store some embeddings first"); return; }
    setLoading(true);
    log("info", `Searching: "${searchQuery.slice(0, 60)}..." (threshold: ${threshold}, stage: ${searchStage || "all"})`);

    try {
      const res = await fetch("/api/debug/embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery, threshold, stage: searchStage }),
      });
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data);
        const hitIcon = data.bestMatch?.hit ? "HIT" : "MISS";
        log(
          data.bestMatch?.hit ? "success" : "warn",
          `${hitIcon} — best: ${data.bestMatch?.similarity ?? "N/A"}, ${data.resultsShown} results, ${data.totalMs}ms`
        );
        data.topResults?.forEach((r: any, i: number) => {
          log("info", `  #${i + 1}: ${r.similarity} [${r.stage}] [used: ${r.usedCount}x] — ${r.responsePreview}`);
        });
      } else {
        log("error", `Error: ${data.error}`);
      }
    } catch (e) {
      log("error", `Failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Clear ──
  const handleClear = async () => {
    if (!confirm(`Delete all ${entryCount} stored embeddings?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/debug/embedding", { method: "DELETE" });
      const data = await res.json();
      log("success", `Cleared ${data.deleted} embeddings (${data.totalMs}ms)`);
      setStoredEntries([]);
      setEntryCount(0);
      setSearchResults(null);
    } catch (e) {
      log("error", `Failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#c5c8cc] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="border-b border-[#1a1a2e] pb-4">
          <h1 className="text-2xl font-mono font-bold text-[#e4e4e7]">
            Embedding Debug
          </h1>
          <p className="text-sm text-[#71717a] mt-1">
            Test, store, and search with your production all-MiniLM-L6-v2 embedding pipeline
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1a1a2e]">
          {([
            ["store", "Store"],
            ["embed", "Embed"],
            ["search", "Search"],
            ["stored", `Stored (${entryCount})`],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-mono transition-colors border-b-2 ${
                activeTab === key
                  ? "text-[#10b981] border-[#10b981]"
                  : "text-[#71717a] border-transparent hover:text-[#c5c8cc]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* STAGE SELECTOR */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-[#71717a] font-mono">Stage:</span>
          {STAGES.map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                stage === s
                  ? "bg-[#10b981]/10 border-[#10b981] text-[#10b981]"
                  : "border-[#27272a] text-[#71717a] hover:border-[#3f3f46]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* ── STORE PANEL ── */}
        {activeTab === "store" && (
          <div className="space-y-3">
            <div className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4 space-y-3">
              <label className="text-xs font-mono text-[#71717a]">Question</label>
              <textarea
                value={storeQuestion}
                onChange={(e) => setStoreQuestion(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#27272a] rounded-md px-3 py-2 text-sm font-mono text-[#c5c8cc] focus:border-[#10b981] outline-none resize-none"
                rows={2}
                placeholder="e.g. How do two pointers work?"
              />
              <label className="text-xs font-mono text-[#71717a]">Answer</label>
              <textarea
                value={storeAnswer}
                onChange={(e) => setStoreAnswer(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#27272a] rounded-md px-3 py-2 text-sm font-mono text-[#c5c8cc] focus:border-[#10b981] outline-none resize-none"
                rows={4}
                placeholder="e.g. Two pointers uses two indices moving toward each other..."
              />
              <button
                onClick={handleStore}
                disabled={loading}
                className="px-4 py-2 bg-[#10b981] text-[#0a0a0f] font-mono text-sm font-bold rounded-md hover:bg-[#34d399] transition-colors disabled:opacity-50"
              >
                {loading ? "Storing..." : "Store Embedding"}
              </button>
            </div>
          </div>
        )}

        {/* ── EMBED PANEL ── */}
        {activeTab === "embed" && (
          <div className="space-y-3">
            <div className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4 space-y-3">
              <label className="text-xs font-mono text-[#71717a]">Text to embed</label>
              <textarea
                value={embedText}
                onChange={(e) => setEmbedText(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#27272a] rounded-md px-3 py-2 text-sm font-mono text-[#c5c8cc] focus:border-[#3b82f6] outline-none resize-none"
                rows={2}
                placeholder="e.g. Can you explain the two pointer technique?"
              />
              <div className="flex items-start gap-3">
                <button
                  onClick={handleEmbed}
                  disabled={loading}
                  className="px-4 py-2 bg-[#3b82f6] text-[#0a0a0f] font-mono text-sm font-bold rounded-md hover:bg-[#60a5fa] transition-colors disabled:opacity-50"
                >
                  {loading ? "Embedding..." : "Generate Embedding"}
                </button>
              </div>

              {embedResult && (
                <div className="mt-3 bg-[#0a0a0f] border border-[#27272a] rounded-md p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#71717a]">Dimensions:</span>
                    <span className="text-sm font-mono text-[#e4e4e7]">{embedResult.dimensions}</span>
                    <span className="text-xs font-mono text-[#71717a]">Non-zero:</span>
                    <span className="text-sm font-mono text-[#e4e4e7]">{embedResult.nonzero}</span>
                    <span className="text-xs font-mono text-[#71717a]">Time:</span>
                    <span className="text-sm font-mono text-[#e4e4e7]">{embedResult.totalMs}ms</span>
                    <span className="text-xs font-mono text-[#71717a]">(embed: {embedResult.embedMs}ms)</span>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-[#71717a]">Vector preview:</span>
                    <pre className="text-xs font-mono text-[#a1a1aa] mt-1 overflow-x-auto">
                      [{embedResult.vectorPreview?.join(", ")}]
                    </pre>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-[#71717a]">Top 5 dimensions:</span>
                    <pre className="text-xs font-mono text-[#a1a1aa] mt-1">{embedResult.topDimensions}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SEARCH PANEL ── */}
        {activeTab === "search" && (
          <div className="space-y-3">
            <div className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4 space-y-3">
              <label className="text-xs font-mono text-[#71717a]">Search query</label>
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#27272a] rounded-md px-3 py-2 text-sm font-mono text-[#c5c8cc] focus:border-[#f59e0b] outline-none resize-none"
                rows={2}
                placeholder="e.g. Can you explain how the two pointer technique works?"
              />
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#71717a]">Stage:</span>
                  <select
                    value={searchStage}
                    onChange={(e) => setSearchStage(e.target.value)}
                    className="bg-[#0a0a0f] border border-[#27272a] rounded px-2 py-1 text-xs font-mono text-[#c5c8cc]"
                  >
                    <option value="">All</option>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#71717a]">Threshold:</span>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-16 bg-[#0a0a0f] border border-[#27272a] rounded px-2 py-1 text-xs font-mono text-[#c5c8cc]"
                  />
                </div>
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-2 bg-[#f59e0b] text-[#0a0a0f] font-mono text-sm font-bold rounded-md hover:bg-[#fbbf24] transition-colors disabled:opacity-50"
              >
                {loading ? "Searching..." : "Search"}
              </button>

              {searchResults && (
                <div className="mt-3 space-y-2">
                  {/* Summary bar */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono text-[#71717a]">Best:</span>
                    <span
                      className={`text-sm font-mono font-bold ${
                        searchResults.bestMatch?.hit ? "text-[#10b981]" : "text-[#ef4444]"
                      }`}
                    >
                      {searchResults.bestMatch?.similarity ?? "N/A"}
                    </span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded ${
                        searchResults.bestMatch?.hit
                          ? "bg-[#10b981]/10 text-[#10b981]"
                          : "bg-[#ef4444]/10 text-[#ef4444]"
                      }`}
                    >
                      {searchResults.bestMatch?.hit ? "CACHE HIT" : "CACHE MISS"}
                    </span>
                    <span className="text-xs font-mono text-[#71717a]">
                      {searchResults.resultsShown} results · {searchResults.totalMs}ms (query: {searchResults.queryEmbedMs}ms, search: {searchResults.searchMs}ms)
                    </span>
                  </div>

                  {/* Similarity bars */}
                  <div className="space-y-1.5">
                    {searchResults.topResults?.map((r: any, i: number) => {
                      const pct = Math.round(r.similarity * 100);
                      const color = pct > 75 ? "#10b981" : pct > 50 ? "#f59e0b" : "#ef4444";
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono">
                          <span className="w-12 text-[#71717a] text-right">{r.similarity}</span>
                          <div className="flex-1 bg-[#1a1a2e] rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[#52525b] min-w-10">{r.stage}</span>
                          <span className="text-[#52525b] text-[10px]">{r.usedCount}x</span>
                          <span className="text-[#a1a1aa] truncate max-w-[250px]">{r.responsePreview}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Best match content */}
                  {searchResults.bestMatch?.hit && (
                    <div className="mt-2 bg-[#10b981]/5 border border-[#10b981]/20 rounded-md p-3">
                      <div className="text-xs font-mono text-[#10b981] mb-2">
                        Matched: [{searchResults.bestMatch.stage}] — similarity {searchResults.bestMatch.similarity}
                      </div>
                      <div className="text-sm font-mono text-[#c5c8cc] whitespace-pre-wrap leading-relaxed">
                        {searchResults.bestMatch.response}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STORED PANEL ── */}
        {activeTab === "stored" && (
          <div className="space-y-3">
            {storedEntries.length === 0 ? (
              <div className="text-center py-8 text-[#52525b] font-mono text-sm">
                No embeddings stored yet. Go to the Store tab to add some.
              </div>
            ) : (
              <div className="space-y-2">
                {storedEntries.map((e) => (
                  <div key={e.id} className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#71717a] truncate max-w-[400px]">
                        {e.questionMd5}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#52525b] shrink-0">
                        <span className={`px-1.5 py-0.5 rounded ${
                          e.stage === "EXPLORE" ? "bg-blue-500/10 text-blue-400" :
                          e.stage === "STRATEGIZE" ? "bg-purple-500/10 text-purple-400" :
                          e.stage === "IMPLEMENT" ? "bg-yellow-500/10 text-yellow-400" :
                          e.stage === "DEBUG" ? "bg-orange-500/10 text-orange-400" :
                          e.stage === "STUCK" ? "bg-red-500/10 text-red-400" :
                          "bg-green-500/10 text-green-400"
                        }`}>
                          {e.stage}
                        </span>
                        <span>used: {e.usedCount}x</span>
                        <span>{new Date(e.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="text-sm font-mono text-[#a1a1aa] mt-1">{e.responsePreview}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={fetchStored}
                className="px-3 py-1.5 border border-[#27272a] text-[#71717a] font-mono text-xs rounded-md hover:border-[#3f3f46] hover:text-[#c5c8cc] transition-colors"
              >
                Refresh
              </button>
              {storedEntries.length > 0 && (
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="px-3 py-1.5 border border-[#ef4444]/30 text-[#ef4444] font-mono text-xs rounded-md hover:bg-[#ef4444]/10 transition-colors disabled:opacity-50"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── LOG CONSOLE ── */}
        <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-[#71717a]">LOG CONSOLE</span>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] font-mono text-[#52525b] hover:text-[#71717a]"
            >
              CLEAR
            </button>
          </div>
          <div
            ref={logRef}
            className="h-64 overflow-y-auto space-y-0.5 font-mono text-xs bg-[#050508] rounded-md p-2"
          >
            {logs.length === 0 && (
              <span className="text-[#27272a]">No logs yet. Start by storing an embedding...</span>
            )}
            {logs.map((l) => (
              <div key={l.id} className="flex gap-2">
                <span className="text-[#3f3f46] shrink-0">[{l.timestamp}]</span>
                <span
                  className={
                    l.type === "error" ? "text-[#ef4444]" :
                    l.type === "success" ? "text-[#10b981]" :
                    l.type === "warn" ? "text-[#f59e0b]" :
                    "text-[#71717a]"
                  }
                >
                  {l.type === "error" ? "ERR " : l.type === "success" ? "OK  " : l.type === "warn" ? "WARN" : "INFO"}
                </span>
                <span className={l.message.startsWith("  ") ? "text-[#52525b]" : "text-[#a1a1aa]"}>
                  {l.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
