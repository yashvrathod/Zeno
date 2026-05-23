'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const codeLines = [
  { text: 'function binarySearch(arr, target) {', type: 'keyword' },
  { text: '  let left = 0, right = arr.length - 1;', type: 'variable' },
  { text: '  while (left <= right) {', type: 'keyword' },
  { text: '    const mid = Math.floor((left + right) / 2);', type: 'function' },
  { text: '    if (arr[mid] === target) return mid;', type: 'condition' },
  { text: '    if (arr[mid] < target) left = mid + 1;', type: 'condition' },
  { text: '    else right = mid - 1;', type: 'condition' },
  { text: '  }', type: 'keyword' },
  { text: '  return -1;', type: 'return' },
  { text: '}', type: 'keyword' },
];

const metrics = [
  { label: 'Time',    value: 'O(log n)', progress: 0.85 },
  { label: 'Space',   value: 'O(1)',     progress: 0.95 },
  { label: 'Optimal', value: '98%',      progress: 0.98 },
];

// How many code lines to show at each breakpoint
const VISIBLE_LINES = { sm: 5, md: 7, lg: 10 } as const;

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export default function CodeAnalysisCard({ className, style }: Props) {
  const cardRef    = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(0);
  const [analyzing,  setAnalyzing]  = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  // Update visible lines on resize
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setVisibleCount(w < 480 ? VISIBLE_LINES.sm : w < 768 ? VISIBLE_LINES.md : VISIBLE_LINES.lg);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!cardRef.current) return;

    const interval = setInterval(() => {
      setActiveLine((prev) => (prev + 1) % codeLines.length);
    }, 800);

    const timeout = setTimeout(() => setAnalyzing(false), 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const displayedLines = codeLines.slice(0, visibleCount);

  return (
    <div
      ref={cardRef}
      className={className ?? ''}
      style={{
        width:  'min(500px, calc(100vw - 40px))',
        height: 'clamp(220px, 28vw, 320px)',
        transformStyle: 'preserve-3d',
        ...style,
      }}
    >
      <div
        className="
          relative w-full h-full
          rounded-2xl sm:rounded-3xl
          border border-white/40
          bg-white/[0.03]
          backdrop-blur-[12px]
          shadow-[0_0_60px_rgba(255,255,255,0.15),0_20px_60px_rgba(0,0,0,0.4)]
          overflow-hidden
        "
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3 border-b border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/60" />
            <span className="text-white/80 text-[10px] sm:text-[12px] font-mono tracking-wide">
              AI Code Analysis
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${analyzing ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
            <span className="text-white/40 text-[9px] sm:text-[10px] font-mono">
              {analyzing ? 'Analyzing...' : 'Complete'}
            </span>
          </div>
        </div>

        {/* ── CODE BLOCK ─────────────────────────────────────────────────── */}
        <div className="px-3 sm:px-5 py-2 sm:py-4 font-mono text-[9px] sm:text-[10px] lg:text-[11px] leading-relaxed">
          {displayedLines.map((line, i) => (
            <div
              key={i}
              className={`transition-opacity duration-300 truncate ${
                i === activeLine % visibleCount ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span className="text-white/20 mr-2 sm:mr-3 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={
                  line.type === 'keyword'   ? 'text-white/70' :
                  line.type === 'function'  ? 'text-white/90' :
                  line.type === 'condition' ? 'text-white/60' :
                  line.type === 'variable'  ? 'text-white/50' :
                  line.type === 'return'    ? 'text-white/80' :
                  'text-white/40'
                }
              >
                {line.text}
              </span>
            </div>
          ))}
        </div>

        {/* ── METRICS ────────────────────────────────────────────────────── */}
        <div className="px-3 sm:px-5 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2">
          {metrics.map((metric, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3">
              <span className="text-white/40 text-[9px] sm:text-[10px] font-mono w-8 sm:w-10 shrink-0">
                {metric.label}
              </span>
              <div className="flex-1 h-[3px] sm:h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full transition-all duration-1000"
                  style={{ width: `${metric.progress * 100}%` }}
                />
              </div>
              <span className="text-white/70 text-[9px] sm:text-[10px] font-mono w-10 sm:w-12 text-right shrink-0">
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── GLOW OVERLAY ───────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)',
          }}
        />

        {/* ── BOTTOM LINE ────────────────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    </div>
  );
}