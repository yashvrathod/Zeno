'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft,
  Play,
  CheckCircle2,
  Clock,
  Settings,
  Bookmark,
  ChevronRight,
  ChevronDown,
  FileCode,
  Zap,
  Brain,
  Target,
  Lightbulb
} from 'lucide-react';
import { use } from 'react';
import Editor from '@monaco-editor/react';
import Link from 'next/link';

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  console.log('Problem ID:', id, 'Type:', typeof id);
  const [language, setLanguage] = useState<'javascript' | 'python' | 'java' | 'cpp'>('javascript');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [level, setLevel] = useState(12);
  const [xp, setXp] = useState(450);
  const [streak, setStreak] = useState(7);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [activeSection, setActiveSection] = useState('description');
  const [typingSounds, setTypingSounds] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  type TestResult = {
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
    time?: string;
    memory?: string;
  };

  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{success: boolean, message: string} | null>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  // Resizable layout (LeetCode-style) - desktop only.
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(350);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(300);
  const [consoleHeight, setConsoleHeight] = useState<number>(160);
  const dragStateRef = useRef<
    | null
    | {
        kind: 'left' | 'right' | 'console';
        startX: number;
        startY: number;
        startLeft: number;
        startRight: number;
        startConsole: number;
      }
  >(null);

  const editorRef = useRef<unknown>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load real problem data from backend
  const [dbProblem, setDbProblem] = useState<null | {  
    id: string;
    slug: string;
    title: string;
    statementMd: string;
    constraintsMd: string | null;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    hints: string[];
    publicTestCases: Array<{ order: number; input: string; expected: string }>;
    starterCode: Record<string, string>;
  }>(null);

  // Store code for each language separately
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({
    javascript: '',
    python: '',
    java: '',
    cpp: '',
  });

  const [code, setCode] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/problems/${id}`, { cache: 'no-store' });
        const data = (await res.json()) as
          | { problem: unknown }
          | { error?: string };
        if (!res.ok) throw new Error('error' in data ? data.error || 'Failed to load problem' : 'Failed to load problem');

        const p = ('problem' in data ? data.problem : null) as {
          id: string;
          slug: string;
          title: string;
          statementMd: string;
          constraintsMd?: string | null;
          difficulty: 'EASY' | 'MEDIUM' | 'HARD';
          hints?: unknown;
          publicTestCases?: unknown;
          starterCode?: unknown;
        };
        const starter = (p.starterCode ?? {}) as Record<string, string>;

        const normalized = {
          id: p.id as string,
          slug: p.slug as string,
          title: p.title as string,
          statementMd: p.statementMd as string,
          constraintsMd: (p.constraintsMd ?? null) as string | null,
          difficulty: p.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
          hints: Array.isArray(p.hints) ? (p.hints as string[]) : [],
          publicTestCases: Array.isArray(p.publicTestCases) ? (p.publicTestCases as Array<{ order: number; input: string; expected: string }>) : [],
          starterCode: starter,
        };

        if (!mounted) return;
        setDbProblem(normalized);

        const initialByLang = {
          javascript: starter.javascript ?? '',
          python: starter.python ?? '',
          java: starter.java ?? '',
          cpp: starter.cpp ?? '',
        };
        setCodeByLanguage(initialByLang);
        setCode(initialByLang[language] ?? '');
      } catch (e) {
        if (!mounted) return;
        setConsoleOutput(e instanceof Error ? e.message : 'Failed to load problem');
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Initialize Audio Context for typing sounds + respect reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const w = window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext ?? w.webkitAudioContext;
      audioContextRef.current = AC ? new AC() : null;

    }

    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Typing sound effect function
  const playTypingSound = () => {
    if (!typingSounds || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Mechanical keyboard sound simulation
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800 + Math.random() * 200, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      if (drag.kind === 'left') {
        const dx = e.clientX - drag.startX;
        const next = Math.min(560, Math.max(260, drag.startLeft + dx));
        setLeftPanelWidth(next);
      } else if (drag.kind === 'right') {
        const dx = e.clientX - drag.startX;
        const next = Math.min(520, Math.max(240, drag.startRight - dx));
        setRightPanelWidth(next);
      } else {
        const dy = e.clientY - drag.startY;
        const next = Math.min(320, Math.max(100, drag.startConsole - dy));
        setConsoleHeight(next);
      }
    };

    const onUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startDrag = (kind: 'left' | 'right' | 'console') => (e: React.MouseEvent) => {
    // Don’t allow resizing on mobile (use the existing toggles instead)
    if (window.innerWidth < 768) return;

    dragStateRef.current = {
      kind,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: leftPanelWidth,
      startRight: rightPanelWidth,
      startConsole: consoleHeight,
    };

    document.body.style.cursor = kind === 'console' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setTimeElapsed((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle language switching with code persistence
  const handleLanguageChange = (newLanguage: 'javascript' | 'python' | 'java' | 'cpp') => {
    // Save current code before switching
    setCodeByLanguage(prev => ({
      ...prev,
      [language]: code,
    }));
    
    // Switch to new language
    setLanguage(newLanguage);
    
    // Load code for new language
    setCode(codeByLanguage[newLanguage] || dbProblem?.starterCode?.[newLanguage] || '');
  };

  // Update code when it changes
  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    setCodeByLanguage(prev => ({
      ...prev,
      [language]: newCode,
    }));
    playTypingSound();
  };

  // Public test cases are loaded from the backend (problem.publicTestCases).
  const publicTestCases = dbProblem?.publicTestCases ?? [];

  // Run tests function with Judge0 API
  const runTests = async () => {
    setIsRunningTests(true);
    setConsoleOutput('| Compiling and running tests...\n');
    setSubmissionResult(null);
    
    try {
      if (!dbProblem?.slug) throw new Error('Problem not loaded');

      // Run only public test cases (like LeetCode "Run")
      const response = await fetch(`/api/problems/${dbProblem.slug}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setConsoleOutput(`❌ Error: ${data.error || 'Failed to execute code'}`);
        setIsRunningTests(false);
        return;
      }

      // Piston API always works (no API key needed!)
      // No need for fallback checks

      // Map /run API results (public tests only) into existing UI shape
      const results = (
        data.results as Array<{ order: number; passed: boolean; output: string; expected: string }>
      ).map((r) => ({
        passed: r.passed,
        input: publicTestCases.find((t) => t.order === r.order)?.input ?? `Test #${r.order}`,
        expected: r.expected,
        actual: r.output,
      }));

      setTestResults(results);
      
      // Generate console output
      let output = '=== Test Results ===\n\n';
      results.forEach((result, index: number) => {
        output += `Test ${index + 1}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        output += `  Input: ${result.input}\n`;
        output += `  Expected: ${result.expected}\n`;
        output += `  Got: ${result.actual}\n`;

        output += '\n';
      });
      
      const passedCount = results.filter((r) => r.passed).length;
      output += `\nResult: ${passedCount}/${results.length} tests passed`;
      
      if (passedCount === results.length) {
        output += ' 🎉';
      }
      
      setConsoleOutput(output);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setConsoleOutput(`❌ Network Error: ${message}\n\nPlease check your connection or API configuration.`);
    } finally {
      setIsRunningTests(false);
    }
  };

  // NOTE: Previously this page had a client-side Two Sum runner.
  // All execution is now handled by server-side /run and /submit endpoints.
  // Keeping this stub to avoid refactoring the UI further.
  const runTestsClientSide = async () => {
    setConsoleOutput('Client-side runner removed. Use Run / Submit.');
  };

  // Submit solution function with Judge0
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setConsoleOutput('| Submitting solution and running all tests...\n');
    setSubmissionResult(null);
    
    try {
      if (!dbProblem?.slug) throw new Error('Problem not loaded');

      // Submit runs ALL tests (public + hidden) on the server.
      const response = await fetch(`/api/problems/${dbProblem.slug}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmissionResult({
          success: false,
          message: `Error: ${data.error || 'Failed to execute code'}`
        });
        setConsoleOutput(`❌ Submission Error: ${data.error || 'Failed to execute code'}`);
        setIsSubmitting(false);
        return;
      }

      // Piston API always works (no API key needed!)
      // No need for fallback checks

      // Map /submit API results (public + hidden) into existing UI shape.
      // Backend does not return hidden inputs/expected.
      const results = (
        data.details as Array<{ order: number; isHidden: boolean; passed: boolean; output?: string }>
      ).map((r) => ({
        passed: r.passed,
        input: r.isHidden
          ? `Hidden Test #${r.order}`
          : (publicTestCases.find((t) => t.order === r.order)?.input ?? `Test #${r.order}`),
        expected: r.isHidden
          ? '(hidden)'
          : (publicTestCases.find((t) => t.order === r.order)?.expected ?? ''),
        // Show actual program output for public tests; keep hidden tests opaque.
        actual: r.isHidden ? (r.passed ? 'Passed' : 'Failed') : (r.output ?? ''),
      }));

      setTestResults(results);
      
      // Generate console output
      let output = '=== Submission Results ===\n\n';
      results.forEach((result, index: number) => {
        output += `Test ${index + 1}: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        output += `  Input: ${result.input}\n`;
        output += `  Expected: ${result.expected}\n`;
        output += `  Got: ${result.actual}\n`;
        
        if (result.error) {
          output += `  ❌ Error: ${result.error}\n`;
        }
        
        if (result.time) {
          output += `  ⏱ Time: ${result.time}s\n`;
        }
        
        if (result.memory) {
          output += `  💾 Memory: ${result.memory} KB\n`;
        }
        
        output += '\n';
      });
      
      const passedCount = results.filter((r) => r.passed).length;
      const allPassed = passedCount === results.length;
      
      if (allPassed) {
        setSubmissionResult({
          success: true,
          message: '✅ Accepted! Your solution passed all test cases. 🎉'
        });
        output += '\n✅ ACCEPTED\nYour solution has been submitted successfully!\n\n🎉 Congratulations! Problem solved!';

        
        // Update XP and streak
        setXp(prev => prev + 50);
        setStreak(prev => prev + 1);
      } else {
        setSubmissionResult({
          success: false,
          message: `❌ Wrong Answer. ${passedCount}/${results.length} tests passed.`
        });
        output += `\n❌ WRONG ANSWER\n${passedCount}/${results.length} tests passed.\nPlease review the failed tests and try again.`;
      }
      
      setConsoleOutput(output);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setSubmissionResult({
        success: false,
        message: `Error: ${message}`
      });
      setConsoleOutput(`❌ Network Error: ${message}\n\nPlease check your connection or API configuration.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // NOTE: Client-side submission was Two-Sum-specific and has been disabled.
  const submitClientSide = async () => {
    setSubmissionResult({ success: false, message: 'Client-side submit removed. Use Submit.' });
    setConsoleOutput('Client-side submit removed. Use Submit.');
  };


  type ExampleVm = { input: string; output: string; explanation?: string };

  // View model used by the existing UI. (Keeps markup unchanged.)
  const problem: {
    id: string;
    title: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    pattern: string;
    description: string;
    examples: ExampleVm[];
    constraints: string[];
    hints: string[];
  } = {
    // UI previously expected a numeric id; we use slug for now.
    id: dbProblem?.slug ?? '',
    title: dbProblem?.title ?? 'Loading…',
    difficulty: dbProblem?.difficulty ?? 'EASY',
    pattern: '',
    description: dbProblem?.statementMd ?? '',
    // DB doesn’t have a dedicated examples field yet; derive from first public tests.
    examples: (dbProblem?.publicTestCases ?? []).slice(0, 2).map((tc) => ({
      input: tc.input,
      output: tc.expected,
    })),
    constraints: dbProblem?.constraintsMd ? dbProblem.constraintsMd.split('\n').filter(Boolean) : [],
    hints: dbProblem?.hints ?? [],
  };

  return (
    <div className="h-screen bg-gradient-to-br from-[#1e1e2e] via-[#1a1a28] to-[#16161f] text-gray-100 flex flex-col relative overflow-hidden" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
      
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-transparent to-black pointer-events-none"></div>
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[160px]"></div>
      </div>

      {/* Top Header - VS Code Style */}
      <header className="relative z-10 bg-[#0a0a0f] border-b border-white/10 px-2 md:px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/problems" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </Link>
          <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
            <span className="text-gray-500 hidden sm:inline">Problems</span>
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-gray-600 hidden sm:inline" />
            <span className="text-white truncate max-w-[180px] md:max-w-none">{problem.id ? `${problem.id} • ` : ''}{problem.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1 md:gap-3 text-[10px] md:text-xs">
            <div className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-[#3e3e3e] rounded">
              <div className="w-4 h-4 md:w-6 md:h-6 bg-gradient-to-br from-gray-700 to-gray-900 rounded flex items-center justify-center text-[10px] md:text-xs font-bold">{level}</div>
            </div>
            <div className="hidden sm:flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-[#3e3e3e] rounded">
              <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 text-yellow-400" />
              <span className="text-yellow-400 font-semibold">{xp}</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 bg-[#3e3e3e] rounded">
              <span>🔥</span>
              <span className="text-orange-400 font-semibold">{streak}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-0.5 md:py-1 bg-[#3e3e3e] rounded text-xs md:text-sm">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
            <span className="font-mono">{formatTime(timeElapsed)}</span>
          </div>
          
          {!isRunning && (
            <button onClick={() => setIsRunning(true)} className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs md:text-sm transition-colors">
              Start
            </button>
          )}
        </div>
      </header>

      {/* Main Layout - 3 Column */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - VS Code Explorer Style */}
        <div
          className={`
          ${showLeftSidebar ? 'w-full' : 'w-0'}
          bg-[#0a0a0f] border-r border-white/10 flex flex-col transition-all duration-300
          ${showLeftSidebar ? 'block' : 'hidden md:block'}
        `}
          style={{ width: showLeftSidebar ? leftPanelWidth : 0 }}
        >
          {/* Problem Title */}
          <div className="p-4 border-b border-white/10">
            <h1 className="text-2xl font-bold mb-2">{problem.title}</h1>
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                problem.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                problem.difficulty === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {problem.difficulty}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{problem.pattern}</span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm">
            <div>
              <h3 className="text-gray-400 uppercase text-xs font-semibold mb-2">Description</h3>
              <p className="text-gray-300 leading-relaxed">{problem.description}</p>
            </div>

            <div>
              <h3 className="text-gray-400 uppercase text-xs font-semibold mb-3">Examples</h3>
              <div className="space-y-3">
                {problem.examples.map((ex, idx) => (
                  <div key={idx} className="bg-[#16161f] border border-white/10 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-2">Example {idx + 1}</div>
                    <div className="space-y-1 font-mono text-xs">
                      <div><span className="text-gray-500">Input:</span> <span className="text-blue-400">{ex.input}</span></div>
                      <div><span className="text-gray-500">Output:</span> <span className="text-green-400">{ex.output}</span></div>
                      {ex.explanation && <div className="text-gray-400 text-xs mt-1">{ex.explanation}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-gray-400 uppercase text-xs font-semibold mb-2">Constraints</h3>
              <ul className="space-y-1">
                {problem.constraints.map((c, idx) => (
                  <li key={idx} className="text-gray-400 text-xs">• {c}</li>
                ))}
              </ul>
            </div>

            <div>
              <button 
                onClick={() => setActiveSection(activeSection === 'hints' ? 'description' : 'hints')}
                className="text-gray-400 uppercase text-xs font-semibold mb-2 hover:text-white flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                Hints
                <ChevronDown className={`w-3 h-3 transition-transform ${activeSection === 'hints' ? 'rotate-180' : ''}`} />
              </button>
              {activeSection === 'hints' && (
                <div className="space-y-2 mt-2">
                  {problem.hints.map((hint, idx) => (
                    <div key={idx} className="text-gray-400 text-xs bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                      {idx + 1}. {hint}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Splitter: Left | Editor */}
        <div
          className="hidden md:block w-[6px] cursor-col-resize bg-transparent hover:bg-white/10 transition-colors"
          onMouseDown={startDrag('left')}
          title="Drag to resize"
        />

        {/* Middle - Code Editor */}
        <div className="flex-1 flex flex-col bg-[#0a0a0f] border border-white/10 min-w-0">
          {/* Editor Toolbar - VS Code Tabs Style */}
          <div className="bg-[#0a0a0f] border-b border-white/10 px-2 md:px-4 py-2 flex items-center justify-between flex-wrap gap-2">
            {/* Mobile Toggle Buttons */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Toggle Problem"
              >
                <FileCode className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setShowRightSidebar(!showRightSidebar)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title="Toggle Tests"
              >
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-gray-400 hidden md:block" />
              <select 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'javascript' | 'python' | 'java' | 'cpp')}
                className="bg-white/10 backdrop-blur-sm border border-white/10 text-gray-300 rounded px-2 py-1 text-xs md:text-sm focus:outline-none focus:border-blue-500/50 hover:bg-white/15 transition-all"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  title="Editor Settings"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                </button>
                
                {showSettings && (
                  <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl p-3 min-w-[200px] z-50">
                    <div className="text-xs font-semibold text-gray-400 mb-2">Editor Settings</div>
                    <label className="flex items-center justify-between gap-2 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                      <span className="text-sm text-gray-300">Typing Sounds</span>
                      <input
                        type="checkbox"
                        checked={typingSounds}
                        onChange={(e) => setTypingSounds(e.target.checked)}
                        className="w-4 h-4 accent-blue-500"
                      />
                    </label>
                  </div>
                )}
              </div>

              <button 
                onClick={runTests}
                disabled={isRunningTests}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs md:text-sm transition-colors"
              >
                <Play className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{isRunningTests ? 'Running...' : 'Run Tests'}</span>
                <span className="sm:hidden">Run</span>
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 relative">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                
                // Custom Black Theme
                monaco.editor.defineTheme('vscode-black', {
                  base: 'vs-dark',
                  inherit: true,
                  rules: [
                    { token: 'keyword', foreground: 'ffffff', fontStyle: 'bold' },
                    { token: 'string', foreground: 'A5E844' },
                    { token: 'number', foreground: '4FC3F7' },
                    { token: 'comment', foreground: '666666', fontStyle: 'italic' },
                    { token: 'function', foreground: '82AAFF' },
                    { token: 'variable', foreground: 'E0E0E0' },
                    { token: 'type', foreground: 'FFB86C' },
                    { token: 'constant', foreground: 'F8F8F2' },
                  ],
                  colors: {
                    'editor.background': '#0a0a0f',
                    'editor.foreground': '#E0E0E0',
                    'editor.lineHighlightBackground': '#16161f',
                    'editor.selectionBackground': '#2a2a3f',
                    'editorCursor.foreground': '#ffffff',
                    'editorLineNumber.foreground': '#666666',
                    'editorLineNumber.activeForeground': '#ffffff',
                  },
                });
                monaco.editor.setTheme('vscode-black');
                
                // Add Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
                editor.addAction({
                  id: 'open-command-palette',
                  label: 'Open Command Palette',
                  keybindings: [
                    monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP,
                  ],
                  run: () => {
                    editor.trigger('', 'editor.action.quickCommand', '');
                  },
                });
                
                // Add Format Document (Shift+Alt+F)
                editor.addAction({
                  id: 'format-document',
                  label: 'Format Document',
                  keybindings: [
                    monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
                  ],
                  run: () => {
                    editor.getAction('editor.action.formatDocument')?.run();
                  },
                });
                
                // Add Toggle Minimap (Ctrl+M)
                editor.addAction({
                  id: 'toggle-minimap',
                  label: 'Toggle Minimap',
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM],
                  run: () => {
                    const currentValue = editor.getOption(monaco.editor.EditorOption.minimap).enabled;
                    editor.updateOptions({ minimap: { enabled: !currentValue } });
                  },
                });
                
                // Enhanced bracket matching animations
                editor.onDidChangeCursorPosition((e) => {
                  // This triggers bracket highlighting
                  editor.deltaDecorations([], []);
                });
              }}
              theme="vscode-black"
              options={{
                // Font & Typography
                fontSize: 14,
                fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                fontLigatures: true,
                lineHeight: 22,
                letterSpacing: 0.5,
                
                // Visual Enhancements - Smooth Animations
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                cursorWidth: 2,
                smoothScrolling: true,
                
                // Minimap - VS Code Style
                minimap: { 
                  enabled: true, 
                  scale: 1,
                  showSlider: 'mouseover',
                  renderCharacters: true,
                  maxColumn: 120,
                  side: 'right',
                },
                
                // Scrollbar - Custom Premium Style
                scrollbar: {
                  vertical: 'auto',
                  horizontal: 'auto',
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                  useShadows: true,
                  scrollByPage: false,
                },
                
                // Line Numbers & Highlights
                lineNumbers: 'on',
                lineNumbersMinChars: 4,
                renderLineHighlight: 'all',
                renderLineHighlightOnlyWhenFocus: false,
                
                // Bracket Features - Rainbow Brackets
                bracketPairColorization: { 
                  enabled: true,
                  independentColorPoolPerBracketType: true,
                },
                guides: {
                  bracketPairs: true,
                  bracketPairsHorizontal: 'active',
                  highlightActiveBracketPair: true,
                  indentation: true,
                  highlightActiveIndentation: true,
                },
                
                // Code Folding
                folding: true,
                foldingStrategy: 'indentation',
                showFoldingControls: 'mouseover',
                foldingHighlight: true,
                unfoldOnClickAfterEndOfLine: true,
                foldingImportsByDefault: false,
                
                // Multi-cursor Support (Alt+Click)
                multiCursorModifier: 'alt',
                multiCursorMergeOverlapping: true,
                multiCursorPaste: 'spread',
                
                // Autocomplete & Suggestions
                quickSuggestions: {
                  other: 'on',
                  comments: 'on',
                  strings: 'on',
                },
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnCommitCharacter: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                wordBasedSuggestions: 'allDocuments',
                suggestSelection: 'first',
                suggestFontSize: 13,
                suggestLineHeight: 20,
                
                // Parameter Hints
                parameterHints: { 
                  enabled: true, 
                  cycle: true,
                },
                
                // Hover Tooltips
                hover: { 
                  enabled: true, 
                  delay: 300, 
                  sticky: true,
                  above: true,
                },
                
                // Code Lens - Inline Hints
                codeLens: true,
                codeLensFontFamily: '"JetBrains Mono", monospace',
                codeLensFontSize: 12,
                
                // Sticky Scroll - Function Names Stay at Top
                stickyScroll: { 
                  enabled: true,
                  maxLineCount: 5,
                },
                
                // Auto Formatting
                formatOnPaste: true,
                formatOnType: true,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                autoSurround: 'languageDefined',
                
                // Indent Guides (renderIndentGuides deprecated - now 'guides' object)
                renderWhitespace: 'selection',
                
                // Selection & Occurrence Highlighting
                selectionHighlight: true,
                
                // Layout & Spacing
                padding: { top: 16, bottom: 16 },
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                scrollBeyondLastLine: false,
                
                // Glyph Margin - For Breakpoints/Bookmarks
                glyphMargin: true,
                
                // Performance & Responsiveness
                fastScrollSensitivity: 5,
                mouseWheelScrollSensitivity: 1,
                
                // Find & Replace
                find: {
                  addExtraSpaceOnTop: true,
                  autoFindInSelection: 'never',
                  seedSearchStringFromSelection: 'always',
                },
              }}
            />
          </div>

          {/* Splitter: Editor | Console */}
          <div
            className="hidden md:block h-[6px] cursor-row-resize bg-transparent hover:bg-white/10 transition-colors"
            onMouseDown={startDrag('console')}
            title="Drag to resize"
          />

          {/* Console Output - VS Code Terminal Style */}
          <div
            className="bg-[#0a0a0f] border-t border-white/10 flex flex-col"
            style={{ height: consoleHeight }}
          >
            <div className="flex items-center gap-4 px-2 md:px-4 py-1.5 md:py-2 border-b border-white/10 bg-[#0a0a0f]">
              <span className="text-xs md:text-sm font-semibold">Console</span>
            </div>
            <div className="flex-1 p-2 md:p-4 font-mono text-[10px] md:text-sm text-gray-300 overflow-auto">
              {consoleOutput || 'Click "Run Tests" to see output...'}
            </div>
          </div>
        </div>

        {/* Splitter: Editor | Right */}
        <div
          className="hidden md:block w-[6px] cursor-col-resize bg-transparent hover:bg-white/10 transition-colors"
          onMouseDown={startDrag('right')}
          title="Drag to resize"
        />

        {/* Right Sidebar - Test Cases & Submit */}
        <div
          className={`
          ${showRightSidebar ? 'w-full' : 'w-0'}
          bg-[#0a0a0f] border-l border-white/10 flex flex-col transition-all duration-300
          ${showRightSidebar ? 'block' : 'hidden md:block'}
        `}
          style={{ width: showRightSidebar ? rightPanelWidth : 0 }}
        >
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold mb-4">Test Cases</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {testResults.length > 0 ? (
                testResults.map((result, index: number) => (
                  <div 
                    key={index}
                    className={`bg-[#16161f] border rounded-lg p-3 ${
                      result.passed 
                        ? 'border-green-500/30' 
                        : 'border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-500 text-xs">✕</span>
                        </div>
                      )}
                      <span className="text-sm font-medium">Test {index + 1}</span>
                      {result.time && (
                        <span className="text-[10px] text-gray-500 ml-auto">{result.time}s</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono space-y-1">
                      <div>{result.input}</div>
                      {!result.passed && (
                        <>
                          <div className="text-red-400">Expected: {result.expected}</div>
                          <div className="text-orange-400">Got: {result.actual}</div>
                          {result.error && (
                            <div className="text-red-400 bg-red-500/10 p-2 rounded mt-1">
                              Error: {result.error}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                publicTestCases.map((testCase, index) => (
                  <div key={index} className="bg-[#16161f] border border-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 border-2 border-gray-600 rounded-full" />
                      <span className="text-sm font-medium">Test {index + 1}</span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono whitespace-pre-wrap">
                      {testCase.input}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3">
            {submissionResult && (
              <div className={`p-3 rounded-lg text-sm ${
                submissionResult.success 
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
                  : 'bg-red-500/20 border border-red-500/30 text-red-400'
              }`}>
                {submissionResult.message}
              </div>
            )}
            
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || isRunningTests}
              className="w-full py-3 bg-green-600/90 backdrop-blur-sm hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(22,163,74,0.3)] hover:shadow-[0_6px_20px_rgba(22,163,74,0.4)]"
            >
              <CheckCircle2 className="w-5 h-5" />
              {isSubmitting ? 'Submitting...' : 'Submit Solution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
