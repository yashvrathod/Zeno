'use client';

import type { ReactNode } from 'react';

interface Phase {
  label: string;
  start: number;
  end: number;
}

export default function ScrollDebug({ scrollPos, phases, children }: { scrollPos: number; phases: Phase[]; children?: ReactNode }) {
  return (
    <div className="fixed bottom-4 left-4 z-[999] bg-black/85 text-white/90 font-mono text-[11px] leading-relaxed px-3 py-2.5 rounded-lg border border-white/20 pointer-events-none shadow-lg">
      <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1">Scroll Debug</div>
      <div className="text-yellow-300 font-bold mb-1">scrollY: {scrollPos}px</div>
      {phases.map(({ label, start, end }) => (
        <div key={label} className={scrollPos >= start ? 'text-green-400' : 'text-white/40'}>
          {label.padEnd(8)} {start}–{end}
        </div>
      ))}
      {children}
    </div>
  );
}
