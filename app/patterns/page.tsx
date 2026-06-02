'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Pattern {
  id: string;
  name: string;
  description: string;
  problemCount: number;
  problems: { slug: string; title: string; difficulty: string }[];
}

function getDifficultyColor(d: string) {
  switch (d) {
    case 'EASY': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'MEDIUM': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'HARD': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/patterns', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.patterns) setPatterns(d.patterns);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">DSA Patterns</h1>
            <p className="text-zinc-400 text-lg">Browse all DSA patterns and practice with curated problems</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
            </div>
          ) : patterns.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-zinc-500 text-lg">No patterns available yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{pattern.name}</h3>
                      {pattern.description && (
                        <p className="text-zinc-400 text-sm">{pattern.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 bg-white/5 px-3 py-1 rounded-full border border-white/10 shrink-0 ml-4">
                      {pattern.problemCount} problems
                    </span>
                  </div>

                  {pattern.problems.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {pattern.problems.slice(0, 5).map((p) => (
                        <Link
                          key={p.slug}
                          href={`/problems/${p.slug}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(p.difficulty)} hover:scale-105 transition-transform`}
                        >
                          {p.title}
                        </Link>
                      ))}
                      {pattern.problems.length > 5 && (
                        <Link
                          href="/problems"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs text-zinc-500 border border-white/10 hover:text-zinc-300 transition-colors"
                        >
                          +{pattern.problems.length - 5} more <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
