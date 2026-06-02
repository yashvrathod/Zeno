'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface QuickActionCardProps {
  icon: ReactNode;
  label: string;
  sub: string;
  href: string;
  gradient: string;
}

export function QuickActionCard({ icon, label, sub, href, gradient }: QuickActionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <Link
        href={href}
        className="group relative glass-panel-strong rounded-2xl p-5 overflow-hidden block hover:border-white/[0.08] transition-colors duration-300"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500`} />
        <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.04] blur-3xl transition-opacity duration-700`} />
        <div className="relative flex items-center gap-4">
          <motion.div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg shrink-0`}
            whileHover={{ rotate: -5, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            {icon}
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">{label}</p>
            <p className="text-[10px] text-zinc-600">{sub}</p>
          </div>
          <motion.div
            className="shrink-0"
            initial={{ x: 0 }}
            whileHover={{ x: 3 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <ArrowRight size={16} className="text-zinc-700 group-hover:text-white transition-colors duration-300" />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}
