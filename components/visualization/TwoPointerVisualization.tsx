"use client";

import type { VisualizationStep, ArrayElement } from "@/lib/execution-trace/types";

interface TwoPointerVisualizationProps {
  step: VisualizationStep;
}

export function TwoPointerVisualization({ step }: TwoPointerVisualizationProps) {
  const data = step.data as any;
  const elements: ArrayElement[] = data?.array ?? [];
  const left = data?.left;
  const right = data?.right;
  const mid = data?.mid;

  const description = data?.description ?? "";

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 min-h-[100px] relative">
        {elements.map((el, i) => {
          const isLeft = left && i === left.index;
          const isRight = right && i === right.index;
          const isMid = mid && i === mid.index;

          let bg = "bg-muted";
          if (isLeft) bg = "bg-red-500";
          else if (isRight) bg = "bg-pink-500";
          else if (isMid) bg = "bg-blue-500";
          else if (el.highlight === "compared") bg = "bg-yellow-400";
          else if (el.highlight === "sorted") bg = "bg-green-500";

          return (
            <div
              key={i}
              className="flex flex-col items-center relative"
              style={{ width: `${Math.max(36, 100 / Math.min(elements.length, 15))}%` }}
            >
              {isLeft && (
                <span className="text-[10px] font-bold text-red-500 mb-0.5">L</span>
              )}
              {isRight && !isLeft && (
                <span className="text-[10px] font-bold text-pink-500 mb-0.5">R</span>
              )}
              {isMid && !isLeft && !isRight && (
                <span className="text-[10px] font-bold text-blue-500 mb-0.5">M</span>
              )}
              {!isLeft && !isRight && !isMid && <span className="mb-0.5 h-3" />}

              <div
                className={`w-full rounded-t flex items-center justify-center text-xs font-mono font-bold text-white transition-all ${bg}`}
                style={{ height: "40px" }}
              >
                {String(el.value)}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">{el.index}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 text-xs font-mono">
        {left && <span className="text-red-500">left={left.index} (val={String(left.value)})</span>}
        {right && <span className="text-pink-500">right={right.index} (val={String(right.value)})</span>}
        {mid && mid.index >= 0 && <span className="text-blue-500">mid={mid.index} (val={String(mid.value)})</span>}
      </div>

      {description && (
        <div className="text-xs text-muted-foreground italic">
          {description}
        </div>
      )}
    </div>
  );
}
