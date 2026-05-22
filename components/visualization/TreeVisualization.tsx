"use client";

import React from "react";

interface TreeNode {
  value: string | number;
  left?: TreeNode | null;
  right?: TreeNode | null;
  highlight?: string;
}

type NullableTreeNode = TreeNode | null;

interface TreeVisualizationProps {
  root: TreeNode | null;
  label?: string;
}

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  left?: LayoutNode | null;
  right?: LayoutNode | null;
}

function layoutTree(root: TreeNode | null): LayoutNode | null {
  if (!root) return null;
  const spacing = 48;
  const levelHeight = 64;

  function calcWidth(node: TreeNode | null | undefined): number {
    if (!node) return 0;
    return calcWidth(node.left) + spacing + calcWidth(node.right) || spacing;
  }

  function assign(node: TreeNode | null | undefined, x: number, y: number, offset: number): LayoutNode | null {
    if (!node) return null;
    const leftWidth = calcWidth(node.left);
    const nx = x + leftWidth;
    return {
      ...node,
      x: nx,
      y,
      left: assign(node.left, x, y + levelHeight, offset),
      right: assign(node.right, nx + spacing, y + levelHeight, offset),
    };
  }

  const totalWidth = calcWidth(root);
  return assign(root, 20, 40, totalWidth);
}

export function TreeVisualization({ root, label }: TreeVisualizationProps) {
  const layout = layoutTree(root);
  if (!layout) {
    return (
      <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
        <div className="py-8 text-center text-zinc-700 text-xs font-mono">Empty Tree</div>
      </div>
    );
  }

  const nodes: Array<{ x: number; y: number; value: string | number; highlight?: string }> = [];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  function traverse(node: LayoutNode | null) {
    if (!node) return;
    nodes.push({ x: node.x, y: node.y, value: node.value, highlight: node.highlight });
    if (node.left) {
      edges.push({ x1: node.x, y1: node.y, x2: node.left.x, y2: node.left.y });
      traverse(node.left);
    }
    if (node.right) {
      edges.push({ x1: node.x, y1: node.y, x2: node.right.x, y2: node.right.y });
      traverse(node.right);
    }
  }
  traverse(layout);

  const maxX = Math.max(...nodes.map(n => n.x), 100);
  const maxY = Math.max(...nodes.map(n => n.y), 100);

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4 overflow-x-auto">
      {label && (
        <div className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-3">{label}</div>
      )}
      <svg width={maxX + 60} height={maxY + 60} className="mx-auto">
        {/* Edges */}
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1} y1={e.y1 + 18}
            x2={e.x2} y2={e.y2 - 18}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1.5"
          />
        ))}
        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle
              cx={n.x} cy={n.y}
              r={18}
              className={
                n.highlight === 'visited' ? 'fill-purple-500/30 stroke-purple-400' :
                n.highlight === 'current' ? 'fill-emerald-500/30 stroke-emerald-400' :
                'fill-white/10 stroke-zinc-600'
              }
              strokeWidth={1.5}
            />
            <text
              x={n.x} y={n.y + 4}
              textAnchor="middle"
              className="fill-zinc-300 text-[11px] font-mono"
            >
              {n.value}
            </text>
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500/50" />
          <span className="text-[9px] text-zinc-500">Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          <span className="text-[9px] text-zinc-500">Current</span>
        </div>
      </div>
    </div>
  );
}
