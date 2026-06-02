'use client';

import { ChevronDown } from 'lucide-react';

interface DateRangePillProps {
  label: string;
  onClick?: () => void;
}

export function DateRangePill({ label, onClick }: DateRangePillProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl glass-pill text-[11px] font-semibold text-nx-text hover:bg-white/[0.04] transition-colors"
    >
      {label}
      <ChevronDown size={12} className="text-nx-muted" />
    </button>
  );
}
