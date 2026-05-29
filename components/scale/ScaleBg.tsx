'use client';

import { forwardRef } from 'react';

const ScaleBg = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-[1] opacity-0 overflow-hidden bg-[#050505] pointer-events-none"
    >
      {/* Deep cinematic base */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(
              180deg,
              #050505 0%,
              #070707 25%,
              #0b0b0b 55%,
              #050505 100%
            )
          `,
        }}
      />

      {/* Massive atmospheric lighting */}
      <div
        className="absolute -top-[25%] left-[-10%] h-[150vw] w-[150vw] max-h-[900px] max-w-[900px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(255,220,180,0.05) 18%, transparent 62%)',
          filter: 'blur(120px)',
          transform: 'translateZ(0)',
        }}
      />

      <div
        className="absolute top-[5%] right-[-12%] h-[130vw] w-[130vw] max-h-[850px] max-w-[850px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(120,170,255,0.10) 0%, rgba(170,120,255,0.08) 22%, transparent 65%)',
          filter: 'blur(140px)',
          transform: 'translateZ(0)',
        }}
      />

      {/* Cinematic center glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[200vw] w-[200vw] max-h-[1200px] max-w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 28%, transparent 70%)',
          filter: 'blur(150px)',
        }}
      />

      {/* Elegant light streak */}
      <div
        className="absolute left-[-20%] top-[18%] h-[1px] w-[140%]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 20%, rgba(180,220,255,0.08) 50%, transparent 80%)',
          filter: 'blur(1px)',
          opacity: 0.8,
          transform: 'rotate(-6deg)',
        }}
      />

      {/* Premium grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px',
          maskImage:
            'radial-gradient(circle at center, black 30%, transparent 90%)',
          WebkitMaskImage:
            'radial-gradient(circle at center, black 30%, transparent 90%)',
        }}
      />

      {/* Vertical futuristic beam */}
      <div
        className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08), transparent)',
          filter: 'blur(1px)',
          opacity: 0.5,
        }}
      />

      {/* Metallic vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at center,
              transparent 38%,
              rgba(0,0,0,0.55) 100%
            )
          `,
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")
          `,
          mixBlendMode: 'soft-light',
        }}
      />

      {/* Glass atmosphere */}
      <div
        className="absolute inset-0 backdrop-blur-[20px] md:backdrop-blur-[40px]"
        style={{ transform: 'translateZ(0)' }}
      />
    </div>
  );
});

ScaleBg.displayName = 'ScaleBg';

export default ScaleBg;
