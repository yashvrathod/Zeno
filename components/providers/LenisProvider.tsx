'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

interface LenisProviderProps {
  children: React.ReactNode;
  options?: {
    duration?: number;
    easing?: (t: number) => number;
    smoothWheel?: boolean;
    wheelMultiplier?: number;
    touchMultiplier?: number;
    infinite?: boolean;
  };
}

export function LenisProvider({ children, options = {} }: LenisProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: options.duration ?? 1.2,
      easing: options.easing ?? ((t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t))),
      smoothWheel: options.smoothWheel ?? true,
      wheelMultiplier: options.wheelMultiplier ?? 1,
      touchMultiplier: options.touchMultiplier ?? 2,
      infinite: options.infinite ?? false,
    });

    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
