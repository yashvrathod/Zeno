'use client';

import { forwardRef } from 'react';

const ScaleBg = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      className="absolute inset-0 z-[1] opacity-0 pointer-events-none overflow-hidden bg-black"
    >
      {/* Aurora Base */}
      <div
        className="absolute inset-[-20%]"
        style={{
          background: `
            radial-gradient(circle at 18% 12%, rgba(255, 220, 190, 0.95) 0%, transparent 20%),
            radial-gradient(circle at 12% 26%, rgba(196, 156, 255, 0.85) 0%, transparent 26%),
            radial-gradient(circle at 82% 8%, rgba(120, 170, 255, 0.82) 0%, transparent 22%),
            radial-gradient(circle at 70% 22%, rgba(205, 255, 170, 0.45) 0%, transparent 18%),
            radial-gradient(circle at 45% 42%, rgba(255,255,255,0.08) 0%, transparent 40%),
            linear-gradient(
              145deg,
              #06070a 0%,
              #0d1014 25%,
              #111518 55%,
              #161d1a 100%
            )
          `,
          filter: 'blur(70px) saturate(180%)',
          transform: 'scale(1.25)',
        }}
      />

      {/* Holographic Light Sweep */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            linear-gradient(
              115deg,
              transparent 15%,
              rgba(255,255,255,0.05) 35%,
              rgba(255,255,255,0.12) 48%,
              rgba(180,220,255,0.10) 54%,
              transparent 72%
            )
          `,
          mixBlendMode: 'screen',
          filter: 'blur(30px)',
          transform: 'scale(1.2) rotate(-8deg)',
        }}
      />

      {/* Cinematic Glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              ellipse at 50% -10%,
              rgba(255,255,255,0.12),
              transparent 55%
            )
          `,
          mixBlendMode: 'soft-light',
          filter: 'blur(40px)',
        }}
      />

      {/* Noise Texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")
          `,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Premium Blur Blob */}
      <div
        className="absolute -top-20 left-[10%] h-[500px] w-[500px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,210,180,0.22) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      <div
        className="absolute top-[5%] right-[8%] h-[420px] w-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(120,170,255,0.18) 0%, transparent 70%)',
          filter: 'blur(110px)',
        }}
      />

      <div
        className="absolute bottom-[-10%] left-[35%] h-[450px] w-[450px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(180,255,170,0.12) 0%, transparent 70%)',
          filter: 'blur(120px)',
        }}
      />

      {/* Optional image texture */}
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: `url('/scale/image.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'overlay',
          filter: 'blur(1px) contrast(120%)',
        }}
      />

      {/* Glass Layer */}
      <div
        className="absolute inset-0 backdrop-blur-[120px]"
        style={{
          WebkitBackdropFilter: 'blur(120px)',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(
              circle at center,
              transparent 38%,
              rgba(0,0,0,0.52) 100%
            )
          `,
        }}
      />
    </div>
  );
});

ScaleBg.displayName = 'ScaleBg';

export default ScaleBg;