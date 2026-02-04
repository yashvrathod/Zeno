'use client';

import React from 'react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Search, Code, User, Menu } from 'lucide-react';
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

  // While NextAuth is hydrating the session on the client, avoid rendering the wrong auth CTA.
  const isLoading = status === 'loading';

  return (
    <header className="bg-[#0f0f0f] border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Code className="w-6 h-6 text-white" />
          <span className="text-white font-semibold text-lg">code.zone</span>
        </Link>
        
        <div className="hidden md:flex items-center bg-[#1a1a1a] rounded-lg px-4 py-2 w-64 lg:w-96">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input 
            type="text" 
            placeholder="Search"
            className="bg-transparent border-none outline-none text-sm text-gray-300 w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Mobile menu */}
        <div className="lg:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="p-2 rounded-md hover:bg-zinc-900 text-gray-300"
              >
                <Menu className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/problems">Problems</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/leaderboard">Leaderboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onSelect={() => signOut({ callbackUrl: '/' })}>
                  Sign out
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onSelect={() => signIn(undefined, { callbackUrl: '/' })}>
                    Sign in
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/register">Sign up</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Link href="/problems" className="text-gray-400 hover:text-white text-sm hidden lg:block">Problems</Link>
        <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm hidden lg:block">Leaderboard</Link>
        <button className="text-gray-400 hover:text-white text-sm hidden lg:block">Discuss</button>
        <button className="text-gray-400 hover:text-white text-sm hidden lg:block">Discover</button>
        <button className="text-gray-400 hover:text-white text-sm hidden lg:block">Hackathons</button>
        
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-20 rounded-md bg-zinc-800 animate-pulse" />
          </div>
        ) : user ? (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2">
              <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            </Link>
            <button
              className="text-gray-400 hover:text-white text-sm hidden md:block"
              onClick={() => signOut({ callbackUrl: '/' })}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              className="text-gray-300 hover:text-white text-sm"
              onClick={() => signIn(undefined, { callbackUrl: '/' })}
            >
              Sign in
            </button>
            <Link
              href="/auth/register"
              className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-md"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
