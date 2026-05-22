"use client";

import React from "react";
import type { CallStackFrame } from "@/lib/execution-trace/enhanced-types";

interface StackFrameViewProps {
  frames: CallStackFrame[];
  currentLine: number;
}

const DEPTH_COLORS = [
  "from-purple-500/20 to-purple-600/10",
  "from-blue-500/20 to-blue-600/10",
  "from-emerald-500/20 to-emerald-600/10",
  "from-amber-500/20 to-amber-600/10",
  "from-rose-500/20 to-rose-600/10",
  "from-cyan-500/20 to-cyan-600/10",
];

export function StackFrameView({ frames, currentLine }: StackFrameViewProps) {
  if (frames.length === 0) {
    return (
      <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
        <div className="text-[10px] font-bold tracking-widest text-zinc-600 uppercase mb-3">Call Stack</div>
        <div className="py-6 text-center text-zinc-700 text-xs font-mono">No call stack data</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">Call Stack</span>
        <span className="text-[9px] text-zinc-600 font-mono">{frames.length} frame{frames.length > 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-1.5">
        {frames.map((frame, i) => {
          const colorIdx = Math.min(i, DEPTH_COLORS.length - 1);
          const isBottom = i === 0;
          const isActive = frame.line === currentLine;

          return (
            <div
              key={`${frame.functionName}-${i}`}
              className={`
                relative rounded-lg border overflow-hidden transition-all duration-300
                ${isActive ? 'border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'border-white/5'}
              `}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${DEPTH_COLORS[colorIdx]} opacity-50`} />
              <div className="relative p-3 pl-4">
                {/* Depth indent line */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full"
                  style={{
                    background: i === 0
                      ? 'linear-gradient(to bottom, #a855f7, #7c3aed)'
                      : `rgba(255,255,255,${Math.max(0.05, 0.3 - i * 0.05)})`,
                  }}
                />

                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isBottom ? 'bg-purple-400' : 'bg-zinc-600'}`} />
                    <span className={`text-xs font-mono font-bold ${isBottom ? 'text-purple-300' : 'text-zinc-400'}`}>
                      {frame.functionName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-zinc-600 font-mono">L{frame.line}</span>
                    {isBottom && <span className="text-[8px] text-purple-500 font-bold uppercase tracking-wider">TOP</span>}
                  </div>
                </div>

                {/* Parameters */}
                {frame.parameters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {frame.parameters.map(p => (
                      <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500 font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Variables preview */}
                {Object.keys(frame.variables).length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {Object.entries(frame.variables).slice(0, 4).map(([name, val]) => (
                      <span key={name} className="text-[9px] text-zinc-600 font-mono">
                        <span className="text-zinc-500">{name}</span>
                        <span className="text-zinc-700">: </span>
                        <span className="text-zinc-400">{String(val).slice(0, 20)}</span>
                      </span>
                    ))}
                    {Object.keys(frame.variables).length > 4 && (
                      <span className="text-[9px] text-zinc-700">+{Object.keys(frame.variables).length - 4} more</span>
                    )}
                  </div>
                )}

                {/* Depth indicator */}
                <div className="absolute right-2 bottom-1">
                  <span className="text-[8px] text-zinc-700 font-mono">d:{frame.depth}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
