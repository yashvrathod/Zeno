"use client";

import { useEffect, useState } from "react";

const codeLines = [
  { text: "function binarySearch(arr, target) {", type: "keyword" },
  { text: "  let left = 0, right = arr.length - 1;", type: "variable" },
  { text: "  while (left <= right) {", type: "keyword" },
  { text: "    const mid = Math.floor((left + right) / 2);", type: "function" },
  { text: "    if (arr[mid] === target) return mid;", type: "condition" },
  { text: "    if (arr[mid] < target) left = mid + 1;", type: "condition" },
  { text: "    else right = mid - 1;", type: "condition" },
  { text: "  }", type: "keyword" },
  { text: "  return -1;", type: "return" },
  { text: "}", type: "keyword" },
];

const metrics = [
  { label: "Time", value: "O(log n)", progress: 0.85 },
  { label: "Space", value: "O(1)", progress: 0.95 },
  { label: "Optimal", value: "98%", progress: 0.98 },
];

const insights = [
  "Pattern detected: Divide & Conquer",
  "Memory allocation optimized",
  "Branch prediction stabilized",
  "Execution path validated",
];

export default function CodeAnalysisCard() {
  const [activeLine, setActiveLine] = useState(0);
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLine((p) => (p + 1) % codeLines.length);
    }, 800);

    const timeout = setTimeout(() => setAnalyzing(false), 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className="
        relative w-full h-full
        rounded-[22px]
        border border-white/40
        bg-black/30
        backdrop-blur-[18px]
        shadow-[0_0_50px_rgba(255,255,255,0.12),0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.6)]
        overflow-hidden
      "
    >
      {/* Ambient Glow */}
      <div className="absolute inset-0 opacity-60 pointer-events-none">
        <div className="absolute -top-24 left-[-10%] w-[280px] h-[280px] rounded-full bg-purple-500/30 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[240px] h-[240px] rounded-full bg-cyan-400/20 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/15">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          <span className="text-white text-[11px] font-mono tracking-wide">
            AI Code Analysis
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              analyzing ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-white/60"
            }`}
          />
          <span className="text-white/60 text-[10px] font-mono">
            {analyzing ? "Analyzing..." : "Complete"}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="relative z-10 grid grid-cols-[1.3fr_0.7fr] h-[calc(100%-52px)]">
        
        {/* Left Side */}
        <div className="border-r border-white/8">
          {/* Code */}
          <div className="px-4 pt-3 pb-2 font-mono text-[10px] leading-relaxed">
            {codeLines.map((line, i) => (
              <div
                key={i}
                className={`transition-all duration-300 truncate ${
                  i === activeLine
                    ? "opacity-100 translate-x-1"
                    : "opacity-45"
                }`}
              >
                <span className="text-white/40 mr-2 select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span
                  className={
                    line.type === "keyword"
                      ? "text-purple-200"
                      : line.type === "function"
                      ? "text-cyan-200"
                      : line.type === "condition"
                      ? "text-white/80"
                      : line.type === "variable"
                      ? "text-white/60"
                      : line.type === "return"
                      ? "text-emerald-200"
                      : "text-white/55"
                  }
                >
                  {line.text}
                </span>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="px-4 pt-2 space-y-2">
            {insights.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[9px] text-white/70 font-mono"
              >
                <div className="w-1 h-1 rounded-full bg-white/60" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side */}
        <div className="flex flex-col justify-between p-4">
          
          {/* AI Score */}
          <div>
            <div className="text-white/50 text-[9px] uppercase tracking-[0.18em] mb-2">
              Confidence
            </div>

            <div className="text-white text-4xl font-light tracking-tight">
              98<span className="text-xl text-white/60">%</span>
            </div>

            <div className="mt-2 text-white/60 text-[10px] leading-relaxed">
              Pattern recognition and execution flow successfully optimized.
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-3 mt-6">
            {metrics.map((m, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/60 text-[9px] font-mono">
                    {m.label}
                  </span>

                  <span className="text-white/90 text-[9px] font-mono">
                    {m.value}
                  </span>
                </div>

                <div className="h-[3px] bg-white/15 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white/40 to-white/90 transition-all duration-1000"
                    style={{ width: `${m.progress * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Glass Reflection */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 40%,rgba(255,255,255,0.04) 100%)",
        }}
      />

      {/* Bottom Glow */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}