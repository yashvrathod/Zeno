"use client";

import { useEffect, useState } from "react";

const arr = [1, 3, 5, 7, 9, 11, 13];

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

const pointerStates = [
  { left: -1, right: -1, mid: -1, highlight: -1 },
  { left: 0, right: 6, mid: -1, highlight: -1 },
  { left: 0, right: 6, mid: -1, highlight: -1 },
  { left: 0, right: 6, mid: 3, highlight: -1 },
  { left: 0, right: 6, mid: 3, highlight: 3 },
  { left: 0, right: 6, mid: 3, highlight: 3 },
  { left: 4, right: 6, mid: -1, highlight: -1 },
  { left: 4, right: 6, mid: -1, highlight: -1 },
  { left: 4, right: 6, mid: 5, highlight: -1 },
  { left: 4, right: 6, mid: 5, highlight: 5 },
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
  const [insightCount, setInsightCount] = useState(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const lineInterval = setInterval(() => {
      setActiveLine((p) => (p + 1) % codeLines.length);
    }, 850);

    const insightInterval = setInterval(() => {
      setInsightCount((p) => {
        if (p < insights.length) return p + 1;
        return p;
      });
    }, 900);

    const timeout = setTimeout(() => {
      setAnalyzing(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }, 4200);

    return () => {
      clearInterval(lineInterval);
      clearInterval(insightInterval);
      clearTimeout(timeout);
    };
  }, []);

  const state = pointerStates[activeLine];

  return (
    <div className="relative w-full h-full rounded-[28px] overflow-hidden border border-white/[0.06] bg-[#0c0c0e] shadow-[0_40px_120px_rgba(0,0,0,0.8)]">
      {/* Ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] left-[-10%] h-[320px] w-[320px] rounded-full blur-[120px] opacity-40"
          style={{ background: "radial-gradient(circle, rgba(139,157,195,0.12) 0%, transparent 70%)" }} />
        <div className="absolute top-[10%] right-[-8%] h-[260px] w-[260px] rounded-full blur-[120px] opacity-30"
          style={{ background: "radial-gradient(circle, rgba(176,196,222,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-15%] left-[30%] h-[240px] w-[240px] rounded-full blur-[100px] opacity-25"
          style={{ background: "radial-gradient(circle, rgba(139,157,195,0.08) 0%, transparent 70%)" }} />
      </div>

      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")` }} />

      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 22%, transparent 60%, rgba(139,157,195,0.04) 100%)",
      }} />

      {flash && (
        <div className="absolute inset-0 z-30 pointer-events-none animate-fade-out"
          style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%)" }} />
      )}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[#8b9dc3]" />
            <div className="absolute inset-0 rounded-full bg-[#8b9dc3] blur-[6px] opacity-50" />
          </div>
          <div>
            <div className="text-[12px] uppercase tracking-[0.24em] text-[#8b9dc3]/70">AI Analysis Engine</div>
            <div className="text-white/80 text-[14px] tracking-wide">Binary Search Runtime Audit</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${analyzing ? "bg-[#8b9dc3] animate-pulse" : "bg-white/20"}`}
            style={{ boxShadow: analyzing ? "0 0 12px rgba(139,157,195,0.5)" : "none" }} />
          <span className="text-[12px] uppercase tracking-[0.18em] text-white/35">
            {analyzing ? "Live" : "Completed"}
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 grid grid-cols-[1.35fr_0.65fr]" style={{ height: 'calc(100% - 74px)' }}>

        {/* LEFT */}
        <div className="border-r border-white/[0.04] px-5 py-4 flex flex-col gap-3">

          {/* Code */}
          <div className="space-y-[5px] font-mono text-[13px]">
            {codeLines.map((line, i) => (
              <div key={i} className="flex relative">
                {i === activeLine && (
                  <>
                    <div className="absolute left-[-20px] top-0 bottom-0 w-[1.5px] bg-[#8b9dc3]/60"
                      style={{ boxShadow: '0 0 6px rgba(139,157,195,0.3)' }} />
                    <div className="absolute inset-0 rounded bg-gradient-to-r from-[#8b9dc3]/[0.06] to-transparent" />
                  </>
                )}
                <span className={`w-7 select-none ${i === activeLine ? 'text-[#8b9dc3]' : 'text-white/15'}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`transition-all duration-500 ${i === activeLine ? "opacity-100 translate-x-0.5" : "opacity-35"}`}
                  style={i === activeLine ? { textShadow: '0 0 8px rgba(139,157,195,0.15)' } : {}}>
                  <span className={
                    line.type === "keyword" ? "text-[#8b9dc3]" :
                    line.type === "function" ? "text-[#b0c4de]" :
                    line.type === "condition" ? "text-white/80" :
                    line.type === "variable" ? "text-white/55" :
                    line.type === "return" ? "text-white/65" :
                    "text-white/40"
                  }>
                    {line.text}
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* Array viz */}
          <div className="flex items-end gap-[3px] h-12 pt-2 pb-1">
            {arr.map((val, i) => {
              const isLeft = state.left === i;
              const isRight = state.right === i;
              const isMid = state.mid === i;
              const isHighlighted = state.highlight === i;
              const isInRange = state.left >= 0 && state.right >= 0 && i >= state.left && i <= state.right;

              return (
                <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                  <div className="flex gap-[3px] items-center justify-center h-5 w-full">
                    {isLeft && <span className="text-[9px] font-mono text-[#8b9dc3] leading-none">L</span>}
                    {isMid && isLeft && <span className="text-[9px] font-mono text-[#b0c4de] leading-none">M</span>}
                    {isMid && !isLeft && <span className="text-[9px] font-mono text-[#b0c4de] leading-none">M</span>}
                    {isRight && <span className="text-[9px] font-mono text-[#8b9dc3] leading-none">R</span>}
                  </div>
                  <div
                    className={`w-full h-7 rounded-[4px] flex items-center justify-center text-[12px] font-mono font-medium transition-all duration-500 ${
                      isHighlighted
                        ? "bg-[#8b9dc3]/25 text-white shadow-[0_0_12px_rgba(139,157,195,0.25)] scale-110 border border-[#8b9dc3]/40"
                        : isMid
                        ? "bg-white/10 text-white/80"
                        : isInRange
                        ? "bg-white/[0.06] text-white/60"
                        : "bg-white/[0.03] text-white/25"
                    }`}
                  >
                    {val}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#8b9dc3]/20 to-transparent" />

          {/* Insights */}
          <div className="space-y-2.5">
            {insights.slice(0, insightCount).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-white/45 tracking-wide"
                style={{ animation: 'fadeSlideIn 0.4s ease-out forwards' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#8b9dc3]/50" />
                <span>{item}</span>
              </div>
            ))}
            {!analyzing && insightCount >= insights.length && (
              <div className="flex items-center gap-2 text-[12px] text-white/50 tracking-wide">
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Analysis complete</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col justify-between p-5">
          <div>
            <div className="text-[12px] uppercase tracking-[0.28em] text-[#8b9dc3]/60 mb-3">Confidence</div>
            <div className="text-[4rem] leading-none font-light tracking-tight bg-gradient-to-b from-[#8b9dc3] via-[#b0c4de] to-[#d4e0f0] bg-clip-text text-transparent">
              98%
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-white/35">
              Pattern recognition and execution flow optimized for interview-grade performance.
            </p>
          </div>

          {/* Metrics */}
          <div className="space-y-4 mt-8">
            {metrics.map((m, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] uppercase tracking-[0.18em] text-white">{m.label}</span>
                  <span className="text-[13px] text-white font-mono">{m.value}</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${m.progress * 100}%`,
                      background: "linear-gradient(90deg, #8b9dc3, #b0c4de)",
                      boxShadow: "0 0 8px rgba(139,157,195,0.2)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#8b9dc3]/40 to-transparent" />
      <div className="absolute inset-0 rounded-[28px] border border-white/[0.02] pointer-events-none" />
    </div>
  );
}
