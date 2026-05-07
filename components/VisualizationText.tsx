"use client";

import React from "react";
import { processVisualizations } from "@/lib/client/visualizationParser";

interface VisualizationTextProps {
  text: string;
  className?: string;
}

export function VisualizationText({ text, className = "" }: VisualizationTextProps) {
  const { text: cleanText, visualizations } = React.useMemo(() => {
    return processVisualizations(text);
  }, [text]);

  // Split text by visualization positions and insert visualizations
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;

  visualizations.forEach((viz, index) => {
    // Add text before this visualization
    if (viz.index > lastIndex) {
      elements.push(
        <span key={`text-${index}`}>
          {cleanText.substring(lastIndex, viz.index)}
        </span>
      );
    }

    // Add the visualization
    elements.push(
      <div key={`viz-${index}`} className="my-4">
        <div className="bg-[#0d0d10] border border-white/10 rounded-lg p-4 font-mono text-[13px] text-zinc-300 overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">
              Algorithm Visualization
            </span>
            <span className="text-[10px] text-zinc-600 capitalize">
              {viz.type.replace(/-/g, " ")}
            </span>
          </div>
          <pre className="whitespace-pre text-zinc-400 leading-relaxed">
            {viz.rendered}
          </pre>
        </div>
      </div>
    );

    lastIndex = viz.index;
  });

  // Add remaining text
  if (lastIndex < cleanText.length) {
    elements.push(
      <span key="text-final">{cleanText.substring(lastIndex)}</span>
    );
  }

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {elements.length > 0 ? elements : cleanText}
    </div>
  );
}
