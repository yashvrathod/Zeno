"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, Bug,
  Variable, Layers, Box, ChevronDown, ChevronRight,
} from "lucide-react";
import { StackFrameView } from "./StackFrameView";
import { HeapMemoryView } from "./HeapMemoryView";
import { enhancedClientTrace } from "@/lib/execution-trace/enhanced-executor";
import type { EnhancedTraceEvent, HeapObject, Reference, CallStackFrame } from "@/lib/execution-trace/enhanced-types";

interface ExecutionTracePanelProps {
  code: string;
  language: string;
  defaultInput?: string;
}

type TabType = "trace" | "stack" | "heap" | "vars";

export function ExecutionTracePanel({ code, language, defaultInput }: ExecutionTracePanelProps) {
  const [input, setInput] = useState(defaultInput || "[2, 7, 11, 15]");
  const [events, setEvents] = useState<EnhancedTraceEvent[]>([]);
  const [finalOutput, setFinalOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [playMode, setPlayMode] = useState<"idle" | "playing">("idle");
  const [activeTab, setActiveTab] = useState<TabType>("trace");
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalSteps = events.length;
  const currentEvent = events[currentStep] || null;
  const isJsTs = language === "javascript" || language === "typescript";

  // Cleanup play interval
  useEffect(() => {
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, []);

  // Sync input when defaultInput arrives asynchronously (e.g. from API)
  useEffect(() => {
    if (defaultInput) setInput(defaultInput);
  }, [defaultInput]);

  // Auto-step during play
  useEffect(() => {
    if (playMode !== "playing") return;
    if (currentStep >= totalSteps - 1) { setPlayMode("idle"); return; }
    playRef.current = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= totalSteps - 1) { setPlayMode("idle"); return prev; }
        return prev + 1;
      });
    }, 600);
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playMode, totalSteps, currentStep]);

  const runTrace = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentStep(0);
    setPlayMode("idle");
    if (playRef.current) clearInterval(playRef.current);

    try {
      await new Promise(r => setTimeout(r, 50));

      if (language === "javascript" || language === "typescript") {
        const result = enhancedClientTrace(code, input);
        if (result.error) {
          setError(result.error);
          setEvents([]);
        } else {
          setEvents(result.events);
          setFinalOutput(result.finalOutput);
        }
      } else {
        const res = await fetch("/api/trace/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, language, input }),
        });
        const data = await res.json();
        if (!data.ok) {
          setError(data.error || "Trace failed");
          setEvents([]);
        } else if (data.trace) {
          setEvents(data.trace.events || []);
          setFinalOutput(data.trace.finalOutput || "");
        } else {
          setError("No trace data returned");
          setEvents([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trace failed");
    } finally {
      setLoading(false);
    }
  }, [code, input, language]);

  // Show line numbers
  const codeLines = useMemo(() => code.split("\n"), [code]);

  // Current heap + call stack from current event
  const currentHeap = currentEvent?.heap || [];
  const currentRefs = currentEvent?.references || [];
  const currentStack = currentEvent?.callStack || [{ functionName: "<global>", line: 1, variables: {}, depth: 0, parameters: [] }];
  const currentVars = currentEvent?.variables || {};
  const changedVars = currentEvent?.changedVars || [];

  const allVarNames = useMemo(() => {
    const names = new Set<string>();
    for (const e of events) {
      for (const k of Object.keys(e.variables)) names.add(k);
    }
    return Array.from(names).sort();
  }, [events]);

  return (
    <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d10] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Bug size={14} className="text-amber-400" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">Execution Trace</span>
        </div>
        {events.length > 0 && (
          <span className="text-[10px] text-zinc-600 font-mono">
            Step {currentStep + 1}/{totalSteps}
          </span>
        )}
      </div>

      {/* Input + Run */}
      <div className="flex gap-3 px-5 py-3 border-b border-white/5 bg-[#0d0d10]">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Test input (e.g. [2, 7, 11, 15])'
          className="flex-1 bg-[#121214] border border-white/10 rounded-xl px-4 py-2 text-sm text-zinc-300 font-mono outline-none focus:border-purple-500/50"
        />
        <button
          onClick={runTrace}
          disabled={loading}
          className="px-5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-[11px] font-bold tracking-wider hover:bg-amber-500/20 transition-all disabled:opacity-50 shrink-0"
        >
          {loading ? "Tracing..." : "▶ Trace"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Tab bar */}
      {events.length > 0 && (
        <div className="flex gap-1 px-5 pt-3 border-b border-white/5 bg-[#0d0d10]">
          {([
            { id: "trace" as TabType, label: "Trace", icon: <Bug size={12} /> },
            { id: "stack" as TabType, label: "Call Stack", icon: <Layers size={12} /> },
            { id: "heap" as TabType, label: "Heap", icon: <Box size={12} /> },
            { id: "vars" as TabType, label: "Variables", icon: <Variable size={12} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-t-lg transition-all
                ${activeTab === tab.id
                  ? "bg-[#0a0a0c] text-white border-t border-l border-r border-white/10 -mb-px"
                  : "text-zinc-600 hover:text-zinc-400"}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {events.length === 0 && !loading && !error && (
          <div className="py-12 text-center">
            <Bug size={32} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-xs text-zinc-700 font-mono">
              Enter a test input and click <span className="text-amber-500">Trace</span>
            </p>
            <p className="text-[10px] text-zinc-800 mt-2">
              Supports JS, TS, Python, Java, and C++
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-[10px] text-zinc-600 font-mono">Tracing execution...</span>
          </div>
        )}

        {currentEvent && activeTab === "trace" && (
          <div className="space-y-4">
            {/* Code context */}
            <div className="bg-[#050508] rounded-xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] border-b border-white/5">
                <span className="text-[10px] text-zinc-600 font-mono">Line {currentEvent.line}</span>
                <span className="text-[9px] text-zinc-700 font-mono">{currentEvent.action}</span>
              </div>
              <pre className="text-xs text-zinc-400 font-mono leading-relaxed p-3 overflow-x-auto max-h-64 overflow-y-auto">
                {codeLines.map((lineContent, idx) => {
                  const lineNum = idx + 1;
                  const isActive = lineNum === currentEvent.line;
                  const inRange = Math.abs(lineNum - currentEvent.line) <= 2;
                  if (!inRange) return null;
                  return (
                    <div
                      key={idx}
                      className={`px-3 py-1 rounded transition-all ${
                        isActive ? "bg-amber-500/15 text-amber-200 border-l-2 border-amber-400 -ml-[2px]" : ""
                      }`}
                    >
                      <span className="text-zinc-700 mr-4 select-none w-8 inline-block text-right">{lineNum}</span>
                      <span className={isActive ? "text-amber-200" : ""}>{lineContent || " "}</span>
                    </div>
                  );
                })}
              </pre>
            </div>

            {/* Changed variables highlight */}
            {changedVars.length > 0 && (
              <div className="bg-[#121214] rounded-xl p-4 border border-white/5">
                <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold mb-2 block">Changed</span>
                <div className="flex flex-wrap gap-2">
                  {changedVars.map(name => (
                    <span key={name} className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                      {name} = {String(currentVars[name] ?? "undefined").slice(0, 30)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Variables grid */}
            {Object.keys(currentVars).length > 0 && (
              <div>
                <span className="text-[9px] text-purple-400 uppercase tracking-wider font-bold mb-2 block">All Variables</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(currentVars).map(([name, value]) => (
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
          </div>
        )}

        {currentEvent && activeTab === "stack" && (
          <StackFrameView frames={currentStack} currentLine={currentEvent.line} />
        )}

        {currentEvent && activeTab === "heap" && (
          <HeapMemoryView
            heap={currentHeap}
            references={currentRefs}
            variableNames={allVarNames}
          />
        )}

        {currentEvent && activeTab === "vars" && (
          <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
            <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">All Variables</div>
            {allVarNames.length === 0 ? (
              <div className="py-6 text-center text-zinc-700 text-xs font-mono">No variables tracked</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {/* Table header */}
                <div className="flex items-center text-[9px] text-zinc-700 uppercase tracking-wider font-bold px-3 py-1.5">
                  <span className="w-1/3">Name</span>
                  <span className="w-2/3">Value</span>
                </div>
                {allVarNames.map(name => {
                  const value = currentVars[name];
                  const changed = changedVars.includes(name);
                  return (
                    <div
                      key={name}
                      className={`flex items-center px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                        changed ? "bg-emerald-500/10 text-emerald-300" : "bg-[#121214] text-zinc-400"
                      }`}
                    >
                      <span className="w-1/3 truncate">{name}</span>
                      <span className="w-2/3 truncate text-zinc-500">{String(value ?? "undefined")}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Timeline slider */}
        {events.length > 1 && (
          <div className="space-y-3 pt-2 border-t border-white/5">
            {/* Playback controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setCurrentStep(0); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                title="Reset"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                disabled={currentStep === 0}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                title="Previous step"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={() => {
                  if (playMode === "playing") { setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); return; }
                  if (currentStep >= totalSteps - 1) setCurrentStep(0);
                  setPlayMode("playing");
                }}
                className="p-3 rounded-xl bg-amber-500 text-white hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                title={playMode === "playing" ? "Pause" : "Play"}
              >
                {playMode === "playing" ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
              </button>
              <button
                onClick={() => { setCurrentStep(Math.min(totalSteps - 1, currentStep + 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                disabled={currentStep >= totalSteps - 1}
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all"
                title="Next step"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Slider */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={Math.max(0, totalSteps - 1)}
                value={currentStep}
                onChange={(e) => { setCurrentStep(Number(e.target.value)); setPlayMode("idle"); }}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-amber-500/50"
              />
              <div className="flex items-center justify-between mt-1 text-[8px] text-zinc-700 font-mono">
                <span>Step 1</span>
                <span>Step {totalSteps}</span>
              </div>
            </div>

            {/* Final output */}
            {finalOutput && (
              <div className="bg-[#121214] rounded-xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] border-b border-white/5">
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">Output</span>
                </div>
                <pre className="text-xs text-zinc-400 font-mono p-4 leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {finalOutput || "(no output)"}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
