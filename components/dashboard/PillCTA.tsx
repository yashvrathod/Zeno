'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface PillCTAProps {
  label: string;
  href: string;
  icon?: ReactNode;
  iconBgClass?: string;
  size?: 'sm' | 'md' | 'lg';
  external?: boolean;
}

export function PillCTA({
  label,
  href,
  icon = <ArrowRight size={16} />,
  iconBgClass = 'bg-gradient-to-br from-rose-500 to-red-600',
  size = 'md',
  external = false,
}: PillCTAProps) {
  const dims = {
    sm: { wrap: 'h-11', btn: 'h-11 w-11', text: 'text-[11px]', padding: 'pl-[52px] pr-5' },
    md: { wrap: 'h-14', btn: 'h-14 w-14', text: 'text-xs', padding: 'pl-[64px] pr-7' },
    lg: { wrap: 'h-16', btn: 'h-16 w-16', text: 'text-sm', padding: 'pl-[72px] pr-8' },
  }[size];

  const inner = (
    <>
      <motion.div
        className={`absolute left-0 top-0 ${dims.btn} rounded-full ${iconBgClass} flex items-center justify-center text-white shadow-lg`}
        whileHover={{ rotate: -15, scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        {icon}
      </motion.div>
      <span className={`font-bold tracking-[0.2em] uppercase text-white whitespace-nowrap`}>
        {label}
      </span>
      <motion.div
        className="ml-3 text-white/60"
        initial={{ x: 0 }}
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <ArrowRight size={14} />
      </motion.div>
    </>
  );

  const className = `group relative ${dims.wrap} ${dims.padding} inline-flex items-center justify-center rounded-full glass-pill border border-white/10 hover:border-white/20 transition-all duration-300 overflow-visible`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
