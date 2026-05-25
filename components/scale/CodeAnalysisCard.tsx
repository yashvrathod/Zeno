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
    }, 850);

    const timeout = setTimeout(() => setAnalyzing(false), 4200);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className="
        relative
        w-full
        h-full
        rounded-[28px]
        overflow-hidden
        border
        border-white/[0.08]
        bg-[#07090d]/85
        backdrop-blur-[24px]
        shadow-[0_40px_120px_rgba(0,0,0,0.75)]
      "
    >
      {/* Premium Ambient Layers */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="
            absolute
            -top-[25%]
            left-[-10%]
            h-[320px]
            w-[320px]
            rounded-full
            blur-[120px]
            opacity-60
          "
          style={{
            background:
              "radial-gradient(circle, rgba(255,220,185,0.22) 0%, transparent 70%)",
          }}
        />

        <div
          className="
            absolute
            top-[10%]
            right-[-8%]
            h-[260px]
            w-[260px]
            rounded-full
            blur-[120px]
            opacity-60
          "
          style={{
            background:
              "radial-gradient(circle, rgba(165,140,255,0.18) 0%, transparent 70%)",
          }}
        />

        <div
          className="
            absolute
            bottom-[-15%]
            left-[30%]
            h-[240px]
            w-[240px]
            rounded-full
            blur-[100px]
            opacity-40
          "
          style={{
            background:
              "radial-gradient(circle, rgba(120,190,255,0.16) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Noise */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")
          `,
        }}
      />

      {/* Top Reflection */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(
              135deg,
              rgba(255,255,255,0.10) 0%,
              transparent 22%,
              transparent 60%,
              rgba(255,255,255,0.03) 100%
            )
          `,
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f4d7bb]" />
            <div className="absolute inset-0 rounded-full bg-[#f4d7bb] blur-[6px] opacity-80" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-[#d9c3a7]/65">
              AI Analysis Engine
            </div>

            <div className="text-white/90 text-[12px] tracking-wide">
              Binary Search Runtime Audit
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              analyzing
                ? "bg-emerald-300 animate-pulse"
                : "bg-white/40"
            }`}
            style={{
              boxShadow: analyzing
                ? "0 0 12px rgba(110,231,183,0.8)"
                : "none",
            }}
          />

          <span className="text-[10px] uppercase tracking-[0.18em] text-white/45">
            {analyzing ? "Live" : "Completed"}
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="relative z-10 grid grid-cols-[1.35fr_0.65fr] h-[calc(100%-74px)]">

        {/* LEFT */}
        <div className="border-r border-white/[0.05] px-5 py-4">

          {/* Code */}
          <div className="space-y-[6px] font-mono text-[11px]">
            {codeLines.map((line, i) => (
              <div
                key={i}
                className={`
                  flex
                  transition-all
                  duration-500
                  ${
                    i === activeLine
                      ? "opacity-100 translate-x-1"
                      : "opacity-40"
                  }
                `}
              >
                <span className="w-7 text-white/25 select-none">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span
                  className={
                    line.type === "keyword"
                      ? "text-[#d8c6ff]"
                      : line.type === "function"
                      ? "text-[#b8e3ff]"
                      : line.type === "condition"
                      ? "text-[#f3eee8]"
                      : line.type === "variable"
                      ? "text-[#c7c7d3]"
                      : line.type === "return"
                      ? "text-[#b7f0d7]"
                      : "text-white/60"
                  }
                >
                  {line.text}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Insights */}
          <div className="space-y-3">
            {insights.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[10px] text-white/58 tracking-wide"
              >
                <div className="w-1 h-1 rounded-full bg-[#f4d7bb]/70" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col justify-between p-5">

          {/* Score */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[#d9c3a7]/60 mb-3">
              Confidence
            </div>

            <div
              className="
                text-[4rem]
                leading-none
                font-light
                tracking-tight
                bg-gradient-to-b
                from-[#fff8f0]
                via-[#f1dbc2]
                to-[#b9a2ff]
                bg-clip-text
                text-transparent
              "
            >
              98%
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-white/45">
              Pattern recognition and execution flow optimized for interview-grade performance.
            </p>
          </div>

          {/* Metrics */}
          <div className="space-y-4 mt-8">
            {metrics.map((m, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                    {m.label}
                  </span>

                  <span className="text-[10px] text-white/80 font-mono">
                    {m.value}
                  </span>
                </div>

                <div className="h-[4px] rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${m.progress * 100}%`,
                      background:
                        "linear-gradient(90deg,#f4d7bb 0%, #d8c6ff 45%, #b8e3ff 100%)",
                      boxShadow:
                        "0 0 12px rgba(216,198,255,0.35)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Accent */}
      <div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, rgba(244,215,187,0.55), transparent)",
        }}
      />

      {/* Border Glow */}
      <div className="absolute inset-0 rounded-[28px] border border-white/[0.03] pointer-events-none" />
    </div>
  );
}
