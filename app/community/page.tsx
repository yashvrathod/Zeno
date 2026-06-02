'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { MessageSquare, Users, TrendingUp, Loader2, ArrowRight } from 'lucide-react';

interface Discussion {
  id: string;
  title: string;
  author: string;
  replies: number;
  timestamp: string;
  tags: string[];
}

const FEATURED_DISCUSSIONS: Discussion[] = [
  { id: '1', title: 'How to approach DP problems in interviews?', author: 'algo_master', replies: 24, timestamp: '2h ago', tags: ['Dynamic Programming', 'Interview Tips'] },
  { id: '2', title: 'Two Sum to Expert: My 6-month journey', author: 'code_ninja', replies: 18, timestamp: '5h ago', tags: ['Journey', 'Motivation'] },
  { id: '3', title: 'Best resources for Graph theory?', author: 'graph_guru', replies: 12, timestamp: '1d ago', tags: ['Graphs', 'Resources'] },
  { id: '4', title: 'Understanding the Sliding Window pattern', author: 'window_master', replies: 9, timestamp: '2d ago', tags: ['Sliding Window', 'Tutorial'] },
  { id: '5', title: 'Common mistakes in Binary Search implementation', author: 'search_sage', replies: 15, timestamp: '3d ago', tags: ['Binary Search', 'Debugging'] },
];

const STATS = [
  { label: 'Active Members', value: '2,847', icon: Users },
  { label: 'Discussions', value: '1,203', icon: MessageSquare },
  { label: 'Solutions Shared', value: '4,691', icon: TrendingUp },
];

export default function CommunityPage() {
  const [discussions] = useState(FEATURED_DISCUSSIONS);

  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Community</h1>
            <p className="text-zinc-400 text-lg">Learn together, grow together</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-zinc-400" />
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Recent Discussions</h2>
          </div>

          <div className="space-y-3">
            {discussions.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-white/10 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors">{d.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                      <span>by {d.author}</span>
                      <span>{d.timestamp}</span>
                      <span>{d.replies} replies</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {d.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] text-zinc-400 bg-white/5 border border-white/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 ml-4 shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-zinc-500 text-sm">Community features are in preview. Full discussion boards and solution sharing coming soon.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
