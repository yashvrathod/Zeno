'use client';

import { forwardRef } from 'react';

interface BottomRevealSectionProps {
  imgSlideRef: React.RefObject<HTMLDivElement | null>;
  oldLabelRef: React.RefObject<HTMLSpanElement | null>;
  newLabelRef: React.RefObject<HTMLSpanElement | null>;
  greenCardRef: React.RefObject<HTMLDivElement | null>;
}

const stats = [
  { label: 'AI Models', value: '500+' },
  { label: 'Developers', value: '1M+' },
  { label: 'Inference', value: '99.99%' },
];

export const BottomRevealSection = forwardRef<HTMLDivElement, BottomRevealSectionProps>(
  ({ imgSlideRef, oldLabelRef, newLabelRef, greenCardRef }, sectionRef) => {
    return (
      <section
        ref={sectionRef}
        className="relative z-30 w-full overflow-hidden mt-[-10vh] sm:mt-[-15vh] lg:mt-[-22vh]"
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
                alt="Scale feature"
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
            className="relative w-full rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-white/10 shadow-[0_25px_100px_rgba(0,0,0,0.45)]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,#0a2d1f_0%,#103a28_45%,#071811_100%)]" />

            <div className="relative z-10 p-8 sm:p-12 md:p-16 lg:p-20 xl:p-24 flex flex-col justify-between min-h-[420px] sm:min-h-[500px] lg:min-h-[620px]">
              <div className="mb-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-md">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Trusted AI Infrastructure
                </div>
              </div>

              <div>
                <h2 className="max-w-6xl text-[#f5f5f0] font-medium tracking-[-0.04em] leading-[0.92] text-[clamp(2.7rem,7vw,7rem)]">
                  90% of the world&apos;s leading generative AI model builders are powered by{' '}
                  <span className="bg-gradient-to-r from-[#b8ffda] via-[#c7f9ff] to-[#d6bcfa] bg-clip-text text-transparent">
                    Scale
                  </span>
                  .
                </h2>

                <p className="mt-6 max-w-2xl text-white/60 text-base sm:text-lg leading-relaxed">
                  Build, fine-tune, and deploy advanced AI systems with enterprise-grade infrastructure
                  and elegant developer workflows.
                </p>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-5"
                  >
                    <div className="text-2xl sm:text-3xl font-semibold text-white">{item.value}</div>
                    <div className="mt-1 text-sm text-white/50">{item.label}</div>
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
