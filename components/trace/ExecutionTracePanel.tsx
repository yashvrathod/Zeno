"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, SkipBack, SkipForward, RotateCcw, Bug,
  Variable, Layers, Box, ChevronDown, ChevronRight, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  useEffect(() => {
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, []);

  useEffect(() => {
    if (defaultInput) setInput(defaultInput);
  }, [defaultInput]);

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

  const codeLines = useMemo(() => code.split("\n"), [code]);

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
    <div className="bg-black border border-white/[0.08] rounded-[2rem] overflow-hidden flex flex-col h-full shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.05] bg-black shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center relative">
            <Bug size={16} className="text-amber-500" strokeWidth={1.5} />
            <div className="absolute inset-0 blur-sm bg-amber-500/20 animate-pulse" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.3em] text-amber-500/80 uppercase">EXECUTION_TRACE_LOG</span>
        </div>
        {events.length > 0 && (
          <span className="text-[10px] text-zinc-600 font-mono bg-white/[0.03] px-3 py-1 rounded-lg">
            STEP_{String(currentStep + 1).padStart(2, '0')}/{String(totalSteps).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* Input + Run */}
      <div className="flex gap-4 px-8 py-6 border-b border-white/[0.05] bg-black/40 backdrop-blur-md relative z-10">
        <div className="flex-1 relative group">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Buffer input_stream (e.g. [2, 7, 11, 15])'
            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl px-6 py-3 text-[13px] text-zinc-300 font-mono outline-none focus:border-amber-500/40 focus:bg-white/[0.04] transition-all group-hover:border-white/20"
          />
        </div>
        <button
          onClick={runTrace}
          disabled={loading}
          className="h-12 px-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 text-[11px] font-bold tracking-[0.2em] hover:bg-amber-500 hover:text-black transition-all duration-300 disabled:opacity-20 shrink-0 uppercase active:scale-95 shadow-lg shadow-amber-500/5"
        >
          {loading ? "INITIALIZING..." : "START_TRACE"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-8 mt-4 p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-400 text-xs font-mono shadow-xl"
        >
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle size={14} />
            <span className="font-bold uppercase tracking-widest">Trace_Fault</span>
          </div>
          {error}
        </motion.div>
      )}

      {/* Tab bar */}
      {events.length > 0 && (
        <div className="flex gap-2 px-8 pt-4 border-b border-white/[0.05] bg-black shrink-0 overflow-x-auto no-scrollbar">
          {([
            { id: "trace" as TabType, label: "Debugger", icon: <Bug size={14} /> },
            { id: "stack" as TabType, label: "Call_Stack", icon: <Layers size={14} /> },
            { id: "heap" as TabType, label: "Heap_Allocation", icon: <Box size={14} /> },
            { id: "vars" as TabType, label: "Variables", icon: <Variable size={14} /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-3 px-6 py-3 text-[10px] font-bold tracking-[0.15em] uppercase rounded-t-2xl transition-all relative
                ${activeTab === tab.id
                  ? "bg-white/[0.03] text-white border-t border-l border-r border-white/[0.08] shadow-2xl"
                  : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.01]"}
              `}
            >
              <span className={activeTab === tab.id ? "text-amber-500" : "text-zinc-700"}>{tab.icon}</span>
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="activeTraceTab" className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-black/20">
        {events.length === 0 && !loading && !error && (
          <div className="py-20 text-center space-y-6">
            <Bug size={48} strokeWidth={1} className="mx-auto text-zinc-900 mb-4 animate-pulse" />
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-[0.3em]">Ready for Investigation</p>
              <p className="text-[10px] text-zinc-800 uppercase tracking-widest leading-relaxed">Systematic step-by-step execution <br/>tracing and memory analysis.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-6 py-20">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-amber-500/10 border-t-amber-500 rounded-full animate-spin" />
              <div className="absolute inset-0 blur-xl bg-amber-500/20 animate-pulse" />
            </div>
            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] animate-pulse">Allocating virtual environment…</span>
          </div>
        )}

        {currentEvent && activeTab === "trace" && (
          <div className="space-y-6">
            {/* Code context */}
            <div className="bg-black/40 rounded-[2rem] border border-white/[0.05] overflow-hidden shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/[0.05]">
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Line_{String(currentEvent.line).padStart(3, '0')}</span>
                <span className="text-[9px] text-amber-500/60 font-mono tracking-widest uppercase bg-amber-500/5 px-2 py-0.5 rounded-full">{currentEvent.action}</span>
              </div>
              <pre className="text-[13px] text-zinc-400 font-mono leading-loose p-6 overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                {codeLines.map((lineContent, idx) => {
                  const lineNum = idx + 1;
                  const isActive = lineNum === currentEvent.line;
                  const inRange = Math.abs(lineNum - currentEvent.line) <= 3;
                  if (!inRange) return null;
                  return (
                    <motion.div
                      key={idx}
                      initial={isActive ? { opacity: 0, x: -5 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      className={`px-4 py-1.5 rounded-xl transition-all flex items-start gap-6 group ${
                        isActive ? "bg-amber-500/10 text-amber-100 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <span className={`text-[10px] font-bold select-none w-8 shrink-0 text-right mt-1 ${isActive ? "text-amber-500" : "text-zinc-800 group-hover:text-zinc-700"}`}>{lineNum}</span>
                      <span className={`whitespace-pre-wrap ${isActive ? "text-amber-100 font-medium" : "text-zinc-500"}`}>{lineContent || " "}</span>
                    </motion.div>
                  );
                })}
              </pre>
            </div>

            {/* Changed variables highlight */}
            <AnimatePresence>
              {changedVars.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-emerald-500/[0.02] rounded-3xl p-6 border border-emerald-500/10 shadow-lg"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] text-emerald-500/80 uppercase tracking-[0.3em] font-bold">State_Mutation_Detected</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {changedVars.map(name => (
                      <div key={name} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 border border-emerald-500/20 shadow-inner">
                        <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-tighter">{name}</span>
                        <span className="text-sm font-mono text-emerald-400/90 truncate max-w-[200px]">
                          {String(currentVars[name] ?? "undefined")}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Variables grid */}
            {Object.keys(currentVars).length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 ml-2">
                  <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-700 uppercase">Contextual_Memory</span>
                  <div className="h-px flex-1 bg-white/[0.03]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(currentVars).map(([name, value]) => (
                    <div key={name} className="bg-white/[0.01] rounded-[1.5rem] px-5 py-4 border border-white/[0.05] hover:bg-white/[0.02] transition-colors group">
                      <div className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-bold mb-2 group-hover:text-zinc-500 transition-colors">{name}</div>
                      <div className="text-sm text-zinc-400 font-mono truncate" title={String(value)}>
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
          <div className="rounded-[2rem] overflow-hidden border border-white/[0.05] bg-black/40 backdrop-blur-sm">
            <StackFrameView frames={currentStack} currentLine={currentEvent.line} />
          </div>
        )}

        {currentEvent && activeTab === "heap" && (
          <div className="rounded-[2rem] overflow-hidden border border-white/[0.05] bg-black/40 backdrop-blur-sm">
            <HeapMemoryView
              heap={currentHeap}
              references={currentRefs}
              variableNames={allVarNames}
            />
          </div>
        )}

        {currentEvent && activeTab === "vars" && (
          <div className="bg-white/[0.01] border border-white/[0.08] rounded-[2rem] p-8 shadow-2xl">
            <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase mb-8 ml-2">Variable_Persistence_Table</div>
            {allVarNames.length === 0 ? (
              <div className="py-20 text-center text-zinc-800 text-xs font-mono uppercase tracking-widest">No segments allocated</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                {/* Table header */}
                <div className="flex items-center text-[9px] text-zinc-700 uppercase tracking-widest font-bold px-6 py-3 border-b border-white/[0.03] mb-2">
                  <span className="w-1/3">Segment_Identifier</span>
                  <span className="w-2/3">Live_Data_Value</span>
                </div>
                {allVarNames.map(name => {
                  const value = currentVars[name];
                  const changed = changedVars.includes(name);
                  return (
                    <div
                      key={name}
                      className={`flex items-center px-6 py-4 rounded-2xl text-[13px] font-mono transition-all duration-300 ${
                        changed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg" : "bg-black/60 text-zinc-500 border border-white/[0.03]"
                      }`}
                    >
                      <span className="w-1/3 truncate font-bold text-zinc-600 uppercase text-[10px] tracking-tighter">{name}</span>
                      <span className={`w-2/3 truncate ${changed ? "text-emerald-400/80 font-medium" : "text-zinc-400"}`}>{String(value ?? "undefined")}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Timeline controls — Floating footer style */}
        {events.length > 1 && (
          <div className="sticky bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-20 mx-2 mb-2">
            <div className="space-y-6">
              {/* Slider */}
              <div className="relative group px-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalSteps - 1)}
                  value={currentStep}
                  onChange={(e) => { setCurrentStep(Number(e.target.value)); setPlayMode("idle"); }}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(245,158,11,0.6)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125 transition-all"
                />
                <div className="flex items-center justify-between mt-3 text-[8px] text-zinc-700 font-bold uppercase tracking-[0.2em]">
                  <span className={currentStep === 0 ? "text-amber-500/60" : ""}>INITIAL_STATE</span>
                  <span className={currentStep === totalSteps - 1 ? "text-amber-500/60" : ""}>TERMINAL_STATE</span>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setCurrentStep(0); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                    className="p-3 rounded-xl text-zinc-600 hover:text-white hover:bg-white/5 transition-all active:scale-90"
                    title="Reset Trace"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button
                    onClick={() => { setCurrentStep(Math.max(0, currentStep - 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                    disabled={currentStep === 0}
                    className="p-3 rounded-xl text-zinc-600 hover:text-white hover:bg-white/5 disabled:opacity-10 transition-all active:scale-90"
                    title="Decrement Step"
                  >
                    <SkipBack size={16} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (playMode === "playing") { setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); return; }
                    if (currentStep >= totalSteps - 1) setCurrentStep(0);
                    setPlayMode("playing");
                  }}
                  className="h-14 px-10 rounded-2xl bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] active:scale-95 flex items-center gap-4 group"
                  title={playMode === "playing" ? "Pause Execution" : "Resume Execution"}
                >
                  {playMode === "playing" ? (
                    <>
                      <Pause size={20} fill="currentColor" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">HALT_PROCESS</span>
                    </>
                  ) : (
                    <>
                      <Play size={20} fill="currentColor" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">RESUME_FLOW</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setCurrentStep(Math.min(totalSteps - 1, currentStep + 1)); setPlayMode("idle"); if (playRef.current) clearInterval(playRef.current); }}
                    disabled={currentStep >= totalSteps - 1}
                    className="p-3 rounded-xl text-zinc-600 hover:text-white hover:bg-white/5 disabled:opacity-10 transition-all active:scale-90"
                    title="Increment Step"
                  >
                    <SkipForward size={16} />
                  </button>
                  <div className="w-12 text-center text-[10px] font-mono text-zinc-700 font-bold border-l border-white/10 ml-2">
                    {Math.round((currentStep / (totalSteps - 1 || 1)) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final output */}
        {finalOutput && activeTab === "trace" && (
          <div className="bg-black/40 rounded-[2rem] border border-white/[0.05] overflow-hidden shadow-2xl backdrop-blur-sm">
            <div className="flex items-center gap-3 px-6 py-4 bg-white/[0.02] border-b border-white/[0.05]">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <span className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] font-bold">TERMINAL_STDOUT</span>
            </div>
            <pre className="text-[13px] text-zinc-400 font-mono p-8 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar italic bg-black/60">
              {finalOutput || "(no_buffer_output)"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
