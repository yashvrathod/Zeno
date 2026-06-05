'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, Calendar, Zap, Star, Trophy, Sparkles } from 'lucide-react';

interface LimeProgramCardProps {
  variant?: 'program' | 'daily' | 'streak';
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
  icon?: ReactNode;
  badge?: string;
}

export function LimeProgramCard({
  variant = 'program',
  title,
  subtitle,
  meta,
  href = '/problems',
  icon,
  badge,
}: LimeProgramCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative overflow-hidden rounded-2xl glass-panel-lime h-full"
    >
      <Link href={href} className="block h-full p-5 lg:p-6">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl pointer-events-none" />

        <div className="relative h-full flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {icon || (
                variant === 'program' ? <Zap size={14} className="text-black" /> :
                variant === 'daily' ? <Calendar size={14} className="text-black" /> :
                <Trophy size={14} className="text-black" />
              )}
              <span className="text-[9px] font-bold tracking-[0.25em] text-black/80 uppercase">
                {badge || (variant === 'program' ? 'Programm' : variant === 'daily' ? 'Daily' : 'Streak')}
              </span>
            </div>
            <div className="w-7 h-7 rounded-full bg-black/85 flex items-center justify-center">
              <ArrowUpRight size={12} className="text-nx-lime" />
            </div>
          </div>

          <div>
            <h3 className="font-heading text-2xl lg:text-3xl font-bold text-black leading-[1.05] tracking-tight capitalize">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[12px] text-black/70 mt-1.5 leading-snug line-clamp-2">
                {subtitle}
              </p>
            )}
            {meta && (
              <div className="text-[9px] font-bold tracking-[0.2em] text-black/60 uppercase mt-2.5">
                {meta}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
