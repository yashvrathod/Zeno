'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, Target, Zap, Activity, Award,
  AlertTriangle, BarChart3, Flame, Layers, ArrowRight,
  Play, Trophy, Sparkles, CheckCircle2,
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { MiniStatCard } from '@/components/dashboard/MiniStatCard';
import { ConceptImageCard, ConceptStripCard } from '@/components/dashboard/ConceptImageCard';
import { EnhancementChart } from '@/components/dashboard/EnhancementChart';
import { QuickActionCard } from '@/components/dashboard/QuickActionCard';
import { FeaturedHeroCard } from '@/components/dashboard/FeaturedHeroCard';
import { AIMentorInsight } from '@/components/dashboard/AIMentorInsight';
import { AIMentorInsightCompact } from '@/components/dashboard/AIMentorInsightCompact';
import { FilterTabs } from '@/components/dashboard/FilterTabs';
import { ImageOverlayCard } from '@/components/dashboard/ImageOverlayCard';
import { LimeProgramCard } from '@/components/dashboard/LimeProgramCard';
import { PillCTA } from '@/components/dashboard/PillCTA';
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
            {/* ==================== ROW 1 — KIFF Asymmetric Hero ==================== */}
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
                {/* ROW 1: Asymmetric 3-column KIFF layout */}
                <div className="entrance-section grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* LEFT col-3: AI Mentor + Mini stats + Quick actions */}
                  <div className="lg:col-span-3 flex flex-col gap-3">
                    <AIMentorInsightCompact
                      conceptMastery={data.conceptMastery}
                      weakAreas={data.weakAreas}
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <MiniStatCard
                        icon={<Brain size={14} />}
                        label="Mastered"
                        value={data.overallStats.problemsSolved}
                        sub={`/ ${data.overallStats.problemsAttempted}`}
                        gradient="from-emerald-500 to-teal-500"
                        delay={0.05}
                      />
                      <MiniStatCard
                        icon={<Trophy size={14} />}
                        label="Success"
                        value={data.overallStats.successRate}
                        suffix="%"
                        sub="rate"
                        gradient="from-amber-500 to-orange-500"
                        delay={0.1}
                      />
                      <MiniStatCard
                        icon={<Flame size={14} />}
                        label="Streak"
                        value={data.overallStats.currentStreak}
                        suffix="d"
                        sub={`Best ${data.overallStats.longestStreak}d`}
                        gradient="from-orange-500 to-rose-500"
                        delay={0.15}
                      />
                      <MiniStatCard
                        icon={<Award size={14} />}
                        label="Patterns"
                        value={data.masteredPatterns.length}
                        sub="mastered"
                        gradient="from-cyan-500 to-blue-500"
                        delay={0.2}
                      />
                    </div>
                  </div>

                  {/* CENTER col-6: Featured Hero card (image-overlay pattern) */}
                  <div className="lg:col-span-6 entrance-hero">
                    <FeaturedHeroCard
                      name={session?.user?.name}
                      interviewReadiness={data.overallStats.interviewReadiness}
                      conceptMastery={data.conceptMastery}
                      weakAreas={data.weakAreas}
                      dailyChallengeSlug={dailyChallenge?.problem?.slug}
                    />
                  </div>

                  {/* RIGHT col-3: Lime "Programm" + Stuck Problems + Mentor recommendation */}
                  <div className="lg:col-span-3 flex flex-col gap-3">
                    {dailyChallenge?.problem ? (
                      <LimeProgramCard
                        variant="daily"
                        badge="Daily Challenge"
                        title={dailyChallenge.problem.title}
                        subtitle={`${dailyChallenge.problem.difficulty} · ${dailyChallenge.problem.totalSolvers} solved`}
                        meta={dailyChallenge.date}
                        href={`/problems/${dailyChallenge.problem.slug}`}
                        icon={<Zap size={14} className="text-black" />}
                      />
                    ) : (
                      <LimeProgramCard
                        variant="program"
                        badge="Programs"
                        title="Browse all"
                        subtitle="Explore problem sets and curated tracks"
                        meta="Discover →"
                        href="/problems"
                      />
                    )}

                    {stuckProblems.length > 0 ? (
                      <ImageOverlayCard
                        variant="rose"
                        title={stuckProblems[0]}
                        subtitle={`${stuckProblems.length} problem${stuckProblems.length === 1 ? '' : 's'} need a nudge`}
                        meta="Stuck · Tap to mentor"
                        href="/problems"
                        height="md"
                        showArrow
                      />
                    ) : (
                      <ImageOverlayCard
                        variant="mastered"
                        title="No stuck problems"
                        subtitle="All caught up — keep the momentum going"
                        meta="On fire"
                        href="/problems"
                        height="md"
                      />
                    )}

                    <ImageOverlayCard
                      variant="cyan"
                      title={mentorProgress?.recommendedNextProblem ?? "AI Pick Awaits"}
                      subtitle={mentorProgress?.recommendedNextProblem ? "Curated by your AI mentor" : "Solve a few to unlock picks"}
                      meta="Recommended"
                      href="/problems"
                      height="sm"
                      showArrow
                    />
                  </div>
                </div>

                {/* ==================== ROW 2 — Concept Strip (3 image-overlay cards) ==================== */}
                <div className="entrance-section grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ConceptStripCard
                    label="Mastered"
                    count={groupedConcepts.mastered.length}
                    total={data.conceptMastery.length}
                    variant="mastered"
                    icon={CheckCircle2}
                  />
                  <ConceptStripCard
                    label="Learning"
                    count={groupedConcepts.learning.length}
                    total={data.conceptMastery.length}
                    variant="learning"
                    icon={Sparkles}
                  />
                  <ConceptStripCard
                    label="Not Started"
                    count={groupedConcepts.weak.length}
                    total={data.conceptMastery.length}
                    variant="weak"
                    icon={AlertTriangle}
                  />
                </div>

                <SectionDivider />

                {/* ==================== ROW 3 — AI Mentor Insight (full) + Next Up ==================== */}
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
                            <PillCTA
                              label="Start Now"
                              href="/problems"
                              iconBgClass="bg-gradient-to-br from-nx-accent to-amber-600"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-nx-text/80 mb-1">Start your journey</p>
                          <p className="text-xs text-nx-muted leading-relaxed mb-6 flex-1">
                            Begin solving problems and the AI mentor will recommend the best next challenge based on your progress.
                          </p>
                          <div className="mt-auto">
                            <PillCTA
                              label="Browse"
                              href="/problems"
                              iconBgClass="bg-gradient-to-br from-zinc-700 to-zinc-900"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <SectionDivider />

                {/* ==================== ROW 4 — Concept Mastery detail (image cards) ==================== */}
                <div className="entrance-section">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-nx-accent-soft flex items-center justify-center">
                        <Layers size={15} className="text-nx-accent" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold tracking-[0.25em] text-nx-accent/80 uppercase">Concept Mastery</span>
                        <p className="text-[10px] text-nx-muted mt-0.5">
                          {groupedConcepts.mastered.length}/{data.conceptMastery.length} mastered
                        </p>
                      </div>
                    </div>
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
                  </div>

                  {(() => {
                    const filtered: { key: string; list: ConceptMasteryItem[]; variant: 'mastered' | 'learning' | 'weak' }[] = [];
                    if (filterTab === 'All' || filterTab === 'Mastered') filtered.push({ key: 'mastered', list: groupedConcepts.mastered, variant: 'mastered' });
                    if (filterTab === 'All' || filterTab === 'Learning') filtered.push({ key: 'learning', list: groupedConcepts.learning, variant: 'learning' });
                    if (filterTab === 'All' || filterTab === 'Not Started') filtered.push({ key: 'weak', list: groupedConcepts.weak, variant: 'weak' });

                    return (
                      <div className="space-y-3">
                        {filtered.map(group => (
                          <div key={group.key} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                            {group.list.slice(0, 12).map(c => (
                              <ConceptImageCard key={c.concept} concept={c} href="/problems" />
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <SectionDivider />

                {/* ==================== ROW 5 — Interview Readiness ==================== */}
                <div className="entrance-section">
                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-nx-accent-soft flex items-center justify-center">
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
                  <>
                    <SectionDivider />

                    {/* ==================== ROW 6 — Stuck Problems (image cards) ==================== */}
                    <div className="entrance-section">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-nx-accent/15 flex items-center justify-center border border-nx-accent/25">
                            <AlertTriangle size={14} className="text-amber-400" />
                          </div>
                          <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Stuck Problems</span>
                        </div>
                        <span className="text-[9px] text-nx-muted font-mono">{stuckProblems.length} items</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stuckProblems.slice(0, 6).map((title) => (
                          <ImageOverlayCard
                            key={title}
                            title={title}
                            subtitle="Multiple failed attempts — try a hint"
                            meta="Tap to mentor"
                            variant="rose"
                            href="/problems"
                            height="sm"
                            showArrow
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <SectionDivider />

                {/* ==================== ROW 7 — Velocity + Activity (chart + image cards) ==================== */}
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

                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between mb-1">
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
                    {data.recentActivity.slice(0, 4).map((item) => {
                      const variant = item.type === 'solved' ? 'mastered' : item.type === 'attempted' ? 'cyan' : item.type === 'review' ? 'amber' : 'violet';
                      return (
                        <ImageOverlayCard
                          key={item.id}
                          title={item.problemTitle}
                          subtitle={item.detail}
                          meta={new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          variant={variant as 'mastered' | 'cyan' | 'amber' | 'violet'}
                          href={`/problems/${item.problemSlug}`}
                          height="sm"
                        />
                      );
                    })}
                  </div>
                </div>

                <SectionDivider />

                {/* ==================== ROW 8 — Roadmap (image cards) ==================== */}
                <div className="entrance-section">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-nx-accent-soft flex items-center justify-center border border-nx-accent/20">
                        <Layers size={15} className="text-nx-accent" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold tracking-[0.25em] text-nx-accent/80 uppercase">Learning Roadmap</span>
                        <p className="text-[10px] text-nx-muted mt-0.5">Tap any concept to dive in</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                    {roadmapItems.slice(0, 12).map(item => {
                      const variant = item.status === 'mastered' ? 'mastered' : item.status === 'learning' ? 'learning' : 'weak';
                      return (
                        <ImageOverlayCard
                          key={item.concept}
                          title={item.concept.replace(/_/g, ' ')}
                          count={item.mastery}
                          unit="%"
                          meta={item.status.replace(/_/g, ' ')}
                          variant={variant}
                          href="/problems"
                          height="sm"
                          showArrow
                        />
                      );
                    })}
                  </div>
                </div>

                <SectionDivider />

                {/* ==================== ROW 9 — Programs (lime) + Quick actions ==================== */}
                <div className="entrance-section grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <LimeProgramCard
                    variant="program"
                    badge="Programs"
                    title="Skill Tracks"
                    subtitle="Curated paths through patterns, data structures, and interview prep"
                    meta="Browse all tracks"
                    href="/profile/skills"
                    icon={<Layers size={14} className="text-black" />}
                  />

                  <div className="glass-panel-warm rounded-2xl p-6 lg:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-nx-accent-soft flex items-center justify-center">
                        <Zap size={14} className="text-nx-accent" />
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.25em] text-nx-accent/70 uppercase">Quick Actions</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <QuickActionCard
                        icon={<Play size={16} />}
                        label="Continue"
                        sub="Resume progress"
                        href="/problems"
                        gradient="from-nx-accent to-amber-600"
                      />
                      <QuickActionCard
                        icon={<Brain size={16} />}
                        label="AI Mentor"
                        sub="Personalized help"
                        href="/problems"
                        gradient="from-blue-600 to-cyan-600"
                      />
                      <QuickActionCard
                        icon={<Target size={16} />}
                        label="Weaknesses"
                        sub="Error patterns"
                        href="/profile/skills"
                        gradient="from-rose-600 to-orange-600"
                      />
                      <QuickActionCard
                        icon={<Layers size={16} />}
                        label="Skill Tree"
                        sub="Mastery map"
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
