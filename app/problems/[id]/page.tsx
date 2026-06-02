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
  Lightbulb,
  Lock,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavLink, SidebarLink, DifficultyBadge } from '@/components/ui/nav-link';
import { Markdown } from '@/components/Markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VisualizationRenderer } from '@/components/VisualizationRenderer';
import { TraceDebugger } from '@/components/TraceDebugger';
import { ExecutionTracePanel } from '@/components/trace/ExecutionTracePanel';
import { SeePlusPlusDebugger } from '@/components/SeePlusPlusDebugger';
import { DebugAnalysisPanel } from '@/components/DebugAnalysisPanel';
import { ArchitectReviewCard } from '@/components/ArchitectReviewCard';
import { InterventionIndicator, type InterventionType } from '@/components/InterventionIndicator';
import type { LastExecution, TestCaseView, InputShape } from '@/lib/mentor/lastExecution';

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

type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'cpp';

const LANGUAGE_CONFIG: Record<SupportedLanguage, { label: string; ext: string; monacoLang: string; executable: string }> = {
  typescript: { label: 'TypeScript', ext: 'ts', monacoLang: 'typescript', executable: 'javascript' },
  javascript: { label: 'JavaScript', ext: 'js', monacoLang: 'javascript', executable: 'javascript' },
  python: { label: 'Python', ext: 'py', monacoLang: 'python', executable: 'python' },
  java: { label: 'Java', ext: 'java', monacoLang: 'java', executable: 'java' },
  cpp: { label: 'C++', ext: 'cpp', monacoLang: 'cpp', executable: 'cpp' },
};

const DEFAULT_STARTER = `// Write your solution here\n\nfunction solution(input) {\n  // Your logic here\n}\n`;

function pickStarterCode(starterCode: Record<string, string> | undefined, lang: SupportedLanguage): string {
  if (!starterCode) return DEFAULT_STARTER;
  if (starterCode[lang]) return starterCode[lang];
  const fallbackOrder: SupportedLanguage[] = ['javascript', 'python', 'java', 'cpp', 'typescript'];
  for (const key of fallbackOrder) {
    if (starterCode[key]) return starterCode[key];
  }
  return DEFAULT_STARTER;
}

function normalizeProblemPayload(raw: Record<string, unknown>): Problem {
  const testCases = (raw.testCases ?? raw.publicTestCases ?? []) as Array<{
    id?: string;
    order: number;
    input: string;
    expected: string;
    isSample?: boolean;
  }>;

  return {
    id: raw.id as string,
    title: raw.title as string,
    slug: raw.slug as string,
    difficulty: raw.difficulty as Problem['difficulty'],
    statementMd: raw.statementMd as string,
    constraintsMd: (raw.constraintsMd as string | null) ?? null,
    hints: (raw.hints as string[]) ?? [],
    starterCode: (raw.starterCode as Record<string, string>) ?? {},
    testCases: testCases.map((tc, idx) => ({
      id: tc.id ?? `tc-${tc.order ?? idx}`,
      order: tc.order ?? idx,
      input: tc.input,
      expected: tc.expected,
      isSample: tc.isSample ?? true,
    })),
    patterns: (raw.patterns as Problem['patterns']) ?? [],
  };
}

/**
 * Renders an InputShape as a human-readable string for the page's hidden-
 * test row. Mirrors the prompt renderer's `describeInputShape` but is kept
 * as a local copy so the page has no runtime dependency on the prompt
 * module. Never emits raw input data.
 */
