'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface UseFooterEntranceParams {
  footerRef: React.RefObject<HTMLDivElement | null>;
}

export function useFooterEntrance({ footerRef }: UseFooterEntranceParams) {
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const ctx = gsap.context(() => {
      const items = footer.querySelectorAll<HTMLElement>('[data-footer-item]');
      if (!items.length) return;

      gsap.set(items, { y: 40, opacity: 0 });

      gsap.to(items, {
        y: 0,
        opacity: 1,
        stagger: 0.05,
        ease: 'power3.out',
        duration: 0.8,
        scrollTrigger: {
          trigger: footer,
          start: 'top bottom-=10%',
          end: 'top center',
          scrub: 1,
        },
      });
    });

    return () => ctx.revert();
  }, []);
}
