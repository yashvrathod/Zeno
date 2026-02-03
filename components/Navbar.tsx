'use client';

import React from 'react';
import { Search, Code, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Navbar() {
  return (
    <header className="bg-[#0f0f0f] border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <a href="/" className="flex items-center gap-2">
          <Code className="w-6 h-6 text-white" />
          <span className="text-white font-semibold text-lg">code.zone</span>
        </a>
        
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
        <a href="/problems" className="text-gray-400 hover:text-white text-sm hidden lg:block">Problems</a>
        <a href="/leaderboard" className="text-gray-400 hover:text-white text-sm hidden lg:block">Leaderboard</a>
        <button className="text-gray-400 hover:text-white text-sm hidden lg:block">Discuss</button>
        <button className="text-gray-400 hover:text-white text-sm hidden lg:block">Discover</button>
        <button className="text-gray-400 hover:text-white text-sm hidden lg:block">Hackathons</button>
        
        <a href="/profile" className="flex items-center gap-2">
          <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop" />
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
        </a>
      </div>
    </header>
  );
}
