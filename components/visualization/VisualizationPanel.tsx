"use client";

import type { VisualizationData, VisualizationStep } from "@/lib/execution-trace/types";
import { ArrayVisualization } from "./ArrayVisualization";
import { TwoPointerVisualization } from "./TwoPointerVisualization";

interface VisualizationPanelProps {
  visualization?: VisualizationData | null;
  currentStepIndex: number;
}

export function VisualizationPanel({ visualization, currentStepIndex }: VisualizationPanelProps) {
  if (!visualization || visualization.steps.length === 0) {
    return (
      <div className="p-4 border rounded-lg min-h-[200px] flex items-center justify-center text-sm text-muted-foreground">
        No visualization available
      </div>
    );
  }

  const step = visualization.steps[Math.min(currentStepIndex, visualization.steps.length - 1)];

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">
          {visualization.metadata.title}
        </h4>
        <span className="text-xs text-muted-foreground">
          Algorithm: {visualization.algorithm}
        </span>
      </div>

      {step && (
        <div className="mb-2 text-xs text-muted-foreground">
          {step.description}
        </div>
      )}

      {renderVisualization(visualization, step)}

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Active
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Sorted
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400" /> Comparing
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400" /> Pointer
        </span>
      </div>
    </div>
  );
}

function renderVisualization(viz: VisualizationData, step?: VisualizationStep) {
  if (!step) return null;

  switch (viz.type) {
    case "two_pointer":
    case "binary_search":
      return <TwoPointerVisualization step={step} />;
    case "array_traversal":
    case "sliding_window":
      return <ArrayVisualization step={step} />;
    default:
      return (
        <pre className="text-xs font-mono overflow-x-auto p-2 bg-muted rounded">
          {JSON.stringify(step.data, null, 2)}
        </pre>
      );
  }
}
