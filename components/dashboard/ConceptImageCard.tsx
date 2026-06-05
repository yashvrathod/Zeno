'use client';

import { CheckCircle2, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { ImageOverlayCard } from './ImageOverlayCard';
import type { ConceptMasteryItem } from '@/lib/dashboard/types';

type Status = 'mastered' | 'learning' | 'not_started' | 'blocked';

interface ConceptImageCardProps {
  concept: ConceptMasteryItem;
  href?: string;
}

const statusMeta: Record<Status, {
  label: string;
  variant: 'mastered' | 'learning' | 'weak';
  icon: typeof CheckCircle2;
}> = {
  mastered: { label: 'Mastered', variant: 'mastered', icon: CheckCircle2 },
  learning: { label: 'Learning', variant: 'learning', icon: Sparkles },
  not_started: { label: 'Not started', variant: 'weak', icon: ChevronRight },
  blocked: { label: 'Blocked', variant: 'weak', icon: AlertTriangle },
};

export function ConceptImageCard({ concept, href }: ConceptImageCardProps) {
  const meta = statusMeta[concept.status] || statusMeta.not_started;
  const name = concept.concept.replace(/_/g, ' ');

  return (
    <ImageOverlayCard
      title={name}
      variant={meta.variant}
      count={concept.mastery}
      unit="%"
      meta={meta.label}
      subtitle={`${concept.practiceCount} practice${concept.practiceCount === 1 ? '' : 's'} · ${concept.successRate.toFixed(0)}% success`}
      href={href}
      height="sm"
      showArrow
    />
  );
}

interface ConceptStripCardProps {
  label: string;
  count: number;
  total: number;
  variant: 'mastered' | 'learning' | 'weak';
  href?: string;
  icon: typeof CheckCircle2;
}

const stripVariantStyles: Record<'mastered' | 'learning' | 'weak', {
  textClass: string;
  bg: string;
  ring: string;
  bar: string;
}> = {
  mastered: {
    textClass: 'text-emerald-300',
    bg: 'bg-emerald-500/15 border-emerald-500/30',
    ring: 'ring-emerald-500/20',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  },
  learning: {
    textClass: 'text-amber-300',
    bg: 'bg-amber-500/15 border-amber-500/30',
    ring: 'ring-amber-500/20',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
  },
  weak: {
    textClass: 'text-rose-300',
    bg: 'bg-rose-500/15 border-rose-500/30',
    ring: 'ring-rose-500/20',
    bar: 'bg-gradient-to-r from-rose-500 to-orange-400',
  },
};

export function ConceptStripCard({ label, count, total, variant, href, icon: Icon }: ConceptStripCardProps) {
  const styles = stripVariantStyles[variant];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  const inner = (
    <div className={`relative overflow-hidden rounded-2xl border ${styles.bg} ${styles.ring} p-4 lg:p-5 h-full min-h-[160px] flex flex-col justify-between group hover:scale-[1.01] transition-transform duration-300`}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className={styles.textClass} />
          <span className={`text-[9px] font-bold tracking-[0.22em] uppercase ${styles.textClass}`}>
            {label}
          </span>
        </div>
        {href && (
          <span className={`text-[9px] font-mono ${styles.textClass} opacity-60 group-hover:opacity-100`}>
            View →
          </span>
        )}
      </div>
      <div className="relative">
        <div className="font-heading text-4xl lg:text-5xl font-bold text-white leading-none">
          {count}
          <span className="text-base font-semibold text-white/40 ml-1.5">/ {total}</span>
        </div>
        <div className="mt-3 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${styles.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block h-full">
        {inner}
      </a>
    );
  }
  return inner;
}
