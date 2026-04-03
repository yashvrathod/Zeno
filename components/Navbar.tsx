'use client';

import React from 'react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Search, Code, User, Menu, Settings, Bell, Zap, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Navbar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';

  return (
    <header className="bg-[#050507] border-b border-white/5 h-16 flex items-center justify-between px-8 sticky top-0 z-50 backdrop-blur-md bg-opacity-80" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
      <div className="flex items-center gap-12">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-purple-900/20">
            <Code className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight group-hover:text-purple-400 transition-colors">code.zone</span>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-8 text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
          <Link href="/problems" className="hover:text-white transition-colors">Problems</Link>
          <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
          <Link href="/discussions" className="hover:text-white transition-colors">Discussions</Link>
          <Link href="/explore" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Sparkles size={10} className="text-purple-400" />
            Explore
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-2 w-64 lg:w-96 focus-within:border-purple-500/30 transition-all group">
          <Search className="w-4 h-4 text-white/20 group-focus-within:text-purple-400 transition-colors mr-2" />
          <input 
            type="text" 
            placeholder="Search problems..."
            className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full font-medium"
          />
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-full">
              <Zap size={12} className="text-orange-400" />
              <span className="text-[10px] font-bold text-orange-400">450 XP</span>
            </div>
          )}

          {isLoading ? (
            <div className="h-8 w-8 rounded-full bg-white/5 animate-pulse" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center outline-none">
                  <Avatar className="w-9 h-9 border border-white/10 hover:border-purple-500/40 transition-colors cursor-pointer">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="bg-white/5 text-white/40 text-xs">
                      {user.name?.charAt(0) ?? <User className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0f] border-white/10 text-white shadow-2xl">
                <div className="px-2 py-3 flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-white/10">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="bg-white/5 text-white/40">
                      {user.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <p className="text-[10px] text-white/40 truncate">@{user.username || 'user'}</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem asChild className="focus:bg-white/5 focus:text-purple-400 cursor-pointer py-3">
                  <Link href="/profile" className="flex items-center gap-3">
                    <User size={16} />
                    Profile Overview
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="focus:bg-white/5 focus:text-purple-400 cursor-pointer py-3">
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings size={16} />
                    Preferences
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
                <DropdownMenuItem 
                  onSelect={() => signOut({ callbackUrl: '/' })}
                  className="focus:bg-rose-500/10 focus:text-rose-400 text-rose-400/80 cursor-pointer py-3"
                >
                  Sign Out of Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-4">
              <button
                className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                onClick={() => signIn(undefined, { callbackUrl: '/' })}
              >
                Sign In
              </button>
              <Link
                href="/auth/register"
                className="text-[10px] font-bold uppercase tracking-widest bg-purple-500 hover:bg-purple-600 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-95"
              >
                Join Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
