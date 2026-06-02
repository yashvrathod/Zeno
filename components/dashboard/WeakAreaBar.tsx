'use client';

import { motion } from 'framer-motion';
import type { WeakArea } from '@/lib/dashboard/types';

interface WeakAreaBarProps {
  area: WeakArea;
  index: number;
}

export function WeakAreaBar({ area, index }: WeakAreaBarProps) {
  const pct = Math.min(area.percentOfSessions, 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04] hover:border-rose-500/20 transition-colors duration-300"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white/90 font-medium">{area.friendlyName}</span>
        <span className="text-[10px] text-rose-400/60 font-mono">{area.percentOfSessions.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2 + index * 0.06, ease: 'easeOut' }}
        />
      </div>
      <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">{area.description}</p>
    </motion.div>
  );
}
