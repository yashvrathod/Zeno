'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface UseCodeShowcaseParams {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  cardRef: React.RefObject<HTMLDivElement | null>;
  textRef: React.RefObject<HTMLDivElement | null>;
}

export function useCodeShowcase({ sectionRef, cardRef, textRef }: UseCodeShowcaseParams) {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !cardRef.current || !textRef.current) return;

    const gridBg = section.querySelector<HTMLDivElement>('[data-bg-grid]');
    const orbs = section.querySelectorAll<HTMLDivElement>('[data-orb]');
    const particles = section.querySelectorAll<HTMLSpanElement>('[data-particle]');

    const ctx = gsap.context(() => {
      gsap.set(cardRef.current, { y: '50%', scale: 0.85, rotateX: 20, opacity: 0 });
      gsap.set(textRef.current, { opacity: 0, y: 40 });
      if (gridBg) gsap.set(gridBg, { opacity: 0, scale: 1.2 });
      if (particles.length) gsap.set(particles, { opacity: 0, y: gsap.utils.wrap([-30, 30]) });
      if (orbs.length) gsap.set(orbs, { scale: 0.6, opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=180%',
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
        },
      });

      tl.to(cardRef.current, {
        y: '0%',
        scale: 1,
        rotateX: 0,
        opacity: 1,
        duration: 2,
        ease: 'power4.out',
      }, 0.3);

      tl.to(textRef.current, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 1.0);

      if (gridBg) {
        tl.to(gridBg, { opacity: 0.5, scale: 1, duration: 1.5, ease: 'power2.out' }, 0);
      }

      if (orbs.length) {
        tl.to(orbs, { scale: 1, opacity: 1, duration: 2, ease: 'power2.out', stagger: 0.3 }, 0.2);
      }

      if (particles.length) {
        tl.to(particles, {
          opacity: 0.4,
          y: gsap.utils.wrap([30, -30]),
          duration: 2.5,
          stagger: 0.05,
          ease: 'power2.out',
        }, 1.2);
      }

      if (orbs.length) {
        tl.to(orbs[0], { x: 40, y: -20, duration: 3, ease: 'sine.inOut' }, 2.5);
        tl.to(orbs[orbs.length - 1], { x: -30, y: 30, duration: 3.5, ease: 'sine.inOut' }, 2.5);
      }

      tl.to(cardRef.current, { y: '-2%', duration: 1.5, ease: 'sine.inOut' }, 2.5);
      tl.to(cardRef.current, { y: '0%', duration: 1.5, ease: 'sine.inOut' }, 4);
    });

    return () => ctx.revert();
  }, []);
}
