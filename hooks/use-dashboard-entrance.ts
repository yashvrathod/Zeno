'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useDashboardEntrance(ready: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mmRef = useRef<gsap.MatchMedia | null>(null);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const mm = gsap.matchMedia();
    mmRef.current = mm;

    mm.add('(min-width: 768px)', () => {
      const container = containerRef.current!;
      const hero = container.querySelector<HTMLElement>('.entrance-hero');
      const sections = container.querySelectorAll<HTMLElement>('.entrance-section');

      // Initial state — all hidden
      gsap.set([hero, ...sections], {
        opacity: 0,
        y: 16,
        willChange: 'transform, opacity',
      });

      // Entrance: hero + first visible sections
      const entranceTl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          // Register ScrollTriggers for sections still below fold
          sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            const isInViewport = rect.top < window.innerHeight + 100;

            if (!isInViewport) {
              ScrollTrigger.create({
                trigger: section,
                start: 'top 85%',
                onEnter: () => {
                  gsap.to(section, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' });
                },
              });
            }
          });
        },
      });

      if (hero) {
        entranceTl.to(hero, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
      }

      // Only animate sections visible in the first viewport
      const inViewSections = Array.from(sections).filter((section) => {
        const rect = section.getBoundingClientRect();
        return rect.top < window.innerHeight + 100;
      });

      if (inViewSections.length > 0) {
        entranceTl.to(inViewSections, { opacity: 1, y: 0, stagger: 0.06, duration: 0.45 }, '-=0.1');
      }
    });

    mm.add('(max-width: 767px)', () => {
      const container = containerRef.current!;
      const hero = container.querySelector<HTMLElement>('.entrance-hero');
      const sections = container.querySelectorAll<HTMLElement>('.entrance-section');

      gsap.set([hero, ...sections], { opacity: 0, willChange: 'opacity' });
      gsap.to([hero, ...sections], { opacity: 1, stagger: 0.04, duration: 0.25, ease: 'power2.out' });
    });

    // Respect reduced motion — just show everything immediately
    mm.add('(prefers-reduced-motion: reduce)', () => {
      const container = containerRef.current!;
      gsap.set(container.querySelectorAll<HTMLElement>('.entrance-hero, .entrance-section'), {
        opacity: 1,
        y: 0,
        clearProps: 'willChange',
      });
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      mm.kill();
    };
  }, [ready]);

  return containerRef;
}
