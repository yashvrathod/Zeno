'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  Search,
  LayoutGrid,
  List,
  ArrowRight,
  Sparkles,
  Target,
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
  problemCount: number;
  completed: number;
  problems: Array<{ id: string; title: string; difficulty: string; leetcodeId: string }>;
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
    fetchPatterns().then(setApiPatterns).catch(() => setApiPatterns([]));
  }, []);

  const patterns: UiPattern[] = useMemo(() => {
    if (apiPatterns) {
      return apiPatterns.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        problemCount: p.problemCount,
        completed: 0,
        problems: p.problems.map((pr) => ({
          id: pr.id,
          title: pr.title,
          difficulty: pr.difficulty,
          leetcodeId: pr.id,
        })),
      }));
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

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-400 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 overflow-y-auto bg-[#0a0a0c] selection:bg-purple-500/30 scrollbar-hide">
          <div className="max-w-6xl mx-auto px-12 py-16 flex gap-16">
            
            <div className="flex-1 min-w-0">
              {/* Aether Header */}
              <div className="space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Sparkles size={14} className="text-purple-400" />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">CURRICULUM ARCHITECT</span>
                </div>
                
                <h1 className="text-5xl font-serif italic text-white leading-tight tracking-tight">
                  Algorithmic foundations for the modern architect.
                </h1>
                <p className="text-lg text-zinc-500 font-light max-w-2xl leading-relaxed">
                  Master the core patterns of computation through our curated curriculum. Each module represents a neural path toward mastery.
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
                <div className="relative flex-1 max-w-md group">
                  <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-purple-500 transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Search neural paths..."
                    className="w-full bg-transparent py-3 pl-8 text-sm text-white placeholder:text-zinc-800 outline-none transition-all font-light"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'text-white' : 'text-zinc-700 hover:text-zinc-500'}`}
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'text-white' : 'text-zinc-700 hover:text-zinc-500'}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>

              {/* Pattern Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {filteredPatterns.map((pattern) => (
                  <div key={pattern.id} className="group flex flex-col bg-[#0d0d10] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition-all duration-500">
                    <div className="flex justify-between items-start mb-8">
                       <span className="text-[10px] font-bold text-zinc-700 tracking-[0.3em] uppercase font-mono">MOD_{pattern.id.slice(-4).toUpperCase()}</span>
                       <div className="w-2 h-2 rounded-full bg-zinc-800 group-hover:bg-purple-500 transition-colors shadow-[0_0_10px_rgba(168,85,247,0)] group-hover:shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    </div>

                    <h3 className="text-2xl font-serif italic text-white mb-4 group-hover:text-purple-200 transition-colors">{pattern.name}</h3>
                    <p className="text-sm text-zinc-500 font-light leading-relaxed mb-10 line-clamp-2">
                      {pattern.description}
                    </p>

                    <div className="mt-auto space-y-8">
                       <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-zinc-700 tracking-widest uppercase">Complexity</span>
                                <span className="text-xs text-zinc-400">Mixed Level</span>
                             </div>
                             <div className="w-px h-6 bg-white/5" />
                             <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-zinc-700 tracking-widest uppercase">Nodes</span>
                                <span className="text-xs text-zinc-400">{pattern.problemCount} Problems</span>
                             </div>
                          </div>
                          
                          <button 
                           onClick={() => setExpandedPattern(expandedPattern === pattern.id ? null : pattern.id)}
                           className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-zinc-500 hover:text-white transition-colors uppercase"
                          >
                            {expandedPattern === pattern.id ? 'Hide Nodes' : 'Show Nodes'}
                            <ArrowRight size={14} className={`transition-transform duration-300 ${expandedPattern === pattern.id ? '-rotate-90' : 'group-hover:translate-x-1'}`} />
                          </button>
                       </div>

                       {/* Expanded Problem List */}
                       <div className={`space-y-2 transition-all duration-500 overflow-hidden ${expandedPattern === pattern.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="grid grid-cols-1 gap-1 pb-4">
                             {pattern.problems.map((problem) => (
                               <Link 
                                 key={problem.id}
                                 href={`/problems/${problem.leetcodeId}`}
                                 className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all group/item"
                               >
                                 <div className="flex items-center gap-3">
                                    <div className="w-1 h-1 rounded-full bg-zinc-800 group-hover/item:bg-purple-500 transition-colors" />
                                    <span className="text-sm text-zinc-400 group-hover/item:text-white transition-colors font-light">{problem.title}</span>
                                 </div>
                                 <span className={`text-[9px] font-bold uppercase tracking-widest ${
                                   problem.difficulty === 'EASY' ? 'text-emerald-500/50' : 
                                   problem.difficulty === 'MEDIUM' ? 'text-amber-500/50' : 'text-rose-500/50'
                                 }`}>
                                   {problem.difficulty}
                                 </span>
                               </Link>
                             ))}
                          </div>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side Rail */}
            <aside className="hidden lg:block w-72 shrink-0 space-y-16">
               <section className="space-y-8 p-8 bg-[#0d0d10] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Target size={14} className="text-zinc-600" />
                    <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Global Sync</h4>
                  </div>
                  
                  <div className="space-y-6">
                    <ProgressItem label="Analytical" value={74} />
                    <ProgressItem label="Syntax" value={42} />
                    <ProgressItem label="Efficiency" value={61} />
                  </div>

                  <button className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:text-black transition-all">
                    Resume Neural Path
                  </button>
               </section>

               <section className="px-8 space-y-6">
                  <h4 className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Recent Activity</h4>
                  <div className="space-y-4">
                     {[1, 2, 3].map(i => (
                       <div key={i} className="flex gap-4 items-start border-l border-white/5 pl-4 py-1">
                          <div className="w-1 h-1 rounded-full bg-purple-500 mt-1.5" />
                          <div className="flex flex-col gap-1">
                             <span className="text-xs text-zinc-400 font-light">Solved "Two Sum"</span>
                             <span className="text-[9px] text-zinc-700 uppercase tracking-tighter">2 hours ago</span>
                          </div>
                       </div>
                     ))}
                  </div>
               </section>
            </aside>

          </div>
        </main>
      </div>
    </div>
  );
}

function ProgressItem({ label, value }: { label: string, value: number }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-[2px] w-full bg-white/5 overflow-hidden">
        <div 
          className="h-full bg-purple-500 transition-all duration-1000"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
