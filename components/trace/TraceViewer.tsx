"use client";

import { useState, useMemo } from "react";
import type { ExecutionTrace, TraceStep, VisualizationData } from "@/lib/execution-trace/types";
import { StepControls } from "./StepControls";
import { VariableInspector } from "./VariableInspector";
import { ExecutionTimeline } from "./ExecutionTimeline";
import { VisualizationPanel } from "../visualization/VisualizationPanel";

interface TraceViewerProps {
  trace: ExecutionTrace | null;
  visualization?: VisualizationData | null;
  loading?: boolean;
  onRequestStep?: (direction: "forward" | "backward") => void;
}

export function TraceViewer({ trace, visualization, loading, onRequestStep }: TraceViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [playMode, setPlayMode] = useState<"idle" | "playing" | "paused">("idle");

  const steps = trace?.steps ?? [];
  const currentTraceStep: TraceStep | null = steps[currentStep] ?? null;
  const totalSteps = steps.length;

  const currentVariables = useMemo(() => {
    if (!currentTraceStep) return {};
    const vars: Record<string, unknown> = {};
    for (const [name, snap] of Object.entries(currentTraceStep.variables)) {
      if (!name.startsWith("__") && !name.startsWith("___")) {
        vars[name] = snap.value;
      }
    }
    return vars;
  }, [currentTraceStep]);

  const handleStepForward = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1);
      onRequestStep?.("forward");
    }
  };

  const handleStepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
      onRequestStep?.("backward");
    }
  };

  const handleGoToStep = (step: number) => {
    setCurrentStep(Math.max(0, Math.min(step, totalSteps - 1)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Running execution trace...
      </div>
    );
  }

  if (!trace || steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No execution trace available. Submit code to generate a trace.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Execution Trace</h3>
        <span className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
          {trace.summary.error && <span className="ml-2 text-destructive">({trace.summary.error})</span>}
        </span>
      </div>

      <StepControls
        currentStep={currentStep}
        totalSteps={totalSteps}
        onForward={handleStepForward}
        onBackward={handleStepBackward}
        onGoToStep={handleGoToStep}
        playMode={playMode}
        onPlayModeChange={setPlayMode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <VisualizationPanel
            visualization={visualization}
            currentStepIndex={currentStep}
          />
        </div>
        <div>
          <VariableInspector
            variables={currentVariables}
            previousVariables={currentStep > 0 ? steps[currentStep - 1]?.variables : undefined}
          />
        </div>
      </div>

      <ExecutionTimeline
        steps={steps}
        currentStep={currentStep}
        onSelectStep={handleGoToStep}
      />

      {currentTraceStep && (
        <div className="p-3 bg-muted rounded text-sm font-mono">
          <div className="text-xs text-muted-foreground mb-1">
            Line {currentTraceStep.line} · {currentTraceStep.operation}
          </div>
          <div className="text-xs opacity-70">
            {currentTraceStep.code}
          </div>
        </div>
      )}
    </div>
  );
}
