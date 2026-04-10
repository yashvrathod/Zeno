"use client";

import React from "react";
import { generateVisualization, type VisualizationData } from "@/lib/mentor/services/visualScaffolding";

interface VisualizationRendererProps {
  type: string;
  data: unknown;
  className?: string;
}

export function VisualizationRenderer({ type, data, className = "" }: VisualizationRendererProps) {
  // Generate the ASCII visualization
  const asciiArt = React.useMemo(() => {
    try {
      const vizData = typeof data === "string" ? JSON.parse(data) : data;
      return generateVisualization({
        type: vizData.type || type,
        data: vizData.data || vizData,
      });
    } catch {
      return null;
    }
  }, [type, data]);

  if (!asciiArt) return null;

  return (
    <div
      className={`bg-[#0d0d10] border border-white/10 rounded-lg p-4 font-mono text-[13px] text-zinc-300 overflow-x-auto ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
          Algorithm Visualization
        </span>
        <span className="text-[10px] text-zinc-600 capitalize">{type.replace(/-/g, " ")}</span>
      </div>
      <pre className="whitespace-pre text-zinc-400 leading-relaxed">{asciiArt}</pre>
    </div>
  );
}

// SVG Animation component for animated visualizations
interface AnimatedVisualizationProps {
  type: "binary-search" | "two-pointers" | "sliding-window";
  data: number[];
  pointers?: { name: string; index: number; color: string }[];
  highlight?: number[];
  step?: number;
}

export function AnimatedVisualization({
  type,
  data,
  pointers = [],
  highlight = [],
  step = 0,
}: AnimatedVisualizationProps) {
  const cellWidth = 48;
  const cellHeight = 48;
  const gap = 8;
  const totalWidth = data.length * (cellWidth + gap) - gap;

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
          Step {step + 1}
        </span>
        <span className="text-[10px] text-zinc-600 capitalize">{type.replace(/-/g, " ")}</span>
      </div>

      <svg
        width={Math.max(totalWidth + 32, 300)}
        height={120}
        className="mx-auto"
      >
        {/* Array cells */}
        {data.map((value, i) => {
          const x = i * (cellWidth + gap) + 16;
          const isHighlighted = highlight.includes(i);
          const pointer = pointers.find((p) => p.index === i);

          return (
            <g key={i}>
              {/* Pointer label above */}
              {pointer && (
                <text
                  x={x + cellWidth / 2}
                  y={20}
                  textAnchor="middle"
                  className="fill-purple-400 text-[10px] font-bold"
                >
                  {pointer.name}
                </text>
              )}

              {/* Cell */}
              <rect
                x={x}
                y={32}
                width={cellWidth}
                height={cellHeight}
                rx={6}
                className={`${
                  isHighlighted
                    ? "fill-purple-500/20 stroke-purple-500/50"
                    : pointer
                    ? "fill-white/5 stroke-purple-400/50"
                    : "fill-white/5 stroke-white/10"
                }`}
                strokeWidth={1.5}
              />

              {/* Value */}
              <text
                x={x + cellWidth / 2}
                y={32 + cellHeight / 2 + 4}
                textAnchor="middle"
                className={`fill-zinc-300 text-[14px] font-mono ${
                  pointer ? "fill-purple-300 font-bold" : ""
                }`}
              >
                {value}
              </text>

              {/* Index below */}
              <text
                x={x + cellWidth / 2}
                y={32 + cellHeight + 16}
                textAnchor="middle"
                className="fill-zinc-600 text-[10px] font-mono"
              >
                {i}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Pointer legend */}
      {pointers.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2">
          {pointers.map((p) => (
            <div key={p.name} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color || "#a855f7" }}
              />
              <span className="text-[10px] text-zinc-500">{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
