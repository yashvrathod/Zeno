'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface UseProblemEntranceParams {
  ready: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useProblemEntrance({ ready, containerRef }: UseProblemEntranceParams) {
  const mmRef = useRef<gsap.MatchMedia | null>(null);

  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const mm = gsap.matchMedia();
    mmRef.current = mm;

    mm.add('(min-width: 1024px)', () => {
      const container = containerRef.current!;
      const title = container.querySelector<HTMLElement>('.entrance-title');
      const patterns = container.querySelectorAll<HTMLElement>('.entrance-pattern');
      const statement = container.querySelector<HTMLElement>('.entrance-statement');
      const constraints = container.querySelector<HTMLElement>('.entrance-constraints');
      const hints = container.querySelectorAll<HTMLElement>('.entrance-hint');
      const rightPanel = container.querySelector<HTMLElement>('.entrance-editor');

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out', willChange: 'transform, opacity' },
      });

      if (title) {
        tl.fromTo(title, { opacity: 0, y: 8, filter: 'blur(3px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.32, ease: 'power2.out' });
      }

      if (patterns.length) {
        tl.fromTo(patterns, { opacity: 0, y: 6, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, stagger: 0.025, duration: 0.24, ease: 'power2.out' }, '-=0.18');
      }

      if (statement) {
        tl.fromTo(statement, { opacity: 0, y: 10, scale: 0.99 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power2.out' }, '-=0.12');
      }

      if (constraints) {
        tl.fromTo(constraints, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' }, '-=0.14');
      }

      if (hints.length) {
        tl.fromTo(hints, { opacity: 0, x: -6 }, { opacity: 1, x: 0, stagger: 0.04, duration: 0.22, ease: 'power2.out' }, '-=0.1');
      }

      if (rightPanel) {
        tl.fromTo(rightPanel, { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.32, ease: 'power2.out' }, '-=0.2');
      }
    });

    mm.add('(prefers-reduced-motion: reduce)', () => {
      const container = containerRef.current!;
      gsap.set(container.querySelectorAll<HTMLElement>('.entrance-title, .entrance-pattern, .entrance-statement, .entrance-constraints, .entrance-hint, .entrance-editor'), {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
        clearProps: 'willChange',
      });
    });

    return () => {
      mm.kill();
    };
  }, [ready, containerRef]);
}
