'use client';

import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const MILESTONES = [
  { title: 'Advanced DP', desc: 'Digit DP, DP on trees, DP with bitmask, DP on intervals', href: '/problems', patterns: ['Digit DP', 'Tree DP', 'Bitmask DP', 'Interval DP'] },
  { title: 'Graph Algorithms', desc: 'Dijkstra, Bellman-Ford, Floyd-Warshall, Tarjan, Kosaraju', href: '/problems', patterns: ['Shortest Path', 'SCC', 'Bridges', 'Articulation'] },
  { title: 'Advanced Trees', desc: 'Fenwick tree, segment tree with lazy, treap, AVL, red-black', href: '/problems', patterns: ['Fenwick', 'Segment Tree', 'Lazy Prop', 'Treap'] },
  { title: 'String Algorithms', desc: 'Z-algorithm, suffix array, Aho-Corasick, Manacher', href: '/problems', patterns: ['Z-Algo', 'Suffix Array', 'Aho-Corasick', 'Manacher'] },
  { title: 'Geometry & Math', desc: 'Convex hull, line sweep, combinatorics, number theory', href: '/problems', patterns: ['Convex Hull', 'Line Sweep', 'Combinatorics', 'GCD/LCM'] },
  { title: 'Flow & Matching', desc: 'Max flow, min cut, bipartite matching, Hungarian algorithm', href: '/problems', patterns: ['Max Flow', 'Min Cut', 'Bipartite', 'Hungarian'] },
  { title: 'Competitive Programming', desc: 'Optimization techniques, IOI/ICPC style problems, speed-coding', href: '/problems', patterns: ['Optimization', 'Speed Coding', 'ICPC', 'IOI'] },
];

export default function AdvancedRoadmapPage() {
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const toggleMilestone = (i: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-12">
          <Link href="/roadmap" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to roadmaps
          </Link>

          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
              Advanced DSA
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Go Pro</h1>
            <p className="text-zinc-400 text-lg max-w-2xl">Deep dive into advanced algorithms, competitive programming, and optimization techniques.</p>
          </div>

          <div className="relative">
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-white/5" />

            <div className="space-y-8">
              {MILESTONES.map((m, i) => {
                const isDone = completed.has(i);
                return (
                  <div key={i} className="relative pl-16">
                    <button
                      onClick={() => toggleMilestone(i)}
                      className="absolute left-[11px] top-1 -translate-x-1/2"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-7 h-7 text-amber-400" />
                      ) : (
                        <Circle className="w-7 h-7 text-zinc-600 hover:text-zinc-400 transition-colors" />
                      )}
                    </button>

                    <div className={`rounded-2xl border ${isDone ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-white/[0.02]'} p-6 hover:border-white/10 transition-all`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className={`text-xl font-semibold ${isDone ? 'text-amber-300' : 'text-white'} mb-1`}>{m.title}</h3>
                          <p className="text-zinc-400 text-sm">{m.desc}</p>
                        </div>
                        <span className="text-xs text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/10 whitespace-nowrap ml-4">
                          Step {i + 1}/{MILESTONES.length}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {m.patterns.map((p) => (
                          <span key={p} className="px-2.5 py-1 rounded-full text-xs text-zinc-400 bg-white/5 border border-white/10">
                            {p}
                          </span>
                        ))}
                      </div>

                      <Link
                        href={m.href}
                        className="inline-flex items-center gap-1.5 mt-4 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        Start practicing →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
