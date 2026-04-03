'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUpRight,
  Sparkles,
  Copy,
  Maximize2,
  Terminal,
  Paperclip,
  History,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { Markdown } from '@/components/Markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Sidebar from '@/components/Sidebar';

type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statementMd: string;
  constraintsMd: string | null;
  hints: string[];
  starterCode?: any;
};

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = React.use(params);
  const { data: session } = useSession();
  const [dbProblem, setDbProblem] = useState<Problem | null>(null);
  const [mentorInput, setMentorInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'ai'>('problem');
  const [code, setCode] = useState('// Initializing workspace...\n\nimport { AetherAuth } from \'@aether/core\';\n\nexport class SecurityArchitect {\n  private vault: ZkProofSystem;\n\n  constructor() {\n    this.vault = new ZkProofSystem({ entropy: \'quantum-void\' });\n  }\n\n  // Initialize the zero-knowledge handshake\n  async initiateHandshake(userId: string) {\n    const challenge = await this.vault.generateChallenge();\n\n    return new Promise((resolve) => {\n      AetherAuth.dispatch({\n        type: \'AUTH_PROTOCOL_V4\',\n        payload: { userId, challenge }\n      });\n    });\n  }\n}');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/problems/${problemId}`)
      .then((res) => res.json())
      .then((data) => {
        setDbProblem(data.problem);
      })
      .catch((err) => console.error('Failed to fetch problem:', err));
  }, [problemId]);

  useEffect(() => {
    if (session?.user?.id && problemId) {
      fetch(`/api/mentor/history?problemId=${problemId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.history) {
            setMessages(data.history);
          }
        })
        .catch((err) => console.error('Failed to fetch mentor history:', err));
    }
  }, [problemId, session]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isMentorLoading, activeLeftTab]);

  const sendMentorMessage = async (content: string) => {
    if (!content.trim()) return;
    setActiveLeftTab('ai');
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

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-400 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]">
          <div className="flex items-center gap-2">
             <Link href="/" className="text-white font-serif italic text-xl tracking-wide hover:opacity-80 transition-opacity">Aether AI</Link>
          </div>

          <nav className="flex items-center gap-10">
            <NavLink label="Home" href="/" />
            <NavLink label="Problems" href="/problems" active />
            <NavLink label="Leaderboard" href="/leaderboard" />
            <NavLink label="Discussions" href="/discussions" />
          </nav>

          <div className="flex items-center gap-4">
             <Avatar className="w-8 h-8 border border-white/10">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-white/5 text-[10px]">{session?.user?.name?.[0] ?? 'U'}</AvatarFallback>
             </Avatar>
          </div>
        </header>

        {/* Main Split Workspace */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: AI Mentor / Problem Content */}
          <div className="w-1/2 flex flex-col border-r border-white/5 bg-[#0a0a0c] relative">
            {/* Panel Tabs */}
            <div className="flex items-center gap-8 px-16 pt-8 border-b border-white/5">
               <button 
                onClick={() => setActiveLeftTab('problem')}
                className={`pb-4 text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${activeLeftTab === 'problem' ? 'text-white border-b border-white' : 'text-zinc-600'}`}
               >
                 Description
               </button>
               <button 
                onClick={() => setActiveLeftTab('ai')}
                className={`pb-4 text-[10px] font-bold tracking-[0.2em] uppercase transition-all ${activeLeftTab === 'ai' ? 'text-white border-b border-white' : 'text-zinc-600'}`}
               >
                 AI Mentor
               </button>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-16 py-12 scrollbar-hide">
              {activeLeftTab === 'problem' ? (
                <div className="space-y-8 max-w-xl animate-in fade-in duration-500">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                      <Sparkles size={14} className="text-purple-400" />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">PROBLEM DETAILS</span>
                  </div>

                  <h1 className="text-4xl font-serif italic text-white leading-[1.2]">
                    {dbProblem?.title ? `Solve ${dbProblem.title}` : "Ready to start coding?"}
                  </h1>

                  <div className="text-zinc-400 text-lg leading-relaxed font-light">
                    {dbProblem ? (
                      <Markdown md={dbProblem.statementMd} />
                    ) : (
                      <p>Select a problem to view the description and start solving it with the help of AI.</p>
                    )}
                  </div>

                  {dbProblem?.constraintsMd && (
                    <div className="mt-12 pt-8 border-t border-white/5">
                      <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4">CONSTRAINTS</h3>
                      <div className="bg-[#050505] p-6 rounded-xl border border-white/5 text-sm font-mono text-zinc-500">
                        <Markdown md={dbProblem.constraintsMd} />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-12 max-w-xl animate-in fade-in duration-500">
                   {messages.length === 0 ? (
                      <div className="space-y-8">
                        <div className="p-8 bg-[#0d0d10] border-l-2 border-purple-500/30 italic text-zinc-300 font-light text-lg">
                          "Use the chat below if you get stuck or need a hint to move forward."
                        </div>
                      </div>
                   ) : (
                     <div className="space-y-10 pb-12">
                        {messages.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                             <div className={`text-[10px] font-bold tracking-widest uppercase ${msg.role === 'user' ? 'text-zinc-600' : 'text-purple-400'}`}>
                                {msg.role === 'user' ? 'GUEST_EXPLORER' : 'AI_MENTOR'}
                             </div>
                             <div className={`max-w-[90%] p-6 rounded-2xl text-[16px] font-light leading-relaxed ${
                               msg.role === 'user' 
                                 ? 'bg-white/5 border border-white/5 text-white' 
                                 : 'bg-[#0d0d10] border border-white/5 text-zinc-300'
                             }`}>
                               <Markdown md={msg.content} />
                             </div>
                          </div>
                        ))}
                        {isMentorLoading && (
                          <div className="flex gap-2 p-4 bg-white/5 rounded-xl border border-white/5 animate-pulse">
                            <div className="w-1 h-1 bg-purple-500 rounded-full" />
                            <div className="w-1 h-1 bg-purple-500 rounded-full" />
                            <div className="w-1 h-1 bg-purple-500 rounded-full" />
                          </div>
                        )}
                     </div>
                   )}
                </div>
              )}
            </div>

            {/* AI Interaction Footer */}
            <div className="p-8 border-t border-white/5 bg-[#0a0a0c]">
               <div className="relative group">
                  <input 
                    type="text"
                    placeholder="Ask a question or get a hint..."
                    className="w-full bg-[#111114] border border-white/5 rounded-2xl py-6 px-8 text-white placeholder:text-zinc-700 outline-none focus:border-purple-500/20 transition-all pr-20 text-lg font-light"
                    value={mentorInput}
                    onChange={(e) => setMentorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void sendMentorMessage(mentorInput);
                    }}
                  />
                  <button 
                    onClick={() => void sendMentorMessage(mentorInput)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-purple-200/90 text-black rounded-xl flex items-center justify-center hover:bg-white transition-all shadow-xl active:scale-95"
                  >
                    <ArrowUpRight size={24} />
                  </button>
               </div>
               
               <div className="mt-6 flex items-center gap-8 text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                  <button className="flex items-center gap-2 hover:text-white transition-colors">
                    <Paperclip size={12} />
                    ATTACH FILE
                  </button>
                  <button className="flex items-center gap-2 hover:text-white transition-colors">
                    <History size={12} />
                    CHAT HISTORY
                  </button>
               </div>
            </div>
          </div>

          {/* Right Panel: Code Workspace */}
          <div className="w-1/2 flex flex-col bg-[#050505]">
             {/* Editor Header / Tabs */}
             <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a0c]">
                <div className="flex items-center gap-1 h-full">
                   <div className="h-full px-4 border-r border-white/5 flex items-center gap-2 bg-[#050505] text-white">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-[11px] font-medium tracking-wide">solution.ts</span>
                   </div>
                   <div className="h-full px-4 flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                      <span className="text-[11px] font-medium tracking-wide">test_cases.go</span>
                   </div>
                </div>

                <div className="flex items-center gap-4 text-zinc-600">
                   <button className="hover:text-white transition-colors"><Copy size={14} /></button>
                   <button className="hover:text-white transition-colors"><Terminal size={14} /></button>
                   <button className="hover:text-white transition-colors"><Maximize2 size={14} /></button>
                </div>
             </div>

             {/* Monaco Editor */}
             <div className="flex-1 overflow-hidden relative">
                <Editor
                  height="100%"
                  defaultLanguage="typescript"
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono',
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    backgroundColor: '#050505',
                    padding: { top: 32 },
                    cursorStyle: 'block',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    contextmenu: false,
                  }}
                />
             </div>

             {/* Editor Footer / Status */}
             <div className="h-12 border-t border-white/5 flex items-center justify-end px-8 bg-[#050505]">
                <div className="flex items-center gap-4">
                   <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-600 uppercase">
                      NEURAL LOAD <span className="text-zinc-400 ml-1">0.042ms</span>
                   </div>
                   <div className="w-3 h-3 rounded-full bg-purple-500/40 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                   </div>
                </div>
             </div>
          </div>

        </main>
      </div>
    </div>
  );
}

function NavLink({ label, href, active = false }: { label: string, href: string, active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`text-[11px] font-bold tracking-[0.2em] uppercase transition-all hover:text-white ${active ? 'text-white border-b border-white' : 'text-zinc-600'}`}
    >
      {label}
    </Link>
  );
}
