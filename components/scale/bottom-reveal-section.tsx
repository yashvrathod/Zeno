'use client';

import { forwardRef } from 'react';

interface BottomRevealSectionProps {
  imgSlideRef: React.RefObject<HTMLDivElement | null>;
  oldLabelRef: React.RefObject<HTMLSpanElement | null>;
  newLabelRef: React.RefObject<HTMLSpanElement | null>;
  greenCardRef: React.RefObject<HTMLDivElement | null>;
}

const stats = [
  { label: 'DSA Patterns', value: '500+' },
  { label: 'Problems Solved', value: '1M+' },
  { label: 'Success Rate', value: '99.9%' },
];

export const BottomRevealSection = forwardRef<HTMLDivElement, BottomRevealSectionProps>(
  ({ imgSlideRef, oldLabelRef, newLabelRef, greenCardRef }, sectionRef) => {
    return (
      <section
        ref={sectionRef}
        className="relative w-full overflow-hidden"
      >
        <div className="relative w-full min-h-screen flex flex-col lg:flex-row items-end gap-5 sm:gap-7 lg:gap-8 px-4 sm:px-8 lg:px-12 pb-6 sm:pb-10">
          <div
            ref={imgSlideRef}
            className="relative w-full sm:w-[70%] md:w-[50%] lg:w-[22%] shrink-0 rounded-[2rem] overflow-hidden will-change-transform shadow-[0_20px_80px_rgba(0,0,0,0.35)] border border-white/10 backdrop-blur-xl group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent z-10 pointer-events-none" />

            <div className="relative aspect-[3/4] lg:aspect-[0.72] overflow-hidden">
              <img
                src="/scale/image.png"
                alt="DSA Mentor feature"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-black/35" />

              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  ref={oldLabelRef}
                  className="absolute inset-0 flex items-center justify-center text-white text-[clamp(1.5rem,3vw,3rem)] font-semibold tracking-tight text-center leading-tight px-4"
                >
                  AI{' '}
                  <span className="mx-2 bg-gradient-to-r from-[#93c5fd] via-[#d8b4fe] to-[#6ee7b7] bg-clip-text text-transparent">
                    DSA
                  </span>{' '}
                  Mentor
                </span>

                <span
                  ref={newLabelRef}
                  className="absolute inset-0 flex items-center justify-center opacity-0 text-white text-[clamp(1.8rem,4vw,4rem)] font-semibold tracking-tight"
                >
                  Zeno
                </span>
              </div>
            </div>
          </div>

          <div
            ref={greenCardRef}
            className="relative w-full rounded-[2rem] sm:rounded-[3.2rem] overflow-hidden border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
          >
            {/* Premium cinematic background */}
            <div className="absolute inset-0 bg-[#060807]" />
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,0.15),transparent_40%)]" />
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.1),transparent_40%)]" />

            {/* Futuristic Grid Overlay */}
            <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
              }}
            />

            <div className="relative z-10 p-8 sm:p-14 md:p-20 lg:p-24 xl:p-28 flex flex-col justify-between min-h-[500px] sm:min-h-[600px] lg:min-h-[720px]">
              <div className="mb-14">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-white/60 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.2)]">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
                  AI DSA Mentor Platform
                </div>
              </div>

              <div>
                <h2 className="max-w-6xl text-white font-semibold tracking-[-0.045em] leading-[0.9] text-[clamp(2.8rem,7.5vw,7.5rem)]">
                  Built for the world&apos;s most <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-emerald-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                    Ambitious Learners
                  </span> & Engineers.
                </h2>

                <p className="mt-8 max-w-2xl text-white/50 text-base sm:text-xl font-light leading-relaxed">
                  Join thousands mastering DSA with AI-powered guidance, from zero to interview-ready.
                </p>
              </div>

              <div className="mt-16 flex flex-wrap gap-4 sm:gap-8">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1"
                  >
                    <div className="text-3xl sm:text-5xl font-medium text-white tracking-tight">{item.value}</div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-white/30 font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

BottomRevealSection.displayName = 'BottomRevealSection';
