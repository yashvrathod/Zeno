'use client';

import type { ReactNode } from 'react';

interface ContentPanelProps {
  panelRef: React.Ref<HTMLDivElement>;
  side: 'left' | 'right';
  title: string;
  description: string;
  children?: ReactNode;
}

export default function ContentPanel({ panelRef, side, title, description, children }: ContentPanelProps) {
  const isLeft = side === 'left';
  const alignmentClasses = isLeft
    ? 'left-6 sm:left-8 lg:left-16'
    : 'right-6 sm:right-8 lg:right-16';
  const vertClasses = isLeft ? 'top-1/2 -translate-y-1/2' : 'top-[30%] sm:top-1/4 -translate-y-1/2';
  const textAlign = isLeft ? 'text-left' : 'text-right';

  return (
    <div
      ref={panelRef}
      className={`absolute ${alignmentClasses} ${vertClasses} z-40 pointer-events-none opacity-0 ${textAlign}`}
      style={{ maxWidth: 'min(400px, calc(100vw - 64px))' }}
    >
      <div className={`w-8 sm:w-12 h-[1px] sm:h-[2px] bg-white/30 rounded-full mb-5 sm:mb-8 ${isLeft ? '' : 'ml-auto'}`} />
      <h2 className="text-xl sm:text-3xl lg:text-[clamp(1.75rem,3vw,2.75rem)] font-semibold text-white leading-tight tracking-tight">
        {title}
      </h2>
      <p className={`mt-3 sm:mt-5 text-xs sm:text-base lg:text-[clamp(0.85rem,1.2vw,1.05rem)] text-white/50 leading-relaxed ${isLeft ? '' : 'ml-auto'}`}>
        {description}
      </p>
      {children && (
        <div className={`mt-5 sm:mt-6 flex gap-3 ${isLeft ? '' : 'justify-end'}`}>
          {children}
        </div>
      )}
    </div>
  );
}
