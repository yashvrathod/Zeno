'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  Settings,
  Brain,
  Layers,
  BarChart3,
  User,
  Award,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const SidebarIcon = ({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) => (
    <Link
      href={href}
      className={`w-full flex items-center justify-center py-4 transition-all duration-300 group/icon relative ${
        active
          ? 'text-white'
          : 'text-zinc-700 hover:text-zinc-400'
      }`}
    >
      <div className={`shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-500 ${active ? 'bg-white/5 shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10' : ''}`}>
        {icon}
      </div>

      <span className="absolute left-16 px-3 py-1 bg-white text-black text-[10px] font-bold tracking-widest uppercase rounded opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100]">
        {label}
      </span>

      {active && <div className="absolute left-0 w-1 h-6 bg-purple-500 rounded-r-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />}
    </Link>
  );

  return (
    <aside
      className="w-20 flex flex-col items-center py-8 border-r border-white/5 bg-[#050505] h-full z-50 group/sidebar overflow-hidden"
    >
      <div className="mb-12">
         <Link href="/" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 italic font-serif text-white text-xl hover:border-white/40 transition-colors shrink-0">
           C
         </Link>
      </div>

      <nav className="flex-1 flex flex-col gap-2 w-full">
        <SidebarIcon href="/" icon={<LayoutGrid size={20} strokeWidth={1.5} />} label="WORKBENCH" active={pathname === '/'} />
        <SidebarIcon href="/dashboard" icon={<BarChart3 size={20} strokeWidth={1.5} />} label="DASHBOARD" active={pathname === '/dashboard'} />
        <SidebarIcon href="/problems" icon={<Layers size={20} strokeWidth={1.5} />} label="CURRICULUM" active={pathname.startsWith('/problems')} />
        <SidebarIcon href="/profile" icon={<User size={20} strokeWidth={1.5} />} label="PROFILE" active={pathname === '/profile'} />
        <SidebarIcon href="/profile/skills" icon={<Brain size={20} strokeWidth={1.5} />} label="SKILL TREE" active={pathname === '/profile/skills'} />
        <SidebarIcon href="/leaderboard" icon={<Award size={20} strokeWidth={1.5} />} label="LEADERBOARD" active={pathname === '/leaderboard'} />
      </nav>

      <div className="mt-auto w-full">
        <Link
          href="/settings"
          className="w-full flex items-center justify-center py-4 text-zinc-700 hover:text-white transition-all duration-300"
        >
          <Settings size={20} strokeWidth={1.5} />
        </Link>
      </div>
    </aside>
  );
}
