'use client';

import { ReactNode } from 'react';

interface StatusPillProps {
  icon?: ReactNode;
  label: string;
  value?: string | number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
}

const variantStyles: Record<NonNullable<StatusPillProps['variant']>, { bg: string; text: string; border: string }> = {
  default: { bg: 'bg-white/[0.03]', text: 'text-nx-text', border: 'border-white/[0.06]' },
  success: { bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-400', border: 'border-emerald-500/15' },
  warning: { bg: 'bg-amber-500/[0.08]', text: 'text-amber-400', border: 'border-amber-500/15' },
  danger:  { bg: 'bg-rose-500/[0.08]', text: 'text-rose-400', border: 'border-rose-500/15' },
  info:    { bg: 'bg-cyan-500/[0.08]', text: 'text-cyan-400', border: 'border-cyan-500/15' },
  accent:  { bg: 'bg-nx-accent-soft', text: 'text-nx-accent', border: 'border-nx-accent/20' },
};

export function StatusPill({ icon, label, value, variant = 'default' }: StatusPillProps) {
  const styles = variantStyles[variant];
  return (
    <div className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full ${styles.bg} border ${styles.border} backdrop-blur-sm`}>
      {icon && <span className={`${styles.text} opacity-80`}>{icon}</span>}
      <span className="text-[10px] font-semibold text-nx-muted uppercase tracking-wider">{label}</span>
      {value !== undefined && (
        <span className={`text-[10px] font-bold font-mono ${styles.text}`}>{value}</span>
      )}
    </div>
  );
}
