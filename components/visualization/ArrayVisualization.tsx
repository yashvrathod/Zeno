"use client";

import type { VisualizationStep, ArrayElement } from "@/lib/execution-trace/types";

interface ArrayVisualizationProps {
  step: VisualizationStep;
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  active: "bg-blue-500 text-white",
  compared: "bg-yellow-400 text-black",
  swapped: "bg-orange-500 text-white",
  pivot: "bg-purple-500 text-white",
  sorted: "bg-green-500 text-white",
  pointer_a: "bg-red-400 text-white",
  pointer_b: "bg-pink-400 text-white",
  none: "bg-muted text-foreground",
};

export function ArrayVisualization({ step }: ArrayVisualizationProps) {
  const data = step.data as any;
  const elements: ArrayElement[] = data?.elements ?? [];
  const variables = step.variables ?? {};

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 min-h-[80px] flex-wrap">
        {elements.map((el, i) => {
          const colorClass = HIGHLIGHT_COLORS[el.highlight || "none"] || HIGHLIGHT_COLORS.none;
          const height = typeof el.value === "number"
            ? Math.max(30, Math.min(80, (el.value as number) * 3))
            : 40;

          return (
            <div
              key={i}
              className="flex flex-col items-center"
              style={{ width: `${Math.max(32, 100 / Math.min(elements.length, 20))}%` }}
            >
              {el.label && (
                <span className="text-[10px] text-muted-foreground mb-0.5">{el.label}</span>
              )}
              <div
                className={`w-full rounded-t flex items-center justify-center text-xs font-mono font-bold transition-all ${colorClass}`}
                style={{ height: `${height}px`, minHeight: "30px" }}
              >
                {String(el.value)}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">{el.index}</span>
            </div>
          );
        })}
      </div>

      {Object.keys(variables).length > 0 && (
        <div className="flex gap-3 text-xs font-mono text-muted-foreground">
          {Object.entries(variables).map(([name, value]) => (
            <span key={name}>
              <strong>{name}</strong> = {formatVarValue(value)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatVarValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  return String(value);
}
