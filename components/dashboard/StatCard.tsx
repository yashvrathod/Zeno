'use client';

import { useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ReactNode } from 'react';
import { AnimatedCounter } from './AnimatedCounter';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  sub: string;
  gradient: string;
  suffix?: string;
  prefix?: string;
}

export function StatCard({ icon, label, value, sub, gradient, suffix = '', prefix = '' }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cleanup = useRef<(() => void) | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    gsap.to(card, {
      rotateX,
      rotateY,
      transformPerspective: 600,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;

    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.4,
      ease: 'power2.out',
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className="group glass-panel-strong rounded-2xl p-6 relative overflow-hidden cursor-default border-t-2 border-t-nx-accent/40"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-[0.03] blur-2xl group-hover:opacity-[0.08] transition-opacity duration-700`} />
      <div className="relative" style={{ transform: 'translateZ(20px)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg`}>
            {icon}
          </div>
          <span className="text-[9px] font-bold tracking-[0.25em] text-zinc-600 uppercase">{label}</span>
        </div>
        <div className={`text-4xl font-bold tracking-tight mb-1 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          <AnimatedCounter to={value} suffix={suffix} prefix={prefix} />
        </div>
        <div className="text-[10px] text-zinc-600">{sub}</div>
      </div>
    </div>
  );
}
