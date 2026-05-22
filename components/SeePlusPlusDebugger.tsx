"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, Bug,
  ChevronDown, ChevronRight, Code, Layers, Box, Variable,
  Terminal, AlertCircle,
} from "lucide-react";

interface SeePlusPlusDebuggerProps {
  code: string;
  language: string;
}

interface DebugFrame {
  line: number;
  variables: Record<string, unknown>;
  callStack?: string[];
}

interface DebugResult {
  frames: DebugFrame[];
  totalLines: number;
  finalOutput: string;
  error?: string;
}

const JS_LIKE = ["javascript", "typescript"];

type TabType = "trace" | "vars" | "stack" | "output";

export function SeePlusPlusDebugger({ code, language }: SeePlusPlusDebuggerProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [playMode, setPlayMode] = useState<"idle" | "playing">("idle");
  const [activeTab, setActiveTab] = useState<TabType>("trace");
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeLines = useMemo(() => code.split("\n"), [code]);

  useEffect(() => {
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, []);

  const totalFrames = result?.frames?.length || 0;
  const frame = result?.frames?.[currentStep] ?? null;
  const prevFrame = currentStep > 0 ? result?.frames?.[currentStep - 1] : null;

  const runTrace = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWarning(null);
    setCurrentStep(0);
    setPlayMode("idle");
    if (playRef.current) clearInterval(playRef.current);

    try {
      const res = await fetch("/api/trace/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, input }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Trace failed");
        setResult(null);
        return;
      }
      if (data.warning) {
        setWarning(data.warning);
      }
      const events = data.trace?.events || [];
      const frames = events.map((evt: any) => ({
        line: evt.line,
        variables: evt.variables || {},
        callStack: evt.callStack?.map((f: any) => f.functionName) || ["<global>"],
      }));
      setResult({
        frames,
        totalLines: data.trace?.totalLines || code.split("\n").length,
        finalOutput: data.trace?.finalOutput || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trace failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [code, language, input]);

  const handlePlayPause = () => {
    if (playMode === "playing") {
      setPlayMode("idle");
      if (playRef.current) clearInterval(playRef.current);
      return;
    }
    if (currentStep >= totalFrames - 1) setCurrentStep(0);
    setPlayMode("playing");
  };

  useEffect(() => {
    if (playMode !== "playing") return;
    if (currentStep >= totalFrames - 1) { setPlayMode("idle"); return; }
    playRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= totalFrames - 1) { setPlayMode("idle"); return prev; }
        return prev + 1;
      });
    }, 800);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playMode, totalFrames, currentStep]);

  const changedVars = useMemo(() => {
    if (!frame || !prevFrame) return [];
    const changed: string[] = [];
    for (const key of Object.keys(frame.variables)) {
      if (JSON.stringify(frame.variables[key]) !== JSON.stringify(prevFrame.variables[key])) {
        changed.push(key);
      }
    }
    return changed;
  }, [frame, prevFrame]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d10] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Bug size={14} className="text-emerald-400" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">SeePlusPlus Debugger</span>
          <span className="text-[8px] text-zinc-600 font-mono px-2 py-0.5 rounded bg-white/5 uppercase">{language}</span>
        </div>
        {result && (
          <span className="text-[10px] text-zinc-600 font-mono">
            Step {currentStep + 1}/{totalFrames}
          </span>
        )}
      </div>

      {/* Input + Run */}
      <div className="flex gap-3 px-5 py-3 border-b border-white/5 bg-[#0d0d10]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Test input (optional, e.g. 5 or [1,2,3])'
          className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-300 font-mono outline-none focus:border-emerald-500/50"
        />
        <button
          onClick={runTrace}
          disabled={loading}
          className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[11px] font-bold tracking-wider hover:bg-emerald-500/20 transition-all disabled:opacity-50 shrink-0"
        >
          {loading ? "Tracing..." : "▶ Debug"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-rose-400 font-medium">Debug failed</p>
            <p className="text-[10px] text-rose-300/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Warning */}
      {warning && (
        <div className="mx-5 mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-amber-400 font-medium">No variable changes detected</p>
            <p className="text-[10px] text-amber-300/70 mt-0.5">{warning}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Code Panel */}
        <div className="w-1/2 border-r border-white/5 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
            <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">Code</span>
            {frame && (
              <span className="text-[9px] text-emerald-500 font-mono">Line {frame.line}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <pre className="text-xs text-zinc-400 font-mono leading-relaxed">
              {codeLines.map((lineContent, idx) => {
                const lineNum = idx + 1;
                const isActive = frame?.line === lineNum;
                return (
                  <div
                    key={idx}
                    className={`px-3 py-1 rounded transition-all ${
                      isActive
                        ? "bg-emerald-500/15 text-emerald-200 border-l-2 border-emerald-400"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <span className={`mr-4 select-none w-8 inline-block text-right ${
                      isActive ? "text-emerald-500" : "text-zinc-700"
                    }`}>{lineNum}</span>
                    <span className={isActive ? "text-emerald-200" : ""}>{lineContent || " "}</span>
                  </div>
                );
              })}
            </pre>
          </div>
        </div>

        {/* Right: Debug Info */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex gap-1 px-3 pt-3 border-b border-white/5 bg-[#0d0d10] shrink-0">
            {([
              { id: "trace" as TabType, label: "Variables", icon: <Variable size={12} /> },
              { id: "stack" as TabType, label: "Call Stack", icon: <Layers size={12} /> },
              { id: "output" as TabType, label: "Output", icon: <Terminal size={12} /> },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-bold tracking-wider uppercase rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? "bg-[#0a0a0c] text-white border-t border-l border-r border-white/10 -mb-px"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!result && !loading && !error && (
              <div className="py-8 text-center">
                <Bug size={28} className="mx-auto text-zinc-800 mb-3" />
                <p className="text-xs text-zinc-700 font-mono">Enter input and click Debug</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                <span className="text-[10px] text-zinc-600 font-mono">Tracing execution...</span>
              </div>
            )}

            {frame && activeTab === "trace" && (
              <div>
                {Object.keys(frame.variables).length === 0 ? (
                  <div className="text-center text-zinc-700 text-xs py-6 font-mono">No variables at this step</div>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(frame.variables).map(([name, value]) => {
                      const changed = changedVars.includes(name);
                      return (
                        <div
                          key={name}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                            changed
                              ? "bg-emerald-500/10 border border-emerald-500/20"
                              : "bg-[#121214] border border-white/5"
                          }`}
                        >
                          <span className="text-purple-300 font-bold">{name}</span>
                          <span className={`truncate ml-2 max-w-[60%] ${
                            changed ? "text-emerald-300" : "text-zinc-400"
                          }`}>
                            {formatValue(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {frame && activeTab === "stack" && (
              <div className="space-y-1.5">
                {(frame.callStack?.length ? frame.callStack : ["<global>"]).map((func, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded-lg text-xs font-mono border transition-all ${
                      i === 0
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                        : "bg-[#121214] border-white/5 text-zinc-500"
                    }`}
                  >
                    <span className="text-[9px] text-zinc-600 mr-2">#{frame.callStack ? frame.callStack.length - i : 1}</span>
                    {func}
                    <span className="text-[9px] text-zinc-700 ml-2">L{frame.line}</span>
                  </div>
                ))}
                {(!frame.callStack || frame.callStack.length === 0) && (
                  <div className="text-center text-zinc-700 text-xs py-6 font-mono">Global scope only</div>
                )}
              </div>
            )}

            {activeTab === "output" && (
              <div>
                <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap bg-[#121214] p-4 rounded-xl border border-white/5 min-h-[80px] max-h-[300px] overflow-y-auto">
                  {result?.finalOutput || "(no output)"}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      {totalFrames > 1 && (
        <div className="border-t border-white/5 bg-[#0d0d10] px-5 py-3 space-y-2">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setCurrentStep(0); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
              title="Reset"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
              disabled={currentStep === 0}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
              title="Previous step"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              title={playMode === "playing" ? "Pause" : "Play"}
            >
              {playMode === "playing" ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
            </button>
            <button
              onClick={() => { setCurrentStep(Math.min(totalFrames - 1, currentStep + 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
              disabled={currentStep >= totalFrames - 1}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
              title="Next step"
            >
              <SkipForward size={14} />
            </button>
            <span className="text-[10px] text-zinc-600 font-mono ml-2">
              {currentStep + 1} / {totalFrames}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, totalFrames - 1)}
            value={currentStep}
            onChange={(e) => { setCurrentStep(Number(e.target.value)); setPlayMode("idle"); }}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-500/50"
          />
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value.length > 30 ? value.slice(0, 30) + "..." : value}"`;
  if (typeof value === "object") {
    try {
      const str = JSON.stringify(value);
      return str.length > 40 ? str.slice(0, 40) + "..." : str;
    } catch { return String(value); }
  }
  return String(value);
}

export default SeePlusPlusDebugger;
