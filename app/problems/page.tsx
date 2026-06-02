'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Flame,
  Loader2,
  AlertCircle,
  Play,
  Target,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { DifficultyBadge } from '@/components/ui/nav-link';

interface Pattern {
  id: string;
  name: string;
  description: string | null;
  problemCount: number;
  problems: Array<{
    id: string;
    slug: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  }>;
}

interface DashboardStats {
  currentStreak: number;
  problemsSolved: number;
  successRate: number;
  interviewReadiness: number;
}

export default function ProblemsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [resumeSlug, setResumeSlug] = useState<string | null>(null);
  const [weakAreaName, setWeakAreaName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [patternsRes, dashboardRes] = await Promise.all([
          fetch('/api/patterns', { cache: 'no-store' }),
          fetch('/api/dashboard', { cache: 'no-store' }).catch(() => null),
        ]);

        if (!patternsRes.ok) throw new Error('Failed to load curriculum');

        const patternsData = await patternsRes.json();
        const list: Pattern[] = patternsData.patterns ?? [];
        if (cancelled) return;

        setPatterns(list);
        if (list.length > 0) setExpandedModule(list[0].id);

        let nextResume: string | null = null;

        if (dashboardRes?.ok) {
          const { data: d } = await dashboardRes.json();
          if (d) {
            setStats({
              currentStreak: d.overallStats?.currentStreak ?? 0,
              problemsSolved: d.overallStats?.problemsSolved ?? 0,
              successRate: d.overallStats?.successRate ?? 0,
              interviewReadiness: d.overallStats?.interviewReadiness ?? 0,
            });
            if (d.weakAreas?.[0]) setWeakAreaName(d.weakAreas[0].friendlyName);
            nextResume = d.recentActivity?.[0]?.problemSlug ?? null;
          }
        }

        if (!nextResume) nextResume = list[0]?.problems[0]?.slug ?? null;
        setResumeSlug(nextResume);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
          setPatterns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const totalProblems = useMemo(
    () => patterns.reduce((n, p) => n + p.problemCount, 0),
    [patterns]
  );

  return (
    <div className="flex h-screen bg-[#0b0b10] text-zinc-400 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto border-l border-white/[0.04] custom-scrollbar">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold tracking-widest text-violet-400/80 uppercase mb-2">Curriculum</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Practice by pattern</h1>
              <p className="text-sm text-zinc-500 mt-2 max-w-xl">
                {weakAreaName
                  ? `Your mentor suggests reinforcing ${weakAreaName}. Pick a module below.`
                  : 'Structured modules from fundamentals to interview-ready problems.'}
              </p>
            </div>
            {resumeSlug && (
              <Link
                href={`/problems/${resumeSlug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors shrink-0"
              >
                <Play size={16} fill="currentColor" />
                Continue
              </Link>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatPill icon={<BookOpen size={15} />} label="Modules" value={String(patterns.length)} />
            <StatPill icon={<Target size={15} />} label="Problems" value={String(totalProblems)} />
            <StatPill icon={<TrendingUp size={15} />} label="Solved" value={String(stats?.problemsSolved ?? 0)} />
            <StatPill icon={<Flame size={15} />} label="Streak" value={`${stats?.currentStreak ?? 0}d`} accent />
          </div>

          {/* Modules */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-white">All modules</h2>
              {!loading && <span className="text-xs text-zinc-600">{patterns.length} modules</span>}
            </div>

            {loading && (
              <div className="flex flex-col items-center py-20 gap-3">
                <Loader2 size={28} className="text-violet-400 animate-spin" />
                <p className="text-sm text-zinc-600">Loading modules…</p>
              </div>
            )}

            {error && !loading && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm text-rose-300">{error}</p>
              </div>
            )}

            {!loading && !error && patterns.length === 0 && (
              <div className="text-center py-16 rounded-xl border border-dashed border-white/[0.06]">
                <p className="text-sm text-zinc-600">No modules published yet.</p>
              </div>
            )}

            {!loading && patterns.map((pattern, idx) => {
              const open = expandedModule === pattern.id;
              return (
                <div
                  key={pattern.id}
                  className={`rounded-xl border transition-colors ${open ? 'border-violet-500/30 bg-[#12121a]' : 'border-white/[0.06] bg-[#0f0f14] hover:border-white/10'}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedModule(open ? null : pattern.id)}
                    className="w-full flex items-center gap-4 p-4 sm:p-5 text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${open ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.04] text-zinc-500'}`}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-white">{pattern.name}</h3>
                        <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                          {pattern.problemCount} problems
                        </span>
                      </div>
                      {pattern.description && (
                        <p className="text-sm text-zinc-500 mt-1 line-clamp-1">{pattern.description}</p>
                      )}
                    </div>
                    {open ? <ChevronDown size={18} className="text-zinc-500 shrink-0" /> : <ChevronRight size={18} className="text-zinc-600 shrink-0" />}
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-white/[0.04]">
                          {pattern.problems.length === 0 ? (
                            <p className="text-sm text-zinc-600 py-4 text-center">No problems in this module yet.</p>
                          ) : (
                            <ul className="divide-y divide-white/[0.04] mt-2">
                              {pattern.problems.map((problem, pIdx) => (
                                <li key={problem.id}>
                                  <Link
                                    href={`/problems/${problem.slug}`}
                                    className="flex items-center justify-between gap-4 py-3.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="text-xs font-mono text-zinc-600 w-6">{pIdx + 1}</span>
                                      <span className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                                        {problem.title}
                                      </span>
                                    </div>
                                    <DifficultyBadge difficulty={problem.difficulty} />
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}

function StatPill({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0f0f14] px-4 py-3">
      <div className="flex items-center gap-2 text-zinc-500 mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${accent ? 'text-amber-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
