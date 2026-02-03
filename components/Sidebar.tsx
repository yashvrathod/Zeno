'use client';

import React from 'react';
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
  return (
    <aside className="w-64 bg-[#0f0f0f] border-r border-zinc-800 p-4 hidden lg:block overflow-y-auto">
      <nav className="space-y-1">
        <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <Home className="w-5 h-5" />
          My Feed
        </a>
        <a href="/problems" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <Code className="w-5 h-5" />
          Problems
        </a>
        <a href="/leaderboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
          <Users className="w-5 h-5" />
          Leaderboard
        </a>
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
        <a href="/profile" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-900 rounded-lg transition-colors">
          <img 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
            alt="Profile"
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Robert J.</p>
            <p className="text-xs text-gray-400">@robert_dev</p>
          </div>
        </a>
      </div>
    </aside>
  );
}
