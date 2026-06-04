'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function useTestResultReveal(results: unknown[], containerRef: React.RefObject<HTMLDivElement | null>) {
  const prevCount = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || results.length === 0 || results.length === prevCount.current) return;

    prevCount.current = results.length;

    const cards = container.querySelectorAll<HTMLElement>('[data-result-card]');
    if (!cards.length) return;

    gsap.fromTo(
      cards,
      { opacity: 0, y: 6, scale: 0.99, willChange: 'transform, opacity' },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        stagger: 0.035,
        duration: 0.24,
        ease: 'power2.out',
        clearProps: 'willChange',
      }
    );

    // Animate the summary counters
    const summaryItems = container.querySelectorAll<HTMLElement>('[data-summary-item]');
    if (summaryItems.length) {
      gsap.fromTo(summaryItems, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, stagger: 0.03, duration: 0.22, ease: 'power2.out' });
    }
  }, [results, containerRef]);
}
