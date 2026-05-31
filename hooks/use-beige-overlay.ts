'use client';

import { useEffect, type MutableRefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface UseBeigeOverlayParams {
  beigeWrapRef: React.RefObject<HTMLDivElement | null>;
  bottomSectionRef: React.RefObject<HTMLDivElement | null>;
  footerRef: React.RefObject<HTMLDivElement | null>;
  waveProgressRef: MutableRefObject<number>;
  spacerRef: React.RefObject<HTMLDivElement | null>;
}

export function useBeigeOverlay({
  beigeWrapRef,
  bottomSectionRef,
  footerRef,
  waveProgressRef,
  spacerRef,
}: UseBeigeOverlayParams) {
  useEffect(() => {
    if (!beigeWrapRef.current || !bottomSectionRef.current || !footerRef.current || !spacerRef.current) return;

    const footer = footerRef.current;
    const spacer = spacerRef.current;

    const ctx = gsap.context(() => {
      gsap.set(beigeWrapRef.current, { y: '100%' });

      // Move overlay in as we scroll into the spacer
      gsap.to(beigeWrapRef.current, {
        y: '0%',
        ease: 'power1.inOut',
        scrollTrigger: {
          trigger: spacer,
          start: 'top bottom',
          end: 'top top',
          scrub: 1,
        },
      });

      // Update wave progress while scrolling through the spacer
      ScrollTrigger.create({
        trigger: spacer,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          waveProgressRef.current = self.progress;
        },
      });

      // Move overlay out as we reach the footer
      gsap.to(beigeWrapRef.current, {
        y: '-100%',
        ease: 'power1.in',
        scrollTrigger: {
          trigger: footer,
          start: 'top bottom',
          end: 'top top',
          scrub: 1,
        },
      });
    });

    return () => ctx.revert();
  }, []);
}
