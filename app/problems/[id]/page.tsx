
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
  Play,
  Send,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Clock,
  MemoryStick,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { Markdown } from '@/components/Markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BottomSheetChat } from '@/components/BottomSheetChat';
import { VisualizationRenderer, AnimatedVisualization } from '@/components/VisualizationRenderer';
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
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'ai'>('ai');
  const [activeRightTab, setActiveRightTab] = useState<'editor' | 'testcases' | 'output'>('editor');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [code, setCode] = useState('// Initializing workspace...\n\nimport { AetherAuth } from \'@aether/core\';\n\nexport class SecurityArchitect {\n  private vault: ZkProofSystem;\n\n  constructor() {\n    this.vault = new ZkProofSystem({ entropy: \'quantum-void\' });\n  }\n\n  // Initialize the zero-knowledge handshake\n  async initiateHandshake(userId: string) {\n    const challenge = await this.vault.generateChallenge();\n\n    return new Promise((resolve) => {\n      AetherAuth.dispatch({\n        type: \'AUTH_PROTOCOL_V4\',\n        payload: { userId, challenge }\n      });\n    });\n  }\n}');
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

  // Handle visualization from AI response
  const handleMentorResponse = (data: any) => {
    if (data.visualization) {
      setCurrentVisualization(data.visualization);
    }
    if (data.architectReview) {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: `**Code Review: Grade ${data.architectReview.grade} (${data.architectReview.score}/100)**\n\n${data.architectReview.feedback}`,
      }]);
    }
  };

  // Click outside to close language dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
    setShowLangDropdown(false);
  };

  const runCode = async () => {
    if (!code.trim() || isRunning) return;
    setIsRunning(true);
    setActiveRightTab('output');
    setOutput('Running code...\n');

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          code,
          runAll: false, // Only run sample test cases
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
    setOutput('Submitting solution...\n');

    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          code,
          runAll: true, // Run all test cases including hidden
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
      }
    } catch (err) {
      setOutput(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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
        console.error('Mentor API error:', errData);
        setMessages([...newMessages, { role: 'assistant', content: errData.error ?? 'Something went wrong. Please try again.' }]);
        return;
      }
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.message ?? 'AI response unavailable' }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMessages, { role: 'assistant', content: 'Network error. Please try again.' }]);
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

            <div className="flex-1 overflow-y-auto px-16 py-12 scrollbar-hide">
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

                  {/* Visualization Section */}
                  {currentVisualization && (
                    <div className="mt-8 pt-8 border-t border-white/5">
                      <h3 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4">
                        Algorithm Visualization
                      </h3>
                      <VisualizationRenderer
                        type={currentVisualization.type}
                        data={currentVisualization.data}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-8 max-w-xl animate-in fade-in duration-500">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                      <Sparkles size={14} className="text-purple-400" />
                    </div>
                    <span className="text-[10px] font-bold tracking-[0.3em] text-purple-400 uppercase">AI MENTOR</span>
                  </div>

                  <div className="p-8 bg-[#0d0d10] border-l-2 border-purple-500/30 italic text-zinc-300 font-light text-lg">
                    "Click the AI button in the bottom right to open the mentor chat. I'll guide you without giving away the answer."
                  </div>

                  {messages.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[12px] text-zinc-500 uppercase tracking-wider">Recent Messages</p>
                      {messages.slice(-3).map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg text-[13px] ${
                            msg.role === 'user'
                              ? 'bg-purple-500/10 border border-purple-500/20 text-zinc-300'
                              : 'bg-[#111114] border border-white/5 text-zinc-400'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-zinc-600 uppercase block mb-1">
                            {msg.role === 'user' ? 'You' : 'AI'}
                          </span>
                          <div className="line-clamp-2">
                            <Markdown md={msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Mentor Floating Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="absolute bottom-8 right-8 w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 transition-all z-30"
            >
              <Sparkles size={24} className="text-white" />
            </button>
          </div>

          {/* Right Panel: Code Workspace */}
          <div className="w-1/2 flex flex-col bg-[#050505]">
             {/* Editor Header / Toolbar */}
             <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-[#0a0a0c]">
                {/* Left: Language Selector & Filename */}
                <div className="flex items-center gap-3">
                   {/* Language Dropdown */}
                   <div className="relative" ref={langDropdownRef}>
                      <button
                        onClick={() => setShowLangDropdown(!showLangDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#111114] border border-white/10 rounded-lg text-[12px] text-white hover:border-purple-500/30 transition-all"
                      >
                        <span>{LANGUAGE_CONFIG[language].label}</span>
                        <ChevronDown size={14} className={`transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showLangDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-[#111114] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                          {(Object.keys(LANGUAGE_CONFIG) as SupportedLanguage[]).map((lang) => (
                            <button
                              key={lang}
                              onClick={() => handleLanguageChange(lang)}
                              className={`w-full px-3 py-2 text-left text-[12px] hover:bg-white/5 transition-colors flex items-center justify-between ${
                                language === lang ? 'text-purple-400 bg-purple-500/10' : 'text-zinc-400'
                              }`}
                            >
                              <span>{LANGUAGE_CONFIG[lang].label}</span>
                              {language === lang && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      )}
                   </div>
                   <div className="h-6 w-px bg-white/10" />
                   <div className="flex items-center gap-2 text-white">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span className="text-[12px] font-medium tracking-wide">solution.{LANGUAGE_CONFIG[language].ext}</span>
                   </div>
                </div>

                {/* Center: Action Buttons */}
                <div className="flex items-center gap-3">
                   <button
                     onClick={runCode}
                     disabled={isRunning || !code.trim()}
                     className="flex items-center gap-2 px-4 py-2 bg-[#111114] border border-white/10 rounded-lg text-[12px] text-white hover:border-purple-500/30 hover:bg-purple-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isRunning ? (
                       <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     ) : (
                       <Play size={14} className="text-green-400" />
                     )}
                     <span>Run</span>
                   </button>
                   <button
                     onClick={submitCode}
                     disabled={isSubmitting || !code.trim()}
                     className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-[12px] text-purple-300 hover:bg-purple-500/30 hover:border-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isSubmitting ? (
                       <div className="w-3 h-3 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin" />
                     ) : (
                       <Send size={14} />
                     )}
                     <span>Submit</span>
                   </button>
                </div>

                {/* Right: Tab Navigation */}
                <div className="flex items-center">
                   <button
                     onClick={() => setActiveRightTab('editor')}
                     className={`px-4 py-2 text-[11px] font-medium tracking-wide transition-colors ${
                       activeRightTab === 'editor' ? 'text-white border-b-2 border-purple-400' : 'text-zinc-600 hover:text-zinc-400'
                     }`}
                   >
                     Code
                   </button>
                   <button
                     onClick={() => setActiveRightTab('testcases')}
                     className={`px-4 py-2 text-[11px] font-medium tracking-wide transition-colors ${
                       activeRightTab === 'testcases' ? 'text-white border-b-2 border-purple-400' : 'text-zinc-600 hover:text-zinc-400'
                     }`}
                   >
                     Test Cases
                   </button>
                   <button
                     onClick={() => setActiveRightTab('output')}
                     className={`px-4 py-2 text-[11px] font-medium tracking-wide transition-colors flex items-center gap-2 ${
                       activeRightTab === 'output' ? 'text-white border-b-2 border-purple-400' : 'text-zinc-600 hover:text-zinc-400'
                     }`}
                   >
                     Output
                     {testResults.length > 0 && (
                       <span className={`w-2 h-2 rounded-full ${
                         testResults.every(r => r.status === 'passed') ? 'bg-green-400' : 'bg-red-400'
                       }`} />
                     )}
                   </button>
                </div>
             </div>

             {/* Panel Content */}
             <div className="flex-1 overflow-hidden relative">
                {/* Code Editor Panel */}
                {activeRightTab === 'editor' && (
                  <div className="h-full">
                    <Editor
                      height="100%"
                      language={LANGUAGE_CONFIG[language].monacoLang}
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
                        padding: { top: 32 },
                        cursorStyle: 'block',
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                        contextmenu: false,
                      }}
                    />
                  </div>
                )}

                {/* Test Cases Panel */}
                {activeRightTab === 'testcases' && (
                  <div className="h-full overflow-y-auto p-6">
                    <div className="max-w-2xl">
                      <h3 className="text-[12px] font-bold tracking-widest text-zinc-500 uppercase mb-6">Test Cases</h3>
                      {dbProblem?.testCases && dbProblem.testCases.length > 0 ? (
                        <div className="space-y-4">
                          {dbProblem.testCases.filter(tc => tc.isSample).map((testCase, idx) => (
                            <div key={testCase.id} className="bg-[#0d0d10] border border-white/5 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-[12px] font-medium text-white">Sample Test Case {idx + 1}</span>
                                {testResults.find(r => r.testCaseId === testCase.id)?.status === 'passed' && (
                                  <Check size={14} className="text-green-400" />
                                )}
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Input:</span>
                                  <pre className="mt-1 p-2 bg-[#050505] rounded text-[12px] font-mono text-zinc-400 overflow-x-auto">{testCase.input}</pre>
                                </div>
                                <div>
                                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Expected:</span>
                                  <pre className="mt-1 p-2 bg-[#050505] rounded text-[12px] font-mono text-zinc-400 overflow-x-auto">{testCase.expected}</pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-zinc-600 text-[14px]">No test cases available for this problem.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Output Panel */}
                {activeRightTab === 'output' && (
                  <div className="h-full flex flex-col">
                    {/* Console Output */}
                    <div className="flex-1 p-6 overflow-y-auto">
                      <pre className="font-mono text-[13px] text-zinc-400 whitespace-pre-wrap">{output || 'Click "Run" to execute your code or "Submit" to test against all test cases.'}</pre>
                    </div>
                    {/* Test Results */}
                    {testResults.length > 0 && (
                      <div className="border-t border-white/5 p-4 max-h-1/2 overflow-y-auto">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[12px] font-bold tracking-widest text-zinc-500 uppercase">Results</span>
                          <span className="text-[12px] text-zinc-400">
                            {testResults.filter(r => r.status === 'passed').length}/{testResults.length} passed
                          </span>
                        </div>
                        <div className="space-y-2">
                          {testResults.map((result, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-3 rounded-lg text-[12px] ${
                                result.status === 'passed'
                                  ? 'bg-green-500/10 border border-green-500/20'
                                  : result.status === 'failed' || result.status === 'wrong_answer'
                                  ? 'bg-red-500/10 border border-red-500/20'
                                  : 'bg-yellow-500/10 border border-yellow-500/20'
                              }`}
                            >
                              {result.status === 'passed' ? (
                                <Check size={14} className="text-green-400" />
                              ) : result.status === 'failed' || result.status === 'wrong_answer' ? (
                                <X size={14} className="text-red-400" />
                              ) : (
                                <AlertCircle size={14} className="text-yellow-400" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">Test {idx + 1}</span>
                                  {result.executionTime && (
                                    <span className="text-zinc-500 flex items-center gap-1">
                                      <Clock size={10} />
                                      {result.executionTime}ms
                                    </span>
                                  )}
                                  {result.memory && (
                                    <span className="text-zinc-500 flex items-center gap-1">
                                      <MemoryStick size={10} />
                                      {result.memory}KB
                                    </span>
                                  )}
                                </div>
                                {result.status !== 'passed' && (
                                  <div className="mt-1 text-zinc-500 text-[11px]">
                                    {result.error || `Expected: ${result.expected}, Got: ${result.actual || 'N/A'}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
             </div>

             {/* Editor Footer / Status */}
             <div className="h-10 border-t border-white/5 flex items-center justify-between px-4 bg-[#050505]">
                <div className="flex items-center gap-4 text-[10px] font-bold tracking-widest text-zinc-600 uppercase">
                   <span>{LANGUAGE_CONFIG[language].label}</span>
                   <span className="text-zinc-500">UTF-8</span>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-600 uppercase">
                      {code.split('\n').length} lines
                   </div>
                   <div className="w-3 h-3 rounded-full bg-purple-500/40 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                   </div>
                </div>
             </div>
          </div>

        </main>
      </div>

      {/* Bottom Sheet AI Chat with Blur Backdrop */}
      <BottomSheetChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={messages}
        input={mentorInput}
        onInputChange={setMentorInput}
        onSend={async () => {
          if (!mentorInput.trim()) return;
          const newMessages = [...messages, { role: 'user' as const, content: mentorInput }];
          setMessages(newMessages);
          setMentorInput('');
          setIsMentorLoading(true);

          try {
            const res = await fetch('/api/mentor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                problemId,
                language,
                userMessage: mentorInput,
                history: newMessages,
                userCode: code,
                problemTitle: dbProblem?.title,
                problemStatementMd: dbProblem?.statementMd,
                problemConstraintsMd: dbProblem?.constraintsMd,
              }),
            });

            if (!res.ok) {
              const errData = await res.json();
              setMessages([...newMessages, { role: 'assistant' as const, content: errData.error ?? 'Something went wrong.' }]);
              return;
            }

            const data = await res.json();
            setMessages([...newMessages, { role: 'assistant' as const, content: data.message }]);

            // Handle visualization and architect review
            handleMentorResponse(data);
          } catch (err) {
            setMessages([...newMessages, { role: 'assistant' as const, content: 'Network error. Please try again.' }]);
          } finally {
            setIsMentorLoading(false);
          }
        }}
        isLoading={isMentorLoading}
        blurBackdrop={true}
      />
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
