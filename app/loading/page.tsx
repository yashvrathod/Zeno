'use client';

import { useEffect, useState } from 'react';

export default function LoadingPage() {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 3800;

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
      else {
        setTimeout(() => setFadeOut(true), 800);
        setTimeout(() => setDone(true), 1600);
      }
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (done) return null;

  const pct = progress / 100;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#020204] flex flex-col items-center justify-center transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : ''}`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(99,102,241,0.05) 30%, transparent 60%)`,
            transform: `scale(${0.3 + pct * 0.7})`,
          }}
        />
        <div
          className="absolute w-[400px] h-[200px] rounded-full blur-[100px] transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, rgba(192,132,252,0.06) 0%, transparent 60%)`,
            transform: `translateY(${Math.sin(pct * Math.PI * 2) * 20}px) translateX(${(pct - 0.5) * 60}px)`,
          }}
        />
      </div>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 100}%`,
              background: `rgba(139, 92, 246, ${0.1 + Math.random() * 0.2})`,
              animation: `drift ${3 + Math.random() * 5}s ease-in-out ${Math.random() * 4}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Main */}
      <div className="relative flex flex-col items-center gap-14">
        <div className="relative">
          {/* Behind glow */}
          <div
            className="absolute -inset-16 blur-[60px] rounded-full transition-all duration-1000"
            style={{
              background: `radial-gradient(circle, rgba(139,92,246,${pct * 0.15}) 0%, transparent 60%)`,
              transform: `scale(${0.8 + pct * 0.2})`,
            }}
          />

          {/* Stroke layer */}
          <h1
            className="text-[80px] md:text-[120px] leading-none select-none font-cursive"
            style={{
              color: 'transparent',
              WebkitTextStroke: `1.5px rgba(139, 92, 246, ${0.2 + pct * 0.8})`,
              clipPath: `inset(0 ${100 - pct * 100}% 0 0)`,
              transition: 'clip-path 0.08s linear',
            }}
          >
            Zeno
          </h1>

          {/* Fill layer - liquid wave */}
          <h1
            className="text-[80px] md:text-[120px] leading-none select-none absolute inset-0 font-cursive"
            style={{
              color: 'transparent',
              backgroundImage: `
                linear-gradient(
                  105deg,
                  transparent 0%,
                  transparent ${20 - pct * 20}%,
                  #818cf8 ${30 - pct * 15}%,
                  #a78bfa ${40 - pct * 12}%,
                  #c084fc ${50 - pct * 10}%,
                  #e9d5ff ${60 - pct * 8}%,
                  #a78bfa ${70 - pct * 6}%,
                  #818cf8 ${80 - pct * 5}%,
                  transparent ${90 - pct * 5}%,
                  transparent 100%
                )
              `,
              backgroundSize: '250% 100%',
              backgroundPosition: `${100 - pct * 200}% 0`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              clipPath: `inset(0 ${100 - pct * 100}% 0 0)`,
              transition: 'clip-path 0.08s linear, background-position 0.08s linear',
              filter: `drop-shadow(0 0 ${pct * 20}px rgba(139, 92, 246, ${pct * 0.2}))`,
            }}
          >
            Zeno
          </h1>
        </div>

        {/* Tagline */}
        <div
          className="transition-all duration-700"
          style={{
            opacity: Math.max(0, Math.min(1, (pct - 0.25) * 2.5)),
            transform: `translateY(${(1 - Math.max(0, Math.min(1, (pct - 0.25) * 2.5))) * 15}px)`,
          }}
        >
          <span className="text-[11px] md:text-[12px] text-zinc-600 font-mono tracking-[0.4em] uppercase">
            Your coding companion
          </span>
        </div>

        {/* Bar */}
        <div
          className="flex flex-col items-center gap-3 transition-all duration-700"
          style={{ opacity: Math.max(0, Math.min(1, (pct - 0.1) * 2)) }}
        >
          <div className="w-32 h-[1.5px] bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct * 100}%`,
                background: 'linear-gradient(90deg, #818cf8, #a78bfa, #c084fc)',
                transition: 'width 0.08s linear',
              }}
            />
          </div>
          <span className="text-[9px] text-zinc-700 font-mono tracking-[0.3em] uppercase">
            Loading...
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes drift {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(-80px) translateX(20px); opacity: 0.5; }
          90% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
