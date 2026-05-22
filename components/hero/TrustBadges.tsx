'use client';

import { Star, Sparkles } from 'lucide-react';
import ScrollReveal from './ScrollReveal';

export default function TrustBadges() {
  return (
    <ScrollReveal delay={0.2} direction="up">
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <div className="backdrop-blur-md bg-white/50 border border-white/60 px-3 py-1.5 rounded-full shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-zinc-700">AI-Powered Mentor</span>
          </div>
        </div>
        <div className="backdrop-blur-md bg-white/50 border border-white/60 px-3 py-1.5 rounded-full shadow-sm">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span className="text-sm text-zinc-700">4.9</span>
          </div>
        </div>
      </div>
    </ScrollReveal>
  );
}
