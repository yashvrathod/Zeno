'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutGrid,
  Activity,
  Code,
  Circle,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const SidebarIcon = ({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) => (
    <Link 
      href={href} 
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group/icon relative ${
        active 
          ? 'bg-white/5 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
          : 'text-zinc-600 hover:text-white hover:bg-white/[0.02]'
      }`}
    >
      <div className="shrink-0 w-8 flex justify-center">
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-500 whitespace-nowrap">
        {label}
      </span>
      {active && <div className="absolute left-0 w-1 h-6 bg-purple-500 rounded-r-full" />}
    </Link>
  );

  return (
    <aside 
      className="w-16 hover:w-64 transition-all duration-500 ease-in-out flex flex-col items-center py-6 border-r border-white/5 bg-[#050505] h-full z-50 group/sidebar overflow-hidden"
    >
      <div className="mb-12 w-full flex justify-center group-hover/sidebar:justify-start group-hover/sidebar:px-4 transition-all duration-500">
         <Link href="/" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 italic font-serif text-white text-lg hover:border-white/40 transition-colors shrink-0">
           A
         </Link>
         <span className="ml-4 text-white font-serif italic text-xl opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-700 whitespace-nowrap hidden group-hover/sidebar:block">
           Aether
         </span>
      </div>
      
      <nav className="flex-1 flex flex-col gap-4 w-full px-2">
        <SidebarIcon href="/" icon={<LayoutGrid size={20} />} label="WORKBENCH" active={pathname === '/'} />
        <SidebarIcon href="/problems" icon={<Code size={20} />} label="ARCHITECT" active={pathname.startsWith('/problems')} />
        <SidebarIcon href="/leaderboard" icon={<Activity size={20} />} label="LEADERBOARD" active={pathname === '/leaderboard'} />
        <SidebarIcon href="/settings" icon={<Circle size={18} />} label="SETTINGS" active={pathname === '/settings'} />
      </nav>

      <div className="mt-auto w-full px-2">
        <Link 
          href="/settings" 
          className="w-full flex items-center gap-4 px-4 py-3 text-zinc-600 hover:text-white hover:bg-white/[0.02] rounded-xl transition-all duration-300 group/icon"
        >
          <div className="shrink-0 w-8 flex justify-center">
            <Settings size={20} />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-500 whitespace-nowrap">
            Configuration
          </span>
        </Link>
      </div>
    </aside>
  );
}
