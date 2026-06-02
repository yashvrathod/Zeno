'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  Braces, GitBranch, Layers, Repeat, Search, Network, List, Sigma, Cpu,
  ChevronRight, ArrowLeft, BookOpen, CheckCircle2,
} from 'lucide-react';
import { notFound } from 'next/navigation';

const TOPICS = [
  { slug: 'arrays', name: 'Arrays & Strings', icon: Braces, color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/20', text: 'text-blue-400' },
  { slug: 'graphs', name: 'Graphs & Trees', icon: GitBranch, color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  { slug: 'dp', name: 'Dynamic Programming', icon: Layers, color: 'from-violet-500/20 to-violet-600/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  { slug: 'recursion', name: 'Recursion & Backtracking', icon: Repeat, color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  { slug: 'sorting', name: 'Sorting & Searching', icon: Search, color: 'from-rose-500/20 to-rose-600/10', border: 'border-rose-500/20', text: 'text-rose-400' },
  { slug: 'heaps', name: 'Heaps & Hashing', icon: Network, color: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
  { slug: 'linked-lists', name: 'Linked Lists', icon: List, color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/20', text: 'text-orange-400' },
  { slug: 'stacks-queues', name: 'Stacks & Queues', icon: Sigma, color: 'from-pink-500/20 to-pink-600/10', border: 'border-pink-500/20', text: 'text-pink-400' },
  { slug: 'bit-manipulation', name: 'Bit Manipulation', icon: Cpu, color: 'from-indigo-500/20 to-indigo-600/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
];

type PatternItem = {
  id: string;
  name: string;
  description: string | null;
  problemCount: number;
  problems: { id: string; slug: string; title: string; difficulty: string }[];
};

const TOPIC_KEYWORDS: Record<string, string[]> = {
  arrays: ['array', 'string', 'pointer', 'sliding', 'two', 'prefix', 'substring', 'subarray'],
  graphs: ['graph', 'tree', 'bfs', 'dfs', 'trie', 'union', 'disjoint', 'topological', 'dijkstra'],
  dp: ['dp', 'dynamic', 'memo', 'knapsack', 'lis', 'lcs', 'edit distance', 'coin'],
  recursion: ['recursion', 'backtrack', 'subset', 'permutation', 'combination', 'n-queens'],
  sorting: ['sort', 'search', 'binary', 'merge', 'quick', 'partition'],
  heaps: ['heap', 'hash', 'map', 'priority', 'frequency', 'counter'],
  'linked-lists': ['linked', 'list', 'node'],
  'stacks-queues': ['stack', 'queue', 'monotonic'],
  'bit-manipulation': ['bit', 'xor', 'mask', 'shift'],
};

const difficultyColor: Record<string, string> = {
  EASY: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  HARD: 'text-rose-400',
};

const difficultyBadge: Record<string, string> = {
  EASY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  HARD: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function TopicDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const topic = TOPICS.find(t => t.slug === slug);

  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topic) return;
    fetch('/api/patterns', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const keywords = TOPIC_KEYWORDS[slug] ?? [];
        const filtered = (d.patterns ?? []).filter((p: PatternItem) =>
          keywords.some(k => p.name.toLowerCase().includes(k))
        );
        setPatterns(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug, topic]);

  if (!topic) return notFound();

  const Icon = topic.icon;

  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto border-l border-white/5">
        <div className="max-w-6xl mx-auto px-8 py-12 space-y-10">

          {/* Back + Header */}
          <div className="space-y-6">
            <Link
              href="/topics"
              className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} /> All Topics
            </Link>
            <div className="flex items-center gap-6">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${topic.color} border ${topic.border} flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${topic.text}`} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-2">{topic.name}</h1>
                <p className="text-zinc-400">{patterns.length} patterns · {patterns.reduce((s, p) => s + p.problemCount, 0)} problems</p>
              </div>
            </div>
          </div>

          {/* Patterns */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-24 text-zinc-600">
              <BookOpen size={40} className="mx-auto mb-4 text-zinc-700" />
              <p className="text-lg mb-1">No patterns found for this topic</p>
              <p className="text-sm">Patterns are tagged automatically based on naming conventions.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {patterns.map(pattern => (
                <div
                  key={pattern.id}
                  className="bg-[#050507]/80 backdrop-blur-3xl border border-white/10 rounded-[1.75rem] overflow-hidden hover:border-white/20 transition-all"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{pattern.name}</h3>
                        {pattern.description && (
                          <p className="text-sm text-zinc-500">{pattern.description}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-600 shrink-0">{pattern.problemCount} problems</span>
                    </div>

                    {pattern.problems.length > 0 && (
                      <div className="space-y-2">
                        {pattern.problems.map(problem => (
                          <Link
                            key={problem.id}
                            href={`/problems/${problem.slug}`}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all group"
                          >
                            <CheckCircle2 size={14} className="text-zinc-700 group-hover:text-emerald-400 transition-colors" />
                            <span className="flex-1 text-sm text-zinc-400 group-hover:text-white transition-colors">{problem.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${difficultyBadge[problem.difficulty]}`}>
                              {problem.difficulty}
                            </span>
                            <ChevronRight size={14} className="text-zinc-700 group-hover:text-white transition-colors" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
