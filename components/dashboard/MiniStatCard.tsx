'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from './AnimatedCounter';

interface MiniStatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  sub?: string;
  gradient: string;
  suffix?: string;
  prefix?: string;
  delay?: number;
}

export function MiniStatCard({
  icon,
  label,
  value,
  sub,
  gradient,
  suffix = '',
  prefix = '',
  delay = 0,
}: MiniStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl p-4 bg-nx-card border border-white/[0.04] hover:border-white/[0.08] transition-colors duration-300 group"
    >
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.08] blur-2xl group-hover:opacity-[0.14] transition-opacity duration-700`} />
      <div className="relative flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[8px] font-bold tracking-[0.18em] text-nx-muted uppercase">
            {label}
          </div>
          <div className={`text-xl font-bold font-mono leading-tight bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            <AnimatedCounter to={value} suffix={suffix} prefix={prefix} />
          </div>
          {sub && <div className="text-[9px] text-nx-muted truncate">{sub}</div>}
        </div>
      </div>
    </motion.div>
  );
}
