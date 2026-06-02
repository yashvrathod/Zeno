'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Sun, Moon, Coffee, Brain, Zap, ArrowRight, Target, Code } from 'lucide-react';
import Link from 'next/link';
import type { ConceptMasteryItem, WeakArea } from '@/lib/dashboard/types';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', icon: Sun };
  if (h < 18) return { text: 'Good afternoon', icon: Coffee };
  return { text: 'Good evening', icon: Moon };
}

function generateSummary(conceptMastery: ConceptMasteryItem[], weakAreas: WeakArea[]): string {
  const mastered = conceptMastery.filter(c => c.status === 'mastered').sort((a, b) => b.mastery - a.mastery).slice(0, 2);
  const weakest = conceptMastery.filter(c => c.status !== 'mastered').sort((a, b) => a.mastery - b.mastery).slice(0, 1);
  const topWeakness = weakAreas.sort((a, b) => b.percentOfSessions - a.percentOfSessions)[0];

  if (mastered.length === 0 && weakest.length === 0) return 'Start solving problems to get personalized insights.';

  let summary = '';
  if (mastered.length > 0) {
    summary += `You're making strong progress in ${mastered.map(c => c.concept.replace(/_/g, ' ')).join(' and ')}.`;
  }
  if (weakest.length > 0) {
    summary += ` Focus on ${weakest[0].concept.replace(/_/g, ' ')} to increase your readiness score.`;
  }
  if (topWeakness && mastered.length === 0) {
    summary += ` Watch out for ${topWeakness.friendlyName.toLowerCase()}.`;
  }
  return summary;
}

interface HeroSectionProps {
  name: string | null | undefined;
  interviewReadiness: number;
  conceptMastery: ConceptMasteryItem[];
  weakAreas: WeakArea[];
  dailyChallengeSlug?: string;
}

export function HeroSection({ name, interviewReadiness, conceptMastery, weakAreas, dailyChallengeSlug }: HeroSectionProps) {
  const { text, icon: GreetingIcon } = getGreeting();
  const summary = generateSummary(conceptMastery, weakAreas);
  const circleRef = useRef<SVGCircleElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);

  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(interviewReadiness, 100) / 100;
  const offset = circumference * (1 - progress);

  useEffect(() => {
    if (!circleRef.current) return;

    gsap.fromTo(
      circleRef.current,
      { strokeDashoffset: circumference },
      {
        strokeDashoffset: offset,
        duration: 1.5,
        delay: 0.3,
        ease: 'power3.out',
      }
    );

    if (valueRef.current) {
      const val = { v: 0 };
      gsap.to(val, {
        v: interviewReadiness,
        duration: 1.2,
        delay: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          if (valueRef.current) {
            valueRef.current.textContent = `${Math.round(val.v)}%`;
          }
        },
      });
    }
  }, [interviewReadiness, circumference, offset]);

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="relative overflow-hidden rounded-2xl glass-panel-warm p-6 lg:p-8">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-nx-accent/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[300px] h-[300px] bg-amber-700/[0.025] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row items-start justify-between gap-8">
        <div className="flex-1 w-full max-w-2xl">
          <p className="text-[10px] font-bold tracking-[0.25em] text-nx-muted uppercase mb-3">
            {dateStr} · Real-time overview
          </p>
          <h1 className="font-heading text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05] mb-3">
            <span className="text-nx-text-bright">Operations </span>
            <span className="bg-gradient-to-r from-nx-accent via-nx-accent-bright to-nx-accent bg-clip-text text-transparent">
              Dashboard
            </span>
          </h1>
          <p className="text-sm text-nx-muted max-w-xl leading-relaxed mb-6">{summary}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/problems"
              className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-nx-accent to-nx-accent-deep text-nx-bg text-sm font-semibold transition-all duration-300 shadow-lg warm-glow-amber hover:from-nx-accent-bright hover:to-nx-accent"
            >
              Continue learning
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href={dailyChallengeSlug ? `/problems/${dailyChallengeSlug}` : '/challenge'}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-nx-text text-sm font-medium hover:bg-white/[0.04] transition-colors"
            >
              <Zap size={14} className="text-amber-400" />
              Daily challenge
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 shrink-0 self-center lg:self-start">
          <div className="relative w-28 h-28">
            <svg width="112" height="112" viewBox="0 0 112 112" className="transform -rotate-90">
              <circle cx="56" cy="56" r={radius} fill="none" stroke="rgba(230,223,210,0.06)" strokeWidth="5" />
              <circle
                ref={circleRef}
                cx="56" cy="56" r={radius}
                fill="none"
                stroke="url(#readinessGrad)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
              />
              <defs>
                <linearGradient id="readinessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4a553" />
                  <stop offset="100%" stopColor="#e6dfd2" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div ref={valueRef} className="text-2xl font-bold text-nx-text-bright font-mono">{interviewReadiness}%</div>
                <div className="text-[7px] font-bold tracking-[0.15em] text-nx-muted uppercase mt-0.5">Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative grid grid-cols-3 gap-4 mt-7 pt-6 border-t border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/15">
            <Brain size={14} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-nx-text-bright font-mono">{conceptMastery.filter(c => c.status === 'mastered').length}</div>
            <div className="text-[9px] text-nx-muted uppercase tracking-wider">Mastered</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/15">
            <Code size={14} className="text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-nx-text-bright font-mono">{conceptMastery.length}</div>
            <div className="text-[9px] text-nx-muted uppercase tracking-wider">Concepts</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/15">
            <Target size={14} className="text-rose-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-nx-text-bright font-mono">{weakAreas.length}</div>
            <div className="text-[9px] text-nx-muted uppercase tracking-wider">Focus areas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
