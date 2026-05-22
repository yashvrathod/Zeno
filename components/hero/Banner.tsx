'use client';

import { Gift } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

export default function Banner() {
  return (
    <ScrollReveal delay={0.1} direction="up">
      <div className="backdrop-blur-xl bg-white/60 border border-white/50 rounded-2xl px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-purple-500/5">
        <div className="flex items-center gap-2 text-sm text-center sm:text-left">
          <span className="text-zinc-700 font-medium">
            New: AI Architect Review — Get production-ready code feedback
          </span>
        </div>
        <button className="backdrop-blur-md bg-white/60 px-4 py-2 rounded-full text-sm font-medium hover:bg-white/80 transition-all flex items-center gap-2 text-zinc-900 border border-white/30 shadow-sm whitespace-nowrap">
          Learn more
          <Gift className="w-4 h-4" />
        </button>
      </div>
    </ScrollReveal>
  );
}
