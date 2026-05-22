"use client";

interface StepControlsProps {
  currentStep: number;
  totalSteps: number;
  onForward: () => void;
  onBackward: () => void;
  onGoToStep: (step: number) => void;
  playMode: "idle" | "playing" | "paused";
  onPlayModeChange: (mode: "idle" | "playing" | "paused") => void;
}

export function StepControls({
  currentStep,
  totalSteps,
  onForward,
  onBackward,
  onGoToStep,
  playMode,
  onPlayModeChange,
}: StepControlsProps) {
  const progress = totalSteps > 0 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBackward}
        disabled={currentStep <= 0}
        className="px-3 py-1.5 text-sm bg-secondary rounded hover:bg-secondary/80 disabled:opacity-50"
        title="Previous step"
      >
        ◀
      </button>

      <button
        onClick={playMode === "playing" ? () => onPlayModeChange("paused") : () => onPlayModeChange("playing")}
        className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/80"
        title={playMode === "playing" ? "Pause" : "Play"}
      >
        {playMode === "playing" ? "⏸" : "▶"}
      </button>

      <button
        onClick={onForward}
        disabled={currentStep >= totalSteps - 1}
        className="px-3 py-1.5 text-sm bg-secondary rounded hover:bg-secondary/80 disabled:opacity-50"
        title="Next step"
      >
        ▶
      </button>

      <div className="flex-1 mx-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => onGoToStep(Number(e.target.value))}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <span className="text-xs text-muted-foreground min-w-[6rem] text-right">
        {currentStep + 1}/{totalSteps}
      </span>
    </div>
  );
}
