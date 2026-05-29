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
}

export function useBeigeOverlay({
  beigeWrapRef,
  bottomSectionRef,
  footerRef,
  waveProgressRef,
}: UseBeigeOverlayParams) {
  useEffect(() => {
    if (!beigeWrapRef.current || !bottomSectionRef.current || !footerRef.current) return;

    const footer = footerRef.current;

    const ctx = gsap.context(() => {
      gsap.set(beigeWrapRef.current, { y: '100%' });

      gsap.to(beigeWrapRef.current, {
        y: '0%',
        ease: 'none',
        scrollTrigger: {
          trigger: bottomSectionRef.current,
          start: 'bottom bottom',
          end: 'top top',
          scrub: 0.5,
        },
      });

      gsap.to(beigeWrapRef.current, {
        y: '-100%',
        ease: 'none',
        scrollTrigger: {
          trigger: footer,
          start: 'top bottom',
          end: 'top top',
          scrub: 1.2,
        },
      });

      gsap.to(bottomSectionRef.current, {
        opacity: 0,
        scale: 0.95,
        filter: 'blur(6px)',
        ease: 'none',
        scrollTrigger: {
          trigger: bottomSectionRef.current,
          start: 'bottom bottom',
          end: 'top top',
          scrub: 1.2,
        },
      });

      ScrollTrigger.create({
        trigger: bottomSectionRef.current,
        start: 'top top',
        end: '+=80%',
        onUpdate: (self) => {
          waveProgressRef.current = self.progress;
        },
      });
    });

    return () => ctx.revert();
  }, []);
}
