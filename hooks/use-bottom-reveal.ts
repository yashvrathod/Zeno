'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface UseBottomRevealParams {
  imgSlideRef: React.RefObject<HTMLDivElement | null>;
  oldLabelRef: React.RefObject<HTMLSpanElement | null>;
  newLabelRef: React.RefObject<HTMLSpanElement | null>;
  greenCardRef: React.RefObject<HTMLDivElement | null>;
}

export function useBottomReveal({
  imgSlideRef,
  oldLabelRef,
  newLabelRef,
  greenCardRef,
}: UseBottomRevealParams) {
  useEffect(() => {
    const section = imgSlideRef.current?.closest('section');

    if (
      !section ||
      !imgSlideRef.current ||
      !oldLabelRef.current ||
      !newLabelRef.current ||
      !greenCardRef.current
    )
      return;

    const ctx = gsap.context(() => {
      gsap.set(newLabelRef.current, { opacity: 0, y: 20 });
      gsap.set(imgSlideRef.current, { y: '100%' });
      gsap.set(greenCardRef.current, { y: '100%' });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=900%',
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.to({}, { duration: 1.2 });

      tl.to(imgSlideRef.current, { y: '0%', duration: 0.8, ease: 'power2.out' }, 'slide');
      tl.to(greenCardRef.current, { y: '0%', duration: 0.8, ease: 'power2.out' }, 'slide');

      tl.to(
        imgSlideRef.current,
        { y: '-45%', ease: 'power3.inOut', duration: 2 },
        'slide+=0.8',
      );

      tl.to(
        oldLabelRef.current,
        { opacity: 0, y: -20, filter: 'blur(10px)', ease: 'power2.out', duration: 0.6 },
        'slide+=1.0',
      );

      tl.to(
        newLabelRef.current,
        { opacity: 1, y: 0, filter: 'blur(0px)', ease: 'expo.out', duration: 0.8 },
        'slide+=1.3',
      );

      // Add fade out at the end of this pin
      tl.to(section, {
        opacity: 0,
        scale: 0.9,
        filter: 'blur(10px)',
        duration: 1,
      }, '+=0.5');
    });

    return () => ctx.revert();
  }, []);
}
