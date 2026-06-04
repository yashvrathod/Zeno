"use client";

import React, { useState } from "react";
import {
  Bug, AlertTriangle, CheckCircle2, Lightbulb, TestTube,
  ChevronDown, ChevronRight, Search, Code, Shield,
  ArrowRight, Target, FileCode, BookOpen, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisBug {
  type: string;
  confidence: number;
  severity: string;
  description: string;
  explanation: string;
  evidence: string[];
  fix: string;
  location: { line: number; function?: string };
  relatedConcepts: string[];
  testCasesToVerify: Array<{ input: string; expected: string; description: string }>;
}

interface AnalysisTestCase {
  input: string;
  expected: string;
  description: string;
  exposesBug: boolean;
}

interface AnalysisCodeSmell {
  type: string;
  description: string;
  severity: string;
  location: { line: number };
  suggestion: string;
}

interface AnalysisFixSuggestion {
  description: string;
  code: string;
  explanation: string;
  sideEffects: string[];
  confidence: number;
}

interface AnalysisRootCause {
  primaryCause: string;
  contributingFactors: string[];
  whyItHappened: string;
  preventionStrategies: string[];
}

interface AnalysisNextStep {
  action: string;
  description: string;
  expectedOutcome: string;
  difficulty: string;
}

interface AnalysisResult {
  bugHypotheses: AnalysisBug[];
  testCases: AnalysisTestCase[];
  codeSmells: AnalysisCodeSmell[];
  fixSuggestions: AnalysisFixSuggestion[];
  rootCause: AnalysisRootCause | null;
  nextSteps: AnalysisNextStep[];
  complexity?: {
    bigO: string;
    explanation: string;
    improvement: string | null;
    loopDepth: number;
  } | null;
}

interface DebugAnalysisPanelProps {
  code: string;
  language: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export function DebugAnalysisPanel({ code, language, onAnalysisComplete }: DebugAnalysisPanelProps) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>("bugs");

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor/debug-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Analysis failed");
        return;
      }
      setResult(data.analysis);
      onAnalysisComplete?.(data.analysis);
    } catch {
      setError("Failed to connect to analysis service");
    } finally {
      setLoading(false);
    }
  };

  const severityColors: Record<string, string> = {
    critical: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  const difficultyColors: Record<string, string> = {
    easy: "text-emerald-400",
    medium: "text-amber-400",
    hard: "text-rose-400",
  };

  return (
    <div className="bg-black border border-white/[0.08] rounded-[2rem] overflow-hidden flex flex-col h-full shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.05] bg-black shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center relative">
            <Search size={16} className="text-purple-500" strokeWidth={1.5} />
            <div className="absolute inset-0 blur-sm bg-purple-500/20 animate-pulse" />
          </div>
          <span className="text-[11px] font-bold tracking-[0.3em] text-purple-500/80 uppercase">HEURISTIC_ANALYSIS_ENGINE</span>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-5 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 text-[10px] font-bold tracking-[0.15em] hover:bg-purple-500 hover:text-white transition-all disabled:opacity-50 uppercase shadow-lg shadow-purple-500/5"
        >
          {loading ? "PARSING..." : "INITIALIZE_SCAN"}
        </button>
      </div>

      <div className="p-8 space-y-6 max-h-[700px] overflow-y-auto custom-scrollbar bg-black/20">
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-400 text-xs font-mono shadow-xl"
          >
             <div className="flex items-center gap-3 mb-2">
                <AlertCircle size={14} />
                <span className="font-bold uppercase tracking-widest">Analysis_Failure</span>
             </div>
             {error}
          </motion.div>
        )}

        {!result && !loading && (
          <div className="py-20 text-center space-y-8">
            <Search size={48} strokeWidth={1} className="mx-auto text-zinc-900 mb-4 animate-pulse" />
            <div className="space-y-3">
              <p className="text-[11px] text-zinc-600 font-bold uppercase tracking-[0.3em]">Ready for Verification</p>
              <p className="text-[10px] text-zinc-800 uppercase tracking-widest leading-relaxed">Deep static analysis of algorithmic patterns, <br/>complexity constraints, and potential regressions.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-6 py-20">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-purple-500/10 border-t-purple-500 rounded-full animate-spin" />
              <div className="absolute inset-0 blur-xl bg-purple-500/20 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
               <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] animate-pulse block">Consulting Inference Engine…</span>
               <span className="text-[9px] text-zinc-800 uppercase tracking-widest block">Traversing abstract syntax tree for semantic patterns</span>
            </div>
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Bug Hypotheses */}
            <CollapsibleSection
              title="Anomaly_Detection"
              count={result.bugHypotheses.length}
              icon={<Bug size={14} />}
              color="text-amber-500/80"
              badge={result.bugHypotheses.length > 0 ? `Max_Conf: ${Math.round(result.bugHypotheses[0].confidence * 100)}%` : undefined}
              isOpen={expandedSection === "bugs"}
              onToggle={() => setExpandedSection(expandedSection === "bugs" ? null : "bugs")}
            >
              {result.bugHypotheses.length > 0 ? result.bugHypotheses.map((bug, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/[0.01] rounded-[2rem] p-6 border border-white/[0.05] space-y-4 hover:bg-white/[0.02] transition-colors shadow-inner"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <AlertTriangle size={14} className="text-amber-500/60" />
                      </div>
                      <div>
                        <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest block mb-0.5">{bug.type.replace(/_/g, " ")}</span>
                        <span className="text-[9px] text-zinc-700 font-mono tracking-tighter uppercase">LOCATION_PTR: L{bug.location.line}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-bold px-3 py-1 rounded-full border uppercase tracking-widest ${severityColors[bug.severity] || severityColors.medium}`}>
                        {bug.severity}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono bg-black/40 px-2 py-0.5 rounded-lg border border-white/5">{Math.round(bug.confidence * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-[13px] text-zinc-400 leading-relaxed pl-2 border-l border-white/5">{bug.explanation}</p>

                  {/* Evidence */}
                  {bug.evidence.length > 0 && (
                    <div className="bg-amber-500/[0.02] rounded-2xl px-5 py-4 border border-amber-500/10">
                      <span className="text-[9px] text-amber-500/40 uppercase tracking-[0.2em] font-bold block mb-3">Observational_Evidence</span>
                      <ul className="space-y-1.5">
                        {bug.evidence.map((e, j) => (
                          <li key={j} className="flex items-start gap-2 text-[11px] text-zinc-600">
                             <div className="w-1 h-1 rounded-full bg-amber-500/40 mt-1.5 shrink-0" />
                             {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fix */}
                  <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl px-5 py-4 shadow-inner">
                    <span className="text-[9px] text-emerald-500/40 uppercase tracking-[0.2em] font-bold block mb-3">Proposed_Solution</span>
                    <p className="text-[12px] text-emerald-400/80 font-mono bg-black/40 p-4 rounded-xl border border-emerald-500/5">{bug.fix}</p>
                  </div>

                  {/* Related Concepts */}
                  {bug.relatedConcepts.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {bug.relatedConcepts.map(c => (
                        <span key={c} className="text-[8px] px-3 py-1 rounded-full bg-purple-500/5 text-purple-500/40 border border-purple-500/10 font-bold tracking-widest uppercase">
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )) : (
                <div className="flex flex-col items-center gap-4 py-12 text-zinc-800">
                  <CheckCircle2 size={32} strokeWidth={1} className="text-emerald-500/20" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em]">No pattern regressions detected.</p>
                </div>
              )}
            </CollapsibleSection>

            {/* Test Cases */}
            <CollapsibleSection
              title="Boundary_Synthesis"
              count={result.testCases.length}
              icon={<TestTube size={14} />}
              color="text-blue-500/80"
              isOpen={expandedSection === "tests"}
              onToggle={() => setExpandedSection(expandedSection === "tests" ? null : "tests")}
            >
              {result.testCases.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {result.testCases.map((tc, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-white/[0.01] rounded-2xl p-5 border border-white/[0.05] hover:bg-white/[0.02] transition-all"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{tc.description}</span>
                        {tc.exposesBug && (
                          <span className="text-[8px] px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold uppercase tracking-widest shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                            VULNERABILITY_POINT
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/60 rounded-xl px-4 py-3 border border-white/[0.03] shadow-inner">
                          <span className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold block mb-1">Input_Buffer</span>
                          <span className="text-[11px] font-mono text-zinc-400 break-all">{tc.input}</span>
                        </div>
                        <div className="bg-black/60 rounded-xl px-4 py-3 border border-white/[0.03] shadow-inner">
                          <span className="text-[8px] text-zinc-800 uppercase tracking-widest font-bold block mb-1">Expected_Oracle</span>
                          <span className="text-[11px] font-mono text-emerald-500/60 break-all">{tc.expected}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-zinc-800 text-center py-8 font-bold uppercase tracking-widest">No edge-case modules synthesized.</p>
              )}
            </CollapsibleSection>

            {/* Code Smells */}
            <CollapsibleSection
              title="Static_Debt_Audit"
              count={result.codeSmells.length}
              icon={<Code size={14} />}
              color="text-orange-500/80"
              isOpen={expandedSection === "smells"}
              onToggle={() => setExpandedSection(expandedSection === "smells" ? null : "smells")}
            >
              {result.codeSmells.length > 0 ? result.codeSmells.map((smell, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/[0.01] rounded-2xl p-5 border border-white/[0.05] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield size={12} className="text-orange-500/60" />
                      <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{smell.type.replace(/_/g, " ")}</span>
                      {smell.location.line > 0 && (
                        <span className="text-[9px] text-zinc-700 font-mono tracking-widest">L{smell.location.line}</span>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold px-3 py-0.5 rounded-full border uppercase tracking-widest ${severityColors[smell.severity] || severityColors.medium}`}>
                      {smell.severity}
                    </span>
                  </div>
                  <p className="text-[12px] text-zinc-500 leading-relaxed border-l border-white/5 pl-4">{smell.description}</p>
                  <div className="bg-blue-500/[0.02] border border-blue-500/10 rounded-xl px-4 py-3 shadow-inner">
                    <span className="text-[8px] text-blue-500/40 uppercase tracking-widest font-bold block mb-1">Debt_Reduction_Strategy</span>
                    <p className="text-[11px] text-blue-400/80 italic">{smell.suggestion}</p>
                  </div>
                </motion.div>
              )) : (
                <div className="flex flex-col items-center gap-4 py-12 text-zinc-800">
                  <CheckCircle2 size={32} strokeWidth={1} className="text-emerald-500/20" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em]">Codebase satisfies clean-code invariants.</p>
                </div>
              )}
            </CollapsibleSection>

            {/* Complexity and Root Cause in a grid if they exist */}
            <div className="grid grid-cols-1 gap-6">
               {result.complexity && (
                  <div className="bg-white/[0.01] rounded-[2.5rem] p-8 border border-white/[0.05] space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target size={14} className="text-purple-500/60" />
                        <span className="text-[10px] text-purple-500/80 uppercase tracking-[0.4em] font-bold">ALGORITHMIC_COMPLEXITY</span>
                      </div>
                      <div className="bg-black/40 px-5 py-2 rounded-2xl border border-purple-500/20">
                         <span className="text-2xl font-bold font-mono text-white tracking-tighter">{result.complexity.bigO}</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-zinc-500 leading-relaxed bg-black/40 p-5 rounded-2xl border border-white/[0.03] italic">{result.complexity.explanation}</p>
                    {result.complexity.improvement && (
                      <div className="bg-amber-500/[0.02] border border-amber-500/10 rounded-2xl px-6 py-5 shadow-inner">
                        <div className="flex items-center gap-3 mb-3">
                           <Lightbulb size={14} className="text-amber-500/60" />
                           <span className="text-[9px] text-amber-500/80 uppercase tracking-[0.2em] font-bold">OPTIMIZATION_OPPORTUNITY</span>
                        </div>
                        <p className="text-[12px] text-amber-400/80 leading-relaxed">{result.complexity.improvement}</p>
                      </div>
                    )}
                  </div>
               )}

               {result.rootCause && (
                  <div className="bg-white/[0.01] rounded-[2.5rem] p-8 border border-white/[0.05] space-y-6 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <FileCode size={14} className="text-rose-500/60" />
                      <span className="text-[10px] text-rose-500/80 uppercase tracking-[0.4em] font-bold">ROOT_CAUSE_DIAGNOSIS</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-black/60 p-6 rounded-[2rem] border border-rose-500/10">
                        <span className="text-[9px] text-rose-500/40 uppercase tracking-[0.2em] font-bold block mb-3">Primary_Incursion_Factor</span>
                        <p className="text-[13px] text-zinc-300 font-medium leading-relaxed italic">"{result.rootCause.primaryCause}"</p>
                      </div>
                      <div className="bg-black/60 p-6 rounded-[2rem] border border-white/[0.03]">
                        <span className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-bold block mb-3">Causal_Inference</span>
                        <p className="text-[12px] text-zinc-500 leading-relaxed">{result.rootCause.whyItHappened}</p>
                      </div>
                    </div>
                    {result.rootCause.preventionStrategies.length > 0 && (
                      <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-[2rem] p-6 shadow-inner">
                        <span className="text-[9px] text-emerald-500/40 uppercase tracking-[0.2em] font-bold block mb-4">Structural_Prevention_Shield</span>
                        <ul className="grid grid-cols-1 gap-3">
                          {result.rootCause.preventionStrategies.map((s, i) => (
                            <li key={i} className="flex items-center gap-3 text-[11px] text-zinc-400 bg-black/40 p-3 rounded-xl border border-white/[0.03]">
                               <CheckCircle2 size={12} className="text-emerald-500/40" />
                               {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
               )}
            </div>

            {/* Next Steps — Floating banner style */}
            {result.nextSteps.length > 0 && (
              <div className="bg-blue-500/[0.02] border border-blue-500/10 rounded-[2.5rem] p-8 shadow-2xl">
                 <div className="flex items-center gap-3 mb-6">
                    <ArrowRight size={14} className="text-blue-500/60" />
                    <span className="text-[10px] text-blue-500/80 uppercase tracking-[0.4em] font-bold">SEQUENTIAL_ACTION_PIPELINE</span>
                 </div>
                 <div className="grid grid-cols-1 gap-3">
                    {result.nextSteps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-5 bg-black/60 rounded-2xl p-5 border border-white/[0.05] hover:border-blue-500/20 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-black transition-all">
                          <span className="text-[11px] font-bold">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[13px] text-zinc-300 font-bold uppercase tracking-widest">{step.action.replace(/_/g, " ")}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-tighter ${difficultyColors[step.difficulty] || 'text-zinc-500 border-white/10'}`}>
                              {step.difficulty}
                            </span>
                          </div>
                          <p className="text-[12px] text-zinc-500 leading-relaxed mb-3">{step.description}</p>
                          <div className="text-[10px] text-blue-500/60 font-mono tracking-widest uppercase flex items-center gap-2">
                             <div className="w-1 h-1 rounded-full bg-blue-500/40" />
                             EXPECTED_OUTCOME: {step.expectedOutcome}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                 </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title, count, icon, color = "text-zinc-400", badge, children, isOpen, onToggle,
}: {
  title: string; count: number; icon: React.ReactNode; color?: string; badge?: string;
  children: React.ReactNode; isOpen: boolean; onToggle: () => void;
}) {
  return (
    <div className="bg-black/40 border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-xl transition-all">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-8 py-5 hover:bg-white/[0.02] transition-colors relative group">
        <div className="flex items-center gap-4">
          <span className={`${color} group-hover:scale-110 transition-transform`}>{icon}</span>
          <span className="text-[11px] font-bold tracking-[0.3em] text-zinc-500 uppercase group-hover:text-zinc-300 transition-colors">{title}</span>
          {count > 0 && <span className="text-[10px] text-zinc-700 font-mono bg-white/[0.03] px-2 py-0.5 rounded-lg border border-white/5 ml-2">({String(count).padStart(2, '0')})</span>}
          {badge && <span className="text-[9px] text-zinc-800 font-mono ml-4 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">{badge}</span>}
        </div>
        <div className="p-2 rounded-xl group-hover:bg-white/5 transition-colors">
           {isOpen ? <ChevronDown size={16} className="text-zinc-700" /> : <ChevronRight size={16} className="text-zinc-700" />}
        </div>
        {isOpen && <motion.div layoutId={`activeSection-${title}`} className="absolute left-0 top-4 bottom-4 w-1 bg-current opacity-20 rounded-full" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-8 space-y-4 bg-black/20 border-t border-white/[0.03] shadow-inner">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
