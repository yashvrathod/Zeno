'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Users,
  Calendar,
  BarChart,
  Infinity,
  Globe,
  Monitor,
  Award,
  ChevronLeft,
  Pause,
  Layout,
  Brain,
  Zap,
  Target,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type ApiPattern = {
  id: string;
  name: string;
  description: string | null;
  problemCount: number;
  problems: Array<{ id: string; slug: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }>;
};

async function fetchPatterns(): Promise<ApiPattern[]> {
  const res = await fetch('/api/patterns', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load patterns');
  const data = (await res.json()) as { patterns: ApiPattern[] };
  return data.patterns;
}

export default function ProblemsPage() {
  const [apiPatterns, setApiPatterns] = useState<ApiPattern[] | null>(null);

  useEffect(() => {
    fetchPatterns().then(setApiPatterns).catch(() => setApiPatterns([]));
  }, []);

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-zinc-100 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
          <div className="max-w-[1400px] mx-auto p-8 space-y-10">
            
            {/* AI Recommendation Hero */}
            <section className="relative rounded-[32px] overflow-hidden bg-[#111111] border border-zinc-800 shadow-2xl p-10 flex flex-col md:flex-row items-center gap-10">
              <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-500 rounded-full blur-[100px]" />
              </div>

              <div className="flex-1 space-y-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-[#111111] bg-zinc-800 overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 20}`} alt="user" />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Joined by 12k+ engineers this week</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#a855f7]">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Mentor Recommendation</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
                    You're mastering <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Sliding Window</span>.
                  </h1>
                  <p className="text-zinc-400 text-lg max-w-2xl leading-relaxed">
                    Based on your recent sessions, you have strong syntax precision but struggle with <span className="text-white font-semibold">off-by-one errors</span>. Let's fix that with "Longest Substring Without Repeating Characters".
                  </p>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <Button className="bg-[#4ade80] hover:bg-[#3bbd6d] text-black font-bold h-12 px-8 rounded-xl shadow-[0_0_20px_rgba(74,222,128,0.3)] transition-all">
                    Resume Journey
                  </Button>
                  <Button variant="outline" className="border-zinc-800 bg-transparent text-zinc-300 h-12 px-6 rounded-xl hover:bg-zinc-900 transition-all">
                    View Weakness Map
                  </Button>
                </div>
              </div>

              <div className="w-full md:w-[340px] bg-[#1a1a1a] rounded-2xl border border-zinc-800 p-6 space-y-6 relative z-10 shadow-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Skill Growth</span>
                  <TrendingUp size={14} className="text-[#4ade80]" />
                </div>
                
                <div className="space-y-4">
                  <SkillProgress label="Analytical Velocity" value={78} color="bg-purple-500" />
                  <SkillProgress label="Syntax Precision" value={42} color="bg-blue-500" />
                  <SkillProgress label="Time Complexity" value={61} color="bg-emerald-500" />
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Current Streak</span>
                    <span className="text-xl font-black text-white">12 Days</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 flex items-center justify-center text-[#4ade80]">
                    <Zap size={20} fill="currentColor" />
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col lg:flex-row gap-12">
              {/* Content Column */}
              <div className="flex-1 space-y-16">
                {apiPatterns ? (
                  apiPatterns.map((pattern, idx) => (
                    <div key={pattern.id} className="space-y-8">
                      <div className="flex justify-between items-end border-b border-zinc-900 pb-6">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">Module {idx + 1}</span>
                          <h2 className="text-3xl font-bold text-white tracking-tight">{pattern.name}</h2>
                          <p className="text-zinc-500 text-sm max-w-xl">{pattern.description || "Mastering the fundamental logic of this computational pattern."}</p>
                        </div>
                        <div className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">
                          {pattern.problemCount} Challenges
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        {pattern.problems.map((problem, pIdx) => (
                          <Link 
                            key={problem.id}
                            href={`/problems/${problem.id}`}
                            className="group bg-[#111111] hover:bg-[#161616] border border-zinc-800/50 rounded-2xl p-6 flex items-center gap-8 transition-all duration-300 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-[#4ade80] transition-all" />
                            
                            <div className="w-20 h-20 rounded-2xl bg-[#0d0d0d] flex items-center justify-center border border-zinc-800 shrink-0 relative group-hover:border-[#4ade80]/30 transition-colors">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="text-zinc-700 group-hover:text-zinc-400 transition-colors relative z-10">
                                  {pIdx % 3 === 0 ? <Brain size={32} /> : pIdx % 3 === 1 ? <Layout size={32} /> : <Target size={32} />}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-white group-hover:text-[#4ade80] transition-colors">{problem.title}</h3>
                                {pIdx % 4 === 0 && (
                                  <Badge className="bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/20 text-[9px] font-black uppercase tracking-widest h-5">
                                    <Eye size={10} className="mr-1" /> Visual Lab
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-6 text-zinc-500">
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                  <div className={`w-2 h-2 rounded-full ${problem.difficulty === 'EASY' ? 'bg-emerald-500' : problem.difficulty === 'MEDIUM' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                  {problem.difficulty}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Clock size={14} className="text-zinc-600" />
                                  <span>Approx. 45 min</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Sparkles size={14} className="text-purple-500/60" />
                                  <span className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">Strategize Stage</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-end mr-4">
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Success Rate</span>
                                <span className="text-sm font-bold text-white">84%</span>
                              </div>
                              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-[#4ade80] group-hover:bg-[#4ade80] group-hover:text-black transition-all shadow-xl">
                                <Play size={20} fill="currentColor" className="ml-1" />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-32 bg-zinc-900 animate-pulse rounded-3xl" />
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Column */}
              <aside className="lg:w-[400px] space-y-10">
                <section className="bg-[#111111] border border-zinc-800 rounded-3xl p-8 space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <Brain size={18} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Mentor Insights</h3>
                  </div>

                  <div className="space-y-6">
                    <InsightItem 
                      icon={<Sparkles className="text-amber-400" size={14} />}
                      text="Your recursive thinking has improved by 15% this week. Focus on base cases next."
                    />
                    <InsightItem 
                      icon={<Target className="text-rose-400" size={14} />}
                      text="Recurring 'Off-by-one' pattern detected in your Array sessions. Suggesting targeted labs."
                    />
                    <InsightItem 
                      icon={<Zap className="text-blue-400" size={14} />}
                      text="You solve 'Easy' problems 40% faster than the global average. Ready for 'Medium'."
                    />
                  </div>

                  <Button className="w-full h-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all font-bold text-[11px] uppercase tracking-widest">
                    Open Full Analysis <ArrowRight size={14} className="ml-2" />
                  </Button>
                </section>

                <section className="space-y-6 px-4">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Course Highlights</h4>
                  <div className="space-y-5">
                    <DetailItem icon={<Users size={18} />} text="17,402 engineers enrolled" />
                    <DetailItem icon={<Globe size={18} />} text="Available in 4 languages" />
                    <DetailItem icon={<Monitor size={18} />} text="Cross-platform sync enabled" />
                    <DetailItem icon={<Award size={18} />} text="Industry recognized certificate" />
                  </div>
                </section>

                <section className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-3xl p-8 space-y-4">
                  <h4 className="text-lg font-bold text-white">Upgrade to Pro</h4>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Get unlimited AI-guided sessions, system design tracks, and direct mentor support.
                  </p>
                  <Button className="w-full h-10 rounded-lg bg-white text-black font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-200">
                    Unlock Full Access
                  </Button>
                </section>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SkillProgress({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className="text-zinc-400 uppercase tracking-widest">{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(168,85,247,0.3)]`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function InsightItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex gap-4 items-start group">
      <div className="mt-1 shrink-0">{icon}</div>
      <p className="text-[13px] text-zinc-400 leading-relaxed group-hover:text-zinc-200 transition-colors">
        {text}
      </p>
    </div>
  );
}

function DetailItem({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="flex items-center gap-4 text-zinc-400 group cursor-default">
      <div className="text-zinc-600 group-hover:text-[#4ade80] transition-colors shrink-0">{icon}</div>
      <span className="text-xs font-medium group-hover:text-zinc-200 transition-colors">{text}</span>
    </div>
  );
}
