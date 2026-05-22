"use client";

import { useMemo } from "react";
import type { VariableSnapshot } from "@/lib/execution-trace/types";

interface VariableInspectorProps {
  variables: Record<string, unknown>;
  previousVariables?: Record<string, VariableSnapshot>;
}

export function VariableInspector({ variables, previousVariables }: VariableInspectorProps) {
  const entries = useMemo(() => {
    return Object.entries(variables)
      .filter(([name]) => !name.startsWith("__") && !name.startsWith("___"))
      .map(([name, value]) => {
        const prev = previousVariables?.[name];
        const changed = prev !== undefined && JSON.stringify(prev.value) !== JSON.stringify(value);
        return { name, value, changed, prevValue: prev?.value };
      });
  }, [variables, previousVariables]);

  if (entries.length === 0) {
    return (
      <div className="p-3 border rounded-lg">
        <h4 className="text-sm font-medium mb-2">Variables</h4>
        <p className="text-xs text-muted-foreground">No variables tracked</p>
      </div>
    );
  }

  return (
    <div className="p-3 border rounded-lg">
      <h4 className="text-sm font-medium mb-2">Variables</h4>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {entries.map(({ name, value, changed, prevValue }) => (
          <div
            key={name}
            className={`flex justify-between items-center p-1.5 rounded text-xs font-mono ${
              changed ? "bg-yellow-500/10 border border-yellow-500/30" : ""
            }`}
          >
            <span className="font-semibold">{name}</span>
            <div className="text-right">
              <span className={changed ? "text-yellow-600" : ""}>
                {formatValue(value)}
              </span>
              {changed && (
                <div className="text-[10px] text-muted-foreground line-through">
                  {formatValue(prevValue)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value.length > 20 ? value.slice(0, 20) + "..." : value}"`;
  if (typeof value === "object") {
    try {
      const str = JSON.stringify(value);
      return str.length > 30 ? str.slice(0, 30) + "..." : str;
    } catch {
      return String(value);
    }
  }
  return String(value);
}
