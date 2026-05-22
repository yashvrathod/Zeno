'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Maximize2,
  Terminal,
  Paperclip,
  History,
  Play,
  Send,
  ChevronDown,
  LayoutGrid,
  BookOpen,
  Compass,
  Award,
  Settings,
  X,
  ArrowUpRight,
  BarChart3,
  Trophy,
  Brain,
  User,
  Bug,
  Search,
  Code,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { NavLink, SidebarLink, DifficultyBadge } from '@/components/ui/nav-link';
import { Markdown } from '@/components/Markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VisualizationRenderer } from '@/components/VisualizationRenderer';
import { TraceDebugger } from '@/components/TraceDebugger';
import { ExecutionTracePanel } from '@/components/trace/ExecutionTracePanel';
import { SeePlusPlusDebugger } from '@/components/SeePlusPlusDebugger';
import { DebugAnalysisPanel } from '@/components/DebugAnalysisPanel';
import { ArchitectReviewCard } from '@/components/ArchitectReviewCard';
import type { ArchitectReviewData } from '@/components/ArchitectReviewCard';
import { InterventionIndicator, type InterventionType } from '@/components/InterventionIndicator';

type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statementMd: string;
  constraintsMd: string | null;
  hints: string[];
  starterCode?: any;
  testCases?: TestCase[];
  patterns?: Array<{ id: string; name: string }>;
};

type TestCase = {
  id: string;
  order: number;
  input: string;
  expected: string;
  isSample: boolean;
};

type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'cpp' | 'go' | 'rust';

const LANGUAGE_CONFIG: Record<SupportedLanguage, { label: string; ext: string; monacoLang: string }> = {
  typescript: { label: 'TypeScript', ext: 'ts', monacoLang: 'typescript' },
  javascript: { label: 'JavaScript', ext: 'js', monacoLang: 'javascript' },
  python: { label: 'Python', ext: 'py', monacoLang: 'python' },
  java: { label: 'Java', ext: 'java', monacoLang: 'java' },
  cpp: { label: 'C++', ext: 'cpp', monacoLang: 'cpp' },
  go: { label: 'Go', ext: 'go', monacoLang: 'go' },
  rust: { label: 'Rust', ext: 'rs', monacoLang: 'rust' },
};

type TestResult = {
  testCaseId: string;
  status: 'passed' | 'failed' | 'runtime_error' | 'time_limit_exceeded' | 'wrong_answer';
  actual?: string;
  expected: string;
  input: string;
  executionTime?: number;
  memory?: number;
  error?: string;
};

