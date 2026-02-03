'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { 
  Home,
  Users,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Bell,
  Settings,
  Code,
  User
} from 'lucide-react';

export default function Sidebar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';

  return (
    <aside className="w-64 bg-[#0f0f0f] border-r border-zinc-800 p-4 hidden lg:block overflow-y-auto">
      <nav className="space-y-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <Home className="w-5 h-5" />
          My Feed
        </Link>
        <Link href="/problems" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <Code className="w-5 h-5" />
          Problems
        </Link>
        <Link href="/leaderboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <Users className="w-5 h-5" />
          Leaderboard
        </Link>
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span>Messages</span>
          <span className="ml-auto bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">5</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <Bookmark className="w-5 h-5" />
          Bookmarks
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <MoreHorizontal className="w-5 h-5" />
          More
        </a>
      </nav>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors w-full">
          <Bell className="w-5 h-5" />
          <span>Notifications</span>
          <span className="ml-auto bg-zinc-700 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
        </button>
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors w-full">
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        {isLoading ? (
          <div className="h-14 rounded-lg bg-zinc-900/40 border border-zinc-800 animate-pulse" />
        ) : user ? (
          <Link href="/profile" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-900 rounded-lg transition-colors">
            <img
              src={user.image ?? 'https://placehold.co/80x80?text=U'}
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{user.name ?? 'User'}</p>
              <p className="text-xs text-gray-400">@{user.username || 'user'}</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-zinc-800">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Guest</p>
              <p className="text-xs text-gray-400">Sign in to track progress</p>
            </div>
            <button
              className="text-xs text-orange-400 hover:text-orange-300"
              onClick={() => signIn(undefined, { callbackUrl: '/' })}
            >
              Sign in
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
