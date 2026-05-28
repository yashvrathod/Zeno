'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { CodeAnalysisCard } from '@/components/scale';

interface CodeShowcaseSectionProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  textRef: React.RefObject<HTMLDivElement | null>;
}

const features = [
  'Real-time pattern detection across 500+ DSA patterns',
  'Time & space complexity analysis for every solution',
  'Optimized alternatives with step-by-step reasoning',
  'Interview-specific feedback aligned with FAANG standards',
];

const codeParticles = [
  'function binarySearch()', 'const mid = (l+r)>>>1',
  'if (arr[mid] === target)', 'O(log n)', 'while (l <= r)',
  'return -1', 'arr.sort((a,b) => a-b)',
  'dp[i] = Math.max(dp[i-1],)', 'class TrieNode',
  'BFS(queue)', 'DFS(stack)', 'prev[x] = find(prev[x])',
  'for (let i=0; i<n; i++)', 'l++, r--', 'return lo < hi',
];

export const CodeShowcaseSection = forwardRef<HTMLDivElement, CodeShowcaseSectionProps>(
  ({ cardRef, textRef }, sectionRef) => {
    const particlesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = particlesRef.current;
      if (!el) return;
      const items = el.querySelectorAll<HTMLSpanElement>('[data-particle]');
      items.forEach((span, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 120 - 10;
        const size = 8 + Math.random() * 6;
        span.style.left = `${x}%`;
        span.style.top = `${y}%`;
        span.style.fontSize = `${size}px`;
      });
    }, []);

    return (
      <section
        ref={sectionRef}
        className="relative w-full min-h-screen overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #080b0f 0%, #0b0e14 30%, #06080c 70%, #030407 100%)' }}
      >
        <div
          data-bg-grid
          className="absolute inset-0 opacity-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)',
          }}
        />

        <div
          ref={particlesRef}
          className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 select-none"
          style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
        >
          {codeParticles.map((s, i) => (
            <span
              key={i}
              data-particle
              className="absolute text-white whitespace-nowrap"
              style={{
                color: ['#d8c6ff', '#b8e3ff', '#b7f0d7', '#f4d7bb'][i % 4],
              }}
            >
              {s}
            </span>
          ))}
        </div>

        <div
          data-orb
          className="absolute -top-[15%] left-[5%] h-[500px] w-[500px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(165,140,255,0.12) 0%, transparent 65%)',
            filter: 'blur(120px)',
          }}
        />
        <div
          data-orb
          className="absolute -bottom-[10%] right-[10%] h-[400px] w-[400px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(120,190,255,0.08) 0%, transparent 65%)',
            filter: 'blur(120px)',
          }}
        />
        <div
          data-orb
          className="absolute top-[30%] right-[40%] h-[300px] w-[300px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(180,220,255,0.05) 0%, transparent 65%)',
            filter: 'blur(100px)',
          }}
        />

        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#080b0f] to-transparent pointer-events-none z-[1]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030407] to-transparent pointer-events-none z-[1]" />

        <div className="relative z-10 w-full min-h-screen flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 px-6 sm:px-12 lg:px-20">
          <div
            ref={cardRef}
            className="w-full lg:w-[55%] h-[400px] sm:h-[500px] lg:h-[560px] will-change-transform"
            style={{ perspective: '1200px' }}
          >
            <CodeAnalysisCard />
          </div>

          <div
            ref={textRef}
            className="w-full lg:w-[35%] max-w-md opacity-0 will-change-transform"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/70 backdrop-blur-md mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-[#d8c6ff] animate-ping opacity-40" />
                <span className="relative rounded-full bg-[#d8c6ff] h-2 w-2" />
              </span>
              AI Analysis Engine
            </div>

            <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-medium tracking-[-0.03em] leading-[1.05] text-white mb-6">
              See AI analyze your{' '}
              <span className="bg-gradient-to-r from-[#d8c6ff] via-[#b8e3ff] to-[#b7f0d7] bg-clip-text text-transparent">
                code in real-time
              </span>
            </h2>

            <p className="text-white/50 text-base leading-relaxed mb-8">
              Paste any DSA problem and watch as the mentor identifies patterns, evaluates
              complexity, and surfaces interview-grade optimizations.
            </p>

            <ul className="space-y-4">
              {features.map((item, i) => (
                <li key={i} className="flex items-start gap-3 group">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#d8c6ff] shrink-0 group-hover:scale-150 transition-transform duration-300" />
                  <span className="text-white/60 group-hover:text-white/80 text-sm leading-relaxed transition-colors duration-300">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  },
);

CodeShowcaseSection.displayName = 'CodeShowcaseSection';
