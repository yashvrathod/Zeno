'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Play,
  CheckCircle2,
  Clock,
  Settings,
  ChevronRight,
  ChevronDown,
  FileCode,
  Zap,
  Lightbulb,
  LayoutGrid,
  MessageCircle,
  Sparkles,
  ArrowUpRight,
  Activity,
  Code,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';
import {Markdown} from '@/components/Markdown';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statementMd: string;
  constraintsMd: string | null;
  hints: string[];
};

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = React.use(params);
  const [dbProblem, setDbProblem] = useState<Problem | null>(null);
  const [activeTab, setActiveTab] = useState('description');
  const [isMentorOpen, setIsMentorOpen] = useState(true);
  const [mentorInput, setMentorInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/problems/${problemId}`)
      .then((res) => res.json())
      .then((data) => setDbProblem(data.problem))
      .catch((err) => console.error('Failed to fetch problem:', err));
  }, [problemId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isMentorLoading]);

  const sendMentorMessage = async (content: string) => {
    if (!content.trim()) return;
    const newMessages = [...messages, { role: 'user', content } as const];
    setMessages(newMessages);
    setMentorInput('');
    setIsMentorLoading(true);

    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages,
          context: { problemId, problemTitle: dbProblem?.title } 
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsMentorLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'EASY': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'HARD': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#020204] text-zinc-400 font-sans overflow-hidden">
      <Navbar />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        {/* Main Integrated Workspace */}
        <main className="flex-1 flex overflow-hidden border-l border-white/10">
          
          {/* Problem Content Section */}
          <div className="flex-1 overflow-y-auto bg-[#020204] relative">
            <div className="max-w-4xl mx-auto px-12 py-16">
              
              {/* Contextual Header */}
              <div className="flex items-center justify-between mb-12">
                <Link href="/problems" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-white transition-colors group">
                  <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  <span>Curriculum</span>
                </Link>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                     <Clock size={12} />
                     <span>45m Est</span>
                   </div>
                   <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                     <Settings size={16} className="text-zinc-500" />
                   </button>
                </div>
              </div>

              {/* Core Content */}
              <div className="space-y-12">
                <div className="flex items-center gap-4">
                  <Badge className={`px-4 py-1 rounded-lg border font-bold text-[10px] tracking-widest uppercase shadow-lg ${getDifficultyColor(dbProblem?.difficulty || 'EASY')}`}>
                    {dbProblem?.difficulty || 'EASY'}
                  </Badge>
                  <div className="h-px w-8 bg-white/10" />
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest font-mono">MOD_742_LINKED_LIST</span>
                </div>

                <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
                  {dbProblem?.title || "Initializing Workspace..."}
                </h1>

                <div className="prose prose-invert max-w-none">
                  <div className="text-[17px] text-zinc-300 leading-relaxed font-light">
                    {dbProblem ? <Markdown md={dbProblem.statementMd} /> : (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-white/5 rounded w-3/4" />
                        <div className="h-4 bg-white/5 rounded w-full" />
                        <div className="h-4 bg-white/5 rounded w-5/6" />
                      </div>
                    )}
                  </div>

                  {dbProblem?.constraintsMd && (
                    <div className="mt-16 pt-12 border-t border-white/10">
                      <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.3em] mb-8">EXECUTION CONSTRAINTS</h3>
                      <div className="bg-[#08080a] border border-white/10 rounded-2xl p-8 font-mono text-sm text-zinc-400 shadow-inner">
                        <Markdown md={dbProblem.constraintsMd} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Tactical Hints */}
                <div className="mt-16 space-y-8">
                   <h3 className="text-[11px] font-bold text-zinc-600 uppercase tracking-[0.3em]">STRATEGIC PHASES</h3>
                   <div className="grid grid-cols-1 gap-4">
                     {dbProblem?.hints.map((hint, idx) => (
                       <details key={idx} className="group bg-[#08080a] border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-white/20">
                         <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                               <Lightbulb size={14} className="text-amber-400" />
                             </div>
                             <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-widest">Phase {idx + 1} Data</span>
                           </div>
                           <ChevronDown size={16} className="text-zinc-700 group-open:rotate-180 transition-transform" />
                         </summary>
                         <div className="px-10 pb-8 text-zinc-400 text-sm leading-relaxed border-t border-white/5 pt-6 font-normal">
                           <Markdown md={hint} />
                         </div>
                       </details>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Neural Mentor Side-Drawer (Google Suggestion) */}
          <aside className={`w-[450px] bg-[#08080a] border-l border-white/15 flex flex-col transition-all duration-500 ${isMentorOpen ? 'translate-x-0' : 'translate-x-full absolute right-0 inset-y-0'}`}>
            
            {/* Mentor Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Sparkles size={14} className="text-purple-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">NEURAL_ASSISTANT</h4>
                  <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest">SYNC_ACTIVE</span>
                </div>
              </div>
              <button 
                onClick={() => setIsMentorOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Chat History */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-gradient-to-b from-transparent to-purple-500/[0.01]"
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                  <div className="w-16 h-16 rounded-[2rem] border border-white/10 flex items-center justify-center mb-6">
                    <MessageCircle size={32} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Session initialized</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                  <div className={`max-w-[90%] p-5 rounded-2xl text-[14px] leading-relaxed transition-all shadow-lg ${
                    msg.role === 'user' 
                      ? 'bg-white/5 border border-white/10 text-white' 
                      : 'bg-[#020204] border border-white/10 text-zinc-300'
                  }`}>
                    <Markdown md={msg.content} />
                  </div>
                </div>
              ))}
              {isMentorLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-1.5">
                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce delay-100" />
                    <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-6 bg-black/40 border-t border-white/10">
              <div className="relative group">
                <input 
                  className="w-full bg-[#020204] border border-white/15 rounded-xl py-4 px-6 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-purple-500/40 transition-all pr-14"
                  placeholder="Inquire architectural guidance..."
                  value={mentorInput}
                  onChange={(e) => setMentorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && mentorInput.trim()) {
                      void sendMentorMessage(mentorInput);
                    }
                  }}
                />
                <button 
                  onClick={() => void sendMentorMessage(mentorInput)}
                  disabled={isMentorLoading || !mentorInput.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-lg flex items-center justify-center hover:bg-purple-500 hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-20"
                >
                  <ArrowUpRight size={18} />
                </button>
              </div>
            </div>
          </aside>

          {/* Toggle Tab for Mentor if Closed */}
          {!isMentorOpen && (
            <button 
              onClick={() => setIsMentorOpen(true)}
              className="absolute right-8 bottom-8 w-14 h-14 bg-purple-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20 group"
            >
              <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
