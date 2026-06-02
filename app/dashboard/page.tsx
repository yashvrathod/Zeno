'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, Target, Zap, Activity, Award,
  AlertTriangle, BarChart3, Flame, Layers, ArrowRight,
  Play, Trophy, Code, Sparkles, Clock,
  Star, ChevronRight, CheckCircle2, GitBranch, Timer,
  Activity as Pulse,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { StatCard } from '@/components/dashboard/StatCard';
import { ConceptRing } from '@/components/dashboard/ConceptRing';
import { EnhancementChart } from '@/components/dashboard/EnhancementChart';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { WeakAreaBar } from '@/components/dashboard/WeakAreaBar';
import { ReviewQueue } from '@/components/dashboard/ReviewQueue';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { HeroSection } from '@/components/dashboard/HeroSection';
import { AIMentorInsight } from '@/components/dashboard/AIMentorInsight';
import { StatusPill } from '@/components/dashboard/StatusPill';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import { DateRangePill } from '@/components/dashboard/DateRangePill';
import { useDashboardEntrance } from '@/hooks/use-dashboard-entrance';
import { GoldParticles } from '@/components/effects/GoldParticles';
import { SectionDivider } from '@/components/effects/SectionDivider';
import type { DashboardData, ConceptMasteryItem } from '@/lib/dashboard/types';

interface MentorProgress {
  recommendedNextProblem: string | null;
  stuckProblems: string[];
}

