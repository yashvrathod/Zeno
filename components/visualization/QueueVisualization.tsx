"use client";

import React from "react";

interface QueueVisualizationProps {
  elements: Array<{ value: string | number; highlight?: string }>;
  label?: string;
}

export function QueueVisualization({ elements, label }: QueueVisualizationProps) {
  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">{label}</div>
      )}
      <div className="space-y-4">
        {/* Queue as horizontal array */}
        <div className="flex items-center gap-1 overflow-x-auto py-4 px-2">
          {elements.length === 0 ? (
            <div className="w-full text-center text-zinc-700 text-xs font-mono py-8">Empty Queue</div>
          ) : (
            elements.map((el, i) => (
              <div key={i} className="flex flex-col items-center">
                <div
                  className={`
                    w-14 h-14 flex items-center justify-center rounded-xl border-2 font-mono text-sm
                    transition-all duration-300
                    ${el.highlight === 'enqueued' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' :
                      el.highlight === 'dequeued' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' :
                      i === 0 ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' :
                      'bg-white/5 border-zinc-700 text-zinc-300'}
                  `}
                >
                  {el.value}
                </div>
                {i === 0 && <span className="text-[8px] text-purple-400 font-bold mt-1 font-mono">FRONT</span>}
                {i === elements.length - 1 && <span className="text-[8px] text-emerald-400 font-bold mt-1 font-mono">REAR</span>}
              </div>
            ))
          )}
        </div>

        {/* Direction arrow */}
        {elements.length > 1 && (
          <div className="flex items-center justify-center gap-1 text-zinc-700 text-[10px] font-mono">
            <span>dequeue</span>
            <span className="text-zinc-600">→</span>
            {elements.slice(1, -1).map((_, i) => (
              <span key={i} className="text-zinc-800">→</span>
            ))}
            <span className="text-zinc-600">→</span>
            <span>enqueue</span>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-purple-500/40" />
            <span className="text-[9px] text-zinc-500">Front</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500/40" />
            <span className="text-[9px] text-zinc-500">Enqueue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-rose-500/40" />
            <span className="text-[9px] text-zinc-500">Dequeue</span>
          </div>
        </div>
      </div>
    </div>
  );
}
