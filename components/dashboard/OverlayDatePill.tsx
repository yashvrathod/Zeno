'use client';

import { ReactNode } from 'react';

interface OverlayDatePillProps {
  label: string;
  icon?: ReactNode;
  className?: string;
}

export function OverlayDatePill({ label, icon, className = '' }: OverlayDatePillProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold tracking-wide shadow-lg ${className}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
