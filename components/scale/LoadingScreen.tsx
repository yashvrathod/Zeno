'use client';

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 2500; // Adjusted duration for a smoother feel

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        setTimeout(() => {
          setFadeOut(true);
          if (onComplete) onComplete();
        }, 500);
        setTimeout(() => setDone(true), 1200);
      }
    };
    
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  if (done) return null;

  const pct = progress / 100;

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#020604] flex flex-col items-center justify-center transition-opacity duration-1000 ${fadeOut ? 'opacity-0 pointer-events-none' : ''}`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[120px] transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.05) 30%, transparent 60%)`,
            transform: `scale(${0.3 + pct * 0.7})`,
          }}
        />
        <div
          className="absolute w-[400px] h-[200px] rounded-full blur-[100px] transition-all duration-1000"
          style={{
            background: `radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 60%)`,
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
              background: `rgba(16, 185, 129, ${0.1 + Math.random() * 0.2})`,
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
              background: `radial-gradient(circle, rgba(16,185,129,${pct * 0.15}) 0%, transparent 60%)`,
              transform: `scale(${0.8 + pct * 0.2})`,
            }}
          />

          {/* Stroke layer */}
          <h1
            className="text-[80px] md:text-[120px] leading-none select-none font-cursive"
            style={{
              color: 'transparent',
              WebkitTextStroke: `1.5px rgba(16, 185, 129, ${0.2 + pct * 0.8})`,
              clipPath: `inset(0 ${100 - pct * 100}% 0 0)`,
              transition: 'clip-path 0.08s linear',
            }}
          >
            neXode
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
                  #10b981 ${30 - pct * 15}%,
                  #34d399 ${40 - pct * 12}%,
                  #6ee7b7 ${50 - pct * 10}%,
                  #a7f3d0 ${60 - pct * 8}%,
                  #34d399 ${70 - pct * 6}%,
                  #10b981 ${80 - pct * 5}%,
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
              filter: `drop-shadow(0 0 ${pct * 20}px rgba(16, 185, 129, ${pct * 0.2}))`,
            }}
          >
            neXode
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
          <span className="text-[11px] md:text-[12px] text-emerald-900/40 font-mono tracking-[0.4em] uppercase">
            Master DSA with AI
          </span>
        </div>

        {/* Bar */}
        <div
          className="flex flex-col items-center gap-3 transition-all duration-700"
          style={{ opacity: Math.max(0, Math.min(1, (pct - 0.1) * 2)) }}
        >
          <div className="w-32 h-[1.5px] bg-emerald-500/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct * 100}%`,
                background: 'linear-gradient(90deg, #059669, #10b981, #34d399)',
                transition: 'width 0.08s linear',
              }}
            />
          </div>
          <span className="text-[9px] text-emerald-800/40 font-mono tracking-[0.3em] uppercase">
            Initialising...
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
