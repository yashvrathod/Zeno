"use client";

import React from "react";

interface GraphNode {
  id: string;
  label: string;
  highlight?: string;
}

interface GraphEdge {
  from: string;
  to: string;
  weight?: number;
  highlight?: string;
}

interface GraphVisualizationProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  label?: string;
}

export function GraphVisualization({ nodes, edges, label }: GraphVisualizationProps) {
  const cx = 180, cy = 140, radius = 100;
  const positions: Record<string, { x: number; y: number }> = {};

  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    positions[n.id] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">{label}</div>
      )}
      <svg viewBox="0 0 360 300" className="w-full h-64">
        {/* Edges */}
        {edges.map((e, i) => {
          const from = positions[e.from];
          const to = positions[e.to];
          if (!from || !to) return null;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                className={
                  e.highlight === 'current' ? 'stroke-emerald-500' :
                  e.highlight === 'visited' ? 'stroke-purple-500' :
                  'stroke-zinc-700'
                }
                strokeWidth={e.highlight ? 2 : 1}
              />
              {e.weight !== undefined && (
                <text
                  x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6}
                  textAnchor="middle"
                  className="fill-zinc-600 text-[9px] font-mono"
                >
                  {e.weight}
                </text>
              )}
            </g>
          );
        })}
        {/* Nodes */}
        {nodes.map(n => {
          const pos = positions[n.id];
          if (!pos) return null;
          return (
            <g key={n.id}>
              <circle
                cx={pos.x} cy={pos.y} r={22}
                className={
                  n.highlight === 'current' ? 'fill-emerald-500/30 stroke-emerald-400' :
                  n.highlight === 'visited' ? 'fill-purple-500/30 stroke-purple-400' :
                  n.highlight === 'queued' ? 'fill-amber-500/30 stroke-amber-400' :
                  'fill-white/10 stroke-zinc-600'
                }
                strokeWidth={1.5}
              />
              <text
                x={pos.x} y={pos.y + 4}
                textAnchor="middle"
                className="fill-zinc-300 text-[10px] font-mono font-bold"
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          <span className="text-[9px] text-zinc-500">Current</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500/50" />
          <span className="text-[9px] text-zinc-500">Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <span className="text-[9px] text-zinc-500">Queued</span>
        </div>
      </div>
    </div>
  );
}
