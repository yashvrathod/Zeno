'use client';

import React from 'react';
import {
  Camera,
  Code,
  MoreVertical,
  ThumbsUp,
  TrendingUp,
  Flame,
  Heart,
  Rocket,
  MessageCircle,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function CodeZonePage() {
  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="max-w-3xl mx-auto p-4">
            {/* New Post Section */}
            <div className="bg-[#0f0f0f] border border-zinc-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
                  alt="User"
                  className="w-10 h-10 rounded-full"
                />
                <input 
                  type="text"
                  placeholder="New Post"
                  className="flex-1 bg-transparent border-none outline-none text-gray-400 placeholder:text-gray-600"
                />
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
                <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors">
                  <Code className="w-5 h-5" />
                </button>
                <span className="text-sm ml-2">More</span>
                <button className="ml-auto bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                  →
                </button>
              </div>
            </div>

            {/* Feed Tabs */}
            <div className="flex items-center gap-6 mb-6 border-b border-zinc-800">
              <button className="flex items-center gap-2 px-1 pb-3 border-b-2 border-pink-500 text-pink-500 font-medium">
                <Heart className="w-4 h-4 fill-current" />
                Following
              </button>
              <button className="flex items-center gap-2 px-1 pb-3 text-gray-400 hover:text-white transition-colors">
                <Flame className="w-4 h-4" />
                Featured
              </button>
              <button className="flex items-center gap-2 px-1 pb-3 text-gray-400 hover:text-white transition-colors">
                <Rocket className="w-4 h-4" />
                Rising
              </button>
            </div>

            {/* Post Card */}
            <article className="bg-[#0f0f0f] border border-zinc-800 rounded-lg overflow-hidden mb-6">
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <img 
                    src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"
                    alt="emhao2005"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">emhao2005</span>
                      <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                    </div>
                    <span className="text-sm text-gray-500">2 hours ago</span>
                  </div>
                  <button className="ml-auto text-gray-500 hover:text-white">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-gray-400">TypeScript useful advanced types</span>
                  </div>
                  
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    As the title says, here are all the useful types that I&apos;m using every day or create new types on top of them. I thought it might be handy for some people so I just share here and this will be updated moving forward:
                  </p>

                  <div className="bg-[#0a0a0a] rounded-lg p-4 border border-zinc-800 mb-3">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                      <span className="text-xs text-gray-500">Loop through an tuple array type</span>
                      <button className="text-gray-500 hover:text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                    <pre className="text-sm overflow-x-auto" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                      <code className="text-gray-300" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
{`type ReduceItems<Arr extends ReadonlyArray<any>, Result extends 
any[] = []> = Arr extends [infer H]
  ? Arr extends readonly [infer H, ...infer Tail]
  ? [
    ...Result, 
    ...["items"]]
    : never
  : Arr extends readonly [infer H, ...infer Tail]
    ? tail extends ReadonlyArray<any>
      ? H extends {items: ReadonlyArray<MenuItem>}
        ? ReduceItems<Tail, [...Result, ...["items"]]>
        : never
      : never;`}
                      </code>
                    </pre>
                  </div>

                  <button className="text-orange-500 hover:text-orange-400 text-sm font-medium flex items-center gap-2">
                    Read All 
                    <span>→</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 mb-4">
                  <span className="text-xs text-gray-500 px-2 py-1 bg-zinc-900 rounded">#typescript</span>
                </div>

                <div className="flex items-center gap-6 pt-4 border-t border-zinc-800">
                  <button className="flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">204</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">24</span>
                  </button>
                  <button className="flex items-center gap-2 text-gray-400 hover:text-green-500 transition-colors">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">40</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 bg-[#0f0f0f] border-l border-zinc-800 p-4 hidden xl:block overflow-y-auto">
          {/* Introducing Pro Banner */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 mb-6 relative overflow-hidden">
            <button className="absolute top-2 right-2 text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-orange-200 text-lg">🌟</span>
              <h3 className="text-white font-bold">Introducing Pro</h3>
            </div>
            <p className="text-sm text-orange-100 mb-4">
              Boost your publishing with our new premium features.
            </p>
            <div className="flex gap-2">
              <button className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-50 transition-colors">
                Upgrade Now
              </button>
              <button className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                Explore
              </button>
            </div>
          </div>

          {/* Trending Topics */}
          <div className="mb-6">
            <h3 className="text-white font-bold mb-4">Trending Topics</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">#11node</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">#avalanche</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">#ankr</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">#thwebapps</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">dev</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">#polygon</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">#90daysofdevops</span>
            </div>
          </div>

          {/* Official Channels */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-white font-bold">Official Channels</h3>
              <span className="text-orange-500">🌟</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  VS
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">VS Code</div>
                </div>
                <button className="text-xs text-gray-400 hover:text-white px-3 py-1 border border-zinc-700 rounded hover:border-zinc-600 transition-colors">
                  Follow
                </button>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  R
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">React</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">Shadcn/UI</div>
                </div>
                <button className="text-xs text-gray-400 hover:text-white px-3 py-1 border border-zinc-700 rounded hover:border-zinc-600 transition-colors">
                  Follow
                </button>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  C
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">ChatGPT</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-sky-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  T
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">Tailwind CSS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Discussions */}
          <div>
            <h3 className="text-white font-bold mb-4">Top Discussions this Week</h3>
            <div className="space-y-4">
              <div className="text-sm">
                <p className="text-gray-300 hover:text-white cursor-pointer mb-1">
                  Why Isn&apos;t React Re-rendering When State is Updated with the Same Value?
                </p>
                <span className="text-xs text-gray-500">181 comments</span>
              </div>
              <div className="text-sm">
                <p className="text-gray-300 hover:text-white cursor-pointer mb-1">
                  What are Your Goals for the Week of Nov 20?
                </p>
                <span className="text-xs text-gray-500">124 comments</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
