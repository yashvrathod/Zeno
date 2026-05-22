"use client";

import React, { useState, useMemo } from "react";
import type { HeapObject, Reference } from "@/lib/execution-trace/enhanced-types";

interface HeapMemoryViewProps {
  heap: HeapObject[];
  references: Reference[];
  variableNames: string[];
  maxHeight?: number;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  object: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-300" },
  array: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-300" },
  function: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-300" },
  string: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-300" },
  number: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-300" },
};

export function HeapMemoryView({ heap, references, variableNames, maxHeight = 300 }: HeapMemoryViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const orphans = useMemo(() => heap.filter(h => h.isOrphaned), [heap]);

  const varRefs = useMemo(() => {
    const map = new Map<string, string>();
    for (const ref of references) {
      if (ref.kind === 'variable→heap') {
        map.set(ref.to, ref.from);
      }
    }
    return map;
  }, [references]);

  const heapRefs = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const ref of references) {
      if (ref.kind === 'heap→heap') {
        const existing = map.get(ref.from) || [];
        existing.push(ref.to);
        map.set(ref.from, existing);
      }
    }
    return map;
  }, [references]);

  if (heap.length === 0) {
    return (
      <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Heap Memory</span>
          <span className="text-[9px] text-zinc-600 font-mono">0 objects</span>
        </div>
        <div className="py-6 text-center text-zinc-700 text-xs font-mono">No heap allocations</div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Heap Memory</span>
          <span className="text-[9px] text-zinc-600 font-mono">{heap.length} objects</span>
          {orphans.length > 0 && (
            <span className="text-[9px] text-rose-400 font-bold">⚠ {orphans.length} orphaned</span>
          )}
        </div>
      </div>

      <div
        className="relative overflow-y-auto space-y-2"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {/* Legend */}
        <div className="flex items-center gap-3 pb-2 border-b border-white/5 mb-2 text-[9px] text-zinc-600">
          {Object.entries(TYPE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded ${colors.bg} ${colors.border} border`} />
              <span>{type}</span>
            </div>
          ))}
        </div>

        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          {references.filter(r => r.kind === 'heap→heap').map((ref, i) => {
            const fromEl = document.getElementById(`heap-${ref.from}`);
            const toEl = document.getElementById(`heap-${ref.to}`);
            // We'll render arrows inline via CSS borders/connectors
            // SVG approach would need getBoundingClientRect which is fragile
            return null;
          })}
        </svg>

        {heap.map(obj => {
          const colors = TYPE_COLORS[obj.type] || TYPE_COLORS.object;
          const variableRef = varRefs.get(obj.id);
          const children = heapRefs.get(obj.id);

          return (
            <div
              key={obj.id}
              id={`heap-${obj.id}`}
              onClick={() => setSelectedId(selectedId === obj.id ? null : obj.id)}
              className={`
                rounded-xl border p-3 transition-all duration-200 cursor-pointer relative
                ${colors.bg} ${colors.border}
                ${selectedId === obj.id ? 'ring-2 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : ''}
                ${obj.isOrphaned ? 'opacity-60' : ''}
              `}
            >
              {/* Variable reference badge */}
              {variableRef && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[8px] text-purple-300 font-mono font-bold shadow-lg">
                  {variableRef}
                </div>
              )}

              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold ${colors.text}`}>{obj.id}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${colors.border} ${colors.text}`}>
                    {obj.type}
                  </span>
                  {obj.isOrphaned && (
                    <span className="text-[8px] text-rose-400 font-bold">ORPHAN</span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 font-mono truncate">{obj.preview}</div>

              {/* Referenced-by indicators */}
              {obj.referencedBy.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {obj.referencedBy.slice(0, 3).map(ref => (
                    <span key={ref} className="text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-600 font-mono">
                      ← {ref.length > 12 ? ref.slice(0, 12) + '…' : ref}
                    </span>
                  ))}
                  {obj.referencedBy.length > 3 && (
                    <span className="text-[7px] text-zinc-700">+{obj.referencedBy.length - 3}</span>
                  )}
                </div>
              )}

              {/* Children references */}
              {children && children.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5 text-[8px] text-zinc-600 font-mono">
                  <span>→</span>
                  {children.slice(0, 3).map(c => {
                    const child = heap.find(h => h.id === c);
                    return (
                      <span key={c} className="px-1 py-0.5 rounded bg-white/5">
                        {child ? child.preview.slice(0, 10) : c}
                      </span>
                    );
                  })}
                  {children.length > 3 && <span>+{children.length - 3}</span>}
                </div>
              )}

              {/* Orphaned label */}
              {obj.isOrphaned && (
                <div className="mt-1.5 text-[8px] text-rose-500/70 font-mono flex items-center gap-1">
                  <span>⚠</span> No live references — garbage collection candidate
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Orphaned summary */}
      {orphans.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-[9px] text-rose-400/70">
            <span>⚠</span>
            <span>{orphans.length} object{orphans.length > 1 ? 's' : ''} unreachable — may indicate a memory leak</span>
          </div>
        </div>
      )}
    </div>
  );
}
