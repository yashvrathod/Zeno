'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import MentorChat from '@/components/MentorChat';
import {
  Search,
  Brain,
  ChevronRight,
  ArrowLeft,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

type ProblemItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  patterns: { id: string; name: string }[];
};

type ProblemDetail = {
  id: string;
  slug: string;
  title: string;
  statementMd: string;
  constraintsMd: string;
  difficulty: string;
  patterns: { id: string; name: string }[];
  publicTestCases: { order: number; input: string; expected: string }[];
  starterCode: Record<string, string>;
};

const difficultyColor: Record<string, string> = {
  EASY: 'text-emerald-400',
  MEDIUM: 'text-amber-400',
  HARD: 'text-rose-400',
};

const difficultyBorder: Record<string, string> = {
  EASY: 'border-emerald-500/20 hover:border-emerald-500/40',
  MEDIUM: 'border-amber-500/20 hover:border-amber-500/40',
  HARD: 'border-rose-500/20 hover:border-rose-500/40',
};

export default function MentorPage() {
  const { data: session } = useSession();
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch('/api/problems')
      .then(r => r.json())
      .then(d => { setProblems(d.problems ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const selectProblem = useCallback(async (slug: string) => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/problems/${slug}`);
      const d = await r.json();
      if (d.problem) setSelectedProblem(d.problem);
    } catch (e) {
      console.error('Failed to load problem:', e);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const filtered = problems.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.patterns.some(pat => pat.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (selectedProblem) {
    return (
      <div className="flex h-screen bg-[#010103] text-zinc-400">
        <Sidebar />
        <main className="flex-1 flex flex-col border-l border-white/5 overflow-hidden">
          {/* Back bar */}
          <div className="shrink-0 flex items-center gap-4 px-8 py-4 border-b border-white/5 bg-[#050507]">
            <button
              onClick={() => setSelectedProblem(null)}
              className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} /> Back to problems
            </button>
            <div className="w-px h-5 bg-white/10" />
            <span className="text-white font-semibold">{selectedProblem.title}</span>
            <span className={`text-[11px] font-bold ${difficultyColor[selectedProblem.difficulty]}`}>
              {selectedProblem.difficulty}
            </span>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex min-h-0">
            <div className="flex-1 flex flex-col min-h-0 border-r border-white/5">
              <MentorChat
                problemId={selectedProblem.id}
                problemTitle={selectedProblem.title}
                problemStatementMd={selectedProblem.statementMd}
                problemConstraintsMd={selectedProblem.constraintsMd}
                publicTestCases={selectedProblem.publicTestCases}
                language="python"
                userCode={selectedProblem.starterCode?.python ?? ''}
              />
            </div>

            {/* Problem sidebar */}
            <div className="w-80 shrink-0 overflow-y-auto p-6 space-y-4 bg-[#050507]/50">
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold tracking-wider uppercase">
                <Sparkles size={14} /> Problem Info
              </div>
              <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap line-clamp-[15]">
                {selectedProblem.statementMd}
              </div>
              {selectedProblem.constraintsMd && (
                <>
                  <div className="text-xs text-zinc-500 font-bold tracking-wider uppercase pt-2">Constraints</div>
                  <div className="text-sm text-zinc-400 whitespace-pre-wrap">{selectedProblem.constraintsMd}</div>
                </>
              )}
              {selectedProblem.patterns.length > 0 && (
                <>
                  <div className="text-xs text-zinc-500 font-bold tracking-wider uppercase pt-2">Patterns</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedProblem.patterns.map(p => (
                      <span key={p.id} className="text-[11px] px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#010103] text-zinc-400">
      <Sidebar />
      <main className="flex-1 overflow-y-auto border-l border-white/5">
        <div className="max-w-5xl mx-auto px-8 py-12 space-y-10">

          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <Brain size={16} className="text-purple-400" />
              </div>
              <span className="text-[10px] font-bold tracking-[0.3em] text-purple-400 uppercase">AI Mentor</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Choose a Problem</h1>
            <p className="text-zinc-500">Select a problem to get Socratic mentor guidance</p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search problems or patterns..."
              className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          {/* Problem List */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectProblem(p.slug)}
                  disabled={loadingDetail}
                  className={`w-full flex items-center gap-4 p-5 rounded-xl border bg-[#050507]/80 backdrop-blur-3xl ${difficultyBorder[p.difficulty]} hover:bg-white/[0.03] transition-all text-left disabled:opacity-50`}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <MessageCircle size={18} className="text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{p.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[11px] font-bold ${difficultyColor[p.difficulty]}`}>{p.difficulty}</span>
                      {p.patterns.slice(0, 2).map(pat => (
                        <span key={pat.id} className="text-[10px] text-zinc-600 truncate">{pat.name}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-700 shrink-0" />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-16 text-zinc-600">
                  <Search size={32} className="mx-auto mb-3 text-zinc-700" />
                  <p>No problems match your search.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
