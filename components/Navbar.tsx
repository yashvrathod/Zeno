'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Navbar() {
  const { data: session } = useSession();

  const NavLink = ({ label, href, active = false }: { label: string, href: string, active?: boolean }) => (
    <Link 
      href={href} 
      className={`text-[11px] font-bold tracking-[0.2em] uppercase transition-all hover:text-white ${active ? 'text-white border-b border-white' : 'text-zinc-600'}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505] w-full sticky top-0 z-40">
      <div className="flex items-center gap-2">
         <Link href="/" className="text-white font-serif italic text-xl tracking-wide hover:opacity-80 transition-opacity">Aether AI</Link>
      </div>

      <nav className="hidden md:flex items-center gap-10">
        <NavLink label="Home" href="/" />
        <NavLink label="Problems" href="/problems" />
        <NavLink label="Leaderboard" href="/leaderboard" />
        <NavLink label="Discussions" href="/discussions" />
      </nav>

      <div className="flex items-center gap-4">
         <Link href="/profile">
           <Avatar className="w-8 h-8 border border-white/10 hover:border-white/30 transition-colors">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback className="bg-white/5 text-[10px]">{session?.user?.name?.[0] ?? 'U'}</AvatarFallback>
           </Avatar>
         </Link>
      </div>
    </header>
  );
}
