'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import type { ConceptMasteryItem, WeakArea } from '@/lib/dashboard/types';

interface AIMentorInsightCompactProps {
  conceptMastery: ConceptMasteryItem[];
  weakAreas: WeakArea[];
}

export function AIMentorInsightCompact({ conceptMastery, weakAreas }: AIMentorInsightCompactProps) {
  const strength = conceptMastery
    .filter(c => c.status === 'mastered')
    .sort((a, b) => b.mastery - a.mastery)[0];
  const weakness = conceptMastery
    .filter(c => c.status !== 'mastered')
    .sort((a, b) => a.mastery - b.mastery)[0];
  const topWeakArea = weakAreas.sort((a, b) => b.percentOfSessions - a.percentOfSessions)[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-nx-card p-4 lg:p-5 group"
    >
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-nx-accent/[0.08] blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-nx-accent/15 flex items-center justify-center border border-nx-accent/20">
            <Sparkles size={13} className="text-nx-accent" />
          </div>
          <span className="text-[9px] font-bold tracking-[0.22em] text-nx-accent/80 uppercase">AI Mentor</span>
        </div>

        {strength ? (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={11} className="text-emerald-400" />
              <span className="text-[8px] font-bold tracking-[0.2em] text-emerald-400/70 uppercase">Strength</span>
            </div>
            <p className="text-sm text-white font-semibold capitalize truncate">
              {strength.concept.replace(/_/g, ' ')}
            </p>
            <div className="mt-1.5 h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                initial={{ width: 0 }}
                animate={{ width: `${strength.mastery}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
            <div className="text-[9px] font-mono text-emerald-400/70 mt-1">{strength.mastery}%</div>
          </div>
        ) : (
          <p className="text-[11px] text-nx-muted mb-3">No strengths yet — keep solving!</p>
        )}

        {weakness && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={11} className="text-rose-400" />
              <span className="text-[8px] font-bold tracking-[0.2em] text-rose-400/70 uppercase">Focus on</span>
            </div>
            <p className="text-sm text-white font-semibold capitalize truncate">
              {weakness.concept.replace(/_/g, ' ')}
            </p>
            <div className="mt-1.5 h-1 bg-white/[0.04] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${weakness.mastery}%` }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
            <div className="text-[9px] font-mono text-rose-400/70 mt-1">{weakness.mastery}%</div>
          </div>
        )}

        {topWeakArea && (
          <div className="pt-3 border-t border-white/[0.04] flex items-start gap-2">
            <Target size={11} className="text-nx-accent shrink-0 mt-0.5" />
            <div>
              <div className="text-[8px] font-bold tracking-[0.2em] text-nx-accent/70 uppercase mb-0.5">Watch</div>
              <p className="text-[11px] text-nx-text/80 leading-snug">
                {topWeakArea.friendlyName}
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
