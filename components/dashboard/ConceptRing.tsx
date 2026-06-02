'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ConceptMasteryItem } from '@/lib/dashboard/types';

const statusTracks: Record<string, string> = {
  mastered: 'rgba(52,211,153,0.08)',
  learning: 'rgba(201,168,76,0.08)',
  blocked: 'rgba(244,63,94,0.08)',
  not_started: 'rgba(113,113,122,0.06)',
};

const statusColors: Record<string, string> = {
  mastered: '#34d399',
  learning: '#c9a84c',
  blocked: '#f43f5e',
  not_started: '#71717a',
};

const statusEndColors: Record<string, string> = {
  mastered: '#2dd4bf',
  learning: '#b8973e',
  blocked: '#e11d48',
  not_started: '#52525b',
};

const statusTextColors: Record<string, string> = {
  mastered: '#34d399',
  learning: '#c9a84c',
  blocked: '#fb7185',
  not_started: '#a1a1aa',
};

const statusLabelColors: Record<string, string> = {
  mastered: 'text-emerald-400/50',
  learning: 'text-nx-accent/50',
  blocked: 'text-rose-400/50',
  not_started: 'text-zinc-700',
};

interface ConceptRingProps {
  concept: ConceptMasteryItem;
  index: number;
}

export function ConceptRing({ concept, index }: ConceptRingProps) {
  const prefersReduced = useReducedMotion();
  const gradientId = useId();
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(concept.mastery, 100) / 100;
  const offset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors duration-300"
    >
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="transform -rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" stroke={statusTracks[concept.status] || statusTracks.not_started} strokeWidth="4" />
          <motion.circle
            cx="32" cy="32" r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: prefersReduced ? 0 : circumference }}
            animate={{ strokeDashoffset: prefersReduced ? 0 : offset }}
            transition={{ duration: 1, delay: 0.2 + index * 0.03, ease: 'easeOut' }}
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={statusColors[concept.status] || statusColors.not_started} />
              <stop offset="100%" stopColor={statusEndColors[concept.status] || statusEndColors.not_started} />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-[10px] font-bold font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + index * 0.03 }}
            style={{ color: statusTextColors[concept.status] || statusTextColors.not_started }}
          >
            {concept.mastery}%
          </motion.span>
        </div>
      </div>
      <span className="text-[9px] font-semibold text-zinc-400 text-center leading-tight capitalize max-w-[80px] truncate">
        {concept.concept.replace(/_/g, ' ')}
      </span>
      <span className={`text-[7px] uppercase tracking-[0.12em] font-bold ${statusLabelColors[concept.status] || statusLabelColors.not_started}`}>
        {concept.status.replace(/_/g, ' ')}
      </span>
    </motion.div>
  );
}
