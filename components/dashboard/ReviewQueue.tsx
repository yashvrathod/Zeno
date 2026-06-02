'use client';

import { motion } from 'framer-motion';
import type { ReviewItem } from '@/lib/dashboard/types';

interface ReviewQueueProps {
  items: ReviewItem[];
}

const priorityConfig = {
  high: {
    dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    label: 'High',
  },
  medium: {
    dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    label: 'Med',
  },
  low: {
    dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    label: 'Low',
  },
};

export function ReviewQueue({ items }: ReviewQueueProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.slice(0, 4).map((r, i) => {
        const cfg = priorityConfig[r.priority];
        return (
          <motion.div
            key={r.concept}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.04] transition-colors duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="text-sm text-zinc-300 truncate capitalize">{r.concept.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-semibold font-mono text-zinc-400">{r.mastery}%</span>
              <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md border ${cfg.badge}`}>
                {cfg.label}
              </span>
              <span className="text-[9px] font-mono text-zinc-700 bg-white/[0.03] px-2 py-0.5 rounded-md">
                {r.interval > 0 ? `${r.interval}d` : 'Overdue'}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
