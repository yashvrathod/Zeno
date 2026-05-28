'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface UseHeroTimelineParams {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  cardRef: React.RefObject<HTMLDivElement | null>;
  stackRef: React.RefObject<HTMLDivElement | null>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  bgRef: React.RefObject<HTMLDivElement | null>;
  wordsRef: React.RefObject<HTMLDivElement | null>;
  typeRef: React.RefObject<HTMLDivElement | null>;
  typeRef2: React.RefObject<HTMLDivElement | null>;
}

export function useHeroTimeline({
  sectionRef,
  cardRef,
  stackRef,
  headingRef,
  bgRef,
  wordsRef,
  typeRef,
  typeRef2,
}: UseHeroTimelineParams) {
  useEffect(() => {
    if (
      !sectionRef.current ||
      !cardRef.current ||
      !stackRef.current ||
      !headingRef.current ||
      !bgRef.current ||
      !wordsRef.current ||
      !typeRef.current ||
      !typeRef2.current
    )
      return;

    const wordEls = wordsRef.current.querySelectorAll<HTMLSpanElement>('.word');
    const layers = stackRef.current.querySelectorAll<HTMLElement>('[data-layer]');
    const headingChars = typeRef.current.querySelectorAll<HTMLElement>('.type-char-heading');
    const descChars = typeRef.current.querySelectorAll<HTMLElement>('.type-char-desc');
    const glowOrb = typeRef.current.querySelector<HTMLElement>('.glow-orb');
    const pills = typeRef.current.querySelectorAll<HTMLElement>('.feature-pill');
    const bottomLabel = typeRef.current.querySelector<HTMLElement>('[data-bottom-label]');
    const headingChars2 = typeRef2.current.querySelectorAll<HTMLElement>('.type-char-heading-2');
    const descChars2 = typeRef2.current.querySelectorAll<HTMLElement>('.type-char-desc-2');
    const glowOrb2 = typeRef2.current.querySelector<HTMLElement>('.glow-orb-2');
    const pills2 = typeRef2.current.querySelectorAll<HTMLElement>('.feature-pill-2:not([data-logo-2])');
    const logos2 = typeRef2.current.querySelectorAll<HTMLElement>('[data-logo-2]');
    const bottomLabel2 = typeRef2.current.querySelector<HTMLElement>('[data-bottom-label-2]');
    const isMobile = window.innerWidth < 640;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=1600%',
        pin: true,
        scrub: 1,
      },
    });

    tl.to(wordsRef.current, { opacity: 1, duration: 0.4 }, 1.2);

    tl.to(
      wordEls,
      {
        opacity: 1,
        y: 0,
        stagger: 0.03,
        ease: 'power3.out',
        duration: 0.8,
      },
      1.3,
    );

    tl.to(
      layers,
      {
        autoAlpha: 1,
        rotateX: 0,
        filter: 'blur(0px)',
        stagger: { each: 0.15 },
        duration: 1.5,
        ease: 'expo.out',
      },
      1.25,
    );

    tl.to(
      cardRef.current,
      {
        scale: 0.15,
        borderRadius: 32,
        opacity: 0,
        rotateY: -50,
        y: -80,
        ease: 'power2.inOut',
        duration: 1.2,
      },
      0,
    );

    tl.to(
      headingRef.current,
      {
        opacity: 0,
        y: -80,
        ease: 'power2.inOut',
        duration: 1,
      },
      0,
    );

    tl.to(
      bgRef.current,
      {
        opacity: 1,
        ease: 'power2.inOut',
        duration: 1,
      },
      0,
    );

    tl.to(wordsRef.current, { opacity: 1, duration: 0.4 }, 1.2);

    tl.to(
      wordEls,
      {
        opacity: 1,
        y: 0,
        stagger: 0.03,
        ease: 'power3.out',
        duration: 0.8,
      },
      1.3,
    );

    tl.to(
      wordsRef.current,
      {
        opacity: 0,
        ease: 'power2.inOut',
        duration: 0.8,
      },
      2.3,
    );

    tl.to(
      typeRef.current,
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      3.9,
    );

    tl.fromTo(
      headingChars,
      { opacity: 0 },
      {
        opacity: 1,
        stagger: 0.035,
        ease: 'none',
        duration: 1,
      },
      4.2,
    );

    tl.fromTo(
      descChars,
      { opacity: 0 },
      {
        opacity: 1,
        stagger: 0.02,
        ease: 'none',
        duration: 1,
      },
      4.6,
    );

    if (glowOrb) {
      tl.fromTo(
        glowOrb,
        { opacity: 0 },
        { opacity: 0.4, duration: 1, ease: 'power2.out' },
        4.8,
      );
    }

    tl.fromTo(
      pills,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        duration: 0.45,
        ease: 'power3.out',
      },
      5.0,
    );

    if (bottomLabel) {
      tl.fromTo(
        bottomLabel,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' },
        5.3,
      );
    }

    tl.to(
      stackRef.current,
      {
        x: '12vw',
        ...(!isMobile ? { y: '15vh' } : {}),
        z: 80,
        // rotationZ:20,
        // rotationY:20,
        // rotationX:-20,
        transformOrigin: 'center center',
        ease: 'power3.out',
        duration: 2,
      },
      5.2,
    );

    tl.to(
      layers,
      {
        stagger: { each: 0.1, from: 'end' },
        ease: 'power3.out',
        duration: 2,
      },
      5.2,
    );

    tl.to(
      typeRef.current,
      {
        opacity: 0,
        ease: 'power2.inOut',
        duration: 1,
      },
      6.5,
    );

    tl.to(
      stackRef.current,
      {
        x: '-12vw',
        ease: 'power3.inOut',
        duration: 2,
      },
      7.6,
    );

    tl.to(
      layers,
      {
        stagger: { each: 0.1, from: 'end' },
        ease: 'power3.inOut',
        duration: 2,
      },
      7.6,
    );

    tl.to(
      typeRef2.current,
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' },
      8.8,
    );

    if (glowOrb2) {
      tl.fromTo(
        glowOrb2,
        { opacity: 0 },
        { opacity: 0.4, duration: 1, ease: 'power2.out' },
        9.0,
      );
    }

    tl.fromTo(
      headingChars2,
      { opacity: 0 },
      {
        opacity: 1,
        stagger: 0.035,
        ease: 'none',
        duration: 1,
      },
      9.3,
    );

    tl.fromTo(
      descChars2,
      { opacity: 0 },
      {
        opacity: 1,
        stagger: 0.02,
        ease: 'none',
        duration: 1,
      },
      9.7,
    );

    tl.fromTo(
      pills2,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        duration: 0.45,
        ease: 'power3.out',
      },
      10.0,
    );

    tl.fromTo(
      logos2,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.06,
        duration: 0.45,
        ease: 'power3.out',
      },
      10.3,
    );

    if (bottomLabel2) {
      tl.fromTo(
        bottomLabel2,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' },
        10.6,
      );
    }

    tl.to(
      stackRef.current,
      {
        opacity: 0,
        ease: 'power2.inOut',
        duration: 1.5,
      },
      12,
    );

    tl.to(
      typeRef2.current,
      {
        opacity: 0,
        ease: 'power2.inOut',
        duration: 1.5,
      },
      12,
    );

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);
}
