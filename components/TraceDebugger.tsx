"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, Bug,
  ChevronDown, ChevronRight, AlertCircle, Terminal,
} from "lucide-react";
import { clientTraceExecution, type TraceResult, type TraceFrame } from "@/lib/trace-executor";

interface TraceDebuggerProps {
  code: string;
  language: string;
}

const JS_LIKE = ["javascript", "typescript"];

export function TraceDebugger({ code, language }: TraceDebuggerProps) {
  const [input, setInput] = useState("[2, 7, 11, 15]");
  const [result, setResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playMode, setPlayMode] = useState<"idle" | "playing">("idle");
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeLines = useMemo(() => code.split("\n"), [code]);

  // Cleanup play interval
  useEffect(() => {
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, []);

  const totalFrames = result?.frames?.length || 0;
  const totalLines = result?.totalLines || codeLines.length;
  const frame: TraceFrame | null = result?.frames?.[currentFrame] ?? null;

  const runTrace = async () => {
    setLoading(true);
    setError(null);
    setCurrentFrame(0);
    setPlayMode("idle");
    if (playRef.current) clearInterval(playRef.current);

    try {
      if (JS_LIKE.includes(language)) {
        await new Promise(r => setTimeout(r, 50));
        const res = clientTraceExecution(code, input);
        if (res.error) {
          setError(res.error);
          setResult(null);
        } else {
          setResult(res);
        }
      } else {
        const apiRes = await fetch("/api/trace/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language, input }),
        });
        const data = await apiRes.json();
        if (!data.ok) {
          setError(data.error || "Trace failed");
          return;
        }
        const traceEvents = data.trace?.events || [];
        const frames = traceEvents.map((evt: any) => ({
          line: evt.line,
          variables: evt.variables,
        }));
        setResult({
          frames,
          totalLines: data.trace?.totalLines || code.split("\n").length,
          finalOutput: data.trace?.finalOutput || "",
          error: undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trace execution failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    if (playMode === "playing") {
      setPlayMode("idle");
      if (playRef.current) clearInterval(playRef.current);
      return;
    }
    if (currentFrame >= totalFrames - 1) setCurrentFrame(0);
    setPlayMode("playing");
  };

  // Auto-step during play
  useEffect(() => {
    if (playMode !== "playing") return;
    if (currentFrame >= totalFrames - 1) {
      setPlayMode("idle");
      return;
    }
    playRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= totalFrames - 1) {
          setPlayMode("idle");
          return prev;
        }
        return prev + 1;
      });
    }, 800);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playMode, totalFrames, currentFrame]);

  return (
    <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d10] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Bug size={14} className="text-amber-400" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">Trace Debugger</span>
          <span className="text-[8px] text-zinc-700 font-mono px-2 py-0.5 rounded bg-white/5">
            {JS_LIKE.includes(language) ? "browser" : "api"}
          </span>
        </div>
        {result && (
          <span className="text-[10px] text-zinc-600 font-mono">
            Step {currentFrame + 1}/{totalFrames}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Input */}
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Test input (e.g. [2, 7, 11, 15])'
            className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-300 font-mono outline-none focus:border-purple-500/50"
          />
          <button
            onClick={runTrace}
            disabled={loading}
            className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-[11px] font-bold tracking-wider hover:bg-amber-500/20 transition-all disabled:opacity-50 shrink-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                Tracing
              </span>
            ) : "Trace"}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-rose-400 font-medium">Trace failed</p>
              <p className="text-[10px] text-rose-300/70 mt-0.5">{error}</p>
              {!JS_LIKE.includes(language) && (
                <p className="text-[10px] text-zinc-500 mt-1">Running trace via API for {language}...</p>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        {result && frame && (
          <div className="space-y-4">
            {/* Code Context with Line Highlight */}
            <div className="bg-[#050508] rounded-xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                <span className="text-[10px] text-zinc-600 font-mono">Line {frame.line}</span>
                <span className="text-[9px] text-zinc-700 font-mono">Total: {totalLines} lines</span>
              </div>
              <pre className="text-xs text-zinc-400 font-mono leading-relaxed p-3 overflow-x-auto max-h-64 overflow-y-auto">
                {codeLines.map((lineContent, idx) => {
                  const lineNum = idx + 1;
                  const isActive = lineNum === frame.line;
                  const inRange = Math.abs(lineNum - frame.line) <= 2;
                  if (!inRange) return null;
                  return (
                    <div
                      key={idx}
                      className={`px-3 py-1 rounded transition-all ${
                        isActive
                          ? "bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 -ml-[2px]"
                          : ""
                      }`}
                    >
                      <span className="text-zinc-700 mr-4 select-none w-8 inline-block text-right">{lineNum}</span>
                      <span className={isActive ? "text-amber-200" : ""}>{lineContent || " "}</span>
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Variables */}
            {Object.keys(frame.variables).length > 0 && (
              <div>
                <span className="text-[9px] text-purple-400 uppercase tracking-wider font-bold mb-2 block">Variables</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(frame.variables).map(([name, value]) => (
                    <div key={name} className="bg-[#121214] rounded-xl px-3 py-2.5 border border-white/5">
                      <div className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold mb-1">{name}</div>
                      <div className="text-sm text-purple-300 font-mono truncate" title={String(value)}>
                        {String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(frame.variables).length === 0 && (
              <div className="text-center text-zinc-700 text-xs py-4 font-mono border border-white/5 rounded-xl bg-[#121214]">
                No variables changed at this step
              </div>
            )}

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-3 pt-2 pb-1">
              <button
                onClick={() => { setCurrentFrame(0); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                title="Reset"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => { setCurrentFrame(Math.max(0, currentFrame - 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                disabled={currentFrame === 0}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                title="Previous step"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-3 rounded-xl bg-amber-500 text-white hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                title={playMode === "playing" ? "Pause" : "Play"}
              >
                {playMode === "playing" ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
              </button>
              <button
                onClick={() => { setCurrentFrame(Math.min(totalFrames - 1, currentFrame + 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                disabled={currentFrame >= totalFrames - 1}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                title="Next step"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${totalFrames > 0 ? ((currentFrame + 1) / totalFrames) * 100 : 0}%` }}
              />
            </div>

            {/* Final Output */}
            {result.finalOutput && (
              <div className="bg-[#121214] rounded-xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/5">
                  <Terminal size={12} className="text-zinc-600" />
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">Output</span>
                </div>
                <pre className="text-xs text-zinc-400 font-mono p-4 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {result.finalOutput || "(no output)"}
                </pre>
              </div>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="py-12 text-center">
            <Bug size={32} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-xs text-zinc-700 font-mono">Enter a test input and click <span className="text-amber-500">Trace</span></p>
            <p className="text-[10px] text-zinc-800 mt-2">Supports JS, TS, Python, Java, C++</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-600 font-mono">Running instrumented code...</span>
          </div>
        )}
      </div>
    </div>
  );
}
