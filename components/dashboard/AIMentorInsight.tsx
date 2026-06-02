'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, Target, Lightbulb } from 'lucide-react';
import type { ConceptMasteryItem, WeakArea } from '@/lib/dashboard/types';

interface AIMentorInsightProps {
  conceptMastery: ConceptMasteryItem[];
  weakAreas: WeakArea[];
  masteredPatterns: string[];
}

export function AIMentorInsight({ conceptMastery, weakAreas, masteredPatterns }: AIMentorInsightProps) {
  const strengths = conceptMastery.filter(c => c.status === 'mastered').sort((a, b) => b.mastery - a.mastery).slice(0, 3);
  const weaknesses = conceptMastery
    .filter(c => c.status !== 'mastered')
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3);

  const topWeakArea = weakAreas.sort((a, b) => b.percentOfSessions - a.percentOfSessions)[0];
  const recommendedFocus = weaknesses[0];

  return (
    <motion.div className="rounded-2xl border border-white/[0.06] bg-[#0f0f14] p-6 lg:p-7 relative overflow-hidden h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-nx-accent/15 flex items-center justify-center border border-nx-accent/20">
          <Sparkles size={16} className="text-nx-accent" />
        </div>
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-nx-accent/80 uppercase">Learning insights</span>
          <p className="text-[10px] text-zinc-600 mt-0.5">Based on your solve history and concept mastery</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-emerald-400" />
            <span className="text-[9px] font-bold tracking-[0.2em] text-emerald-400/70 uppercase">Strengths</span>
          </div>
          {strengths.length > 0 ? (
            <div className="space-y-2.5">
              {strengths.map(s => (
                <div key={s.concept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300 font-medium capitalize">{s.concept.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-emerald-400/80 font-mono">{s.mastery}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${s.mastery}%` }}
                      transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No patterns mastered yet. Keep practicing!</p>
          )}
        </div>

        <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-rose-400" />
            <span className="text-[9px] font-bold tracking-[0.2em] text-rose-400/70 uppercase">Weaknesses</span>
          </div>
          {weaknesses.length > 0 ? (
            <div className="space-y-2.5">
              {weaknesses.map(w => (
                <div key={w.concept}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-300 font-medium capitalize">{w.concept.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-rose-400/80 font-mono">{w.mastery}%</span>
                  </div>
                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${w.mastery}%` }}
                      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No weak areas detected. Great job!</p>
          )}
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-white/[0.04] grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={12} className="text-amber-400" />
            <span className="text-[8px] font-bold tracking-[0.2em] text-amber-400/70 uppercase">Common Mistakes</span>
          </div>
          {topWeakArea ? (
            <div className="bg-white/[0.02] rounded-lg px-3.5 py-2.5 border border-white/[0.04]">
              <p className="text-xs text-zinc-300 font-medium mb-0.5">{topWeakArea.friendlyName}</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{topWeakArea.description}</p>
            </div>
          ) : (
            <p className="text-xs text-zinc-600">No patterns detected yet.</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target size={12} className="text-nx-accent" />
            <span className="text-[8px] font-bold tracking-[0.2em] text-nx-accent/70 uppercase">Recommended Focus</span>
          </div>
          <div className="bg-gradient-to-r from-nx-accent/5 to-amber-700/5 rounded-lg px-3.5 py-2.5 border border-nx-accent/10">
            {recommendedFocus ? (
              <p className="text-xs text-zinc-300 leading-relaxed">
                Focus on <span className="text-white font-semibold capitalize">{recommendedFocus.concept.replace(/_/g, ' ')}</span> to improve your interview readiness. Mastery is currently at <span className="text-rose-400 font-mono">{recommendedFocus.mastery}%</span>.
              </p>
            ) : (
              <p className="text-xs text-zinc-600">Start learning to get recommendations.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
