'use client';

import React from 'react';
import Link from 'next/link';

export function NavLink({ label, href, active = false }: { label: string, href: string, active?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-xs font-bold tracking-[0.2em] uppercase transition-all hover:text-white ${active ? 'text-white border-b border-white' : 'text-zinc-600'}`}
    >
      {label}
    </Link>
  );
}

export function SidebarLink({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-5 px-6 py-4.5 rounded-[1.25rem] transition-all duration-300 group relative ${active ? 'bg-white/[0.07] text-white shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/[0.03]'}`}
    >
      <div className={`shrink-0 transition-colors duration-300 ${active ? 'text-white' : 'text-zinc-600 group-hover:text-white'}`}>
        {icon}
      </div>
      <span className="text-xs font-semibold tracking-widest uppercase">
        {label}
      </span>
      {active && <div className="absolute left-0 w-1.5 h-8 bg-[#a855f7] rounded-r-full shadow-[0_0_15px_rgba(168,85,247,0.6)]" />}
    </Link>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty?: string }) {
  if (!difficulty) return null;
  const colors: Record<string, string> = {
    EASY: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    MEDIUM: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    HARD: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${colors[difficulty] || 'text-zinc-500 border-zinc-700/30 bg-zinc-800/20'}`}>
      {difficulty}
    </span>
  );
}
