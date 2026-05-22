'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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
  { label: 'Time', value: 'O(log n)', progress: 0.85 },
  { label: 'Space', value: 'O(1)', progress: 0.95 },
  { label: 'Optimal', value: '98%', progress: 0.98 },
];

export default function CodeAnalysisCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(0);
  const [analyzing, setAnalyzing] = useState(true);

  useEffect(() => {
    if (!cardRef.current) return;

    gsap.to(cardRef.current, {
      y: `random(-5, 5)`,
      x: `random(-3, 3)`,
      rotateY: `random(-2, 2)`,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    const interval = setInterval(() => {
      setActiveLine((prev) => (prev + 1) % codeLines.length);
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
        relative
        w-[520px]
        h-[280px]
        rounded-3xl
        border border-white/40
        bg-white/[0.03]
        backdrop-blur-[12px]
        shadow-[0_0_60px_rgba(255,255,255,0.15),0_20px_60px_rgba(0,0,0,0.4)]
        overflow-hidden
      "
      style={{
        transformStyle: 'preserve-3d',
        // transform: 'rotateY(-8deg) rotateX(5deg)',
         transform: 'translateY(98%) rotateX(10deg) rotateY(-35deg) rotateZ(5deg) translateZ(10px)',
      }}
    >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <span className="text-white/80 text-[12px] font-mono tracking-wide">
              AI Code Analysis
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${analyzing ? 'bg-green-400 animate-pulse' : 'bg-white/40'}`} />
            <span className="text-white/40 text-[10px] font-mono">
              {analyzing ? 'Analyzing...' : 'Complete'}
            </span>
          </div>
        </div>

        {/* CODE BLOCK */}
        <div className="px-5 py-4 font-mono text-[11px] leading-relaxed">
          {codeLines.map((line, i) => (
            <div
              key={i}
              className={`transition-opacity duration-300 ${
                i === activeLine ? 'opacity-100' : 'opacity-30'
              }`}
            >
              <span className="text-white/20 mr-3 select-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={
                  line.type === 'keyword' ? 'text-white/70' :
                  line.type === 'function' ? 'text-white/90' :
                  line.type === 'condition' ? 'text-white/60' :
                  line.type === 'variable' ? 'text-white/50' :
                  line.type === 'return' ? 'text-white/80' :
                  'text-white/40'
                }
              >
                {line.text}
              </span>
            </div>
          ))}
        </div>

        {/* METRICS */}
        <div className="px-5 pb-4 space-y-2">
          {metrics.map((metric, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-white/40 text-[10px] font-mono w-10">
                {metric.label}
              </span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full transition-all duration-1000"
                  style={{ width: `${metric.progress * 100}%` }}
                />
              </div>
              <span className="text-white/70 text-[10px] font-mono w-12 text-right">
                {metric.value}
              </span>
            </div>
          ))}
        </div>

        {/* GLOW */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.04) 100%)',
          }}
        />

        {/* BOTTOM LINE */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
  );
}
