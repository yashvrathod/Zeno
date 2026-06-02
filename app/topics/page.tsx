'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  Braces,
  GitBranch,
  Layers,
  Repeat,
  Search,
  Network,
  Hash,
  List,
  Sigma,
  Cpu,
  ArrowRight,
} from 'lucide-react';

const TOPICS = [
  { slug: 'arrays', name: 'Arrays & Strings', icon: Braces, color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20', text: 'text-blue-400', count: 8 },
  { slug: 'graphs', name: 'Graphs & Trees', icon: GitBranch, color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20', text: 'text-emerald-400', count: 12 },
  { slug: 'dp', name: 'Dynamic Programming', icon: Layers, color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/20', text: 'text-violet-400', count: 15 },
  { slug: 'recursion', name: 'Recursion & Backtracking', icon: Repeat, color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20', text: 'text-amber-400', count: 6 },
  { slug: 'sorting', name: 'Sorting & Searching', icon: Search, color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/20', text: 'text-rose-400', count: 10 },
  { slug: 'heaps', name: 'Heaps & Hashing', icon: Network, color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/20', text: 'text-cyan-400', count: 7 },
  { slug: 'linked-lists', name: 'Linked Lists', icon: List, color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/20', text: 'text-orange-400', count: 5 },
  { slug: 'stacks-queues', name: 'Stacks & Queues', icon: Sigma, color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/20', text: 'text-pink-400', count: 4 },
  { slug: 'bit-manipulation', name: 'Bit Manipulation', icon: Cpu, color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/20', text: 'text-indigo-400', count: 3 },
];

export default function TopicsPage() {
  const [patternCounts, setPatternCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/patterns', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.patterns) {
          const counts: Record<string, number> = {};
          d.patterns.forEach((p: { name: string; problemCount: number }) => {
            const name = p.name.toLowerCase();
            if (name.includes('array') || name.includes('string') || name.includes('pointer') || name.includes('sliding')) {
              counts.arrays = (counts.arrays || 0) + 1;
            } else if (name.includes('graph') || name.includes('tree') || name.includes('bfs') || name.includes('dfs')) {
              counts.graphs = (counts.graphs || 0) + 1;
            } else if (name.includes('dp') || name.includes('dynamic') || name.includes('memo')) {
              counts.dp = (counts.dp || 0) + 1;
            } else if (name.includes('recursion') || name.includes('backtrack') || name.includes('subset')) {
              counts.recursion = (counts.recursion || 0) + 1;
            } else if (name.includes('sort') || name.includes('search') || name.includes('binary')) {
              counts.sorting = (counts.sorting || 0) + 1;
            } else if (name.includes('heap') || name.includes('hash') || name.includes('map')) {
              counts.heaps = (counts.heaps || 0) + 1;
            } else if (name.includes('linked') || name.includes('list')) {
              counts['linked-lists'] = (counts['linked-lists'] || 0) + 1;
            } else if (name.includes('stack') || name.includes('queue')) {
              counts['stacks-queues'] = (counts['stacks-queues'] || 0) + 1;
            } else if (name.includes('bit') || name.includes('xor') || name.includes('mask')) {
              counts['bit-manipulation'] = (counts['bit-manipulation'] || 0) + 1;
            }
          });
          setPatternCounts(counts);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">DSA Topics</h1>
            <p className="text-zinc-400 text-lg">Master every data structure and algorithm category</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOPICS.map((topic) => {
              const Icon = topic.icon;
              const count = patternCounts[topic.slug] ?? topic.count;
              return (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className={`group relative overflow-hidden rounded-2xl border ${topic.border} bg-gradient-to-br ${topic.color} p-6 hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-white/5 border ${topic.border} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${topic.text}`} />
                    </div>
                    <ArrowRight className={`w-5 h-5 ${topic.text} opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0`} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{topic.name}</h3>
                  <p className={`text-sm ${topic.text}`}>{count} patterns</p>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
