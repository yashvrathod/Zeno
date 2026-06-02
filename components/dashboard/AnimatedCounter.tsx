'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
  from?: number;
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
  formatter?: (v: number) => string;
}

export function AnimatedCounter({
  from = 0,
  to,
  suffix = '',
  prefix = '',
  decimals = 0,
  className,
  formatter,
}: AnimatedCounterProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(prefersReduced ? to : from);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20, mass: 0.5 });
  const rounded = useTransform(spring, (v) => {
    if (formatter) return formatter(v);
    return `${prefix}${v.toFixed(decimals)}${suffix}`;
  });

  useEffect(() => {
    motionValue.set(to);
  }, [to, motionValue]);

  return <motion.span ref={ref} className={className}>{rounded}</motion.span>;
}
