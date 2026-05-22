'use client';

import ScrollReveal from './ScrollReveal';

const platforms = ['LeetCode', 'Codeforces', 'HackerRank', 'GeeksForGeeks', 'InterviewBit'];

export default function PlatformLogos() {
  return (
    <ScrollReveal delay={0.6} direction="up">
      <div className="mt-10 sm:mt-16 backdrop-blur-md bg-white/40 border border-white/50 rounded-2xl px-5 sm:px-8 py-4 sm:py-5 shadow-sm">
        <div className="flex items-center justify-center gap-4 sm:gap-8 md:gap-10 flex-wrap">
          {platforms.map((platform, i) => (
            <span key={i} className={`text-zinc-500 ${i === 0 || i === 2 ? 'text-base sm:text-lg font-bold' : 'text-xs sm:text-sm font-medium'}`}>
              {platform}
            </span>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
