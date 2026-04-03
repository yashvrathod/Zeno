"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

type LogEntry = {
  id: number;
  userId: string;
  problemId: string;
  timestamp: string;
  userMessage: string;
  decisionType: "STATIC" | "CACHE_HIT" | "AI_NEEDED";
  aiCalled: boolean;
  aiRequestPayload?: { system: string; messages: Array<{ role: string; content: string }> };
  aiResponse?: string;
  cacheHitData?: { similarity: string; cacheEntryId: string; responseUsed: string };
  responseData: string;
  stage: string;
  rung: number;
  embedMs?: number;
  aiMs?: number;
  totalMs?: number;
  error?: string;
};

type SessionData = {
  id: string;
  problemId: string;
  stage: string;
  currentRung: number;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: string;
    stage: string;
    content: string;
    createdAt: string;
  }>;
};

type CacheEntry = {
  id: string;
  problemId: string;
  questionMd5: string;
  response: string;
  stage: string;
  rung: number;
  usedCount: number;
  updatedAt: string;
};

export default function MentorLogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [cache, setCache] = useState<{ count: number; entries: CacheEntry[] }>({ count: 0, entries: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "history" | "db">("live");
  const [expandedEntry, setExpandedEntry] = useState<number | null>(null);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [pollEnabled, setPollEnabled] = useState(true);
  const [lastFetch, setLastFetch] = useState<string>("--");
  const logRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/debug/mentor-log");
      const data = await res.json();
      if (data.ok) {
        setSessions(data.sessions || []);
        setCache({ count: data.cache.count ?? 0, entries: data.cache.entries || [] });
        setLastFetch(new Date().toLocaleTimeString());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for DB changes every 3s
  useEffect(() => {
    if (!pollEnabled) return;
    fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, [pollEnabled, fetchData]);

  // Clear logs
  const handleClear = async () => {
    await fetch("/api/debug/mentor-log", { method: "DELETE" });
    setEntries([]);
  };

  // Add to live log (called when a mentor conversation happens)
  // This is auto-populated via a fetch in the mentor route or via custom hook
  // For now, user just reads what's in the DB

  const stageColors: Record<string, string> = {
    EXPLORE: "bg-blue-500/10 text-blue-400",
    STRATEGIZE: "bg-purple-500/10 text-purple-400",
    IMPLEMENT: "bg-yellow-500/10 text-yellow-400",
    DEBUG: "bg-orange-500/10 text-orange-400",
    STUCK: "bg-red-500/10 text-red-400",
    REFLECT: "bg-green-500/10 text-green-400",
  };

  const decisionIcon = (type: string) => {
    switch (type) {
      case "STATIC": return "⏱";
      case "CACHE_HIT": return "⚡";
      case "AI_NEEDED": return "🤖";
      default: return "?";
    }
  };

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + "..." : s;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#c5c8cc] p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="border-b border-[#1a1a2e] pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-mono font-bold text-[#e4e4e7]">
              Conversation Log
            </h1>
            <p className="text-sm text-[#71717a] mt-1">
              See what the user says, whether AI is called, and what comes back
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-mono text-[#71717a] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pollEnabled}
                onChange={(e) => setPollEnabled(e.target.checked)}
                className="accent-[#10b981]"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-mono border border-[#27272a] rounded-md hover:border-[#3f3f46] hover:text-[#c5c8cc] transition-colors disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-mono border border-[#ef4444]/30 text-[#ef4444] rounded-md hover:bg-[#ef4444]/10 transition-colors"
            >
              Clear Live
            </button>
            <span className="text-[10px] font-mono text-[#3f3f46]">
              Last: {lastFetch}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1a1a2e]">
          {([
            ["live", "Live Log"],
            ["history", "Session History"],
            ["db", "Cache DB"],
          ] as [string, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
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

        {/* ──────────── LIVE LOG TAB ──────────── */}
        {activeTab === "live" && (
          <div className="space-y-3">
            <div className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4">
              <p className="text-sm font-mono text-[#71717a] mb-3">
                Talk to the mentor — each interaction will appear below showing whether AI was called or cache was used.
                {" (The mentor route auto-logs each request here.)"}
              </p>
              <div className="text-xs font-mono text-[#52525b]">
                No entries yet. Start a conversation on any problem page.
                <br />
                The live feed will show: user question → decision type → AI payload/response → time.
              </div>
            </div>
          </div>
        )}

        {/* ───────── SESSION HISTORY TAB ───────── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-[#52525b] font-mono text-sm">
                No mentor sessions found
              </div>
            ) : (
              sessions.map((s) => (
                <div key={s.id} className="bg-[#111118] border border-[#1a1a2e] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#e4e4e7]">
                        Problem: {s.problemId.slice(0, 16)}...
                      </span>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded ${stageColors[s.stage] || ""}`}>
                        {s.stage}
                      </span>
                      <span className="text-[10px] font-mono text-[#52525b]">
                        rung: {s.currentRung}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#3f3f46]">
                      {new Date(s.updatedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="space-y-2">
                    {s.messages.map((m) => (
                      <div key={m.id} className="rounded-md overflow-hidden border border-[#1a1a2e]">
                        <button
                          onClick={() => setExpandedMessage(expandedMessage === m.id ? null : m.id)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${
                            expandedMessage === m.id
                              ? "bg-[#1a1a2e]/50"
                              : m.role === "user"
                              ? "bg-[#0d1f3c]/30 hover:bg-[#0d1f3c]/50"
                              : "bg-[#0d2f2f]/20 hover:bg-[#0d2f2f]/30"
                          }`}
                        >
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                              m.role === "user"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {m.role.toUpperCase()}
                          </span>
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${stageColors[m.stage] || ""}`}>
                            {m.stage}
                          </span>
                          <span className="text-xs font-mono text-[#a1a1aa] truncate">
                            {truncate(m.content, 100)}
                          </span>
                          <span className="text-[10px] font-mono text-[#3f3f46] ml-auto shrink-0">
                            {truncate(m.content, 1200).length}/{m.content.length}
                          </span>
                        </button>
                        {expandedMessage === m.id && (
                          <div className="bg-[#050508] px-4 py-3">
                            <pre className="text-xs font-mono text-[#c5c8cc] whitespace-pre-wrap leading-relaxed break-words">
                              {m.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ───────── CACHE DB TAB ───────── */}
        {activeTab === "db" && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-[#71717a]">
                Total cached entries: <span className="text-[#10b981] font-bold">{cache.count}</span>
              </span>
              <span className="text-xs font-mono text-[#71717a]">
                Showing: {cache.entries.length} most recent
              </span>
            </div>

            {cache.entries.length === 0 ? (
              <div className="text-center py-8 text-[#52525b] font-mono text-sm">
                CacheEntry table is empty. When the AI responds to a user question, it should be saved here.
              </div>
            ) : (
              <div className="space-y-2">
                {cache.entries.map((e) => {
                  const isExpanded = expandedEntry === 1e9 + cache.entries.indexOf(e);
                  return (
                    <div key={e.id} className="rounded-lg border border-[#1a1a2e] overflow-hidden">
                      <button
                        onClick={() => setExpandedEntry(isExpanded ? null : 1e9 + cache.entries.indexOf(e))}
                        className="w-full text-left px-3 py-3 bg-[#111118] flex items-center gap-3 hover:bg-[#151520] transition-colors"
                      >
                        <span className="text-xs font-mono text-[#52525b] grow truncate">
                          {e.questionMd5}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded shrink-0 ${stageColors[e.stage] || "bg-gray-500/10 text-gray-400"}`}>
                          {e.stage}
                        </span>
                        <span className="text-[10px] font-mono text-[#52525b] shrink-0">
                          rung {e.rung} · used {e.usedCount}x
                        </span>
                        <span className="text-[10px] font-mono text-[#3f3f46] shrink-0">
                          {new Date(e.updatedAt).toLocaleTimeString()}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="bg-[#050508] px-4 py-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                              <span className="text-[#52525b]">ID:</span> {e.id}
                            </div>
                            <div>
                              <span className="text-[#52525b]">Problem:</span> {e.problemId}
                            </div>
                          </div>
                          <div>
                            <span className="text-[#52525b] text-xs font-mono">Response:</span>
                            <pre className="text-xs font-mono text-[#c5c8cc] whitespace-pre-wrap mt-1 leading-relaxed break-words">
                              {e.response}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
