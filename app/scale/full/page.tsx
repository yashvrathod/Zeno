'use client';

import { useRef } from 'react';
import { ScaleBg, Navbar } from '@/components/scale';
import { HeroSection } from '@/components/scale/hero-section';
import { CodeShowcaseSection } from '@/components/scale/code-showcase-section';
import { BottomRevealSection } from '@/components/scale/bottom-reveal-section';
import { BeigeOverlay } from '@/components/scale/beige-overlay';
import { DarkFooter } from '@/components/scale/dark-footer';
import { useHeroTimeline } from '@/hooks/use-hero-timeline';
import { useCodeShowcase } from '@/hooks/use-code-showcase';
import { useBottomReveal } from '@/hooks/use-bottom-reveal';
import { useBeigeOverlay } from '@/hooks/use-beige-overlay';
import { useFooterEntrance } from '@/hooks/use-footer-entrance';

export default function ScaleFullPage() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const typeRef2 = useRef<HTMLDivElement>(null);
  const imgSlideRef = useRef<HTMLDivElement>(null);
  const oldLabelRef = useRef<HTMLSpanElement>(null);
  const newLabelRef = useRef<HTMLSpanElement>(null);
  const beigeWrapRef = useRef<HTMLDivElement>(null);
  const beigePanelRef = useRef<HTMLDivElement>(null);
  const greenCardRef = useRef<HTMLDivElement>(null);
  const bottomSectionRef = useRef<HTMLDivElement>(null);
  const showcaseSectionRef = useRef<HTMLDivElement>(null);
  const showcaseCardRef = useRef<HTMLDivElement>(null);
  const showcaseTextRef = useRef<HTMLDivElement>(null);
  const waveProgressRef = useRef(0);
  const footerRef = useRef<HTMLDivElement>(null);

  useHeroTimeline({
    sectionRef,
    cardRef,
    stackRef,
    headingRef,
    bgRef,
    wordsRef,
    typeRef,
    typeRef2,
  });

  useCodeShowcase({
    sectionRef: showcaseSectionRef,
    cardRef: showcaseCardRef,
    textRef: showcaseTextRef,
  });

  useBottomReveal({ imgSlideRef, oldLabelRef, newLabelRef, greenCardRef });

  useBeigeOverlay({ beigeWrapRef, bottomSectionRef, footerRef, waveProgressRef });

  useFooterEntrance({ footerRef });

  return (
    <main
      ref={mainRef}
      className="relative min-h-screen bg-white overflow-x-hidden"
    >
      <div className="absolute inset-0 bg-white z-0" />
      <ScaleBg ref={bgRef} />

      <div className="relative z-[2]">
        <Navbar />

        <HeroSection
          ref={sectionRef}
          cardRef={cardRef}
          stackRef={stackRef}
          headingRef={headingRef}
          wordsRef={wordsRef}
          typeRef={typeRef}
          typeRef2={typeRef2}
        />

        <CodeShowcaseSection
          ref={showcaseSectionRef}
          cardRef={showcaseCardRef}
          textRef={showcaseTextRef}
        />

        <BottomRevealSection
          ref={bottomSectionRef}
          imgSlideRef={imgSlideRef}
          oldLabelRef={oldLabelRef}
          newLabelRef={newLabelRef}
          greenCardRef={greenCardRef}
        />

        <BeigeOverlay ref={beigeWrapRef} beigePanelRef={beigePanelRef} progressRef={waveProgressRef} />

        <DarkFooter ref={footerRef} />
      </div>
    </main>
  );
}
