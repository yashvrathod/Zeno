'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUpRight,
  Sparkles,
  Copy,
  Terminal,
  Paperclip,
  History,
  Play,
  Send,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Clock,
  MemoryStick,
  Zap,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { Markdown } from '@/components/Markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomSheetChat } from '@/components/BottomSheetChat';
import { VisualizationRenderer } from '@/components/VisualizationRenderer';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { executeCode, formatExecutionResult } from '@/lib/executor/codeExecutor';
import { checkAIQuota } from '@/lib/executor/aiQuota';

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
  const [mentorInput, setMentorInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'ai'>('problem');
  const [activeRightTab, setActiveRightTab] = useState<'editor' | 'testcases' | 'output'>('editor');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [code, setCode] = useState('// Architecting solution...\n\nexport function solve(input: any) {\n  // Implementation details...\n  return null;\n}');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentVisualization, setCurrentVisualization] = useState<{type: string; data: unknown} | null>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);

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

  const runCode = async () => {
    if (!code.trim() || isRunning) return;
    setIsRunning(true);
    setActiveRightTab('output');
    setOutput('Running code locally...\n');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, language, code, runAll: false }),
      });
      const data: RunResult = await res.json();
      if (!res.ok || !data.ok) {
        setOutput(`Execution Error: ${data.error || 'Unknown failure'}\n${data.compileError || ''}`);
      } else {
        setTestResults(data.results || []);
        const passed = data.results?.filter(r => r.status === 'passed').length || 0;
        const total = data.results?.length || 0;
        setOutput(`✓ Analysis Completed\n${passed}/${total} nodes synchronized successfully.`);
      }
    } catch (err) {
      setOutput(`Network Disconnect: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setActiveRightTab('output');
    setOutput('Synchronizing final solution with global network...\n');
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId, language, code, runAll: true }),
      });
      const data: RunResult = await res.json();
      if (!res.ok || !data.ok) {
        setOutput(`Submission Refused: ${data.error || 'Unknown error'}\n${data.compileError || ''}`);
      } else {
        setTestResults(data.results || []);
        const allPassed = data.results?.every(r => r.status === 'passed');
        setOutput(allPassed ? '✓ Accepted. Solution integrated into architectural registry.' : '✗ Integration Failed. Neural path incomplete.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />

        <main className="flex-1 flex overflow-hidden p-4 gap-4">
          
          {/* Left Panel: Description */}
          <Card className="w-[45%] flex flex-col border-border/60 bg-card overflow-hidden rounded-3xl shadow-sm">
            <div className="flex items-center gap-6 px-8 pt-6 border-b border-border/50">
               {['problem', 'ai'].map((tab) => (
                 <button 
                  key={tab}
                  onClick={() => setActiveLeftTab(tab as any)}
                  className={`pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
                    activeLeftTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                 >
                   {tab === 'problem' ? 'Description' : 'Neural Advisor'}
                   {activeLeftTab === tab && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(217,119,87,0.4)]" />}
                 </button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-10 selection:bg-primary/10 custom-scrollbar">
              {activeLeftTab === 'problem' ? (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">
                        {dbProblem ? `Problem Node_${dbProblem.id.slice(-4).toUpperCase()}` : "Problem Descriptor"}
                      </span>
                    </div>
                    <h1 className="text-4xl font-serif font-semibold tracking-tight leading-tight">
                      {dbProblem?.title || "Syncing path..."}
                    </h1>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-secondary/50 text-[10px] font-bold">{dbProblem?.difficulty}</Badge>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Global Solve Rate: 68%</span>
                    </div>
                  </div>

                  <div className="text-lg text-foreground font-serif leading-relaxed">
                    {dbProblem ? <Markdown md={dbProblem.statementMd} /> : <p className="italic text-muted-foreground">Architecting problem statement...</p>}
                  </div>

                  {dbProblem?.constraintsMd && (
                    <div className="space-y-6 pt-10 border-t border-border/50">
                      <span className="text-[10px] font-bold tracking-[0.3em] text-muted-foreground uppercase">System Constraints</span>
                      <div className="bg-secondary/40 p-6 rounded-2xl border border-border/40 font-mono text-sm text-foreground">
                        <Markdown md={dbProblem.constraintsMd} />
                      </div>
                    </div>
                  )}

                  {currentVisualization && (
                    <div className="space-y-6 pt-10 border-t border-border/50">
                      <span className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase">Neural Projection</span>
                      <VisualizationRenderer type={currentVisualization.type} data={currentVisualization.data} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-primary" />
                    <span className="text-[10px] font-bold tracking-[0.3em] text-primary uppercase">AI Mentor Feedback</span>
                  </div>
                  <div className="p-8 bg-primary/5 border border-primary/10 rounded-2xl font-serif italic text-lg leading-relaxed text-foreground/90">
                    "I am analyzing your implementation patterns. Start coding in the workspace, and I will provide subtle architectural guidance."
                  </div>
                  {messages.length > 0 && (
                    <div className="space-y-6">
                      {messages.slice(-3).map((msg, i) => (
                        <div key={i} className={`p-6 rounded-2xl border ${msg.role === 'user' ? 'bg-secondary/20 border-border/40' : 'bg-card border-border shadow-sm'}`}>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">{msg.role === 'user' ? 'ARCHITECT' : 'SYSTEM'}</span>
                          <div className="font-serif leading-relaxed text-foreground"><Markdown md={msg.content} /></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-border/50 bg-secondary/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Neural Link Stable</span>
              </div>
              <Button onClick={() => setIsChatOpen(true)} size="sm" className="rounded-full px-6 gap-2 shadow-lg shadow-primary/20">
                <Sparkles size={14} />
                Ask Advisor
              </Button>
            </div>
          </Card>

          {/* Right Panel: Workspace */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Top Editor Card */}
            <Card className="flex-1 flex flex-col border-border/60 bg-card overflow-hidden rounded-3xl shadow-sm">
              <div className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-secondary/30">
                <div className="flex items-center gap-4">
                  <div className="relative" ref={langDropdownRef}>
                    <button onClick={() => setShowLangDropdown(!showLangDropdown)} className="flex items-center gap-2 px-4 py-2 bg-background border border-border/60 rounded-xl text-xs font-bold text-foreground hover:border-primary transition-all">
                      {LANGUAGE_CONFIG[language].label}
                      <ChevronDown size={14} className={`transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showLangDropdown && (
                      <Card className="absolute top-full left-0 mt-2 w-48 z-50 p-1 border-border shadow-xl rounded-xl">
                        {Object.keys(LANGUAGE_CONFIG).map(lang => (
                          <button key={lang} onClick={() => { setLanguage(lang as any); setShowLangDropdown(false); }} className={`w-full px-4 py-2.5 text-left text-xs font-medium rounded-lg hover:bg-secondary transition-colors ${language === lang ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                            {LANGUAGE_CONFIG[lang as SupportedLanguage].label}
                          </button>
                        ))}
                      </Card>
                    )}
                  </div>
                  <div className="h-4 w-px bg-border/50" />
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">workspace.{LANGUAGE_CONFIG[language].ext}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button onClick={runCode} disabled={isRunning} variant="outline" className="rounded-xl px-6 h-9 font-bold text-xs gap-2">
                    {isRunning ? <div className="w-3 h-3 border-2 border-primary border-t-transparent animate-spin rounded-full" /> : <Play size={14} />}
                    Run
                  </Button>
                  <Button onClick={submitCode} disabled={isSubmitting} className="rounded-xl px-8 h-9 font-bold text-xs gap-2">
                    {isSubmitting ? <div className="w-3 h-3 border-2 border-background border-t-transparent animate-spin rounded-full" /> : <Send size={14} />}
                    Submit
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative">
                 <Editor
                    height="100%"
                    language={LANGUAGE_CONFIG[language].monacoLang}
                    theme={typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'vs-dark' : 'vs-light'}
                    value={code}
                    onChange={val => setCode(val || '')}
                    options={{
                      fontSize: 14,
                      fontFamily: 'var(--font-mono)',
                      minimap: { enabled: false },
                      padding: { top: 20 },
                      lineHeight: 24,
                      renderLineHighlight: 'all',
                      cursorStyle: 'block',
                      smoothScrolling: true,
                    }}
                 />
              </div>
            </Card>

            {/* Bottom Output Card */}
            <Card className="h-[30%] border-border/60 bg-card flex flex-col rounded-3xl shadow-sm overflow-hidden">
               <div className="flex items-center gap-8 px-8 pt-4 border-b border-border/50">
                 {['testcases', 'output'].map(tab => (
                   <button 
                    key={tab}
                    onClick={() => setActiveRightTab(tab as any)}
                    className={`pb-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${
                      activeRightTab === tab ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                   >
                     {tab === 'testcases' ? 'Validation Nodes' : 'Execution Trace'}
                     {activeRightTab === tab && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-primary rounded-full shadow-[0_0_8px_rgba(217,119,87,0.4)]" />}
                   </button>
                 ))}
               </div>

               <div className="flex-1 overflow-y-auto p-8 font-mono text-sm custom-scrollbar">
                  {activeRightTab === 'testcases' ? (
                    <div className="space-y-4">
                      {dbProblem?.testCases?.filter(tc => tc.isSample).map((tc, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Case {i + 1}</span>
                            {testResults.find(r => r.testCaseId === tc.id)?.status === 'passed' && <Check size={14} className="text-emerald-500" />}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><span className="text-[9px] text-muted-foreground uppercase mb-1 block">Input</span><pre className="text-xs p-2 bg-background rounded-lg border border-border/40 text-foreground">{tc.input}</pre></div>
                            <div><span className="text-[9px] text-muted-foreground uppercase mb-1 block">Expected</span><pre className="text-xs p-2 bg-background rounded-lg border border-border/40 text-foreground">{tc.expected}</pre></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <pre className="text-foreground leading-relaxed whitespace-pre-wrap">{output || 'Protocol idle. Awaiting user commands.'}</pre>
                      {testResults.length > 0 && (
                        <div className="space-y-px rounded-2xl border border-border overflow-hidden">
                          {testResults.map((r, i) => (
                            <div key={i} className="p-4 bg-background flex items-center justify-between border-b border-border/40 last:border-0 hover:bg-secondary/20 transition-colors">
                               <div className="flex items-center gap-4">
                                  <div className={`w-2 h-2 rounded-full ${r.status === 'passed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Node_{String(i+1).padStart(2, '0')}</span>
                               </div>
                               <span className={`text-[10px] font-bold uppercase tracking-widest ${r.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'}`}>{r.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
               </div>
            </Card>
          </div>

        </main>
      </div>

      <BottomSheetChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        input={mentorInput}
        onInputChange={setMentorInput}
        onSend={async () => {
          if (!mentorInput.trim()) return;
          const newMsgs = [...messages, { role: 'user' as const, content: mentorInput }];
          setMessages(newMsgs); setMentorInput(''); setIsMentorLoading(true);
          try {
            const res = await fetch('/api/mentor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ problemId, language, userMessage: mentorInput, history: newMsgs, userCode: code, problemTitle: dbProblem?.title, problemStatementMd: dbProblem?.statementMd }),
            });
            const data = await res.json();
            setMessages([...newMsgs, { role: 'assistant' as const, content: data.message }]);
            if (data.visualization) setCurrentVisualization(data.visualization);
          } catch (err) {
            setMessages([...newMsgs, { role: 'assistant' as const, content: 'Neural link interrupted. Please try again.' }]);
          } finally { setIsMentorLoading(false); }
        }}
        isLoading={isMentorLoading}
        blurBackdrop={true}
      />
    </div>
  );
}
