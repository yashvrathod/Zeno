"use client";

import React from "react";

interface DPTableVisualizationProps {
  table: string[][];
  rows: string[];
  cols: string[];
  highlight?: Array<{ row: number; col: number; color?: string }>;
  label?: string;
}

export function DPTableVisualization({ table, rows, cols, highlight, label }: DPTableVisualizationProps) {
  const cellW = Math.max(48, Math.floor(600 / (cols.length + 1)));
  const cellH = 40;
  const svgW = (cols.length + 1) * cellW + 20;
  const svgH = (rows.length + 1) * cellH + 20;

  const hlMap = new Map<string, string>();
  highlight?.forEach(h => {
    hlMap.set(`${h.row},${h.col}`, h.color || '#a855f7');
  });

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4 overflow-x-auto">
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">{label}</div>
      )}
      <svg width={svgW} height={svgH} className="mx-auto">
        {/* Column headers */}
        {cols.map((c, j) => (
          <g key={`col-${j}`}>
            <rect x={(j + 1) * cellW + 10} y={10} width={cellW - 2} height={cellH - 2} rx={4}
              className="fill-purple-500/10 stroke-purple-500/30" />
            <text x={(j + 1) * cellW + 10 + cellW / 2} y={10 + cellH / 2 + 3}
              textAnchor="middle" className="fill-purple-400 text-[9px] font-mono font-bold">
              {c}
            </text>
          </g>
        ))}
        {/* Row headers */}
        {rows.map((r, i) => (
          <g key={`row-${i}`}>
            <rect x={10} y={(i + 1) * cellH + 10} width={cellW - 2} height={cellH - 2} rx={4}
              className="fill-purple-500/10 stroke-purple-500/30" />
            <text x={10 + cellW / 2} y={(i + 1) * cellH + 10 + cellH / 2 + 3}
              textAnchor="middle" className="fill-purple-400 text-[9px] font-mono font-bold">
              {r}
            </text>
          </g>
        ))}
        {/* Cells */}
        {table.map((row, i) =>
          row.map((val, j) => {
            const hl = hlMap.get(`${i},${j}`);
            const isDefault = hl === undefined;
            return (
              <g key={`cell-${i}-${j}`}>
                <rect
                  x={(j + 1) * cellW + 10}
                  y={(i + 1) * cellH + 10}
                  width={cellW - 2}
                  height={cellH - 2}
                  rx={4}
                  className={hl ? 'fill-emerald-500/20 stroke-emerald-400' : 'fill-white/5 stroke-zinc-700'}
                  strokeWidth={hl ? 2 : 1}
                />
                <text
                  x={(j + 1) * cellW + 10 + cellW / 2}
                  y={(i + 1) * cellH + 10 + cellH / 2 + 3}
                  textAnchor="middle"
                  className={hl ? 'fill-emerald-300 text-[10px] font-mono font-bold' : 'fill-zinc-400 text-[10px] font-mono'}
                >
                  {val}
                </text>
              </g>
            );
          })
        )}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500/50" />
          <span className="text-[9px] text-zinc-500">Selected Cell</span>
        </div>
      </div>
    </div>
  );
}
