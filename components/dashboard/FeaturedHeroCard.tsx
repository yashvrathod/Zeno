'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Sun, Moon, Coffee, Sparkles, Brain, Target, Code } from 'lucide-react';
import { OverlayDatePill } from './OverlayDatePill';
import { PillCTA } from './PillCTA';
import { AnimatedCounter } from './AnimatedCounter';
import type { ConceptMasteryItem, WeakArea } from '@/lib/dashboard/types';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: Sun };
  if (h < 18) return { text: 'Good afternoon', icon: Coffee };
  return { text: 'Good evening', icon: Moon };
}

function generateSummary(conceptMastery: ConceptMasteryItem[], weakAreas: WeakArea[]): string {
  const mastered = conceptMastery
    .filter(c => c.status === 'mastered')
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 2);
  const weakest = conceptMastery
    .filter(c => c.status !== 'mastered')
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 1);
  const topWeakness = weakAreas.sort((a, b) => b.percentOfSessions - a.percentOfSessions)[0];

  if (mastered.length === 0 && weakest.length === 0) return 'Start solving problems to get personalized insights.';

  let summary = '';
  if (mastered.length > 0) {
    summary += `Strong progress in ${mastered.map(c => c.concept.replace(/_/g, ' ')).join(' & ')}.`;
  }
  if (weakest.length > 0) {
    summary += ` Focus on ${weakest[0].concept.replace(/_/g, ' ')} to lift readiness.`;
  }
  if (topWeakness && mastered.length === 0) {
    summary += ` Watch out for ${topWeakness.friendlyName.toLowerCase()}.`;
  }
  return summary;
}

interface FeaturedHeroCardProps {
  name: string | null | undefined;
  interviewReadiness: number;
  conceptMastery: ConceptMasteryItem[];
  weakAreas: WeakArea[];
  ctaHref?: string;
  ctaLabel?: string;
  dailyChallengeSlug?: string;
}

export function FeaturedHeroCard({
  name,
  interviewReadiness,
  conceptMastery,
  weakAreas,
  ctaHref = '/problems',
  ctaLabel = 'Continue Learning',
  dailyChallengeSlug,
}: FeaturedHeroCardProps) {
  const { text: greetingText, icon: GreetingIcon } = getGreeting();
  const summary = generateSummary(conceptMastery, weakAreas);

  const ringRef = useRef<SVGCircleElement>(null);
  const ringValRef = useRef<HTMLDivElement>(null);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(interviewReadiness, 100) / 100;
  const offset = circumference * (1 - progress);

  useEffect(() => {
    if (!ringRef.current) return;
    gsap.fromTo(
      ringRef.current,
      { strokeDashoffset: circumference },
      { strokeDashoffset: offset, duration: 1.6, delay: 0.4, ease: 'power3.out' }
    );
    if (ringValRef.current) {
      const v = { n: 0 };
      gsap.to(v, {
        n: interviewReadiness,
        duration: 1.4,
        delay: 0.6,
        ease: 'power2.out',
        onUpdate: () => {
          if (ringValRef.current) ringValRef.current.textContent = `${Math.round(v.n)}%`;
        },
      });
    }
  }, [interviewReadiness, circumference, offset]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const firstName = name?.split(' ')[0] || 'there';
  const masteredCount = conceptMastery.filter(c => c.status === 'mastered').length;
  const totalConcepts = conceptMastery.length;

  return (
    <div className="relative h-full min-h-[400px] lg:min-h-[480px] overflow-hidden rounded-2xl border border-white/[0.08] bg-nx-card">
      <div className="absolute inset-0 kiff-grid-bg opacity-50" />

      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-nx-accent/15 blur-3xl pointer-events-none animate-orb-drift" />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none animate-orb-drift-slow" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-violet-500/[0.06] blur-3xl pointer-events-none animate-orb-drift" />

      <div className="absolute inset-0 kiff-image-overlay-strong" />

      <div className="relative z-10 h-full flex flex-col p-5 lg:p-6">
        <div className="flex items-start justify-between gap-3">
          <OverlayDatePill label={dateStr} />
          <div className="flex items-center gap-2 px-3 h-7 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white/90 text-[11px] font-semibold tracking-wide shadow-lg">
            <GreetingIcon size={12} className="text-amber-300" />
            <span>{greetingText}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-2xl mt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="font-heading text-[11px] font-bold tracking-[0.3em] text-nx-accent/80 uppercase">
              neXode Operations
            </div>
            <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-nx-accent/40 to-transparent" />
            <span className="text-[9px] font-mono text-white/40">Real-time</span>
          </div>

          <h1 className="font-heading text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05] mb-3 text-white">
            {greetingText},{' '}
            <span className="bg-gradient-to-r from-nx-accent via-nx-accent-bright to-amber-200 bg-clip-text text-transparent">
              {firstName}
            </span>
          </h1>

          <p className="text-sm lg:text-[15px] text-white/70 max-w-xl leading-relaxed mb-5">
            {summary}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[10px] font-semibold">
              <Brain size={11} />
              <span className="font-mono">{masteredCount}</span>
              <span className="text-emerald-300/60">/ {totalConcepts} mastered</span>
            </div>
            <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[10px] font-semibold">
              <Target size={11} />
              <span className="font-mono">{weakAreas.length}</span>
              <span className="text-amber-300/60">focus areas</span>
            </div>
          </div>

          <div className="flex">
            <PillCTA
              label={ctaLabel}
              href={ctaHref}
              icon={<Sparkles size={16} />}
              iconBgClass="bg-gradient-to-br from-nx-accent to-amber-600"
            />
          </div>
        </div>

        <div className="absolute bottom-5 right-5 lg:bottom-6 lg:right-6 z-10">
          <div className="relative w-24 h-24 lg:w-28 lg:h-28">
            <svg width="100%" height="100%" viewBox="0 0 112 112" className="transform -rotate-90">
              <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle
                ref={ringRef}
                cx="56" cy="56" r={radius}
                fill="none"
                stroke="url(#heroReadinessGrad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
              />
              <defs>
                <linearGradient id="heroReadinessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4a553" />
                  <stop offset="100%" stopColor="#c8e600" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div ref={ringValRef} className="text-xl lg:text-2xl font-bold text-white font-mono leading-none">
                  {interviewReadiness}%
                </div>
                <div className="text-[7px] font-bold tracking-[0.18em] text-white/50 uppercase mt-1">
                  Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