function describeInputShape(shape: InputShape): string {
  switch (shape.kind) {
    case 'int_array': {
      const parts: string[] = [`int array of ${shape.length} elements`];
      if (shape.sampledSorted === 'asc') parts.push('sorted asc');
      else if (shape.sampledSorted === 'desc') parts.push('sorted desc');
      if (shape.sampledDuplicates) parts.push('with duplicates');
      if (shape.sampledValueRange) {
        const [lo, hi] = shape.sampledValueRange;
        parts.push(`range ${lo}..${hi}`);
      }
      return parts.join(', ');
    }
    case 'string':
      return `text of ${shape.length} chars`;
    case 'matrix':
      return `${shape.rows}x${shape.cols} matrix`;
    case 'tree':
      return `tree with ${shape.nodes} nodes`;
    case 'graph':
      return `graph with ${shape.nodes} nodes, ${shape.edges} edges`;
    case 'list_of_pairs':
      return `list of ${shape.length} pairs`;
    case 'small_literal':
      // The shapeAnalyzer gates this for non-hidden inputs only, so this
      // branch is unreachable for hidden tests. Render a length proxy so
      // the literal value never appears in the UI.
      return `concrete value of ${shape.literal.length} chars`;
    case 'unknown':
      return `opaque input of ${shape.length} bytes`;
  }
}

type TestResult = TestCaseView;

