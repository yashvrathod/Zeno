'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  Flame,
  Trophy,
  Target,
  ChevronRight,
  Zap,
  Clock,
  Users,
  ArrowRight,
} from 'lucide-react';

type DailyProblem = {
  id: string;
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  totalSolvers: number;
};

export default function ChallengePage() {
  const { data: session } = useSession();
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    fetch('/api/challenge/daily')
      .then(r => r.json())
      .then(d => { setProblem(d.problem); setLoading(false); })
      .catch(() => setLoading(false));

    if (session?.user) {
      fetch('/api/dashboard')
        .then(r => r.json())
        .then(d => {
          if (d.data?.overallStats) {
            setStreak({
              current: d.data.overallStats.currentStreak ?? 0,
              longest: d.data.overallStats.longestStreak ?? 0,
            });
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const difficultyColor: Record<string, string> = {
    EASY: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    HARD: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="flex h-screen bg-[#010103] text-zinc-400">
      <Sidebar />
      <main className="flex-1 overflow-y-auto border-l border-white/5">
        <div className="max-w-5xl mx-auto px-8 py-12 space-y-12">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                  <Zap size={16} className="text-orange-400" />
                </div>
                <span className="text-[10px] font-bold tracking-[0.3em] text-orange-400 uppercase">Daily Challenge</span>
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">Today&apos;s Problem</h1>
            </div>

            {/* Streak Display */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-5 py-3 bg-[#0a0a0c] border border-white/10 rounded-2xl">
                <Flame size={20} className="text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{streak.current}</p>
                  <p className="text-[10px] text-zinc-600 font-bold tracking-wider uppercase">Day Streak</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 bg-[#0a0a0c] border border-white/10 rounded-2xl">
                <Trophy size={20} className="text-amber-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{streak.longest}</p>
                  <p className="text-[10px] text-zinc-600 font-bold tracking-wider uppercase">Best Streak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Problem Card */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : problem ? (
            <div className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden">
              {/* Gradient Bar */}
              <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500" />

              <div className="p-10 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${difficultyColor[problem.difficulty]}`}>
                        {problem.difficulty}
                      </span>
                      <span className="text-[11px] text-zinc-600 flex items-center gap-1.5">
                        <Clock size={12} /> Daily — refreshes in 24h
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{problem.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Users size={14} />
                    <span className="text-sm">{problem.totalSolvers} solved</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    href={`/problems/${problem.slug}`}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-black font-bold rounded-xl hover:scale-[1.02] transition-all"
                  >
                    Solve Challenge <ArrowRight size={18} />
                  </Link>
                  <Link
                    href={`/problems/${problem.slug}?tab=mentor`}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-zinc-300 font-bold rounded-xl hover:bg-white/10 transition-all"
                  >
                    Get Mentor Help <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 text-zinc-600">
              <Target size={40} className="mx-auto mb-4 text-zinc-700" />
              <p>No challenges available today. Check back tomorrow!</p>
            </div>
          )}

          {/* Streak Milestones */}
          <div className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Flame size={16} className="text-orange-400" />
              </div>
              <span className="text-[12px] font-bold tracking-[0.3em] text-orange-400 uppercase">Streak Milestones</span>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[3, 7, 14, 30, 60].map((milestone) => {
                const reached = streak.current >= milestone;
                return (
                  <div
                    key={milestone}
                    className={`rounded-xl border p-5 text-center transition-all ${
                      reached
                        ? 'bg-orange-500/10 border-orange-500/30'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    <div className={`text-2xl font-bold mb-1 ${reached ? 'text-orange-400' : 'text-zinc-700'}`}>
                      {milestone}d
                    </div>
                    <div className={`text-[10px] font-bold tracking-wider uppercase ${reached ? 'text-orange-400' : 'text-zinc-700'}`}>
                      {reached ? 'Unlocked' : 'Locked'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/problems"
              className="group bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[1.75rem] p-6 flex items-center gap-4 hover:border-white/20 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Target size={18} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">All Problems</p>
                <p className="text-[11px] text-zinc-600">Browse the full curriculum</p>
              </div>
              <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
            </Link>
            <Link
              href="/roadmap"
              className="group bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[1.75rem] p-6 flex items-center gap-4 hover:border-white/20 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Target size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">Learning Roadmap</p>
                <p className="text-[11px] text-zinc-600">Follow your personalized path</p>
              </div>
              <ChevronRight size={18} className="text-zinc-700 group-hover:text-white transition-colors" />
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
