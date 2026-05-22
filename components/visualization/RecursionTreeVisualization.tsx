"use client";

import React from "react";

interface RecursionNode {
  id: string;
  functionName: string;
  args: string;
  result?: string;
  depth: number;
  children: RecursionNode[];
  highlight?: string;
}

interface RecursionTreeVisualizationProps {
  root: RecursionNode | null;
  label?: string;
}

export function RecursionTreeVisualization({ root, label }: RecursionTreeVisualizationProps) {
  if (!root) {
    return (
      <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
        <div className="py-8 text-center text-zinc-700 text-xs font-mono">No recursion trace</div>
      </div>
    );
  }

  interface FlatNode {
    name: string;
    args: string;
    result?: string;
    depth: number;
    highlight?: string;
    callOrder: number;
    children: FlatNode[];
  }

  let callCounter = 0;
  function flatten(n: RecursionNode): FlatNode {
    callCounter++;
    const order = callCounter;
    return {
      name: n.functionName,
      args: n.args,
      result: n.result,
      depth: n.depth,
      highlight: n.highlight,
      callOrder: order,
      children: n.children.map(c => flatten(c)),
    };
  }

  const tree = flatten(root);
  const maxDepth = (() => { let d = 0; const walk = (n: FlatNode, depth: number) => { d = Math.max(d, depth); n.children.forEach(c => walk(c, depth + 1)); }; walk(tree, 0); return d; })();

  if (maxDepth > 6) {
    return (
      <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
        <div className="py-8 text-center space-y-3">
          <p className="text-zinc-600 text-xs font-mono">Recursion tree too deep ({maxDepth + 1} levels) to render visually.</p>
          <pre className="text-[10px] text-zinc-700 text-left max-h-48 overflow-y-auto mx-auto max-w-md">
            {JSON.stringify(tree, null, 2).slice(0, 2000)}
          </pre>
        </div>
      </div>
    );
  }

  const items: Array<{
    name: string; args: string; result?: string; depth: number; highlight?: string; order: number;
    x: number; y: number;
  }> = [];

  let maxChildrenAtLevel = 1;
  for (let d = 0; d <= maxDepth; d++) {
    let count = 0;
    const walk = (n: FlatNode, depth: number) => {
      if (depth === d) count++;
      n.children.forEach(c => walk(c, depth + 1));
    };
    walk(tree, 0);
    maxChildrenAtLevel = Math.max(maxChildrenAtLevel, count);
  }

  const cellW = Math.min(140, Math.max(80, Math.floor(600 / maxChildrenAtLevel)));
  const cellH = 56;
  const gapX = Math.max(10, cellW * 0.3);
  const gapY = 50;

  const startX = (maxChildrenAtLevel * (cellW + gapX)) / 2;

  function layout(n: FlatNode, depth: number, left: number, right: number) {
    const x = left + (right - left) / 2;
    const y = depth * (cellH + gapY) + 30;
    items.push({ name: n.name, args: n.args, result: n.result, depth: n.depth, highlight: n.highlight, order: n.callOrder, x, y });

    if (n.children.length === 0) return;

    const childWidth = (right - left) / n.children.length;
    n.children.forEach((child, i) => {
      layout(child, depth + 1, left + i * childWidth, left + (i + 1) * childWidth);
    });
  }

  layout(tree, 0, 20, maxChildrenAtLevel * (cellW + gapX) + 20);

  const svgW = Math.max(items.reduce((m, i) => Math.max(m, i.x + cellW / 2 + 20), 0), 300);
  const svgH = (maxDepth + 1) * (cellH + gapY) + 50;

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4 overflow-x-auto">
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">{label}</div>
      )}
      <svg width={svgW} height={svgH} className="mx-auto">
        {/* Edges (connecting lines) */}
        {(() => {
          const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
          const nodeMap = new Map<number, { x: number; y: number; children: FlatNode[] }>();
          function buildMap(n: FlatNode): void {
            nodeMap.set(n.callOrder, { x: items.find(i => i.order === n.callOrder)!.x, y: items.find(i => i.order === n.callOrder)!.y, children: n.children });
            n.children.forEach(c => buildMap(c));
          }
          buildMap(tree);
          for (const [, parent] of nodeMap) {
            for (const child of parent.children) {
              const childPos = items.find(i => i.order === child.callOrder);
              if (childPos) {
                edges.push({ x1: parent.x, y1: parent.y + cellH / 2, x2: childPos.x, y2: childPos.y - cellH / 2 });
              }
            }
          }
          return edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ));
        })()}

        {/* Nodes */}
        {items.map((item, i) => (
          <g key={i}>
            <rect
              x={item.x - cellW / 2}
              y={item.y - cellH / 2}
              width={cellW} height={cellH} rx={8}
              className={
                item.highlight === 'current' ? 'fill-emerald-500/20 stroke-emerald-400' :
                item.highlight === 'returned' ? 'fill-purple-500/20 stroke-purple-400' :
                'fill-white/5 stroke-zinc-700'
              }
              strokeWidth={1.5}
            />
            <text x={item.x} y={item.y - 4}
              textAnchor="middle"
              className="fill-zinc-300 text-[9px] font-mono font-bold">
              {item.name}({item.args.length > 12 ? item.args.slice(0, 12) + '…' : item.args})
            </text>
            {item.result && (
              <text x={item.x} y={item.y + 13}
                textAnchor="middle"
                className="fill-purple-400 text-[8px] font-mono">
                → {item.result}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-emerald-500/50" />
          <span className="text-[9px] text-zinc-500">Active Call</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-purple-500/50" />
          <span className="text-[9px] text-zinc-500">Returned</span>
        </div>
      </div>
    </div>
  );
}
