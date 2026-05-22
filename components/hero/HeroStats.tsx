'use client';

import ScrollReveal from './ScrollReveal';

const stats = [
  { value: '500+', label: 'DSA problems' },
  { value: '10K+', label: 'students learning' },
];

export default function HeroStats() {
  return (
    <ScrollReveal delay={0.5} direction="up">
      <div className="flex items-center gap-4 sm:gap-16 mt-10 sm:mt-16">
        {stats.map((stat, i) => (
          <div key={i} className="backdrop-blur-md bg-white/50 border border-white/60 rounded-xl px-4 sm:px-5 py-3 shadow-sm">
            <div className="text-3xl font-bold text-zinc-900">{stat.value}</div>
            <div className="text-sm text-zinc-500 mt-1">
              {stat.label.split(' ')[0]}
              <br />
              {stat.label.split(' ').slice(1).join(' ')}
            </div>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}
