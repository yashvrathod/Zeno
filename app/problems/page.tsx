'use client';

import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  Zap,
  ChevronRight,
  ArrowUpRight,
  Lock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';

interface Pattern {
  id: string;
  name: string;
  description: string | null;
  problemCount: number;
  problems: Array<{
    id: string;
    slug: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  }>;
}

export default function ProblemsPage() {
  const [apiPatterns, setApiPatterns] = useState<Pattern[] | null>(null);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/patterns', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setApiPatterns(data.patterns);
        if (data.patterns?.length > 0) {
          setExpandedModule(data.patterns[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch patterns:', err);
        setApiPatterns([]);
      });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#010103] text-zinc-400 font-sans overflow-hidden selection:bg-purple-500/30">
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        <div className="flex-1 overflow-y-auto border-l border-white/5 bg-transparent scrollbar-hide">
          <div className="max-w-7xl mx-auto px-8 py-12 w-full space-y-20">
           
           {/* Hero Section */}
           <div className="bg-[#121214] border border-white/[0.05] rounded-xl p-16 flex flex-col lg:flex-row gap-16 relative overflow-hidden shadow-2xl">
              <div className="flex-1 space-y-12 relative z-10">
                 <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                       {[1, 2, 3].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full border-2 border-[#121214] bg-[#1a1a1e] overflow-hidden shadow-xl">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=eng${i}`} alt="Avatar" />
                         </div>
                       ))}
                    </div>
                    <span className="zone-label-sm text-zinc-600">JOINED BY 12K+ ENGINEERS THIS WEEK</span>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center gap-2">
                       <span className="text-[#a855f7] font-bold zone-label-sm">+ MENTOR RECOMMENDATION</span>
                    </div>
                    <h1 className="text-[4.8rem] text-zinc-400 leading-[1.05] tracking-tight">
                       <span className="font-serif-studio italic block mb-3 text-zinc-500">You're mastering</span>
                       <span className="text-white font-bold">{apiPatterns?.[0]?.name || "DSA Patterns"}</span>
                    </h1>
                 </div>

                 <p className="text-[22px] text-zinc-500 font-light leading-relaxed max-w-xl">
                    Based on your recent sessions, you have strong syntax precision but struggle with <span className="text-white font-medium border-b-2 border-white/10 pb-0.5">complex logic.</span> Let's fix that with some targeted challenges.
                 </p>

                 <div className="flex items-center gap-8 pt-8">
                    <Link 
                      href={apiPatterns?.[0]?.problems[0]?.slug ? `/problems/${apiPatterns[0].problems[0].slug}` : "#"}
                      className="px-14 py-6 bg-[#2dd4bf] text-[#050505] rounded-xl text-[16px] font-extrabold tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(45,212,191,0.3)] flex items-center justify-center"
                    >
                       Resume Journey
                    </Link>
                    <Link href="/profile/skills" className="px-14 py-6 bg-[#1a1a1e] border border-white/[0.05] text-zinc-400 rounded-xl text-[16px] font-extrabold tracking-widest uppercase hover:bg-white/5 transition-all">
                       View Weakness Map
                    </Link>
                 </div>
              </div>

              {/* Skill Growth Card */}
              <div className="w-full lg:w-[480px] relative z-10">
                 <div className="bg-[#161618] border border-white/[0.05] rounded-xl p-12 h-full flex flex-col justify-between shadow-2xl relative">
                    <div className="space-y-12">
                      <div className="flex items-center justify-between">
                         <span className="zone-label-sm text-zinc-500">SKILL GROWTH</span>
                         <ArrowUpRight size={20} className="text-emerald-500" />
                      </div>
                      <div className="space-y-10">
                         <SkillItem label="ANALYTICAL VELOCITY" value={78} color="#a855f7" />
                         <SkillItem label="SYNTAX PRECISION" value={42} color="#3b82f6" />
                         <SkillItem label="TIME COMPLEXITY" value={61} color="#2dd4bf" />
                      </div>
                    </div>
                    
                    <div className="pt-12 flex items-center justify-between border-t border-white/[0.05] mt-12">
                       <div className="flex flex-col gap-1.5">
                          <span className="zone-label-sm text-zinc-700">CURRENT STREAK</span>
                          <span className="text-4xl font-bold text-white tracking-tight">12 Days</span>
                       </div>
                       <div className="w-16 h-14 rounded-[1.25rem] bg-[#2dd4bf]/10 flex items-center justify-center border border-[#2dd4bf]/20 shadow-[0_0_30px_rgba(45,212,191,0.15)] relative">
                          <Zap size={28} className="text-[#2dd4bf] fill-[#2dd4bf]" />
                          <div className="absolute inset-0 rounded-[1.25rem] bg-[#2dd4bf]/5 animate-pulse" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Curriculum Section */}
           <div className="space-y-12">
              <div className="flex items-center justify-between px-8">
                 <div className="flex flex-col gap-2">
                    <span className="zone-label-sm text-zinc-600">CURRICULUM MODULES</span>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Select your path</h2>
                 </div>
                 <span className="zone-label-sm text-zinc-700">{apiPatterns?.length || 0} Modules Total</span>
              </div>

              <div className="space-y-8">
                 {apiPatterns?.map((pattern, idx) => (
                   <div 
                     key={pattern.id} 
                     className={`group bg-[#121214] border rounded-xl transition-all duration-500 overflow-hidden ${expandedModule === pattern.id ? 'border-[#2dd4bf]/30 bg-[#141416]' : 'border-white/[0.05] hover:border-white/10'}`}
                   >
                      {/* Module Header */}
                      <div 
                        onClick={() => setExpandedModule(expandedModule === pattern.id ? null : pattern.id)}
                        className="p-12 flex flex-col gap-12 cursor-pointer relative"
                      >
                         {expandedModule === pattern.id && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-[60%] bg-[#2dd4bf] rounded-r-full shadow-[0_0_20px_rgba(45,212,191,0.8)]" />
                         )}
                         
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className={`px-5 py-2 rounded-xl zone-label-sm ${idx === 0 ? 'bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20' : 'bg-white/5 text-zinc-600 border border-white/5'}`}>
                                  {idx === 0 ? `M0${idx + 1} • IN PROGRESS` : `M0${idx + 1} • AVAILABLE`}
                               </div>
                            </div>
                            <span className="zone-label-sm text-zinc-700 font-mono">{pattern.problemCount} CHALLENGES</span>
                         </div>

                         <div className="flex items-center justify-between gap-12">
                            <div className="space-y-5">
                               <h3 className="text-[3.2rem] font-serif-studio italic text-white tracking-tight leading-none transition-all group-hover:translate-x-2 duration-500">{pattern.name}</h3>
                               <p className="text-[19px] text-zinc-500 font-light leading-relaxed max-w-2xl line-clamp-2">
                                  {pattern.description || "Explore the core patterns and techniques associated with this module to build a strong foundation."}
                               </p>
                            </div>
                            <div className={`w-20 h-20 rounded-lg bg-[#1a1a1e] border border-white/[0.1] flex items-center justify-center text-zinc-500 transition-all duration-500 shadow-2xl shrink-0 ${expandedModule === pattern.id ? 'bg-[#2dd4bf] text-black border-transparent rotate-90' : 'group-hover:text-white group-hover:border-white/20'}`}>
                               <ChevronRight size={32} strokeWidth={2.5} />
                            </div>
                         </div>
                      </div>

                      {/* Problems List (Expanded) */}
                      <AnimatePresence>
                         {expandedModule === pattern.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                              className="border-t border-white/[0.05] bg-black/20"
                            >
                               <div className="p-12 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {pattern.problems.length > 0 ? (
                                    pattern.problems.map((problem, pIdx) => (
                                      <Link 
                                        key={problem.id}
                                        href={`/problems/${problem.slug}`}
                                        className="flex items-center justify-between p-8 bg-[#161618] border border-white/[0.03] rounded-3xl hover:bg-[#1c1c1e] hover:border-white/10 transition-all group/prob"
                                      >
                                         <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center text-zinc-600 font-mono text-sm group-hover/prob:text-[#2dd4bf] transition-colors border border-white/[0.05]">
                                               {String(pIdx + 1).padStart(2, '0')}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                               <span className="text-white font-semibold text-lg tracking-tight group-hover/prob:translate-x-1 transition-transform duration-300">{problem.title}</span>
                                               <div className="flex items-center gap-3">
                                                  <span className={`zone-label-sm ${problem.difficulty === 'EASY' ? 'text-emerald-500' : problem.difficulty === 'MEDIUM' ? 'text-amber-500' : 'text-rose-500'}`}>
                                                     {problem.difficulty}
                                                  </span>
                                                  <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                                  <span className="zone-label-sm text-zinc-600">15-20 MIN</span>
                                               </div>
                                            </div>
                                         </div>
                                         <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center text-zinc-700 group-hover/prob:bg-[#2dd4bf]/10 group-hover/prob:text-[#2dd4bf] transition-all">
                                            <ArrowUpRight size={18} />
                                         </div>
                                      </Link>
                                    ))
                                  ) : (
                                    <div className="col-span-full p-12 text-center border-2 border-dashed border-white/5 rounded-xl">
                                       <Lock size={32} className="mx-auto text-zinc-800 mb-4" />
                                       <p className="text-zinc-600 font-medium">Challenges currently under encryption by the architect.</p>
                                    </div>
                                  )}
                               </div>
                            </motion.div>
                         )}
                      </AnimatePresence>
                   </div>
                 ))}
              </div>
           </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillItem({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-4 group">
       <div className="flex items-center justify-between">
          <span className="zone-label-sm font-bold text-zinc-600">{label}</span>
          <span className="text-xs font-bold text-white font-mono">{value}%</span>
       </div>
       <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-[1500ms] ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            style={{ width: `${value}%`, backgroundColor: color }}
          />
       </div>
    </div>
   );
}
