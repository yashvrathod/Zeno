"use client";

import React from "react";

interface StackVisualizationProps {
  elements: Array<{ value: string | number; highlight?: string }>;
  highlight?: string;
  label?: string;
}

export function StackVisualization({ elements, highlight, label }: StackVisualizationProps) {
  const maxHeight = 240;
  const itemHeight = Math.min(44, Math.max(28, Math.floor((maxHeight - 20) / Math.max(elements.length, 1))));
  const totalHeight = Math.min(maxHeight, elements.length * itemHeight + 20) + 30;

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">{label}</div>
      )}
      <div className="flex items-end justify-center gap-8">
        <div className="relative" style={{ height: `${totalHeight}px`, width: "160px" }}>
          {/* Stack container */}
          <div className="absolute bottom-0 left-0 right-0 border-2 border-zinc-700 rounded-lg overflow-hidden" style={{ height: `${totalHeight - 30}px` }}>
            <div className="flex flex-col-reverse h-full">
              {elements.map((el, i) => (
                <div
                  key={i}
                  className={`
                    flex items-center justify-between px-4 border-b border-zinc-800 last:border-b-0
                    transition-all duration-300
                    ${el.highlight === 'pushed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                      el.highlight === 'popped' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      highlight && i === elements.length - 1 ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                      'bg-white/5 text-zinc-300'}
                  `}
                  style={{ height: `${itemHeight}px`, minHeight: "28px" }}
                >
                  <span className="text-xs font-mono">{el.value}</span>
                  {i === elements.length - 1 && (
                    <span className="text-[9px] font-bold text-purple-400 font-mono">TOP</span>
                  )}
                </div>
              ))}
              {elements.length === 0 && (
                <div className="flex items-center justify-center h-full text-zinc-700 text-xs font-mono">Empty Stack</div>
              )}
            </div>
          </div>
          {/* Label */}
          <div className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-zinc-600 font-mono">
            Stack [{elements.length}]
          </div>
        </div>

        {/* Operations Legend */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500/30" />
            <span className="text-[10px] text-zinc-500">Push</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose-500/30" />
            <span className="text-[10px] text-zinc-500">Pop</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500/30" />
            <span className="text-[10px] text-zinc-500">Top</span>
          </div>
        </div>
      </div>
    </div>
  );
}