type RunResult = {
  ok: boolean;
  results?: TestResult[];
  error?: string;
  compileError?: string;
};

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = React.use(params);
  const { data: session } = useSession();
  const [dbProblem, setDbProblem] = useState<Problem | null>(null);
  const [apiPatterns, setApiPatterns] = useState<any[] | null>(null);
  const [mentorInput, setMentorInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; visualization?: any; architectReview?: any }>>([]);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'editor' | 'testcases' | 'output' | 'debugger' | 'analysis'>('editor');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [code, setCode] = useState('// Initializing workspace...\n\nexport function solution() {\n  // Your logic here\n}');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [currentVisualization, setCurrentVisualization] = useState<{type: string; data: unknown} | null>(null);
  const [showTraceDebugger, setShowTraceDebugger] = useState(false);
  const [showDebugAnalysis, setShowDebugAnalysis] = useState(false);
  const [architectReview, setArchitectReview] = useState<ArchitectReviewData | null>(null);
  const [showArchitectReview, setShowArchitectReview] = useState(false);
  const [intervention, setIntervention] = useState<{type: InterventionType; message: string} | null>(null);
  const [hasOutput, setHasOutput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/problems/${problemId}`)
      .then((res) => res.json())
      .then((data) => {
        setDbProblem(data.problem);
        if (data.problem.starterCode?.[language]) {
          setCode(data.problem.starterCode[language]);
        }
      })
      .catch((err) => console.error('Failed to fetch problem:', err));

    fetch('/api/patterns', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setApiPatterns(data.patterns))
      .catch(() => setApiPatterns([]));
  }, [problemId, language]);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMentorLoading, isChatExpanded]);

  const handleMentorResponse = (data: any) => {
    if (data.visualization) {
      setCurrentVisualization(data.visualization);
    }
    if (data.architectReview) {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: `**Code Review: Grade ${data.architectReview.grade} (${data.architectReview.score}/100)**\n\n${data.architectReview.feedback}`,
        architectReview: data.architectReview,
      }]);
    }
  };

  const runCode = async () => {
    if (!code.trim() || isRunning) return;
    setIsRunning(true);
    setActiveRightTab('output');
    setHasOutput(true);
    setOutput('Running code...\n');

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          code,
          runAll: false,
        }),
      });
      const data: RunResult = await res.json();
      
      if (!res.ok || !data.ok) {
        setOutput(`Error: ${data.error || 'Failed to run code'}\n${data.compileError || ''}`);
        setTestResults([]);
      } else {
        setTestResults(data.results || []);
        const passed = data.results?.filter(r => r.status === 'passed').length || 0;
        const total = data.results?.length || 0;
        setOutput(`✓ Run completed\n${passed}/${total} test cases passed\n`);
      }
    } catch (err) {
      setOutput(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setActiveRightTab('output');
    setHasOutput(true);
    setOutput('Submitting solution...\n');

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          code,
          runAll: true,
        }),
      });
      const data: RunResult = await res.json();
      
      if (!res.ok || !data.ok) {
        setOutput(`Submission failed: ${data.error || 'Unknown error'}\n${data.compileError || ''}`);
        setTestResults([]);
      } else {
        setTestResults(data.results || []);
        const passed = data.results?.filter(r => r.status === 'passed').length || 0;
        const total = data.results?.length || 0;
        const allPassed = passed === total;
        setOutput(`${allPassed ? '✓ Accepted!' : '✗ Wrong Answer'}\n${passed}/${total} test cases passed\n${allPassed ? 'Congratulations! Your solution is correct.' : 'Some test cases failed. Review your code and try again.'}`);

        // Trigger Architect Review on success
        if (allPassed) {
          try {
            const reviewRes = await fetch('/api/mentor/architect-review', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                code, language, problemId,
                problemTitle: dbProblem?.title,
              }),
            });
            const reviewData = await reviewRes.json();
            if (reviewData.ok && reviewData.review) {
              setArchitectReview(reviewData.summary);
              setShowArchitectReview(true);
            }
          } catch {}
        }
      }
    } catch (err) {
      setOutput(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendMentorMessage = async (content: string) => {
    if (!content.trim()) return;
    const newMessages = [...messages, { role: 'user', content } as const];
    setMessages(newMessages);
    setMentorInput('');
    setIsMentorLoading(true);
    setIsChatExpanded(true); // Auto-expand when sending

    try {
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language: 'typescript',
          userMessage: content,
          history: newMessages,
          problemTitle: dbProblem?.title,
          problemStatementMd: dbProblem?.statementMd,
          problemConstraintsMd: dbProblem?.constraintsMd,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        setMessages([...newMessages, { role: 'assistant', content: errData.error ?? 'Something went wrong. Please try again.' }]);
        return;
      }
      const data = await res.json();
      const assistantMsg = { 
        role: 'assistant' as const, 
        content: data.message ?? 'AI response unavailable',
        visualization: data.visualization
      };
      setMessages([...newMessages, assistantMsg]);
      handleMentorResponse(data);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setIsMentorLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-[#94a3b8] font-sans overflow-hidden selection:bg-[#2dd4bf]/20">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:ital,wght@0,500;1,400;1,500;1,600;1,700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .font-sans-studio { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .font-serif-studio { font-family: 'Playfair Display', serif; }
        .font-mono-studio { font-family: 'JetBrains Mono', monospace; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .blur-mask { mask-image: linear-gradient(to bottom, transparent, black 100px); }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.05); opacity: 0.6; }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.2; }
          50% { transform: translateY(-15px) scale(1.08); opacity: 0.5; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(168,85,247,0.1); }
          50% { box-shadow: 0 0 40px rgba(168,85,247,0.3); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-gradient { background-size: 200% 200%; animation: gradient-shift 8s ease infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .glass-card { background: rgba(18,18,20,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.05); }
        .glass-card-light { background: rgba(22,22,24,0.5); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.06); }
        .glass-card-hover:hover { background: rgba(30,30,35,0.7); border-color: rgba(255,255,255,0.1); }
      `}</style>

      {/* Background Ambient Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#a855f7]/5 blur-[120px] animate-float" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-[#2dd4bf]/5 blur-[100px] animate-float-delayed" />
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-[#3b82f6]/5 blur-[80px] animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Sidebar */}
      <aside className="w-[280px] flex flex-col border-r border-white/[0.05] bg-black/80 backdrop-blur-xl h-full z-50 font-sans-studio shrink-0">
        <div className="p-10 mb-4">
           <Link href="/" className="flex items-center gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#161618] to-[#1a1a1e] border border-white/10 flex items-center justify-center font-mono text-white text-xl group-hover:border-[#a855f7]/30 transition-all shadow-lg shadow-purple-500/5">
                {`>_`}
              </div>
              <div className="flex flex-col -space-y-0.5">
                <span className="text-white font-bold tracking-[0.1em] text-[16px] uppercase">CORE</span>
                <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase">DEVELOPER</span>
              </div>
           </Link>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1 px-4">
          <SidebarLink icon={<LayoutGrid size={20} />} label="Workbench" href="/" />
          <div className="relative">
            <SidebarLink icon={<BookOpen size={20} />} label="Curriculum" href="/problems" active />
            <div className="ml-14 mt-1 space-y-2.5 border-l border-white/[0.05] pl-6 py-3">
              {apiPatterns?.slice(0, 2).map((p, i) => (
                <Link key={p.id} href={`/problems/${p.problems[0]?.slug || p.id}`} className={`block text-[11px] font-bold uppercase tracking-wider flex items-center gap-2.5 cursor-pointer transition-colors ${p.id === dbProblem?.patterns?.[0]?.id ? 'text-[#2dd4bf]' : 'text-zinc-600 hover:text-zinc-400'}`}>
                  {p.id === dbProblem?.patterns?.[0]?.id && <div className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] shadow-[0_0_10px_rgba(45,212,191,0.8)] animate-pulse" />}
                  {p.name.length > 20 ? p.name.slice(0, 17) + '...' : p.name}
                </Link>
              ))}
            </div>
          </div>
          <SidebarLink icon={<Brain size={20} />} label="Skill Tree" href="/profile/skills" />
          <SidebarLink icon={<BarChart3 size={20} />} label="Dashboard" href="/dashboard" />
          <SidebarLink icon={<Trophy size={20} />} label="Leaderboard" href="/leaderboard" />
        </nav>

        <div className="mt-auto p-6 space-y-2">
           <SidebarLink icon={<Settings size={20} />} label="Settings" href="/settings" />
           <div className="flex items-center gap-4 px-4 py-6 mt-4 border-t border-white/[0.05]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-[12px] font-bold text-white uppercase shadow-lg shadow-purple-500/20">
                 {session?.user?.name?.[0] || 'N'}
              </div>
              <span className="text-sm font-bold text-white tracking-wide">Account</span>
           </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0c] font-sans-studio relative z-10">
        {/* Workspace Navbar */}
        <header className="h-20 border-b border-white/[0.05] flex items-center justify-between px-10 bg-[#0a0a0c]/80 backdrop-blur-xl">
          <div className="flex items-center gap-8">
             <Link href="/problems" className="flex items-center gap-3 text-zinc-500 hover:text-white transition-colors group">
                <ChevronDown size={20} className="rotate-90 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[11px] font-bold tracking-widest uppercase">Back to Modules</span>
             </Link>
             <div className="h-6 w-[1px] bg-white/10" />
             <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-1">CURRENT CHALLENGE</span>
                <span className="text-white font-bold text-sm tracking-wide bg-gradient-to-r from-white to-zinc-300 bg-clip-text">{dbProblem?.title || 'Loading...'}</span>
             </div>
          </div>

          <nav className="hidden lg:flex items-center gap-12">
            <NavLink label="Workbench" href="/" />
            <NavLink label="Curriculum" href="/problems" active />
            <NavLink label="Skill Tree" href="/profile/skills" />
            <NavLink label="Leaderboard" href="/leaderboard" />
          </nav>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 glass-card-light px-4 py-2 rounded-xl group hover:border-[#2dd4bf]/20 transition-all">
                <div className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">System Active</span>
             </div>
             <Avatar className="w-10 h-10 border border-white/10 ring-2 ring-transparent hover:ring-[#a855f7]/20 transition-all">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-zinc-800 to-zinc-900 text-xs text-zinc-300">{session?.user?.name?.[0] ?? 'U'}</AvatarFallback>
             </Avatar>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Left Panel: The Architect */}
          <div className="w-[45%] flex flex-col border-r border-white/[0.05] bg-[#0a0a0c] relative overflow-hidden">
            
            {/* Gradient accent line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a855f7]/50 to-transparent" />
            
            {/* Scrollable Problem Content */}
            <div className={`flex-1 overflow-y-auto px-12 py-10 scrollbar-hide flex flex-col transition-all duration-700 ease-in-out ${isChatExpanded ? 'blur-[8px] opacity-20 scale-[0.98]' : 'blur-0 opacity-100 scale-100'}`}>
              <div className="space-y-12">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7]/20 to-[#a855f7]/5 flex items-center justify-center border border-[#a855f7]/20 shadow-lg shadow-purple-500/10">
                    <Sparkles size={18} className="text-[#a855f7]" />
                  </div>
                  <span className="text-[11px] font-bold tracking-[0.4em] text-zinc-500 uppercase">THE ARCHITECT</span>
                  <div className="ml-auto flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-float" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-float-delayed" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-float" style={{ animationDelay: '1s' }} />
                  </div>
                </div>

                <div className="space-y-6">
                  <h1 className="text-[3.2rem] leading-[1.1] tracking-tight">
                    <span className="font-serif-studio italic block mb-3 text-zinc-500 text-[2rem]">The neural scaffolding for</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-zinc-300 font-extrabold block text-[3.6rem] leading-[1.05]">
                      {dbProblem?.title ? dbProblem.title : "Initializing..."}
                    </span>
                    <span className="font-serif-studio italic block mt-3 text-zinc-400 text-[2rem]">is ready to be forged.</span>
                  </h1>
                </div>

                <div className="space-y-8">
                   <div className="glass-card rounded-[2rem] p-10 text-zinc-300 text-[16px] leading-[1.8] font-light">
                    {dbProblem ? (
                      <Markdown md={dbProblem.statementMd} />
                    ) : (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-white/5 rounded w-full" />
                        <div className="h-4 bg-white/5 rounded w-[90%]" />
                      </div>
                    )}
                  </div>

                  {dbProblem?.constraintsMd && (
                    <div className="glass-card rounded-[2rem] p-10 relative overflow-hidden group animate-pulse-glow hover:-translate-y-0.5 transition-transform duration-300">
                      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#a855f7]/60 to-transparent" />
                      <div className="absolute top-0 right-0 w-40 h-40 bg-[#a855f7]/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />
                      <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                        SYSTEM CONSTRAINTS
                      </h3>
                      <div className="text-zinc-400 text-[15px] font-light italic leading-relaxed relative z-10">
                        <Markdown md={dbProblem.constraintsMd} />
                      </div>
                    </div>
                  )}
                </div>

                {currentVisualization && (
                  <div className="mt-12 pt-12 border-t border-white/5">
                    <VisualizationRenderer
                      type={currentVisualization.type}
                      data={currentVisualization.data}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom-Up AI Chat Drawer */}
            <motion.div 
              initial={false}
              animate={{ height: isChatExpanded ? '75%' : '140px' }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="absolute bottom-0 left-0 right-0 bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/[0.08] flex flex-col z-[60] shadow-[0_-20px_80px_rgba(0,0,0,0.8)]"
            >
              {/* Handle with Glowing Dots */}
              <div 
                onClick={() => setIsChatExpanded(!isChatExpanded)}
                className="w-full flex flex-col items-center py-4 cursor-pointer hover:bg-white/[0.02] transition-colors group relative"
              >
                <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#a855f7]/20 to-transparent" />
                <div className="flex gap-1.5 mb-1.5">
                  <motion.div animate={{ scale: isChatExpanded ? 0.8 : 1 }} className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-[#a855f7] transition-colors shadow-[0_0_8px_rgba(168,85,247,0)] group-hover:shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  <motion.div animate={{ scale: isChatExpanded ? 0.8 : 1 }} className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-[#a855f7] transition-colors shadow-[0_0_8px_rgba(168,85,247,0)] group-hover:shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                  <motion.div animate={{ scale: isChatExpanded ? 0.8 : 1 }} className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-[#a855f7] transition-colors shadow-[0_0_8px_rgba(168,85,247,0)] group-hover:shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                </div>
                <span className="text-[9px] font-bold tracking-[0.3em] text-zinc-600 uppercase group-hover:text-zinc-400 transition-colors">
                  {isChatExpanded ? 'Collapse Feed' : 'Neural History'}
                </span>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-hidden flex flex-col relative">
                {/* Scroll Mask Top */}
                <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0a0a0c] to-transparent z-10 pointer-events-none" />
                
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-12 py-10 space-y-10 scrollbar-hide scroll-smooth"
                >
                  <AnimatePresence initial={false}>
                    {messages.length === 0 && !isMentorLoading && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-50"
                      >
                         <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-[#a855f7]/10 to-[#2dd4bf]/5 border border-white/[0.06] flex items-center justify-center shadow-lg shadow-purple-500/5">
                            <Sparkles size={28} className="text-[#a855f7]" />
                         </div>
                         <p className="text-[18px] font-light text-zinc-500 max-w-xs leading-relaxed font-serif-studio italic">
                            The Architect awaits your inquiry.
                         </p>
                         <p className="text-[13px] text-zinc-700 max-w-xs leading-relaxed">
                            Whisper your logic to begin the dialogue.
                         </p>
                      </motion.div>
                    )}
                    {messages.map((msg, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-3`}
                      >
                         <div className={`flex items-center gap-3 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border ${msg.role === 'user' ? 'bg-[#3b82f6]/10 border-[#3b82f6]/20 text-[#3b82f6]' : 'bg-[#a855f7]/10 border-[#a855f7]/20 text-[#a855f7]'}`}>
                               {msg.role === 'user' ? 'U' : 'A'}
                            </div>
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                               {msg.role === 'user' ? 'NEURAL PROMPT' : 'ARCHITECT FEEDBACK'}
                            </span>
                         </div>
                         <div className={`max-w-[85%] p-7 rounded-[1.75rem] text-[15px] font-light leading-relaxed transition-all ${msg.role === 'user' ? 'glass-card-light text-white rounded-tr-none' : 'glass-card text-zinc-400 rounded-tl-none'}`}>
                            <Markdown md={msg.content} />
                            
                            {msg.visualization && (
                               <div className="mt-8 pt-8 border-t border-white/5">
                                  <VisualizationRenderer type={msg.visualization.type} data={msg.visualization.data} />
                               </div>
                            )}
                         </div>
                      </motion.div>
                    ))}
                    {isMentorLoading && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-4 text-zinc-600 pl-4"
                      >
                         <div className="flex gap-2">
                            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 rounded-full bg-gradient-to-br from-[#a855f7] to-[#2dd4bf]" />
                            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-2 h-2 rounded-full bg-gradient-to-br from-[#a855f7] to-[#2dd4bf]" />
                            <motion.div animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-2 h-2 rounded-full bg-gradient-to-br from-[#a855f7] to-[#2dd4bf]" />
                         </div>
                         <span className="text-[10px] font-bold tracking-[0.2em] uppercase bg-gradient-to-r from-[#a855f7] to-[#2dd4bf] bg-clip-text text-transparent">Synthesizing Scaffolding...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Chat Input Container */}
              <div className="px-10 py-8 bg-[#0a0a0c]/80 backdrop-blur-sm border-t border-white/[0.05]">
                <div className="relative group">
                    <div className="absolute -inset-[2px] rounded-[1.6rem] bg-gradient-to-r from-[#a855f7]/0 via-[#a855f7]/10 to-[#2dd4bf]/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <input
                      type="text"
                      value={mentorInput}
                      onChange={(e) => setMentorInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMentorMessage(mentorInput)}
                      onFocus={() => setIsChatExpanded(true)}
                      placeholder="Whisper your logic to the architect..."
                      className="relative w-full glass-card-light rounded-[1.5rem] px-10 py-5 text-white placeholder:text-zinc-700 focus:outline-none focus:border-white/20 transition-all text-[16px] font-light pr-24 shadow-2xl"
                    />
                    <button 
                      onClick={() => sendMentorMessage(mentorInput)}
                      disabled={isMentorLoading || !mentorInput.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 glass-card rounded-xl flex items-center justify-center text-zinc-400 hover:text-[#2dd4bf] hover:border-[#2dd4bf]/30 border border-white/5 transition-all disabled:opacity-50 group/btn"
                    >
                      {isMentorLoading ? (
                        <div className="w-5 h-5 border-2 border-zinc-500 border-t-[#2dd4bf] rounded-full animate-spin" />
                      ) : (
                        <Send size={18} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      )}
                    </button>
                </div>
              </div>
            </motion.div>
          </div>

           {/* Right Panel: Workspace */}
           <div className="flex-1 flex flex-col bg-black/60 backdrop-blur-sm relative">
              {/* Gradient accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2dd4bf]/30 to-transparent" />
              
              {/* Header */}
              <div className="h-16 border-b border-white/[0.05] flex items-center justify-between px-8 bg-black/40 backdrop-blur-sm">
                  <div className="flex items-center gap-6">
                     <div className="flex items-center glass-card rounded-xl p-1">
                        <button 
                          onClick={() => setActiveRightTab('editor')}
                          className={`px-5 py-2.5 rounded-lg text-[11px] font-bold tracking-widest transition-all uppercase ${activeRightTab === 'editor' ? 'bg-gradient-to-b from-white/15 to-white/5 text-white shadow-lg shadow-black/20' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'}`}
                        >
                          solution.{LANGUAGE_CONFIG[language].ext}
                        </button>
                        <button 
                          onClick={() => setActiveRightTab('testcases')}
                          className={`px-5 py-2.5 rounded-lg text-[11px] font-bold tracking-widest transition-all uppercase ${activeRightTab === 'testcases' ? 'bg-gradient-to-b from-white/15 to-white/5 text-white shadow-lg shadow-black/20' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'}`}
                        >
                          test_suite
                        </button>
                        <button 
                          onClick={() => setActiveRightTab('output')}
                          className={`px-5 py-2.5 rounded-lg text-[11px] font-bold tracking-widest transition-all uppercase ${activeRightTab === 'output' ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 text-emerald-300 shadow-lg shadow-black/20' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'}`}
                        >
                          output{hasOutput && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block align-middle shadow-[0_0_6px_rgba(16,185,129,0.6)]" />}
                        </button>
                        <button 
                          onClick={() => { setActiveRightTab('debugger'); setShowTraceDebugger(true); }}
                          className={`px-5 py-2.5 rounded-lg text-[11px] font-bold tracking-widest transition-all uppercase ${activeRightTab === 'debugger' ? 'bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-amber-300 shadow-lg shadow-black/20' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'}`}
                        >
                          <Bug size={12} className="inline mr-1 -mt-0.5" />trace
                        </button>
                        <button 
                          onClick={() => { setActiveRightTab('analysis'); setShowDebugAnalysis(true); }}
                          className={`px-5 py-2.5 rounded-lg text-[11px] font-bold tracking-widest transition-all uppercase ${activeRightTab === 'analysis' ? 'bg-gradient-to-b from-purple-500/20 to-purple-500/5 text-purple-300 shadow-lg shadow-black/20' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]'}`}
                        >
                          <Search size={12} className="inline mr-1 -mt-0.5" />analyze
                        </button>
                     </div>
                     {/* Language Selector */}
                     <select
                       value={language}
                       onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                       className="glass-card rounded-xl px-4 py-2.5 text-[11px] font-bold tracking-widest text-zinc-400 uppercase outline-none focus:border-white/20 transition-all cursor-pointer appearance-none hover:border-white/10"
                     >
                       {Object.entries(LANGUAGE_CONFIG).map(([key, cfg]) => (
                         <option key={key} value={key} className="bg-[#121214] text-zinc-300">{cfg.label}</option>
                       ))}
                     </select>
                     <div className="h-4 w-[1px] bg-white/5" />
                     <div className="flex items-center gap-4">
                        <button className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                          <Terminal size={18} />
                        </button>
                        <button className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                          <Maximize2 size={18} />
                        </button>
                     </div>
                  </div>

                  <div className="flex items-center gap-4">
                     <DifficultyBadge difficulty={dbProblem?.difficulty} />
                     <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest font-mono flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                       NEURAL_LOAD: 0.04ms
                     </span>
                  </div>
              </div>

              {/* Architect Review Overlay */}
              {showArchitectReview && architectReview && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-8 overflow-y-auto"
                     onClick={() => setShowArchitectReview(false)}>
                  <div className="max-w-xl w-full" onClick={e => e.stopPropagation()}>
                    <ArchitectReviewCard
                      code={code}
                      language={language}
                      problemId={problemId}
                      problemTitle={dbProblem?.title}
                      onClose={() => setShowArchitectReview(false)}
                    />
                  </div>
                </div>
              )}

              {/* Proactive Intervention */}
              {intervention && (
                <div className="absolute top-4 left-4 right-4 z-40">
                  <InterventionIndicator
                    type={intervention.type}
                    message={intervention.message}
                    onDismiss={() => setIntervention(null)}
                  />
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 overflow-hidden relative">
                {activeRightTab === 'debugger' ? (
                  <div className="h-full overflow-y-auto">
                    <SeePlusPlusDebugger code={code} language={language} />
                  </div>
                ) : activeRightTab === 'analysis' ? (
                  <div className="h-full overflow-y-auto">
                    <DebugAnalysisPanel code={code} language={language} />
                  </div>
                ) : activeRightTab === 'output' ? (
                  <div className="h-full overflow-y-auto bg-black/40">
                    <div className="p-10 space-y-8">
                      <h3 className="text-[11px] font-bold tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        EXECUTION OUTPUT
                      </h3>
                      {testResults.length > 0 ? (
                        <div className="space-y-4">
                          {/* Summary */}
                          <div className="glass-card rounded-2xl p-6 flex items-center gap-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 size={18} className="text-emerald-400" />
                              </div>
                              <span className="text-emerald-400 font-bold text-lg font-mono">{testResults.filter(r => r.status === 'passed').length}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                                <XCircle size={18} className="text-rose-400" />
                              </div>
                              <span className="text-rose-400 font-bold text-lg font-mono">{testResults.filter(r => r.status === 'failed' || r.status === 'wrong_answer').length}</span>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <AlertCircle size={18} className="text-amber-400" />
                              </div>
                              <span className="text-amber-400 font-bold text-lg font-mono">{testResults.filter(r => r.status === 'runtime_error' || r.status === 'time_limit_exceeded').length}</span>
                            </div>
                          </div>

                          {/* Result list */}
                          {testResults.map((r, i) => (
                            <div key={r.testCaseId} className={`glass-card rounded-2xl border p-6 transition-all hover:-translate-y-0.5 duration-200 ${
                              r.status === 'passed' ? 'border-emerald-500/20 hover:border-emerald-500/30' :
                              r.status === 'failed' || r.status === 'wrong_answer' ? 'border-rose-500/20 hover:border-rose-500/30' :
                              'border-amber-500/20 hover:border-amber-500/30'
                            }`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  {r.status === 'passed' ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                                   r.status === 'failed' || r.status === 'wrong_answer' ? <XCircle size={16} className="text-rose-400" /> :
                                   <AlertCircle size={16} className="text-amber-400" />}
                                  <span className="text-sm font-bold text-white uppercase tracking-wider">Case 0{i + 1}</span>
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                    r.status === 'passed' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
                                    r.status === 'failed' || r.status === 'wrong_answer' ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' :
                                    'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                                  }`}>{r.status.replace(/_/g, ' ')}</span>
                                </div>
                                {r.executionTime !== undefined && (
                                  <span className="text-[10px] text-zinc-600 font-mono">{r.executionTime}ms{r.memory ? ` · ${r.memory}KB` : ''}</span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">Input</span>
                                  <pre className="mt-1.5 text-xs font-mono text-zinc-400 bg-black/40 p-3.5 rounded-xl border border-white/5">{r.input}</pre>
                                </div>
                                <div>
                                  <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">Expected</span>
                                  <pre className="mt-1.5 text-xs font-mono text-emerald-400/70 bg-black/40 p-3.5 rounded-xl border border-emerald-500/10">{r.expected}</pre>
                                </div>
                              </div>
                              {r.actual !== undefined && r.status !== 'passed' && (
                                <div className="mt-4">
                                  <span className="text-[9px] text-rose-700 uppercase tracking-widest font-bold">Got</span>
                                  <pre className="mt-1.5 text-xs font-mono text-rose-400/70 bg-black/40 p-3.5 rounded-xl border border-rose-500/20">{r.actual}</pre>
                                </div>
                              )}
                              {r.error && (
                                <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                  <span className="text-[9px] text-rose-400 uppercase tracking-widest font-bold">Error</span>
                                  <pre className="mt-1.5 text-xs font-mono text-rose-300/70">{r.error}</pre>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="glass-card rounded-2xl p-8">
                          <pre className="text-[13px] font-mono text-zinc-500 leading-relaxed whitespace-pre-wrap">{output || 'Run your code to see output.'}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeRightTab === 'editor' ? (
                  <div className="h-full">
                    <Editor
                      height="100%"
                      language={LANGUAGE_CONFIG[language].monacoLang}
                      theme="vs-dark"
                      value={code}
                      onChange={(val) => setCode(val || '')}
                      options={{
                        fontSize: 16,
                        fontFamily: 'JetBrains Mono',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'on',
                        renderLineHighlight: 'none',
                        padding: { top: 40, bottom: 40 },
                        cursorStyle: 'line',
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                        scrollbar: { vertical: 'hidden', horizontal: 'hidden' }
                      }}
                      beforeMount={(monaco) => {
                        monaco.editor.defineTheme('studio-dark', {
                          base: 'vs-dark',
                          inherit: true,
                          rules: [],
                          colors: {
                            'editor.background': '#000000',
                            'editor.lineHighlightBackground': '#00000000',
                            'editorLineNumber.foreground': '#1e1e20',
                            'editorLineNumber.activeForeground': '#4a4a4e',
                          }
                        });
                      }}
                      onMount={(editor, monaco) => {
                        monaco.editor.setTheme('studio-dark');
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-12 bg-black scrollbar-hide">
                    <div className="max-w-3xl space-y-10">
                      <h3 className="text-[11px] font-bold tracking-[0.4em] text-zinc-600 uppercase">SYSTEM TEST SUITE</h3>
                      {dbProblem?.testCases?.map((tc, idx) => (
                        <div key={tc.id} className="bg-[#121214] border border-white/[0.05] rounded-[2rem] p-8 shadow-2xl">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-[14px] font-bold text-white uppercase tracking-widest">Case 0{idx + 1}</span>
                            {tc.isSample && <span className="text-[10px] font-bold text-[#2dd4bf] border border-[#2dd4bf]/20 bg-[#2dd4bf]/5 px-3 py-1 rounded-full tracking-widest uppercase">Sample Module</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                             <div className="space-y-3">
                                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Input Stream</span>
                                <pre className="text-[13px] font-mono text-zinc-500 bg-black/40 p-5 rounded-2xl border border-white/5">{tc.input}</pre>
                             </div>
                             <div className="space-y-3">
                                <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Expected Outcome</span>
                                <pre className="text-[13px] font-mono text-zinc-500 bg-black/40 p-5 rounded-2xl border border-white/5">{tc.expected}</pre>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit/Run Controls — hidden during debugger/analysis */}
                {(activeRightTab === 'editor' || activeRightTab === 'testcases' || activeRightTab === 'output') && (
                <div className="absolute bottom-10 right-10 flex items-center gap-4">
                   <button
                     onClick={runCode}
                     disabled={isRunning}
                     className="px-10 py-5 glass-card rounded-[1.25rem] text-[12px] font-bold text-zinc-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-3 shadow-2xl uppercase tracking-widest glass-card-hover"
                   >
                     {isRunning ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-[#2dd4bf] rounded-full animate-spin" /> : <Play size={16} fill="currentColor" className="text-[#2dd4bf]" />}
                     Run
                   </button>
                   <button
                     onClick={submitCode}
                     disabled={isSubmitting}
                     className="px-10 py-5 bg-gradient-to-r from-[#2dd4bf] to-[#14b8a6] text-[#050505] rounded-[1.25rem] text-[12px] font-extrabold hover:scale-105 hover:shadow-[0_20px_50px_rgba(45,212,191,0.4)] transition-all shadow-[0_15px_40px_rgba(45,212,191,0.3)] uppercase tracking-widest relative overflow-hidden group"
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                     {isSubmitting ? 'Syncing...' : 'Submit'}
                   </button>
                </div>
                )}
             </div>

              {/* Footer Status */}
              <div className="h-12 border-t border-white/[0.05] flex items-center justify-between px-10 bg-black/40 backdrop-blur-sm">
                 <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                       <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-700 uppercase">WORKSPACE ENCRYPTED</span>
                    </div>
                    <div className="text-[10px] font-bold tracking-widest text-zinc-700 uppercase font-mono-studio">
                       L{code.split('\n').length} : C{code.length} : {language.toUpperCase()}
                    </div>
                 </div>

                 <div className="flex items-center gap-6">
                    <div className="w-[120px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-[#a855f7] to-[#2dd4bf] w-[42%] shadow-[0_0_12px_rgba(168,85,247,0.5)] transition-all duration-500" />
                    </div>
                    <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest font-mono-studio">MEM_STACK</span>
                 </div>
              </div>
          </div>

        </main>
     </div>
   </div>
  );
}