type RunResult = {
  ok: boolean;
  results?: TestResult[];
  error?: string;
  compileError?: string;
  lastExecution?: LastExecution | null;
  codeHash?: string | null;
};

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: problemId } = React.use(params);
  const { data: session } = useSession();
  const [dbProblem, setDbProblem] = useState<Problem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problemLoading, setProblemLoading] = useState(true);
  const [mentorInput, setMentorInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; visualization?: any; architectReview?: any }>>([]);
  const [isMentorLoading, setIsMentorLoading] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState<'editor' | 'testcases' | 'output' | 'debugger' | 'analysis'>('editor');
  const [language, setLanguage] = useState<SupportedLanguage>('typescript');
  const [code, setCode] = useState(DEFAULT_STARTER);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [currentVisualization, setCurrentVisualization] = useState<{type: string; data: unknown} | null>(null);
  const [showTraceDebugger, setShowTraceDebugger] = useState(false);
  const [showDebugAnalysis, setShowDebugAnalysis] = useState(false);
  const [showArchitectReview, setShowArchitectReview] = useState(false);
  const [intervention, setIntervention] = useState<{type: InterventionType; message: string} | null>(null);
  const [hasOutput, setHasOutput] = useState(false);
  const [lastExecution, setLastExecution] = useState<LastExecution | null>(null);
  const [codeHash, setCodeHash] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setProblemLoading(true);
    setLoadError(null);

    fetch(`/api/problems/${problemId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.problem) {
          throw new Error(data.error || 'Problem not found');
        }
        if (cancelled) return;
        const problem = normalizeProblemPayload(data.problem);
        setDbProblem(problem);
        setCode(pickStarterCode(problem.starterCode, language));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load problem');
          setDbProblem(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProblemLoading(false);
      });

    return () => { cancelled = true; };
  }, [problemId]);

  useEffect(() => {
    if (dbProblem) {
      setCode(pickStarterCode(dbProblem.starterCode, language));
    }
  }, [language, dbProblem?.id]);

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
    if (!code.trim() || isRunning || !dbProblem) return;
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
          language: LANGUAGE_CONFIG[language].executable,
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
        setLastExecution(data.lastExecution ?? null);
        setCodeHash(data.codeHash ?? null);
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
    if (!code.trim() || isSubmitting || !dbProblem) return;
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
          language: LANGUAGE_CONFIG[language].executable,
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
        setLastExecution(data.lastExecution ?? null);
        setCodeHash(data.codeHash ?? null);
        const passed = data.results?.filter(r => r.status === 'passed').length || 0;
        const total = data.results?.length || 0;
        const allPassed = passed === total;
        setOutput(`${allPassed ? '✓ Accepted!' : '✗ Wrong Answer'}\n${passed}/${total} test cases passed\n${allPassed ? 'Congratulations! Your solution is correct.' : 'Some test cases failed. Review your code and try again.'}`);

        if (allPassed) {
          setShowArchitectReview(true);
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
      // The page sends the codeHash that the server returned with the most
      // recent execute response. The server recomputes the hash of the
      // incoming code and compares against `lastExecution.codeHash` for the
      // authoritative stale check; the page's stored value is a diagnostic
      // signal (mismatch indicates the user has edited since the last run,
      // or a page/server hashing bug).
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId,
          language,
          userCode: code,
          userMessage: content,
          history: newMessages,
          problemTitle: dbProblem?.title,
          problemStatementMd: dbProblem?.statementMd,
          problemConstraintsMd: dbProblem?.constraintsMd,
          publicTestCases: dbProblem?.testCases?.map(({ order, input, expected }) => ({ order, input, expected })),
          lastExecution,
          codeHash,
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
    <div className="flex h-screen bg-[#0b0b10] text-zinc-400 font-sans overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6 bg-[#0b0b10] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/problems" className="text-zinc-500 hover:text-white transition-colors shrink-0">
              <BookOpen size={18} />
            </Link>
            <span className="text-zinc-700">/</span>
            <span className="text-sm font-medium text-white truncate">{dbProblem?.title || (problemLoading ? 'Loading…' : 'Problem')}</span>
            {dbProblem?.difficulty && <DifficultyBadge difficulty={dbProblem.difficulty} />}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/dashboard" className="hidden sm:inline text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Dashboard</Link>
            <Avatar className="w-8 h-8 border border-white/10">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback className="bg-zinc-800 text-xs">{session?.user?.name?.[0] ?? 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 flex overflow-hidden min-h-0">

          {/* Left: Problem + Mentor */}
          <div className="w-full lg:w-[42%] flex flex-col border-r border-white/[0.06] bg-[#0b0b10] relative min-h-0">
            <div className={`flex-1 overflow-y-auto px-5 lg:px-8 py-6 custom-scrollbar flex flex-col transition-opacity ${isChatExpanded ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="space-y-6">
                {loadError ? (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
                    <AlertCircle size={24} className="text-rose-400 mx-auto mb-3" />
                    <p className="text-rose-300 text-sm mb-3">{loadError}</p>
                    <Link href="/problems" className="text-sm text-violet-400 hover:underline">Back to curriculum</Link>
                  </div>
                ) : problemLoading ? (
                  <div className="space-y-3 animate-pulse">
                    <div className="h-6 bg-white/5 rounded w-2/3" />
                    <div className="h-4 bg-white/5 rounded w-full" />
                    <div className="h-4 bg-white/5 rounded w-5/6" />
                  </div>
                ) : dbProblem ? (
                  <>
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest text-violet-400/80 uppercase mb-2">Problem</p>
                      <h1 className="text-xl lg:text-2xl font-bold text-white leading-snug">{dbProblem.title}</h1>
                      {dbProblem.patterns && dbProblem.patterns.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {dbProblem.patterns.map(p => (
                            <span key={p.id} className="text-[10px] px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-[#0f0f14] p-5 text-sm text-zinc-300 leading-relaxed prose-invert max-w-none">
                      <Markdown md={dbProblem.statementMd} />
                    </div>

                    {dbProblem.constraintsMd && (
                      <div className="rounded-xl border border-white/[0.06] bg-[#0f0f14] p-5">
                        <p className="text-[10px] font-semibold tracking-widest text-zinc-500 uppercase mb-3">Constraints</p>
                        <div className="text-sm text-zinc-400 leading-relaxed">
                          <Markdown md={dbProblem.constraintsMd} />
                        </div>
                      </div>
                    )}

                    {dbProblem.hints.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                        <p className="text-[10px] font-semibold tracking-widest text-amber-400/80 uppercase mb-3 flex items-center gap-2">
                          <Lightbulb size={12} /> Hints
                        </p>
                        <div className="space-y-3">
                          {dbProblem.hints.map((hint, idx) => (
                            <div key={idx} className="text-sm text-zinc-400 border-l-2 border-amber-500/30 pl-3">
                              <Markdown md={hint} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}

                {currentVisualization && (
                  <VisualizationRenderer type={currentVisualization.type} data={currentVisualization.data} />
                )}
              </div>
            </div>

            {/* AI Mentor drawer */}
            <motion.div
              initial={false}
              animate={{ height: isChatExpanded ? '70%' : '120px' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-[#0f0f14] border-t border-white/[0.08] flex flex-col z-20"
            >
              <button
                type="button"
                onClick={() => setIsChatExpanded(!isChatExpanded)}
                className="flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.02] transition-colors shrink-0"
              >
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-violet-400" />
                  AI Mentor
                </span>
                <span className="text-[10px] text-zinc-500">{isChatExpanded ? 'Collapse' : 'Expand'}</span>
              </button>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {messages.length === 0 && !isMentorLoading && (
                      <p className="text-sm text-zinc-600 text-center py-8">
                        Ask for hints, edge cases, or approach guidance. The mentor sees your current code.
                      </p>
                    )}
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-violet-600/20 border border-violet-500/20 text-zinc-200'
                            : 'bg-[#0b0b10] border border-white/[0.06] text-zinc-400'
                        }`}>
                          <Markdown md={msg.content} />
                          {msg.visualization && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <VisualizationRenderer type={msg.visualization.type} data={msg.visualization.data} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {isMentorLoading && (
                      <div className="flex items-center gap-2 text-zinc-600 text-xs pl-1">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-violet-400 rounded-full animate-spin" />
                        Thinking…
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/[0.06] shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={mentorInput}
                    onChange={(e) => setMentorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMentorMessage(mentorInput)}
                    onFocus={() => setIsChatExpanded(true)}
                    placeholder="Ask the mentor…"
                    className="w-full rounded-xl bg-[#0b0b10] border border-white/[0.08] px-4 py-3 pr-12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40"
                  />
                  <button
                    onClick={() => sendMentorMessage(mentorInput)}
                    disabled={isMentorLoading || !mentorInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-zinc-500 hover:text-violet-400 disabled:opacity-40 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

           {/* Right: Editor workspace */}
           <div className="hidden lg:flex flex-1 flex-col bg-[#08080c] min-h-0">
              <div className="h-12 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[#0b0b10] shrink-0">
                  <div className="flex items-center gap-1">
                        {(['editor', 'testcases', 'output', 'debugger', 'analysis'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => {
                              setActiveRightTab(tab);
                              if (tab === 'debugger') setShowTraceDebugger(true);
                              if (tab === 'analysis') setShowDebugAnalysis(true);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                              activeRightTab === tab
                                ? 'bg-white/10 text-white'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {tab === 'testcases' ? 'Tests' : tab === 'debugger' ? 'Trace' : tab === 'analysis' ? 'Analyze' : tab}
                          </button>
                        ))}
                     </div>
                     <div className="flex items-center gap-3">
                     <select
                       value={language}
                       onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                       className="rounded-lg bg-[#0f0f14] border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-400 outline-none focus:border-violet-500/40"
                     >
                       {Object.entries(LANGUAGE_CONFIG).map(([key, cfg]) => (
                         <option key={key} value={key} className="bg-[#121214]">{cfg.label}</option>
                       ))}
                     </select>
                  </div>
              </div>

              {/* Architect Review Overlay */}
              {showArchitectReview && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-8 overflow-y-auto"
                     onClick={() => setShowArchitectReview(false)}>
                  <div className="max-w-xl w-full" onClick={e => e.stopPropagation()}>
                    <ArchitectReviewCard
                      code={code}
                      language={LANGUAGE_CONFIG[language].executable}
                      problemId={problemId}
                      problemTitle={dbProblem?.title}
                      autoTrigger
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
                              <span className="text-rose-400 font-bold text-lg font-mono">{testResults.filter(r => r.status === 'wrong_answer').length}</span>
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
                          {testResults.map((r, i) => {
                            const isPassed = r.status === 'passed';
                            const isWrong = r.status === 'wrong_answer';
                            const borderClass = isPassed
                              ? 'border-emerald-500/20 hover:border-emerald-500/30'
                              : isWrong
                                ? 'border-rose-500/20 hover:border-rose-500/30'
                                : 'border-amber-500/20 hover:border-amber-500/30';
                            const pillClass = isPassed
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                              : isWrong
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/20';
                            return (
                              <div key={r.testCaseId} className={`glass-card rounded-2xl border p-6 transition-all hover:-translate-y-0.5 duration-200 ${borderClass}`}>
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    {r.isHidden && <Lock size={14} className="text-zinc-600" aria-label="hidden test" />}
                                    {isPassed ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                                     isWrong ? <XCircle size={16} className="text-rose-400" /> :
                                     <AlertCircle size={16} className="text-amber-400" />}
                                    <span className="text-sm font-bold text-white uppercase tracking-wider">Case 0{i + 1}</span>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${pillClass}`}>
                                      {r.isHidden ? `Hidden · ${r.status.replace(/_/g, ' ')}` : r.status.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-600 font-mono">{r.executionTime}ms</span>
                                </div>
                                {r.kind === 'concrete' ? (
                                  <>
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
                                    {r.status !== 'passed' && (
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
                                  </>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2 text-xs">
                                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/40 border border-white/5">
                                      <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">Input</span>
                                      <span className="text-zinc-400 font-mono">{describeInputShape(r.inputShape)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/40 border border-emerald-500/10">
                                      <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">Expected</span>
                                      <span className="text-emerald-400/70 font-mono">{r.expectedShape}</span>
                                    </div>
                                    {r.status !== 'passed' && (
                                      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/40 border border-rose-500/20">
                                        <span className="text-[9px] text-rose-700 uppercase tracking-widest font-bold">Got</span>
                                        <span className="text-rose-400/70 font-mono">{r.actualShape}</span>
                                      </div>
                                    )}
                                    {r.error && (
                                      <div className="mt-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                                        <span className="text-[9px] text-rose-400 uppercase tracking-widest font-bold">Error</span>
                                        <pre className="mt-1.5 text-xs font-mono text-rose-300/70">{r.error}</pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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
                      {dbProblem?.testCases && dbProblem.testCases.length > 0 ? (
                        dbProblem.testCases.map((tc, idx) => (
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
                      ))
                      ) : (
                        <div className="text-center py-12 text-zinc-600">
                          {problemLoading ? 'Loading test cases...' : 'No sample test cases available for this problem.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit/Run Controls — hidden during debugger/analysis */}
                {(activeRightTab === 'editor' || activeRightTab === 'testcases' || activeRightTab === 'output') && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2">
                   <button
                     onClick={runCode}
                     disabled={isRunning || !dbProblem || !!loadError}
                     className="px-4 py-2 rounded-lg border border-white/[0.1] bg-[#0f0f14] text-sm font-medium text-zinc-300 hover:bg-white/[0.05] disabled:opacity-40 flex items-center gap-2"
                   >
                     {isRunning ? <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-violet-400 rounded-full animate-spin" /> : <Play size={14} />}
                     Run
                   </button>
                   <button
                     onClick={submitCode}
                     disabled={isSubmitting || !dbProblem || !!loadError}
                     className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white disabled:opacity-40"
                   >
                     {isSubmitting ? 'Submitting…' : 'Submit'}
                   </button>
                </div>
                )}
             </div>

              <div className="h-9 border-t border-white/[0.06] flex items-center justify-between px-4 text-[10px] text-zinc-600 font-mono shrink-0">
                 <span>L{code.split('\n').length} · {code.length} chars · {language}</span>
                 {hasOutput && activeRightTab !== 'output' && (
                   <button type="button" onClick={() => setActiveRightTab('output')} className="text-violet-400 hover:text-violet-300">
                     View output
                   </button>
                 )}
              </div>
          </div>

        </main>
     </div>
     </div>
  );
}
