'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { ScaleBg, Navbar } from '@/components/scale';
import { HeroSection } from '@/components/scale/hero-section';
import { CodeShowcaseSection } from '@/components/scale/code-showcase-section';
import { BottomRevealSection } from '@/components/scale/bottom-reveal-section';
import { BeigeOverlay } from '@/components/scale/beige-overlay';
import { DarkFooter } from '@/components/scale/dark-footer';
import { useHeroTimeline } from '@/hooks/use-hero-timeline';

import { useBottomReveal } from '@/hooks/use-bottom-reveal';
import { useBeigeOverlay } from '@/hooks/use-beige-overlay';
import { useFooterEntrance } from '@/hooks/use-footer-entrance';

const GooeyShowcase = dynamic(() => import('@/components/scale/GooeyShowcase'), { ssr: false });

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
  const gooeyRef = useRef<HTMLDivElement>(null);
  const waveProgressRef = useRef(0);
  const footerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

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

  useBottomReveal({ imgSlideRef, oldLabelRef, newLabelRef, greenCardRef });

  useBeigeOverlay({ beigeWrapRef, bottomSectionRef, footerRef, waveProgressRef, spacerRef });

  useFooterEntrance({ footerRef });

  return (
    <main
      ref={mainRef}
      className="relative min-h-screen bg-black overflow-x-hidden"
    >
      <div className="absolute inset-0 bg-black z-0" />
      <ScaleBg ref={bgRef} />

      <Navbar initialLight={false} />

      <div className="relative z-[2]">

        <HeroSection
          ref={sectionRef}
          cardRef={cardRef}
          stackRef={stackRef}
          headingRef={headingRef}
          wordsRef={wordsRef}
          typeRef={typeRef}
          typeRef2={typeRef2}
        />

        <CodeShowcaseSection ref={showcaseSectionRef} />

        <div className="relative w-full">
          <GooeyShowcase ref={gooeyRef} />
        </div>

        <BottomRevealSection
          ref={bottomSectionRef}
          imgSlideRef={imgSlideRef}
          oldLabelRef={oldLabelRef}
          newLabelRef={newLabelRef}
          greenCardRef={greenCardRef}
        />

        {/* Spacer for BeigeOverlay to scroll through */}
        <div ref={spacerRef} className="h-[300vh] w-full pointer-events-none" />

        <BeigeOverlay ref={beigeWrapRef} beigePanelRef={beigePanelRef} progressRef={waveProgressRef} />

        <DarkFooter ref={footerRef} />
      </div>
    </main>
  );
}
