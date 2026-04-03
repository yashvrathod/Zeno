'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  Search,
  LayoutGrid,
  List,
  ArrowRight,
  Layers,
  Sparkles,
  Activity,
  Target,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

type ApiPattern = {
  id: string;
  name: string;
  description: string | null;
  problemCount: number;
  problems: Array<{ id: string; slug: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }>;
};

type UiPattern = {
  id: string;
  name: string;
  description: string;
  icon: string;
  problemCount: number;
  completed: number;
  difficulty: string;
  problems: Array<{ id: string; title: string; difficulty: string; leetcodeId: string; status: 'unsolved' | 'attempted' | 'solved' }>;
};

async function fetchPatterns(): Promise<ApiPattern[]> {
  const res = await fetch('/api/patterns', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load patterns');
  const data = (await res.json()) as { patterns: ApiPattern[] };
  return data.patterns;
}

export default function ProblemsPage() {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [apiPatterns, setApiPatterns] = useState<ApiPattern[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    let mounted = true;
    fetchPatterns().then((p) => { if (mounted) setApiPatterns(p); }).catch(() => { if (mounted) setApiPatterns([]); });
    return () => { mounted = false; };
  }, []);

  const patterns: UiPattern[] = useMemo(() => {
    if (apiPatterns) {
      return apiPatterns.map((p, idx) => {
        const iconPool = ['👆', '🪟', '🐇🐢', '📊', '🔍', '🏆', '🌳', '🌲', '🧠', '🔗'];
        return {
          id: p.id,
          name: p.name,
          description: p.description ?? '',
          icon: iconPool[idx % iconPool.length],
          problemCount: p.problemCount,
          completed: 0,
          difficulty: 'Mixed',
          problems: p.problems.map((pr) => ({
            id: pr.id,
            title: pr.title,
            difficulty: pr.difficulty === 'EASY' ? 'Easy' : pr.difficulty === 'MEDIUM' ? 'Medium' : 'Hard',
            leetcodeId: pr.slug,
            status: 'unsolved',
          })),
        };
      });
    }
    return [];
  }, [apiPatterns]);

  const filteredPatterns = useMemo(() => {
    if (!searchQuery) return patterns;
    return patterns.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patterns, searchQuery]);

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'Easy': return 'text-emerald-400';
      case 'Medium': return 'text-amber-400';
      case 'Hard': return 'text-rose-400';
      default: return 'text-zinc-500';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#020204] text-zinc-400 font-sans overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto border-l border-white/10 bg-[#020204] selection:bg-purple-500/30">
          <div className="flex justify-center">
            <div className="w-full max-w-5xl px-8 py-12 flex gap-12">
              
              {/* Content Column */}
              <div className="flex-1 min-w-0">
                {/* Elegant Header */}
                <div className="flex flex-col gap-6 mb-16">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full">
                      <Sparkles size={12} className="text-purple-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Curriculum v2.0</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                      <Activity size={12} className="text-white/40" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">241 Problems</span>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Pattern Library</h1>
                    <p className="text-sm text-white/40 max-w-xl leading-relaxed font-light">
                      Master the core foundations through curated algorithmic patterns. Each module is designed to bridge the gap between theory and implementation.
                    </p>
                  </div>
                </div>

                {/* Clean Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 pb-8 border-b border-white/10">
                  <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-purple-500 transition-colors" size={18} />
                    <input 
                      type="text"
                      placeholder="Search patterns..."
                      className="w-full bg-transparent py-3 pl-8 text-sm text-white placeholder:text-zinc-800 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 bg-[#08080a] p-1 rounded-xl border border-white/10">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      <LayoutGrid size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                {/* Grid Layout with Surface Elevation */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {filteredPatterns.map((pattern) => (
                      <div key={pattern.id} className="group relative bg-[#08080a] border border-white/15 rounded-2xl p-8 transition-all hover:bg-[#0c0c0e] hover:border-white/25 shadow-lg">
                        <div className="flex items-start justify-between mb-8">
                          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl group-hover:border-purple-500/30 transition-all">
                            <span className="grayscale group-hover:grayscale-0 transition-all opacity-40 group-hover:opacity-100">{pattern.icon}</span>
                          </div>
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest font-mono">MOD_{pattern.id.slice(-2)}</span>
                        </div>
                        
                        <h3 className="text-lg font-bold text-white mb-3 group-hover:text-purple-400 transition-colors tracking-tight">{pattern.name}</h3>
                        <p className="text-sm text-zinc-500 leading-relaxed mb-8 line-clamp-2 font-light">
                          {pattern.description}
                        </p>

                        <div className="mt-auto space-y-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest font-mono">
                              <span className="text-zinc-600">COMPLETION</span>
                              <span className="text-purple-400">{Math.round((pattern.completed / pattern.problemCount) * 100)}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 transition-all duration-1000 ease-out"
                                style={{ width: `${(pattern.completed / pattern.problemCount) * 100}%` }}
                              />
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => setExpandedPattern(expandedPattern === pattern.name ? null : pattern.name)}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-white transition-all"
                          >
                            {expandedPattern === pattern.name ? 'COLLAPSE' : 'EXPAND MODULE'}
                            <ArrowRight size={12} className={`transition-transform duration-300 ${expandedPattern === pattern.name ? '-rotate-90' : 'group-hover:translate-x-1'}`} />
                          </button>
                        </div>

                        {/* Expandable Problem List */}
                        <div className={`mt-6 space-y-1 transition-all duration-500 overflow-hidden ${expandedPattern === pattern.name ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="pt-6 border-t border-white/5 grid grid-cols-1 gap-1">
                            {pattern.problems.map((problem) => (
                              <Link 
                                key={problem.id}
                                href={`/problems/${problem.leetcodeId}`}
                                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-white/5 transition-all group/item"
                              >
                                <span className="text-xs text-zinc-400 group-hover/item:text-white transition-colors">{problem.title}</span>
                                <span className={`text-[9px] font-bold uppercase tracking-widest ${getDifficultyColor(problem.difficulty)}`}>
                                  {problem.difficulty}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#08080a] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    {filteredPatterns.map((pattern) => (
                      <div key={pattern.id} className="group border-b border-white/5 last:border-0">
                        <div 
                          className="flex items-center justify-between px-8 py-6 cursor-pointer hover:bg-white/[0.02] transition-all"
                          onClick={() => setExpandedPattern(expandedPattern === pattern.name ? null : pattern.name)}
                        >
                          <div className="flex items-center gap-8">
                            <span className="text-xl grayscale opacity-20 group-hover:opacity-100 transition-opacity w-8 text-center">{pattern.icon}</span>
                            <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors tracking-tight">{pattern.name}</h3>
                          </div>
                          <ChevronDown size={16} className={`text-zinc-700 transition-transform duration-300 ${expandedPattern === pattern.name ? 'rotate-180 text-purple-400' : ''}`} />
                        </div>
                        {expandedPattern === pattern.name && (
                          <div className="bg-black/20 px-12 py-8 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-4">
                              {pattern.problems.map((problem) => (
                                <Link 
                                  key={problem.id}
                                  href={`/problems/${problem.leetcodeId}`}
                                  className="flex items-center justify-between py-1 group/link"
                                >
                                  <span className="text-xs text-zinc-500 group-hover/link:text-white transition-colors">{problem.title}</span>
                                  <span className={`text-[8px] font-bold uppercase tracking-widest ${getDifficultyColor(problem.difficulty)}`}>
                                    {problem.difficulty}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Module Navigator Rail */}
              <div className="hidden lg:block w-64 shrink-0 h-fit sticky top-12">
                <div className="space-y-10">
                  <section>
                    <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <Target size={12} />
                      <span>MASTER PROGRESS</span>
                    </h4>
                    <div className="space-y-6">
                      {[
                        { label: 'Analytical', val: 78, color: 'bg-emerald-500' },
                        { label: 'Syntax', val: 45, color: 'bg-amber-500' },
                        { label: 'Efficiency', val: 62, color: 'bg-purple-500' },
                      ].map((stat) => (
                        <div key={stat.label} className="space-y-2">
                          <div className="flex justify-between text-[9px] uppercase tracking-widest font-mono">
                            <span className="text-zinc-600">{stat.label}</span>
                            <span className="text-zinc-400">{stat.val}%</span>
                          </div>
                          <div className="h-[1px] w-full bg-white/5">
                            <div className={`h-full ${stat.color}`} style={{ width: `${stat.val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <button className="w-full py-4 bg-white text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-xl">
                    RESUME CURRICULUM
                  </button>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
