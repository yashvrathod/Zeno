"use client";

import React from "react";

interface HeapVisualizationProps {
  elements: Array<{ value: string | number; highlight?: string }>;
  heapType?: 'min' | 'max';
  label?: string;
}

export function HeapVisualization({ elements, heapType = 'min', label }: HeapVisualizationProps) {
  if (elements.length === 0) {
    return (
      <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
        <div className="py-8 text-center text-zinc-700 text-xs font-mono">Empty Heap</div>
      </div>
    );
  }

  const levels: Array<Array<{ value: string | number; highlight?: string; index: number }>> = [];
  let idx = 0;
  let level = 0;
  while (idx < elements.length) {
    const count = Math.pow(2, level);
    const levelEls = elements.slice(idx, idx + count).map((el, i) => ({
      ...el,
      index: idx + i,
      highlight: el.highlight,
    }));
    levels.push(levelEls);
    idx += count;
    level++;
  }

  const maxLevel = levels.length;
  const nodeR = 22;
  const levelGap = 60;
  const baseNodeGap = 80;

  const svgH = maxLevel * levelGap + 60;
  const svgW = Math.max(400, Math.pow(2, maxLevel) * baseNodeGap);

  // Tree edges and nodes
  const nodePositions: Array<{ x: number; y: number; value: string | number; highlight?: string; index: number }> = [];

  function getNodePosition(levelIdx: number, posInLevel: number, totalAtLevel: number): { x: number; y: number } {
    const levelWidth = svgW - 80;
    const x = 40 + (levelWidth / (totalAtLevel + 1)) * (posInLevel + 1);
    const y = 40 + levelIdx * levelGap;
    return { x, y };
  }

  levels.forEach((levelEls, li) => {
    levelEls.forEach((el, pi) => {
      const pos = getNodePosition(li, pi, levelEls.length);
      nodePositions.push({ x: pos.x, y: pos.y, value: el.value, highlight: el.highlight, index: el.index });
    });
  });

  // Edges
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < elements.length; i++) {
    const leftIdx = 2 * i + 1;
    const rightIdx = 2 * i + 2;
    const parent = nodePositions.find(n => n.index === i);
    if (!parent) continue;
    const left = nodePositions.find(n => n.index === leftIdx);
    if (left) edges.push({ x1: parent.x, y1: parent.y + nodeR, x2: left.x, y2: left.y - nodeR });
    const right = nodePositions.find(n => n.index === rightIdx);
    if (right) edges.push({ x1: parent.x, y1: parent.y + nodeR, x2: right.x, y2: right.y - nodeR });
  }

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4 overflow-x-auto">
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">{label}</div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[10px] font-mono text-zinc-500">{heapType === 'min' ? 'Min-Heap' : 'Max-Heap'}</span>
        <span className="text-[10px] font-mono text-zinc-600">Size: {elements.length}</span>
      </div>

      {/* Array representation below */}
      <svg width={svgW} height={svgH} className="mx-auto">
        {edges.map((e, i) => (
          <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
        ))}
        {nodePositions.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={nodeR}
              className={
                n.highlight === 'extracted' ? 'fill-rose-500/30 stroke-rose-400' :
                n.highlight === 'inserted' ? 'fill-emerald-500/30 stroke-emerald-400' :
                n.highlight === 'heapified' ? 'fill-amber-500/30 stroke-amber-400' :
                'fill-white/10 stroke-zinc-600'
              }
              strokeWidth={1.5}
            />
            <text x={n.x} y={n.y + 4} textAnchor="middle"
              className="fill-zinc-300 text-[11px] font-mono font-bold">
              {n.value}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          <span className="text-[9px] text-zinc-500">Insert</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
          <span className="text-[9px] text-zinc-500">Extract</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
          <span className="text-[9px] text-zinc-500">Heapify</span>
        </div>
      </div>
    </div>
  );
}
