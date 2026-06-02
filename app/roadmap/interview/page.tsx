'use client';

import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { CheckCircle2, Circle, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const MILESTONES = [
  { title: 'Advanced Arrays', desc: 'Kadane, cyclic sort, in-place manipulation, intervals', href: '/problems', patterns: ['Kadane', 'Cyclic Sort', 'Intervals'] },
  { title: 'Trees & Graphs', desc: 'BST, tree traversals, graph representations, DFS/BFS', href: '/problems', patterns: ['Tree Traversal', 'Graph BFS/DFS', 'Topological Sort'] },
  { title: 'Dynamic Programming', desc: 'Memoization, tabulation, knapsack, LCS, LIS', href: '/problems', patterns: ['0/1 Knapsack', 'LCS', 'LIS', 'Grid DP'] },
  { title: 'Heaps & Priority Queues', desc: 'Top K, median finding, merge K sorted', href: '/problems', patterns: ['Top K', 'Two Heaps', 'Merge K'] },
  { title: 'Tries & Advanced Trees', desc: 'Prefix tree, segment tree, union find, LCA', href: '/problems', patterns: ['Trie', 'Union Find', 'Segment Tree'] },
  { title: 'Backtracking', desc: 'Subsets, permutations, combinations, N-Queens', href: '/problems', patterns: ['Subsets', 'Permutations', 'N-Queens'] },
  { title: 'String Algorithms', desc: 'KMP, Rabin-Karp, palindrome, sliding window advanced', href: '/problems', patterns: ['KMP', 'Rabin-Karp', 'Sliding Window'] },
  { title: 'Mock Interviews', desc: 'Timed problems, multi-step solutions, system design basics', href: '/problems', patterns: ['Timed Practice', 'Multi-step', 'Optimization'] },
];

export default function InterviewRoadmapPage() {
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider mb-4">
              Interview Prep
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Crack the Interview</h1>
            <p className="text-zinc-400 text-lg max-w-2xl">FAANG-level preparation. Master advanced patterns and timed problem-solving.</p>
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
                        <CheckCircle2 className="w-7 h-7 text-violet-400" />
                      ) : (
                        <Circle className="w-7 h-7 text-zinc-600 hover:text-zinc-400 transition-colors" />
                      )}
                    </button>

                    <div className={`rounded-2xl border ${isDone ? 'border-violet-500/20 bg-violet-500/5' : 'border-white/5 bg-white/[0.02]'} p-6 hover:border-white/10 transition-all`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className={`text-xl font-semibold ${isDone ? 'text-violet-300' : 'text-white'} mb-1`}>{m.title}</h3>
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
                        className="inline-flex items-center gap-1.5 mt-4 text-sm text-violet-400 hover:text-violet-300 transition-colors"
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