interface DailyChallenge {
  problem: { id: string; slug: string; title: string; difficulty: string; totalSolvers: number } | null;
  date: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [mentorProgress, setMentorProgress] = useState<MentorProgress | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('All');

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/mentor/progress').then(r => r.json()).catch(() => ({ data: null })),
      fetch('/api/challenge/daily').then(r => r.json()).catch(() => ({ problem: null })),
    ]).then(([dashboard, mentor, challenge]) => {
      setData(dashboard.data);
      setMentorProgress(mentor.data);
      setDailyChallenge(challenge);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const hasData = data && data.overallStats.problemsAttempted > 0;
  const entranceRef = useDashboardEntrance(!!data);

  const topWeaknesses = useMemo(() => {
    if (!data) return [];
    return [...data.weakAreas].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [data]);

  const groupedConcepts = useMemo(() => {
    if (!data) return { mastered: [], learning: [], weak: [] };
    return {
      mastered: data.conceptMastery.filter(c => c.status === 'mastered'),
      learning: data.conceptMastery.filter(c => c.status === 'learning'),
      weak: data.conceptMastery.filter(c => c.status === 'not_started' || c.status === 'blocked'),
    };
  }, [data]);

  const readinessBreakdown = useMemo(() => {
    if (!data) return [];
    const { overallStats, conceptMastery, masteredPatterns } = data;
    const patternCoverage = Math.min(Math.round((masteredPatterns.length / Math.max(conceptMastery.length, 1)) * 100), 100);
    const consistency = Math.min(Math.round((overallStats.currentStreak / 30) * 100), 100);
    return [
      { label: 'Problem Solving', value: overallStats.successRate, gradient: 'from-nx-accent to-amber-600', sub: `${overallStats.problemsSolved}/${overallStats.problemsAttempted} solved` },
      { label: 'Pattern Coverage', value: patternCoverage, gradient: 'from-emerald-500 to-teal-500', sub: `${masteredPatterns.length} patterns mastered` },
      { label: 'Consistency', value: consistency, gradient: 'from-orange-500 to-amber-500', sub: `${overallStats.currentStreak} day streak` },
      { label: 'Readiness', value: overallStats.interviewReadiness, gradient: 'from-cyan-500 to-blue-500', sub: 'Interview readiness' },
    ];
  }, [data]);

  const roadmapItems = useMemo(() => {
    if (!data) return [];
    return data.conceptMastery.slice(0, 15).map(c => ({
      concept: c.concept,
      mastery: c.mastery,
      status: c.status,
    }));
  }, [data]);

  const stuckProblems: string[] = useMemo(() => {
    if (mentorProgress?.stuckProblems && mentorProgress.stuckProblems.length > 0) return mentorProgress.stuckProblems;
    return [];
  }, [mentorProgress]);

  const yesterdayVelocity = useMemo(() => {
    if (!data || data.learningVelocity.length < 2) return null;
    const points = data.learningVelocity;
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    if (!last || !prev) return null;
    const diff = last.overallMastery - prev.overallMastery;
    return { direction: diff >= 0 ? 'up' as const : 'down' as const, value: Math.abs(diff).toFixed(1) };
  }, [data]);

  const tabCounts = useMemo(() => {
    if (!data) return { all: 0, mastered: 0, learning: 0, weak: 0 };
    return {
      all: data.conceptMastery.length,
      mastered: groupedConcepts.mastered.length,
      learning: groupedConcepts.learning.length,
      weak: groupedConcepts.weak.length,
    };
  }, [data, groupedConcepts]);

  if (loading) {
    return (
      <div className="flex h-screen bg-nx-bg text-nx-text overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center relative my-3 mr-3 rounded-2xl bg-nx-surface border border-white/[0.04] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-0 warm-vignette pointer-events-none" />
          <GoldParticles />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6 relative"
          >
            <div className="relative">
              <div className="font-heading text-4xl font-bold tracking-tight bg-gradient-to-r from-nx-accent via-nx-accent-bright to-nx-accent bg-clip-text text-transparent">
                neXode
              </div>
              <div className="absolute -inset-x-4 -inset-y-2 bg-gradient-to-r from-transparent via-nx-accent/10 to-transparent animate-shimmer rounded-lg" />
            </div>
            <div className="flex gap-3">
              <div className="w-24 h-4 rounded-full bg-white/[0.03] animate-pulse" />
              <div className="w-20 h-4 rounded-full bg-white/[0.03] animate-pulse" />
              <div className="w-28 h-4 rounded-full bg-white/[0.03] animate-pulse" />
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen bg-nx-bg text-nx-text overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center my-3 mr-3 rounded-2xl bg-nx-surface border border-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} className="text-rose-400" />
            </div>
            <p className="text-nx-muted text-sm">Could not load dashboard data.</p>
            <button onClick={() => window.location.reload()} className="text-nx-accent text-xs font-semibold hover:underline">Retry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-nx-bg text-nx-text font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar my-3 mr-3 rounded-2xl bg-nx-surface border border-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative">
        <div className="absolute inset-0 warm-vignette pointer-events-none rounded-2xl" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
          <div
            ref={entranceRef}
            className="space-y-5"
          >
            <div className="entrance-hero">
              <HeroSection
                name={session?.user?.name}
                interviewReadiness={data.overallStats.interviewReadiness}
                conceptMastery={data.conceptMastery}
                weakAreas={data.weakAreas}
                dailyChallengeSlug={dailyChallenge?.problem?.slug}
              />
            </div>

            <div className="entrance-section glass-pill rounded-2xl p-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                <StatusPill icon={<GitBranch size={11} />} label="Solved" value={`${data.overallStats.problemsSolved}/${data.overallStats.problemsAttempted}`} variant="accent" />
                <StatusPill icon={<Trophy size={11} />} label="Rate" value={`${data.overallStats.successRate}%`} variant="success" />
                <StatusPill icon={<Flame size={11} />} label="Streak" value={`${data.overallStats.currentStreak}d`} variant="warning" />
                <StatusPill icon={<Brain size={11} />} label="Patterns" value={data.masteredPatterns.length} variant="info" />
                <StatusPill icon={<Target size={11} />} label="Ready" value={`${data.overallStats.interviewReadiness}%`} variant="default" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <DateRangePill label="Last 7 days" />
              </div>
            </div>

            <div className="entrance-section flex flex-wrap items-center gap-3">
              <FilterTabs
                tabs={[
                  { label: 'All', count: tabCounts.all },
                  { label: 'Mastered', count: tabCounts.mastered, variant: 'success' },
                  { label: 'Learning', count: tabCounts.learning, variant: 'warning' },
                  { label: 'Not Started', count: tabCounts.weak, variant: 'danger' },
                ]}
                active={filterTab}
                onChange={setFilterTab}
              />
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[9px] font-bold tracking-[0.2em] text-nx-muted uppercase">Show charts</span>
                <div className="w-7 h-4 rounded-full bg-nx-accent/20 border border-nx-accent/30 flex items-center px-0.5">
                  <div className="w-3 h-3 rounded-full bg-nx-accent shadow-[0_0_6px_rgba(212,165,83,0.5)]" />
                </div>
                <span className="text-[9px] font-bold tracking-[0.2em] text-nx-muted uppercase">Show alerts</span>
                <div className="w-7 h-4 rounded-full bg-nx-accent/20 border border-nx-accent/30 flex items-center px-0.5">
                  <div className="w-3 h-3 rounded-full bg-nx-accent shadow-[0_0_6px_rgba(212,165,83,0.5)]" />
                </div>
              </div>
            </div>

            {!hasData ? (
              <div className="entrance-section flex flex-col items-center justify-center py-20 lg:py-28 space-y-8">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
                    <Brain size={40} className="text-nx-muted" />
                  </div>
                  <div className="absolute -inset-2 animate-shimmer rounded-3xl pointer-events-none" />
                </div>
                <div className="text-center space-y-3">
                  <p className="text-nx-text-bright text-base font-semibold">Your analytics are waiting</p>
                  <p className="text-nx-muted text-sm max-w-xs mx-auto">Start solving problems and track your mastery across data structures, algorithms, and patterns.</p>
                </div>
                <Link href="/problems" className="group px-8 py-4 rounded-2xl bg-gradient-to-r from-nx-accent to-nx-accent-deep text-nx-bg text-xs font-bold tracking-[0.2em] uppercase hover:from-nx-accent-bright hover:to-nx-accent transition-all duration-300 shadow-lg warm-glow-amber">
                  Start Learning
                  <ArrowRight size={14} className="inline ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ) : (
              <>
                <div className="entrance-section">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                      <StatCard
                        icon={<Brain size={16} />}
                        label="Problems Solved"
                        value={data.overallStats.problemsSolved}
                        sub={`/ ${data.overallStats.problemsAttempted} attempted`}
                        gradient="from-nx-accent to-amber-600"
                      />
                    </div>
                    <StatCard
                      icon={<Trophy size={16} />}
                      label="Success Rate"
                      value={data.overallStats.successRate}
                      suffix="%"
                      sub={`${data.overallStats.totalSubmitCount} submissions`}
                      gradient="from-emerald-500 to-teal-500"
                    />
                    <StatCard
                      icon={<Flame size={16} />}
                      label="Current Streak"
                      value={data.overallStats.currentStreak}
                      suffix="d"
                      sub={`Best: ${data.overallStats.longestStreak}d`}
                      gradient="from-orange-500 to-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <StatCard
                      icon={<Award size={16} />}
                      label="Mastered Patterns"
                      value={data.masteredPatterns.length}
                      sub="Across all problems"
                      gradient="from-cyan-500 to-blue-500"
                    />
                    <StatCard
                      icon={<Target size={16} />}
                      label="Interview Readiness"
                      value={data.overallStats.interviewReadiness}
                      suffix="%"
                      sub="Overall readiness score"
                      gradient="from-nx-accent to-amber-600"
                    />
                  </div>
                </div>

                <SectionDivider />

                <div className="entrance-section grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <AIMentorInsight
                      conceptMastery={data.conceptMastery}
                      weakAreas={data.weakAreas}
                      masteredPatterns={data.masteredPatterns}
                    />
                  </div>
                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7 relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-nx-accent/[0.04] rounded-full blur-[60px] pointer-events-none" />
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-8 h-8 rounded-xl bg-nx-accent-soft flex items-center justify-center border border-nx-accent/20">
                        <Play size={16} className="text-nx-accent" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Next Up</span>
                    </div>
                    <div className="flex-1 flex flex-col">
                      {mentorProgress?.recommendedNextProblem ? (
                        <>
                          <p className="text-sm text-nx-text/80 mb-1">Recommended problem</p>
                          <p className="text-lg font-semibold text-nx-text-bright mb-3">{mentorProgress.recommendedNextProblem}</p>
                          <p className="text-xs text-nx-muted leading-relaxed mb-6">
                            This problem matches your mastered patterns and will help strengthen your understanding.
                          </p>
                          <div className="mt-auto">
                            <Link
                              href="/problems"
                              className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-nx-accent to-nx-accent-deep text-nx-bg text-xs font-bold tracking-[0.2em] uppercase hover:from-nx-accent-bright hover:to-nx-accent transition-all duration-300 shadow-lg warm-glow-amber"
                            >
                              Continue Learning
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-nx-text/80 mb-1">Start your journey</p>
                          <p className="text-xs text-nx-muted leading-relaxed mb-6 flex-1">
                            Begin solving problems and the AI mentor will recommend the best next challenge based on your progress.
                          </p>
                          <div className="mt-auto">
                            <Link
                              href="/problems"
                              className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl glass-panel border border-white/[0.06] text-nx-text text-xs font-bold tracking-[0.2em] uppercase hover:bg-white/[0.06] transition-all duration-300"
                            >
                              Browse Problems
                              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <SectionDivider />

                <div className="entrance-section grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-nx-accent-soft flex items-center justify-center">
                          <Layers size={14} className="text-nx-accent" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Concept Mastery</span>
                      </div>
                      <span className="text-[10px] text-nx-muted font-medium">{groupedConcepts.mastered.length}/{data.conceptMastery.length} mastered</span>
                    </div>

                    {groupedConcepts.mastered.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 size={10} className="text-emerald-400" />
                          <span className="text-[8px] font-bold tracking-[0.2em] text-emerald-400/70 uppercase">Mastered</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {groupedConcepts.mastered.map((c, i) => (
                            <ConceptRing key={c.concept} concept={c} index={i} />
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedConcepts.learning.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={10} className="text-nx-accent" />
                          <span className="text-[8px] font-bold tracking-[0.2em] text-nx-accent/70 uppercase">Learning</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {groupedConcepts.learning.map((c, i) => (
                            <ConceptRing key={c.concept} concept={c} index={i} />
                          ))}
                        </div>
                      </div>
                    )}

                    {groupedConcepts.weak.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle size={10} className="text-rose-400" />
                          <span className="text-[8px] font-bold tracking-[0.2em] text-rose-400/70 uppercase">Not Started</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {groupedConcepts.weak.map((c, i) => (
                            <ConceptRing key={c.concept} concept={c} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5">
                    <div className="glass-panel-strong rounded-2xl p-6 lg:p-7">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center border border-rose-500/20">
                          <AlertTriangle size={14} className="text-rose-400" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.25em] text-rose-400/70 uppercase">Weakness Heatmap</span>
                      </div>
                      {topWeaknesses.length > 0 ? (
                        <div className="space-y-2.5">
                          {topWeaknesses.map((w, i) => (
                            <WeakAreaBar key={w.tag} area={w} index={i} />
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-nx-muted text-sm">No weak patterns detected. Great work!</div>
                      )}
                    </div>

                    {data.reviewQueue.length > 0 && (
                      <div className="glass-panel-strong rounded-2xl p-6 lg:p-7">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-teal-500/15 flex items-center justify-center border border-teal-500/20">
                              <Clock size={14} className="text-teal-400" />
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.25em] text-teal-400/70 uppercase">Review Queue</span>
                          </div>
                          <span className="text-[9px] text-nx-muted font-medium">{data.reviewQueue.length} items</span>
                        </div>
                        <ReviewQueue items={data.reviewQueue} />
                      </div>
                    )}
                  </div>
                </div>

                <SectionDivider />

                <div className="entrance-section">
                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-nx-accent-soft flex items-center justify-center border border-nx-accent/20">
                          <BarChart3 size={14} className="text-nx-accent" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Interview Readiness</span>
                      </div>
                      {yesterdayVelocity && (
                        <span className={`text-[10px] font-mono ${yesterdayVelocity.direction === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {yesterdayVelocity.direction === 'up' ? '↑' : '↓'} {yesterdayVelocity.value}% today
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      {readinessBreakdown.map((item, i) => (
                        <div key={item.label} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-nx-text/80 font-medium">{item.label}</span>
                            <span className="text-sm font-bold text-nx-text-bright font-mono">{item.value}%</span>
                          </div>
                          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                            <motion.div
                              className={`h-full rounded-full bg-gradient-to-r ${item.gradient}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.value}%` }}
                              transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: 'easeOut' }}
                            />
                          </div>
                          <p className="text-[10px] text-nx-muted">{item.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {stuckProblems.length > 0 && (
                  <div className="entrance-section">
                    <div className="glass-panel-strong rounded-2xl p-6 lg:p-7 border-l-2 border-l-nx-accent/60 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-nx-accent/[0.04] to-transparent" />
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-7 h-7 rounded-lg bg-nx-accent/15 flex items-center justify-center border border-nx-accent/25">
                            <AlertTriangle size={14} className="text-amber-400" />
                          </div>
                          <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Stuck Problems</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {stuckProblems.slice(0, 6).map((title, i) => (
                            <motion.div
                              key={title}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04, duration: 0.3 }}
                              className="bg-white/[0.02] rounded-xl px-4 py-3.5 border border-white/[0.04] flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Code size={14} className="text-nx-muted shrink-0" />
                                <span className="text-sm text-nx-text truncate">{title}</span>
                              </div>
                              <Link
                                href="/problems"
                                className="shrink-0 text-[9px] font-bold tracking-[0.15em] px-3 py-1.5 rounded-lg bg-nx-accent-soft border border-nx-accent/20 text-nx-accent hover:bg-nx-accent/15 transition-all duration-200 uppercase"
                              >
                                Mentor
                              </Link>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <SectionDivider />

                <div className="entrance-section grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp size={14} className="text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.25em] text-emerald-400/70 uppercase">Learning Velocity</span>
                    </div>
                    <EnhancementChart points={data.learningVelocity} />
                  </div>

                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center border border-blue-500/20">
                          <Activity size={14} className="text-blue-400" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.25em] text-blue-400/70 uppercase">Recent Activity</span>
                      </div>
                      <Link href="/problems" className="text-[9px] text-nx-accent hover:text-nx-accent-bright flex items-center gap-1 font-semibold transition-colors">
                        View All <ArrowRight size={10} />
                      </Link>
                    </div>
                    <ActivityTimeline items={data.recentActivity} />
                  </div>
                </div>

                <SectionDivider />

                <div className="entrance-section">
                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-7 h-7 rounded-lg bg-nx-accent-soft flex items-center justify-center border border-nx-accent/20">
                        <Layers size={14} className="text-nx-accent" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Learning Roadmap</span>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {roadmapItems.map((item, i) => {
                        const isMastered = item.status === 'mastered';
                        const isLearning = item.status === 'learning';
                        return (
                          <motion.div
                            key={item.concept}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.03, duration: 0.3 }}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-all duration-300 ${
                              isMastered
                                ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-300'
                                : isLearning
                                ? 'bg-nx-accent-soft border-nx-accent/20 text-nx-accent'
                                : 'bg-white/[0.02] border-white/[0.04] text-nx-muted'
                            }`}
                          >
                            {isMastered ? (
                              <CheckCircle2 size={12} className="text-emerald-400" />
                            ) : isLearning ? (
                              <Sparkles size={12} className="text-nx-accent" />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                            <span className="text-[10px] font-semibold capitalize whitespace-nowrap">
                              {item.concept.replace(/_/g, ' ')}
                            </span>
                            <span className={`text-[8px] font-mono ${
                              isMastered ? 'text-emerald-400/60' : isLearning ? 'text-nx-accent/60' : 'text-zinc-700'
                            }`}>
                              {item.mastery}%
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <SectionDivider />

                <div className="entrance-section grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {dailyChallenge?.problem ? (
                    <div className="glass-panel-warm rounded-2xl p-6 lg:p-7 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-amber-500/4 rounded-full blur-[80px] pointer-events-none" />
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center border border-amber-500/25">
                          <Zap size={16} className="text-amber-400" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold tracking-[0.25em] text-amber-400/70 uppercase">Daily Challenge</span>
                          <p className="text-[9px] text-nx-muted">{dailyChallenge.date}</p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-nx-text-bright mb-2">{dailyChallenge.problem.title}</p>
                      <div className="flex items-center gap-4 mb-5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                          dailyChallenge.problem.difficulty === 'EASY' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          dailyChallenge.problem.difficulty === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                          'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                          {dailyChallenge.problem.difficulty}
                        </span>
                        <span className="text-[10px] text-nx-muted flex items-center gap-1">
                          <Star size={10} className="text-amber-500/60" />
                          {dailyChallenge.problem.totalSolvers} solved
                        </span>
                      </div>
                      <Link
                        href={`/problems/${dailyChallenge.problem.slug}`}
                        className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-nx-bg text-xs font-bold tracking-[0.2em] uppercase hover:from-amber-500 hover:to-orange-500 transition-all duration-300 shadow-lg warm-glow-warning"
                      >
                        Start Challenge
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  ) : (
                    <div className="glass-panel-strong rounded-2xl p-6 lg:p-7">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-xl bg-zinc-500/10 flex items-center justify-center border border-zinc-500/20">
                          <Zap size={16} className="text-zinc-500" />
                        </div>
                        <span className="text-[10px] font-bold tracking-[0.25em] text-zinc-500 uppercase">Daily Challenge</span>
                      </div>
                      <p className="text-sm text-nx-muted">No challenge available today.</p>
                    </div>
                  )}

                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-nx-accent-soft flex items-center justify-center border border-nx-accent/20">
                        <Zap size={14} className="text-nx-accent" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Quick Actions</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <QuickActionCard
                        icon={<Play size={16} />}
                        label="Continue Learning"
                        sub="Resume your progress"
                        href="/problems"
                        gradient="from-nx-accent to-amber-600"
                      />
                      <QuickActionCard
                        icon={<Brain size={16} />}
                        label="AI Mentor"
                        sub="Get personalized help"
                        href="/problems"
                        gradient="from-blue-600 to-cyan-600"
                      />
                      <QuickActionCard
                        icon={<Target size={16} />}
                        label="Weaknesses"
                        sub="Review error patterns"
                        href="/profile/skills"
                        gradient="from-rose-600 to-orange-600"
                      />
                      <QuickActionCard
                        icon={<Layers size={16} />}
                        label="Skill Tree"
                        sub="Track concept mastery"
                        href="/profile/skills"
                        gradient="from-emerald-600 to-teal-600"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
