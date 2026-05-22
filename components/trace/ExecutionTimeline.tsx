"use client";

import { useMemo } from "react";
import type { TraceStep } from "@/lib/execution-trace/types";

interface ExecutionTimelineProps {
  steps: TraceStep[];
  currentStep: number;
  onSelectStep: (step: number) => void;
}

const STEP_COLORS: Record<string, string> = {
  assignment: "bg-blue-500",
  loop_start: "bg-green-500",
  loop_end: "bg-green-300",
  loop_iteration: "bg-green-400",
  condition: "bg-yellow-400",
  function_call: "bg-purple-500",
  function_return: "bg-purple-300",
  array_mutation: "bg-orange-500",
  pointer_move: "bg-red-400",
};

export function ExecutionTimeline({ steps, currentStep, onSelectStep }: ExecutionTimelineProps) {
  const rows = useMemo(() => {
    const maxShow = 100;
    if (steps.length <= maxShow) return steps;

    if (currentStep < maxShow / 2) return steps.slice(0, maxShow);
    if (currentStep > steps.length - maxShow / 2) return steps.slice(-maxShow);

    const start = Math.max(0, currentStep - maxShow / 2);
    return steps.slice(start, start + maxShow);
  }, [steps, currentStep]);

  const offset = steps.indexOf(rows[0]);

  return (
    <div className="border rounded-lg max-h-48 overflow-y-auto">
      <div className="p-2 bg-muted/50 text-xs font-medium border-b sticky top-0 bg-background z-10">
        Execution Timeline
      </div>
      <div className="p-1">
        {rows.map((step, i) => {
          const realIndex = i + offset;
          const isCurrent = realIndex === currentStep;
          const color = STEP_COLORS[step.type] || "bg-gray-400";

          return (
            <button
              key={realIndex}
              onClick={() => onSelectStep(realIndex)}
              className={`w-full flex items-center gap-2 p-1.5 text-xs rounded transition-colors ${
                isCurrent ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted/50"
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
              <span className="text-muted-foreground min-w-[3rem]">
                #{realIndex}
              </span>
              <span className="text-muted-foreground w-8">
                L{step.line}
              </span>
              <span className="truncate flex-1 text-left">
                {step.operation?.slice(0, 60) || step.type}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
