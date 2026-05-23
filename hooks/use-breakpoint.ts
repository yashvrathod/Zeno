'use client';

import { useState, useEffect } from 'react';
import { BREAKPOINTS, type Breakpoint } from '@/components/hero/hero.config';

const breakpointEntries = Object.entries(BREAKPOINTS) as [Breakpoint, number][];

function getBreakpoint(width: number): Breakpoint {
  let match: Breakpoint = 'mobile';
  for (const [name, min] of breakpointEntries) {
    if (width >= min) match = name;
  }
  return match;
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('mobile');

  useEffect(() => {
    setBp(getBreakpoint(window.innerWidth));
    const onResize = () => setBp(getBreakpoint(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint();
  return bp === 'mobile';
}
