'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Terminal,
  Play,
  Send,
  BookOpen,
  X,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Lightbulb,
  Lock,
  User,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { DifficultyBadge } from '@/components/ui/nav-link';
import { Markdown } from '@/components/Markdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VisualizationRenderer } from '@/components/VisualizationRenderer';
import { ExecutionTracePanel } from '@/components/trace/ExecutionTracePanel';
import { DebugAnalysisPanel } from '@/components/DebugAnalysisPanel';
import { ArchitectReviewCard } from '@/components/ArchitectReviewCard';
import { useKnowledgeGraphTracker } from '@/hooks/useKnowledgeGraphTracker';
import type { LastExecution, TestCaseView, InputShape } from '@/lib/mentor/lastExecution';

type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  statementMd: string;
  constraintsMd: string | null;
  hints: string[];
  starterCode?: Record<string, string>;
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

async function safeJsonParse(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Server returned non-JSON response (HTTP ${res.status})` };
  }
}

function pickStarterCode(starterCode: Record<string, string> | undefined, lang: SupportedLanguage): string {
  if (!starterCode) return DEFAULT_STARTER;
  if (starterCode[lang]) return starterCode[lang];
  const fallbackOrder: SupportedLanguage[] = ['javascript', 'python', 'java', 'cpp', 'typescript'];
  for (const key of fallbackOrder) {
    if (starterCode[key]) return starterCode[key];
  }
  return DEFAULT_STARTER;
}

/**
 * Format the first non-passed test's actual output for the Output panel.
 * Shows `actual` (what the program printed) vs `expected`, plus the
 * raw stderr if the test crashed. Hidden tests only show shape info,
 * never raw input/expected.
 */
function buildOutputBlock(
  firstFailing: { isHidden?: boolean; status?: string; actual?: string; expected?: string; error?: string; input?: string },
  _allResults: unknown[],
  passed: number,
  total: number,
): string {
  const parts: string[] = [];
  const isHidden = !!firstFailing.isHidden;
  const actual = (firstFailing.actual ?? '').toString();
  const expected = (firstFailing.expected ?? '').toString();
  const error = (firstFailing.error ?? '').toString();
  const status = (firstFailing.status ?? '').toString();

  if (isHidden) {
    parts.push(`\nFirst failing test: hidden — view details in the Test Results tab.`);
    if (status) parts.push(`Status: ${status}`);
    if (error) parts.push(`Error: ${truncate(error, 300)}`);
    return parts.join('\n');
  }

  parts.push(`\n--- First failing test ---`);
  if (status === 'runtime_error' || status === 'compile_error' || status === 'time_limit_exceeded' || status === 'output_limit_exceeded') {
    parts.push(`Status: ${status}`);
    if (error) parts.push(`Error: ${truncate(error, 600)}`);
  }
  if (actual || status === 'passed') {
    parts.push(`Your output:`);
    parts.push(truncate(actual, 1000) || '(empty)');
  }
  if (expected) {
    parts.push(`Expected:`);
    parts.push(truncate(expected, 1000));
  }
  if (actual && expected && actual !== expected) {
    parts.push(`Diff: ${truncate(simpleDiff(actual, expected), 600)}`);
  }
  if (passed === total && total > 0) {
    parts.push(`\nAll ${total} tests passed.`);
  }
  return parts.join('\n');
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + `\n[...truncated ${s.length - n} chars]`;
}

function simpleDiff(a: string, b: string): string {
  // Cheap character-level diff for short strings; not a Myers algorithm,
  // just enough to highlight the first divergence so the user can see
  // what went wrong without scrolling.
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ctxStart = Math.max(0, i - 20);
  return `... first diff at column ${i + 1}\n  got:      …${a.slice(ctxStart, i + 30)}…\n  expected: …${b.slice(ctxStart, i + 30)}…`;
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
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; visualization?: {type: string; data: unknown}; architectReview?: unknown }>>([]);
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
  const [showArchitectReview, setShowArchitectReview] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [hasOutput, setHasOutput] = useState(false);
  const [lastExecution, setLastExecution] = useState<LastExecution | null>(null);
  const [codeHash, setCodeHash] = useState<string | null>(null);
  const [lastSubmitResult, setLastSubmitResult] = useState<{
    passed: boolean;
    testResults: TestCaseView[];
    runtime: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setProblemLoading(true);
    setLoadError(null);

    fetch(`/api/problems/${problemId}`)
      .then(async (res) => {
        const data = await safeJsonParse(res);
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
  }, [problemId, language]);

  useEffect(() => {
    if (session?.user?.id && problemId) {
      fetch(`/api/mentor/history?problemId=${problemId}`)
        .then(async (res) => {
          const data = await safeJsonParse(res);
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

  const kgParams = useMemo(() => {
    if (!dbProblem || !lastSubmitResult) {
      return { userId: undefined, problemContext: null, executionStats: null };
    }
    return {
      userId: session?.user?.id,
      problemContext: {
        problemId: dbProblem.id,
        concepts: dbProblem.patterns?.map((p) => p.name) ?? [],
        patterns: [],
        difficulty: dbProblem.difficulty,
      },
      executionStats: {
        passed: lastSubmitResult.passed,
        testResults: lastSubmitResult.testResults.map((r) => ({
          passed: r.status === 'passed',
          input: r.kind === 'concrete' ? r.input : '',
          expected: r.kind === 'concrete' ? r.expected : '',
          actual: r.kind === 'concrete' ? r.actual : '',
        })),
        runtime: lastSubmitResult.runtime,
      },
    };
  }, [dbProblem, session?.user?.id, lastSubmitResult]);
  useKnowledgeGraphTracker(kgParams);

  const handleMentorResponse = (data: { visualization?: {type: string; data: unknown}; architectReview?: unknown }) => {
    if (data.visualization) {
      setCurrentVisualization(data.visualization);
    }
    if (data.architectReview) {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: `**Code Review: Grade (Audit Received)**`,
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
      const data: RunResult = await safeJsonParse(res);

      if (!res.ok || !data.ok) {
        setOutput(`Error: ${data.error || 'Failed to run code'}\n${data.compileError || ''}`);
        setTestResults([]);
      } else {
        setTestResults(data.results || []);
        setLastExecution(data.lastExecution ?? null);
        setCodeHash(data.codeHash ?? null);
        const results = data.results || [];
        const passed = results.filter(r => r.status === 'passed').length;
        const total = results.length;
        // Surface the actual stdout from the first non-passed test (or
        // the first test if all passed) so the user can see what their
        // program actually printed. Previously this was overwritten with
        // a generic "Run completed" line and the stdout was lost.
        const firstFailing = results.find(r => r.status !== 'passed') || results[0];
        const stdoutBlock = firstFailing
          ? buildOutputBlock(firstFailing, results, passed, total)
          : '';
        setOutput(`✓ Run completed\n${passed}/${total} test cases passed\n${stdoutBlock}`);
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
      const data: RunResult = await safeJsonParse(res);

      if (!res.ok || !data.ok) {
        setOutput(`Submission failed: ${data.error || 'Unknown error'}\n${data.compileError || ''}`);
        setTestResults([]);
      } else {
        setTestResults(data.results || []);
        setLastExecution(data.lastExecution ?? null);
        setCodeHash(data.codeHash ?? null);
        const results = data.results || [];
        const passed = results.filter(r => r.status === 'passed').length;
        const total = results.length;
        const allPassed = passed === total;
        const firstFailing = results.find(r => r.status !== 'passed') || results[0];
        const stdoutBlock = firstFailing
          ? buildOutputBlock(firstFailing, results, passed, total)
          : '';
        setOutput(`${allPassed ? '✓ Accepted!' : '✗ Wrong Answer'}\n${passed}/${total} test cases passed\n${allPassed ? 'Congratulations! Your solution is correct.' : 'Some test cases failed. Review your code and try again.'}\n${stdoutBlock}`);

        if (allPassed) {
          setShowArchitectReview(true);
        }

        const maxRuntime = results.reduce((m, r) => Math.max(m, r.executionTime), 0);
        setLastSubmitResult({
          passed: allPassed,
          testResults: results,
          runtime: maxRuntime,
        });
      }
    } catch (err) {
      setOutput(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendMentorMessage = async (content: string) => {
    if (!content.trim()) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const newMessages = [...messages, { role: 'user', content } as const];
    setMessages(newMessages);
    setMentorInput('');
    setIsMentorLoading(true);
    setIsStreaming(true);
    setIsChatExpanded(true);
    setStreamingMessage('');

    try {
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
        signal: controller.signal,
      });

      if (!res.ok) {
        if (controller.signal.aborted) return;
        const errData = await safeJsonParse(res);
        setMessages([...newMessages, { role: 'assistant', content: errData.error ?? 'Something went wrong. Please try again.' }]);
        return;
      }

      if (!res.body) {
        setMessages([...newMessages, { role: 'assistant', content: 'No response stream received.' }]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';
      let lastUpdate = 0;
      const THROTTLE_MS = 50;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('event: error')) {
              const nextLine = lines[lines.indexOf(line) + 1];
              if (nextLine?.startsWith('data: ')) {
                try {
                  const errPayload = JSON.parse(nextLine.slice(6));
                  if (!controller.signal.aborted) {
                    setMessages([...newMessages, { role: 'assistant', content: errPayload.error ?? 'Mentor error.' }]);
                  }
                } catch { /* ignored */ }
              }
              break;
            }

            if (line.startsWith('event: delta')) {
              const nextLine = lines[lines.indexOf(line) + 1];
              if (nextLine?.startsWith('data: ')) {
                try {
                  const payload = JSON.parse(nextLine.slice(6));
                  if (payload.token) {
                    fullMessage += payload.token;
                    const now = Date.now();
                    if (now - lastUpdate >= THROTTLE_MS) {
                      setStreamingMessage(fullMessage);
                      lastUpdate = now;
                    }
                  }
                } catch { /* ignored */ }
              }
            }

            if (line.startsWith('event: done')) {
              const nextLine = lines[lines.indexOf(line) + 1];
              if (nextLine?.startsWith('data: ')) {
                try {
                  const payload = JSON.parse(nextLine.slice(6));
                  setStreamingMessage(fullMessage);
                  setIsStreaming(false);

                  const assistantMsg = {
                    role: 'assistant' as const,
                    content: payload.message ?? fullMessage ?? 'AI response unavailable',
                    visualization: payload.visualization,
                  };
                  setStreamingMessage('');
                  setMessages([...newMessages, assistantMsg]);
                  handleMentorResponse(payload);
                } catch { /* ignored */ }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStreamingMessage('');
        setIsStreaming(false);
        return;
      }
      setMessages([...newMessages, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setIsMentorLoading(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-zinc-400 font-sans overflow-hidden selection:bg-violet-500/30">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-white/[0.05] flex items-center justify-between px-4 lg:px-8 bg-black/80 backdrop-blur-md shrink-0 z-50">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/problems" className="text-zinc-500 hover:text-white transition-all hover:scale-110 shrink-0">
              <BookOpen size={18} strokeWidth={1.5} />
            </Link>
            <span className="text-zinc-800">/</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white tracking-tight truncate">{dbProblem?.title || (problemLoading ? 'Loading…' : 'Problem')}</span>
              {dbProblem?.difficulty && <DifficultyBadge difficulty={dbProblem.difficulty} />}
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <Link href="/dashboard" className="hidden sm:inline text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors">Dashboard</Link>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <Avatar className="w-8 h-8 border border-white/10 ring-2 ring-white/5 ring-offset-2 ring-offset-black">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback className="bg-zinc-900 text-[10px] font-bold text-zinc-400">{session?.user?.name?.[0] ?? 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 flex overflow-hidden min-h-0">

          {/* Left: Problem + Mentor */}
          <div className="w-full lg:w-[42%] flex flex-col border-r border-white/[0.05] bg-black relative min-h-0 overflow-hidden">
            {/* Background luxury glow */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
              <div className="absolute bottom-[20%] right-[-10%] w-[30%] h-[30%] bg-emerald-600/5 blur-[100px] rounded-full" />
            </div>

            <div className={`flex-1 overflow-y-auto px-8 lg:px-12 py-12 custom-scrollbar flex flex-col transition-all duration-700 relative z-10 ${isChatExpanded ? 'opacity-10 blur-xl pointer-events-none scale-[0.96]' : ''}`}>
              <div className="space-y-12">
                {loadError ? (
                  <div className="rounded-[2.5rem] border border-rose-500/20 bg-rose-500/5 p-12 text-center backdrop-blur-md shadow-2xl">
                    <AlertCircle size={48} strokeWidth={1} className="text-rose-500/40 mx-auto mb-6" />
                    <p className="text-rose-200 text-lg font-medium mb-6 tracking-tight">{loadError}</p>
                    <Link href="/problems" className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-violet-400 hover:text-white transition-all">
                      REVERT_TO_CURRICULUM <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ) : problemLoading ? (
                  <div className="space-y-10 animate-pulse">
                    <div className="space-y-4">
                      <div className="h-2 bg-white/5 rounded-full w-32" />
                      <div className="h-12 bg-white/5 rounded-2xl w-3/4" />
                    </div>
                    <div className="h-64 bg-white/5 rounded-[2.5rem] w-full" />
                    <div className="h-32 bg-white/5 rounded-[2rem] w-full" />
                  </div>
                ) : dbProblem ? (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <span className="w-10 h-px bg-gradient-to-r from-violet-500/60 to-transparent" />
                           <p className="text-[11px] font-black tracking-[0.5em] text-violet-400/80 uppercase">MODULE_v2.0.{dbProblem.id.slice(-2)}</p>
                         </div>
                         <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">System_Verified</span>
                         </div>
                      </div>
                      <h1 className="text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-[-0.04em] py-2 bg-gradient-to-br from-white via-white to-zinc-600 bg-clip-text text-transparent">
                        {dbProblem.title}
                      </h1>
                      {dbProblem.patterns && dbProblem.patterns.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {dbProblem.patterns.map(p => (
                            <span key={p.id} className="text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-500 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/5 transition-all cursor-default backdrop-blur-md shadow-lg">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-[3rem] border border-white/[0.1] bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] relative overflow-hidden group"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-500/10 to-transparent pointer-events-none" />
                      
                      <div className="relative z-10 space-y-6">
                        <Markdown md={dbProblem.statementMd} />
                      </div>
                    </motion.div>

                    {dbProblem.constraintsMd && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-[2.5rem] border border-white/[0.05] bg-white/[0.01] p-10 relative group hover:border-white/10 transition-colors"
                      >
                        <div className="text-[11px] font-black tracking-[0.4em] text-zinc-600 uppercase mb-8 flex items-center gap-4">
                           <div className="w-2 h-2 rounded-full border border-zinc-700 group-hover:border-zinc-500 transition-colors" />
                           CORE_CONSTRAINTS
                        </div>
                        <div className="bg-black/60 p-8 rounded-[2rem] border border-white/[0.04] shadow-inner group-hover:bg-black/40 transition-colors">
                          <Markdown md={dbProblem.constraintsMd} />
                        </div>
                      </motion.div>
                    )}

                    {dbProblem.hints.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-[2.5rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] to-transparent p-10 relative overflow-hidden group"
                      >
                        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-amber-500/5 blur-[60px] rounded-full group-hover:bg-amber-500/10 transition-all" />
                        <div className="text-[11px] font-black tracking-[0.4em] text-amber-500/60 uppercase mb-8 flex items-center gap-4">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                             <Lightbulb size={16} strokeWidth={2} className="text-amber-500/80" />
                          </div>
                          HEURISTIC_GUIDANCE
                        </div>
                        <div className="space-y-6">
                          {dbProblem.hints.map((hint, idx) => (
                            <div key={idx} className="relative pl-8 group/hint">
                              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/20 group-hover/hint:bg-amber-500/40 transition-colors" />
                              <div className="text-lg text-zinc-400 group-hover/hint:text-zinc-200 transition-colors italic">
                                <Markdown md={hint} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </>
                ) : null}

                {currentVisualization && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-[3rem] overflow-hidden border border-white/[0.08] shadow-[0_50px_100px_-30px_rgba(0,0,0,1)] bg-black/60 backdrop-blur-md p-1"
                  >
                    <div className="bg-black rounded-[2.8rem] overflow-hidden">
                       <VisualizationRenderer type={currentVisualization.type} data={currentVisualization.data} />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* AI Mentor drawer */}
            <motion.div
              initial={false}
              animate={{ height: isChatExpanded ? '75%' : '140px' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-2xl border-t border-white/[0.08] flex flex-col z-40 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
            >
              <button
                type="button"
                onClick={() => setIsChatExpanded(!isChatExpanded)}
                className="flex items-center justify-between px-8 py-5 text-left hover:bg-white/[0.02] transition-colors shrink-0 group"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
                  <div className="relative">
                    <Sparkles size={14} className="text-violet-400" />
                    <div className="absolute inset-0 blur-sm bg-violet-400/50 animate-pulse" />
                  </div>
                  AI Mentor
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1 h-3 items-end">
                    {[0.6, 0.4, 0.8].map((o, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: ['40%', '100%', '40%'] }}
                        transition={{ repeat: Infinity, duration: 1 + i * 0.2, ease: "easeInOut" }}
                        className="w-0.5 bg-violet-500/40 rounded-full"
                        style={{ height: `${o * 100}%` }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    {isChatExpanded ? 'Close Assistant' : 'Get Assistance'}
                  </span>
                </div>
              </button>

              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {messages.length === 0 && !isMentorLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 px-6"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mx-auto mb-4">
                          <Brain size={20} className="text-zinc-600" />
                        </div>
                        <p className="text-[13px] text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
                          Analyze approach, request hints, or discuss edge cases. The mentor tracks your live code.
                        </p>
                      </motion.div>
                    )}
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-[2.5rem] px-8 py-6 text-[16px] leading-[1.6] shadow-2xl transition-all ${
                          msg.role === 'user'
                            ? 'bg-violet-600/10 border border-violet-500/20 text-zinc-100'
                            : 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 backdrop-blur-md'
                        }`}>
                          <div className="flex items-center gap-3 mb-4 opacity-50">
                             {msg.role === 'user' ? <User size={12} /> : <Brain size={12} />}
                             <span className="text-[10px] font-black tracking-[0.2em] uppercase">{msg.role === 'user' ? 'Client_Input' : 'Architect_Response'}</span>
                          </div>
                          <Markdown md={msg.content} />
                          {msg.visualization && (
                            <div className="mt-8 pt-8 border-t border-white/5">
                              <VisualizationRenderer type={msg.visualization.type} data={msg.visualization.data} />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {isStreaming && streamingMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="max-w-[85%] rounded-[2.5rem] px-8 py-6 text-[16px] leading-[1.6] bg-white/[0.04] border border-white/[0.08] text-zinc-300 backdrop-blur-md shadow-2xl">
                          <div className="flex items-center gap-3 mb-4 opacity-50">
                             <Brain size={12} />
                             <span className="text-[10px] font-black tracking-[0.2em] uppercase text-violet-400 animate-pulse">Stream_Synchronizing…</span>
                          </div>
                          <Markdown md={streamingMessage} />
                          <span className="inline-block w-[2px] h-5 bg-violet-400 ml-1 animate-pulse align-middle" />
                        </div>
                      </motion.div>
                    )}
                    {isMentorLoading && !isStreaming && (
                      <div className="flex items-center gap-3 text-zinc-500 text-[11px] font-bold uppercase tracking-widest pl-2">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0s' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        CONSULTING ENGINE…
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="px-6 py-5 border-t border-white/[0.05] shrink-0 bg-black/40">
                <div className="relative group">
                  <input
                    type="text"
                    value={mentorInput}
                    onChange={(e) => setMentorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMentorMessage(mentorInput)}
                    onFocus={() => setIsChatExpanded(true)}
                    placeholder="Describe your blocker…"
                    className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.08] px-6 py-4 pr-14 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-all"
                  />
                  <button
                    onClick={() => sendMentorMessage(mentorInput)}
                    disabled={isMentorLoading || !mentorInput.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-violet-600/10 text-violet-400 hover:bg-violet-600 hover:text-white disabled:opacity-20 transition-all duration-300 shadow-lg"
                  >
                    <Send size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

           {/* Right: Editor workspace */}
           <div className="hidden lg:flex flex-1 flex-col bg-black min-h-0 relative">
              <div className="h-14 border-b border-white/[0.05] flex items-center justify-between px-6 bg-black shrink-0 z-10">
                  <div className="flex items-center gap-1">
                        {(['editor', 'testcases', 'output', 'debugger', 'analysis'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveRightTab(tab)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all ${
                              activeRightTab === tab
                                ? 'bg-white/10 text-white shadow-lg'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {tab === 'testcases' ? 'Testsuite' : tab === 'debugger' ? 'Trace' : tab === 'analysis' ? 'Analyze' : tab}
                          </button>
                        ))}
                     </div>
                     <div className="flex items-center gap-4">
                     <select
                       value={language}
                       onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                       className="rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400 outline-none focus:border-violet-500/40 cursor-pointer hover:bg-white/[0.05] transition-all"
                     >
                       {Object.entries(LANGUAGE_CONFIG).map(([key, cfg]) => (
                         <option key={key} value={key} className="bg-zinc-950 text-zinc-300">{cfg.label}</option>
                       ))}
                     </select>
                  </div>
              </div>

              {/* Architect Review Overlay */}
              <AnimatePresence>
                {showArchitectReview && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-start justify-center p-8 overflow-y-auto"
                    onClick={() => setShowArchitectReview(false)}
                  >
                    <motion.div
                      initial={{ scale: 0.95, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.95, y: 20 }}
                      className="max-w-2xl w-full"
                      onClick={e => e.stopPropagation()}
                    >
                      <ArchitectReviewCard
                        code={code}
                        language={LANGUAGE_CONFIG[language].executable}
                        problemId={problemId}
                        problemTitle={dbProblem?.title}
                        autoTrigger
                        onClose={() => setShowArchitectReview(false)}
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden relative">
                {activeRightTab === 'debugger' ? (
                  <div className="h-full overflow-y-auto bg-black custom-scrollbar">
                    <ExecutionTracePanel
                      code={code}
                      language={language}
                      defaultInput={dbProblem?.testCases?.[0]?.input}
                    />
                  </div>
                ) : activeRightTab === 'analysis' ? (
                  <div className="h-full overflow-y-auto bg-black custom-scrollbar">
                    <DebugAnalysisPanel code={code} language={language} />
                  </div>
                ) : activeRightTab === 'output' ? (
                  <div className="h-full overflow-y-auto bg-black/40 custom-scrollbar">
                    <div className="p-12 space-y-10">
                      <h3 className="text-[11px] font-bold tracking-[0.4em] text-zinc-600 uppercase flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                        SYSTEM_OUTPUT_LOG
                      </h3>
                      {testResults.length > 0 ? (
                        <div className="space-y-6">
                          {/* Summary */}
                          <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-8 flex items-center justify-around backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Passed</span>
                              <div className="flex items-center gap-3">
                                <CheckCircle2 size={24} className="text-emerald-500/80" />
                                <span className="text-white font-bold text-3xl font-mono">{testResults.filter(r => r.status === 'passed').length}</span>
                              </div>
                            </div>
                            <div className="w-px h-12 bg-white/5" />
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Failed</span>
                              <div className="flex items-center gap-3">
                                <XCircle size={24} className="text-rose-500/80" />
                                <span className="text-white font-bold text-3xl font-mono">{testResults.filter(r => r.status === 'wrong_answer').length}</span>
                              </div>
                            </div>
                            <div className="w-px h-12 bg-white/5" />
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Errors</span>
                              <div className="flex items-center gap-3">
                                <AlertCircle size={24} className="text-amber-500/80" />
                                <span className="text-white font-bold text-3xl font-mono">{testResults.filter(r => r.status === 'runtime_error' || r.status === 'time_limit_exceeded' || r.status === 'compile_error' || r.status === 'output_limit_exceeded').length}</span>
                              </div>
                            </div>
                          </div>

                          {/* Result list */}
                          <div className="grid grid-cols-1 gap-4">
                            {testResults.map((r, i) => {
                              const isPassed = r.status === 'passed';
                              const isWrong = r.status === 'wrong_answer';
                              const isOle = r.status === 'output_limit_exceeded';
                              const isCompile = r.status === 'compile_error';
                              const borderClass = isPassed
                                ? 'border-emerald-500/10 hover:border-emerald-500/20 bg-emerald-500/[0.01]'
                                : isWrong
                                  ? 'border-rose-500/10 hover:border-rose-500/20 bg-rose-500/[0.01]'
                                  : isOle
                                    ? 'border-cyan-500/10 hover:border-cyan-500/20 bg-cyan-500/[0.01]'
                                    : isCompile
                                      ? 'border-violet-500/10 hover:border-violet-500/20 bg-violet-500/[0.01]'
                                      : 'border-amber-500/10 hover:border-amber-500/20 bg-amber-500/[0.01]';
                              const pillClass = isPassed
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isWrong
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : isOle
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : isCompile
                                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                              const iconBgClass = isPassed
                                ? 'bg-emerald-500/10'
                                : isWrong || isOle || isCompile
                                  ? 'bg-rose-500/10'
                                  : 'bg-amber-500/10';
                              return (
                                <motion.div
                                  key={r.testCaseId}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className={`rounded-[2rem] border p-8 transition-all hover:translate-x-1 duration-300 ${borderClass}`}
                                >
                                  <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconBgClass}`}>
                                        {isPassed ? <CheckCircle2 size={18} className="text-emerald-500/80" /> :
                                         isWrong ? <XCircle size={18} className="text-rose-500/80" /> :
                                         isOle ? <AlertCircle size={18} className="text-cyan-500/80" /> :
                                         <AlertCircle size={18} className="text-amber-500/80" />}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm font-bold text-white uppercase tracking-widest">TestCase_0{i + 1}</span>
                                          {r.isHidden && <Lock size={12} className="text-zinc-600" />}
                                        </div>
                                        <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-tighter ${pillClass}`}>
                                          {r.isHidden ? `Hidden · ${r.status.replace(/_/g, ' ')}` : r.status.replace(/_/g, ' ')}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="text-[11px] text-zinc-600 font-mono bg-white/[0.03] px-3 py-1 rounded-lg">{r.executionTime}ms</span>
                                  </div>
                                  {r.kind === 'concrete' ? (
                                    <>
                                      <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                          <span className="text-[9px] text-zinc-700 uppercase tracking-[0.2em] font-bold">Input_Buffer</span>
                                          <pre className="text-xs font-mono text-zinc-400 bg-black/60 p-5 rounded-2xl border border-white/5 overflow-x-auto">{r.input}</pre>
                                        </div>
                                        <div className="space-y-3">
                                          <span className="text-[9px] text-zinc-700 uppercase tracking-[0.2em] font-bold">Expected_Outcome</span>
                                          <pre className="text-xs font-mono text-emerald-500/60 bg-black/60 p-5 rounded-2xl border border-emerald-500/10 overflow-x-auto">{r.expected}</pre>
                                        </div>
                                      </div>
                                      {r.status !== 'passed' && (
                                        <div className="mt-6 space-y-3">
                                          <span className="text-[9px] text-rose-500/60 uppercase tracking-[0.2em] font-bold">Actual_Result</span>
                                          <pre className="text-xs font-mono text-rose-400/80 bg-black/60 p-5 rounded-2xl border border-rose-500/20 overflow-x-auto">{r.actual}</pre>
                                        </div>
                                      )}
                                      {r.error && (
                                        <div className="mt-6 p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                                          <span className="text-[9px] text-rose-400 uppercase tracking-widest font-bold block mb-3">Runtime_Exception</span>
                                          <pre className="text-xs font-mono text-rose-300/70 whitespace-pre-wrap">{r.error}</pre>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="grid grid-cols-1 gap-3 text-xs">
                                      <div className="flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-black/60 border border-white/5">
                                        <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">Input_Shape</span>
                                        <span className="text-zinc-400 font-mono">{describeInputShape(r.inputShape)}</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-black/60 border border-emerald-500/10">
                                        <span className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">Expected_Schema</span>
                                        <span className="text-emerald-500/60 font-mono">{r.expectedShape}</span>
                                      </div>
                                      {r.status !== 'passed' && (
                                        <div className="flex items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-black/60 border border-rose-500/20">
                                          <span className="text-[9px] text-rose-500/60 uppercase tracking-widest font-bold">Actual_Schema</span>
                                          <span className="text-rose-400/80 font-mono">{r.actualShape}</span>
                                        </div>
                                      )}
                                      {r.error && (
                                        <div className="mt-3 p-6 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                                          <span className="text-[9px] text-rose-400 uppercase tracking-widest font-bold block mb-3">Validation_Error</span>
                                          <pre className="text-xs font-mono text-rose-300/70 whitespace-pre-wrap">{r.error}</pre>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2.5rem] p-12 text-center">
                          <Terminal size={32} className="text-zinc-700 mx-auto mb-6" />
                          <pre className="text-[14px] font-mono text-zinc-500 leading-relaxed whitespace-pre-wrap">{output || 'Initialize execution to capture output stream.'}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ) : activeRightTab === 'editor' ? (
                  <div className="h-full bg-black">
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
                        scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
                        letterSpacing: 0.5,
                        lineHeight: 28,
                        fontWeight: '500',
                      }}
                      beforeMount={(monaco) => {
                        monaco.editor.defineTheme('studio-dark', {
                          base: 'vs-dark',
                          inherit: true,
                          rules: [
                            { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
                            { token: 'keyword', foreground: 'ff79c6' },
                            { token: 'string', foreground: 'f1fa8c' },
                          ],
                          colors: {
                            'editor.background': '#000000',
                            'editor.lineHighlightBackground': '#00000000',
                            'editorLineNumber.foreground': '#222222',
                            'editorLineNumber.activeForeground': '#666666',
                            'editor.selectionBackground': '#ffffff15',
                            'editorCursor.foreground': '#7c3aed',
                          }
                        });
                      }}
                      onMount={(editor, monaco) => {
                        monaco.editor.setTheme('studio-dark');
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto p-12 bg-black custom-scrollbar">
                    <div className="max-w-4xl space-y-12">
                      <div className="flex items-center gap-4">
                        <h3 className="text-[11px] font-bold tracking-[0.5em] text-zinc-600 uppercase">SYSTEM_TEST_SUITE</h3>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      {dbProblem?.testCases && dbProblem.testCases.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6">
                          {dbProblem.testCases.map((tc, idx) => (
                          <motion.div
                            key={tc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white/[0.01] border border-white/[0.05] rounded-[2.5rem] p-10 hover:bg-white/[0.02] transition-all group"
                          >
                            <div className="flex items-center justify-between mb-8">
                              <span className="text-[14px] font-bold text-white uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity">Case_0{idx + 1}</span>
                              {tc.isSample && <span className="text-[10px] font-bold text-violet-400 border border-violet-400/20 bg-violet-400/5 px-4 py-1.5 rounded-full tracking-[0.2em] uppercase">Sample_Module</span>}
                            </div>
                            <div className="grid grid-cols-2 gap-10">
                               <div className="space-y-4">
                                  <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.3em]">Input_Buffer</span>
                                  <pre className="text-[13px] font-mono text-zinc-400 bg-black p-6 rounded-[2rem] border border-white/[0.03] shadow-inner">{tc.input}</pre>
                               </div>
                               <div className="space-y-4">
                                  <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-[0.3em]">Expected_State</span>
                                  <pre className="text-[13px] font-mono text-zinc-400 bg-black p-6 rounded-[2rem] border border-white/[0.03] shadow-inner">{tc.expected}</pre>
                               </div>
                            </div>
                          </motion.div>
                        ))}
                        </div>
                      ) : (
                        <div className="text-center py-20 text-zinc-700 font-bold tracking-widest uppercase text-xs">
                          {problemLoading ? 'Accessing Data Repository…' : 'No sample test cases available.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit/Run Controls — floating with glassmorphism */}
                {(activeRightTab === 'editor' || activeRightTab === 'testcases' || activeRightTab === 'output') && (
                <div className="absolute bottom-10 right-10 flex items-center gap-4 z-20">
                   <button
                     onClick={runCode}
                     disabled={isRunning || !dbProblem || !!loadError}
                     className="h-12 px-6 rounded-2xl border border-white/[0.1] bg-black/60 backdrop-blur-xl text-[11px] font-bold uppercase tracking-widest text-zinc-300 hover:text-white hover:bg-white/[0.05] disabled:opacity-20 flex items-center gap-3 transition-all active:scale-95 shadow-2xl"
                   >
                     {isRunning ? <div className="w-3.5 h-3.5 border-2 border-zinc-500 border-t-violet-400 rounded-full animate-spin" /> : <Play size={14} fill="currentColor" />}
                     Run Code
                   </button>
                   <button
                     onClick={submitCode}
                     disabled={isSubmitting || !dbProblem || !!loadError}
                     className="h-12 px-8 rounded-2xl bg-violet-600 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-violet-500 disabled:opacity-20 transition-all active:scale-95 shadow-[0_0_30px_rgba(124,58,237,0.4)]"
                   >
                     {isSubmitting ? 'Verifying…' : 'Submit Solution'}
                   </button>
                </div>
                )}
             </div>

              <div className="h-10 border-t border-white/[0.05] flex items-center justify-between px-6 text-[10px] text-zinc-600 font-mono bg-black shrink-0">
                 <div className="flex items-center gap-4">
                   <span>UTF-8</span>
                   <span className="text-zinc-800">|</span>
                   <span>L{code.split('\n').length} · C{code.length}</span>
                   <span className="text-zinc-800">|</span>
                   <span className="uppercase">{language}</span>
                 </div>
                 {hasOutput && activeRightTab !== 'output' && (
                   <button type="button" onClick={() => setActiveRightTab('output')} className="text-violet-500 hover:text-violet-400 font-bold uppercase tracking-widest animate-pulse">
                     View Response
                   </button>
                 )}
              </div>
          </div>

        </main>
     </div>
     </div>
  );
}
