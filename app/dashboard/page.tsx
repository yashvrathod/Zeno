'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Brain, TrendingUp, Target, Zap, Activity, BookOpen, Award,
  CheckCircle2, AlertTriangle, Clock, ArrowRight, BarChart3,
  Sparkles, Flame, Layers, Code, ChevronRight, AlertCircle,
  Timer, SkipForward, Play, Trophy,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import type { DashboardData, ConceptMasteryItem, WeakArea, ActivityItem, ReviewItem, LearningVelocityPoint } from '@/lib/dashboard/types';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen bg-[#010103] text-zinc-400">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <span className="text-[11px] font-bold tracking-widest text-zinc-600 uppercase">Compiling Neural Dashboard...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen bg-[#010103] text-zinc-400">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle size={40} className="mx-auto text-zinc-700" />
            <p className="text-zinc-500">Could not load dashboard data.</p>
            <button onClick={() => window.location.reload()} className="text-purple-400 text-sm hover:underline">Retry</button>
          </div>
        </main>
      </div>
    );
  }

  const topWeaknesses = [...data.weakAreas].sort((a, b) => b.count - a.count).slice(0, 3);
  const hasData = data.overallStats.problemsAttempted > 0;
  const reviewQueue = data.reviewQueue;

  return (
    <div className="flex flex-col h-screen bg-[#010103] text-zinc-400 font-sans overflow-hidden selection:bg-purple-500/30">
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto border-l border-white/5 bg-transparent scrollbar-hide">
          <div className="max-w-7xl mx-auto px-8 py-10 space-y-12">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                    <BarChart3 size={16} className="text-purple-400" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.3em] text-purple-400 uppercase">Neural Analytics</span>
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Learning Dashboard</h1>
              </div>
              {session?.user && (
                <div className="flex items-center gap-3 px-5 py-3 bg-[#0a0a0c] border border-white/10 rounded-2xl">
                  <div className={`w-2.5 h-2.5 rounded-full ${data.overallStats.interviewReadiness >= 60 ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_10px_rgba(16,185,129,0.5)]`} />
                  <span className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Readiness: {data.overallStats.interviewReadiness}%</span>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-5">
              <StatCard icon={<Brain size={18} />} label="Problems Solved" value={String(data.overallStats.problemsSolved)} sub={`/ ${data.overallStats.problemsAttempted} attempted`} color="text-purple-400" />
              <StatCard icon={<Trophy size={18} />} label="Success Rate" value={`${data.overallStats.successRate}%`} sub={`${data.overallStats.totalSubmitCount} submissions`} color="text-emerald-400" />
              <StatCard icon={<Flame size={18} />} label="Current Streak" value={`${data.overallStats.currentStreak}d`} sub={`Best: ${data.overallStats.longestStreak}d`} color="text-orange-400" />
              <StatCard icon={<Activity size={18} />} label="Mastered Patterns" value={String(data.masteredPatterns.length)} sub="Across all problems" color="text-cyan-400" />
            </div>

            {!hasData ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-6">
                <Brain size={48} className="text-zinc-800" />
                <p className="text-zinc-600 text-lg font-light">No learning data yet. Start solving problems to see your analytics.</p>
                <Link href="/problems" className="px-10 py-4 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400 text-sm font-bold tracking-wider hover:bg-purple-500/20 transition-all">
                  Browse Curriculum
                </Link>
              </div>
            ) : (
              <>
                {/* Main Grid */}
                <div className="grid grid-cols-3 gap-6">

                  {/* Concept Mastery Radar */}
                  <div className="col-span-2 bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Layers size={16} className="text-purple-400" />
                        </div>
                        <span className="text-[12px] font-bold tracking-[0.3em] text-purple-400 uppercase">Concept Mastery</span>
                      </div>
                      <span className="text-[11px] text-zinc-600">{data.conceptMastery.filter(c => c.status === 'mastered').length}/{data.conceptMastery.length} mastered</span>
                    </div>
                    <ConceptMasteryGrid concepts={data.conceptMastery} />
                  </div>

                  {/* Weak Areas & Review Queue */}
                  <div className="space-y-6">
                    {/* Weak Areas */}
                    <div className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                            <AlertTriangle size={16} className="text-rose-400" />
                          </div>
                          <span className="text-[11px] font-bold tracking-[0.3em] text-rose-400 uppercase">Focus Areas</span>
                        </div>
                      </div>
                      {topWeaknesses.length > 0 ? (
                        <div className="space-y-4">
                          {topWeaknesses.map(w => (
                            <div key={w.tag} className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-white font-medium">{w.friendlyName}</span>
                                <span className="text-[11px] text-rose-400/80 font-mono">{w.percentOfSessions.toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full" style={{ width: `${Math.min(w.percentOfSessions, 100)}%` }} />
                              </div>
                              <p className="text-[11px] text-zinc-600 mt-2 leading-relaxed">{w.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-zinc-600 text-sm">No weak patterns detected. Great work!</div>
                      )}
                    </div>

                    {/* SRS Review Queue */}
                    {reviewQueue.length > 0 && (
                      <div className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                              <Timer size={16} className="text-cyan-400" />
                            </div>
                            <span className="text-[11px] font-bold tracking-[0.3em] text-cyan-400 uppercase">Review Due</span>
                          </div>
                          <span className="text-[10px] text-zinc-600">{reviewQueue.length} concepts</span>
                        </div>
                        <div className="space-y-3">
                          {reviewQueue.map(r => (
                            <div key={r.concept} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${r.priority === 'high' ? 'bg-rose-500' : r.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <span className="text-sm text-zinc-300 capitalize">{r.concept.replace(/_/g, ' ')}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-[11px] text-zinc-600">{r.mastery}%</span>
                                <span className="text-[10px] font-mono text-zinc-700">{r.interval > 0 ? `${r.interval}d` : 'Overdue'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Learning Velocity + Recent Activity */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <TrendingUp size={16} className="text-emerald-400" />
                      </div>
                      <span className="text-[12px] font-bold tracking-[0.3em] text-emerald-400 uppercase">Learning Velocity</span>
                    </div>
                    <LearningVelocityChart points={data.learningVelocity} />
                  </div>

                  <div className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Activity size={16} className="text-blue-400" />
                        </div>
                        <span className="text-[12px] font-bold tracking-[0.3em] text-blue-400 uppercase">Recent Activity</span>
                      </div>
                      <Link href="/problems" className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
                        View All <ChevronRight size={12} />
                      </Link>
                    </div>
                    {data.recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {data.recentActivity.slice(0, 5).map(a => (
                          <ActivityRow key={a.id} item={a} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-zinc-600 text-sm">No recent activity.</div>
                    )}
                  </div>
                </div>

                {/* Stuck Problems Alert */}
                {data.stuckProblems.length > 0 && (
                  <div className="bg-[#050507]/80 backdrop-blur-3xl border border-amber-500/20 rounded-[2rem] p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                        <AlertCircle size={20} className="text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold text-sm">Stuck on {data.stuckProblems.length} problem{data.stuckProblems.length > 1 ? 's' : ''}</p>
                        <p className="text-zinc-500 text-[12px]">High submission count with no accepted solution. Try the mentor for guidance.</p>
                      </div>
                      <Link href="/problems" className="px-6 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-[11px] font-bold tracking-wider hover:bg-amber-500/20 transition-all">
                        Get Help
                      </Link>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-4">
                  <QuickAction icon={<Play size={18} />} label="Resume Learning" sub="Continue where you left off" href={data.recommendedNext ? `/problems/${data.recommendedNext}` : '/problems'} color="from-purple-600 to-indigo-600" />
                  <QuickAction icon={<Target size={18} />} label="Weakness Map" sub="Review your error patterns" href="/profile/skills" color="from-rose-600 to-orange-600" />
                  <QuickAction icon={<Zap size={18} />} label="Skill Tree" sub="Track concept mastery" href="/profile/skills" color="from-emerald-600 to-teal-600" />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[1.75rem] p-6 group hover:border-white/20 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${color}`}>{icon}</div>
        <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase">{label}</span>
      </div>
      <div className="text-3xl font-bold text-white tracking-tight mb-1">{value}</div>
      <div className="text-[11px] text-zinc-600">{sub}</div>
    </div>
  );
}

function ConceptMasteryGrid({ concepts }: { concepts: ConceptMasteryItem[] }) {
  const topConcepts = concepts.slice(0, 12);
  return (
    <div className="grid grid-cols-4 gap-4">
      {topConcepts.map(c => {
        const statusColors: Record<string, string> = {
          mastered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
          learning: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
          blocked: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
          not_started: 'border-zinc-700/30 bg-zinc-800/20 text-zinc-600',
        };
        return (
          <div key={c.concept} className={`rounded-xl border p-4 ${statusColors[c.status] || statusColors.not_started} transition-all hover:scale-[1.02]`}>
            <div className="text-[11px] font-medium capitalize truncate mb-2">{c.concept.replace(/_/g, ' ')}</div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all duration-700 ${c.status === 'mastered' ? 'bg-emerald-400' : c.status === 'learning' ? 'bg-purple-400' : 'bg-zinc-700'}`}
                style={{ width: `${c.mastery}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold">{c.mastery}%</span>
              <span className="text-[9px] uppercase tracking-wider font-bold">{c.status.replace(/_/g, ' ')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LearningVelocityChart({ points }: { points: LearningVelocityPoint[] }) {
  const maxSolved = Math.max(...points.map(p => p.problemsSolved), 1);
  const maxMastery = 100;
  if (points.length === 0) return <div className="py-8 text-center text-zinc-600 text-sm">No data yet</div>;

  const w = 600; const h = 180;
  const pointSpacing = Math.max(12, Math.min(18, w / (points.length || 1)));
  const chartW = Math.max(w, points.length * pointSpacing);

  const pathMastery = points.map((p, i) => {
    const x = i * pointSpacing + 40;
    const y = h - 30 - (p.overallMastery / maxMastery) * (h - 60);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const pathSolved = points.map((p, i) => {
    const x = i * pointSpacing + 40;
    const y = h - 30 - (p.problemsSolved / maxSolved) * (h - 60);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaMastery = pathMastery + ` L ${(points.length - 1) * pointSpacing + 40} ${h - 30} L 40 ${h - 30} Z`;

  const lastVal = points[points.length - 1];
  const firstVal = points[0];
  const velocity = lastVal && firstVal ? ((lastVal.overallMastery - firstVal.overallMastery) / Math.max(points.length, 1)).toFixed(1) : '0';

  return (
    <div>
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-[11px] text-zinc-500">Mastery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-zinc-500">Problems Solved</span>
        </div>
        <div className="ml-auto text-[10px] text-zinc-600 font-mono">+{velocity}%/day</div>
      </div>
      <svg viewBox={`0 0 ${chartW} ${h}`} className="w-full h-48" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="masteryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaMastery} fill="url(#masteryGrad)" />
        <path d={pathMastery} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
        <path d={pathSolved} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" />
        {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0).map((p, i) => {
          const x = i * Math.floor(points.length / 6) * pointSpacing + 40;
          return <text key={i} x={x} y={h - 5} textAnchor="middle" className="fill-zinc-700 text-[8px] font-mono">{p.date.slice(5)}</text>;
        })}
      </svg>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const icons: Record<string, React.ReactNode> = {
    solved: <CheckCircle2 size={14} className="text-emerald-400" />,
    attempted: <Code size={14} className="text-blue-400" />,
    debug: <Activity size={14} className="text-amber-400" />,
    review: <Sparkles size={14} className="text-purple-400" />,
  };
  const icon = icons[item.type] || <Code size={14} className="text-zinc-500" />;
  return (
    <div className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 truncate">{item.problemTitle}</p>
        <p className="text-[11px] text-zinc-600 truncate">{item.detail}</p>
      </div>
      <span className="text-[10px] text-zinc-700 font-mono whitespace-nowrap">
        {new Date(item.timestamp).toLocaleDateString()}
      </span>
    </div>
  );
}

function QuickAction({ icon, label, sub, href, color }: { icon: React.ReactNode; label: string; sub: string; href: string; color: string }) {
  return (
    <Link
      href={href}
      className="relative group bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[1.75rem] p-6 overflow-hidden hover:border-white/20 transition-all"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{label}</p>
          <p className="text-[11px] text-zinc-600">{sub}</p>
        </div>
        <ChevronRight size={18} className="ml-auto text-zinc-700 group-hover:text-white transition-colors" />
      </div>
    </Link>
  );
}
