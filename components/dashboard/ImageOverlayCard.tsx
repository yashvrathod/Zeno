'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

type Variant = 'default' | 'mastered' | 'learning' | 'weak' | 'amber' | 'rose' | 'cyan' | 'violet' | 'dark';

interface ImageOverlayCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  count?: string | number;
  unit?: string;
  badge?: ReactNode;
  href?: string;
  variant?: Variant;
  height?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  rounded?: 'lg' | 'xl' | '2xl';
  className?: string;
  showArrow?: boolean;
  children?: ReactNode;
}

const variantGradients: Record<Variant, string> = {
  default: 'from-zinc-700/30 via-zinc-800/20 to-black/60',
  mastered: 'from-emerald-700/40 via-emerald-900/30 to-black/70',
  learning: 'from-amber-700/40 via-amber-900/30 to-black/70',
  weak: 'from-rose-700/40 via-rose-900/30 to-black/70',
  amber: 'from-amber-600/40 via-amber-800/25 to-black/70',
  rose: 'from-rose-600/40 via-rose-800/25 to-black/70',
  cyan: 'from-cyan-600/40 via-cyan-800/25 to-black/70',
  violet: 'from-violet-600/40 via-violet-800/25 to-black/70',
  dark: 'from-black/70 via-black/40 to-black/80',
};

const variantOrbs: Record<Variant, { c1: string; c2: string }> = {
  default: { c1: 'bg-zinc-500/15', c2: 'bg-zinc-700/10' },
  mastered: { c1: 'bg-emerald-500/25', c2: 'bg-teal-500/15' },
  learning: { c1: 'bg-amber-500/30', c2: 'bg-orange-500/15' },
  weak: { c1: 'bg-rose-500/25', c2: 'bg-orange-500/15' },
  amber: { c1: 'bg-amber-500/30', c2: 'bg-amber-700/20' },
  rose: { c1: 'bg-rose-500/30', c2: 'bg-pink-500/15' },
  cyan: { c1: 'bg-cyan-500/25', c2: 'bg-blue-500/15' },
  violet: { c1: 'bg-violet-500/30', c2: 'bg-fuchsia-500/15' },
  dark: { c1: 'bg-white/[0.03]', c2: 'bg-white/[0.015]' },
};

const heights = {
  sm: 'min-h-[140px]',
  md: 'min-h-[200px]',
  lg: 'min-h-[280px]',
  xl: 'min-h-[360px]',
  auto: '',
};

const roundeds = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

export function ImageOverlayCard({
  title,
  subtitle,
  meta,
  count,
  unit,
  badge,
  href,
  variant = 'default',
  height = 'md',
  rounded = '2xl',
  className = '',
  showArrow = false,
  children,
}: ImageOverlayCardProps) {
  const gradient = variantGradients[variant];
  const orbs = variantOrbs[variant];
  const baseClass = `group relative overflow-hidden ${roundeds[rounded]} ${heights[height]} border border-white/[0.06] bg-nx-card kiff-noise-bg cursor-pointer transition-all duration-500 hover:border-white/[0.12] ${className}`;

  const content = (
    <>
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />

      <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full ${orbs.c1} blur-3xl pointer-events-none animate-orb-drift`} />
      <div className={`absolute -bottom-16 -left-12 w-56 h-56 rounded-full ${orbs.c2} blur-3xl pointer-events-none animate-orb-drift-slow`} />

      <div className="absolute inset-0 kiff-image-overlay pointer-events-none" />

      {badge && <div className="absolute top-3 left-3 z-10">{badge}</div>}
      {showArrow && (
        <div className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/45 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 group-hover:bg-black/65 group-hover:text-white transition-all duration-300">
          <ArrowUpRight size={14} />
        </div>
      )}

      {children && <div className="absolute inset-0 z-0">{children}</div>}

      <div className="relative z-10 h-full flex flex-col justify-end p-4 lg:p-5">
        {count !== undefined && (
          <div className="font-heading text-3xl lg:text-4xl font-bold text-white tracking-tight leading-none mb-1.5">
            {count}
            {unit && <span className="text-base font-semibold text-white/70 ml-1">{unit}</span>}
          </div>
        )}
        <h3 className="text-sm lg:text-base font-bold text-white capitalize leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-white/70 mt-1 line-clamp-2 leading-snug">
            {subtitle}
          </p>
        )}
        {meta && (
          <div className="text-[9px] font-bold tracking-[0.2em] text-white/50 uppercase mt-2">
            {meta}
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className={baseClass}
      >
        <Link href={href} className="block absolute inset-0">
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={baseClass}
    >
      {content}
    </motion.div>
  );
}
