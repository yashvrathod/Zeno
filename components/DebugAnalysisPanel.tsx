"use client";

import React, { useState } from "react";
import {
  Bug, AlertTriangle, CheckCircle2, Lightbulb, TestTube,
  ChevronDown, ChevronRight, Search, Code, Shield,
  ArrowRight, Target, FileCode, BookOpen,
} from "lucide-react";

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
    <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d10]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Search size={14} className="text-purple-400" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">Debug Analysis</span>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-[10px] font-bold tracking-wider hover:bg-purple-500/20 transition-all disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze Code"}
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">{error}</div>
        )}

        {!result && !loading && (
          <div className="py-8 text-center text-zinc-700 text-xs space-y-3">
            <Search size={32} className="mx-auto text-zinc-800" />
            <p>Click "Analyze Code" to detect bugs, code smells, and get actionable fixes.</p>
            <p className="text-[10px] text-zinc-800">Uses pattern matching for off-by-one, null pointers, infinite loops, binary search, two-pointer, sliding window bugs.</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            <span className="text-xs text-zinc-600 font-mono">Parsing code structure...</span>
            <span className="text-[10px] text-zinc-700">Analyzing loops, conditionals, and algorithm patterns</span>
          </div>
        )}

        {result && (
          <>
            {/* Bug Hypotheses */}
            <CollapsibleSection
              title="Bug Hypotheses"
              count={result.bugHypotheses.length}
              icon={<Bug size={14} />}
              color="text-amber-400"
              badge={result.bugHypotheses.length > 0 ? `Top confidence: ${Math.round(result.bugHypotheses[0].confidence * 100)}%` : undefined}
              isOpen={expandedSection === "bugs"}
              onToggle={() => setExpandedSection(expandedSection === "bugs" ? null : "bugs")}
            >
              {result.bugHypotheses.length > 0 ? result.bugHypotheses.map((bug, i) => (
                <div key={i} className="bg-[#121214] rounded-xl p-4 border border-white/5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={12} className="text-amber-400" />
                      <span className="text-xs text-zinc-300 font-medium capitalize">{bug.type.replace(/_/g, " ")}</span>
                      <span className="text-[9px] text-zinc-600 font-mono">L{bug.location.line}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${severityColors[bug.severity] || severityColors.medium}`}>
                        {bug.severity}
                      </span>
                      <span className="text-[9px] text-zinc-600 font-mono">{Math.round(bug.confidence * 100)}%</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-500">{bug.description}</p>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">{bug.explanation}</p>

                  {/* Evidence */}
                  {bug.evidence.length > 0 && (
                    <div className="bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
                      <span className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">Evidence</span>
                      <ul className="list-disc list-inside text-[10px] text-zinc-500 mt-1 space-y-0.5">
                        {bug.evidence.map((e, j) => <li key={j}>{e}</li>)}
                      </ul>
                    </div>
                  )}

                  {/* Fix */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                    <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold">Suggested Fix</span>
                    <p className="text-[11px] text-emerald-300 mt-0.5 font-mono">{bug.fix}</p>
                  </div>

                  {/* Related Concepts */}
                  {bug.relatedConcepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {bug.relatedConcepts.map(c => (
                        <span key={c} className="text-[8px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {c.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )) : (
                <div className="flex flex-col items-center gap-2 py-6 text-zinc-600">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <p className="text-xs">No bugs detected based on common patterns.</p>
                </div>
              )}
            </CollapsibleSection>

            {/* Test Cases */}
            <CollapsibleSection
              title="Generated Test Cases"
              count={result.testCases.length}
              icon={<TestTube size={14} />}
              color="text-blue-400"
              isOpen={expandedSection === "tests"}
              onToggle={() => setExpandedSection(expandedSection === "tests" ? null : "tests")}
            >
              {result.testCases.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {result.testCases.map((tc, i) => (
                    <div key={i} className="bg-[#121214] rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-zinc-400 font-medium">{tc.description}</span>
                        {tc.exposesBug && (
                          <span className="text-[8px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                            Exposes Bug
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-black/40 rounded-lg px-2 py-1.5 border border-white/5">
                          <span className="text-zinc-700">Input:</span>
                          <span className="text-zinc-400 ml-1">{tc.input}</span>
                        </div>
                        <div className="bg-black/40 rounded-lg px-2 py-1.5 border border-white/5">
                          <span className="text-zinc-700">Expected:</span>
                          <span className="text-emerald-400 ml-1">{tc.expected}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 text-center py-4">No test cases generated.</p>
              )}
            </CollapsibleSection>

            {/* Code Smells */}
            <CollapsibleSection
              title="Code Smells"
              count={result.codeSmells.length}
              icon={<Code size={14} />}
              color="text-orange-400"
              isOpen={expandedSection === "smells"}
              onToggle={() => setExpandedSection(expandedSection === "smells" ? null : "smells")}
            >
              {result.codeSmells.length > 0 ? result.codeSmells.map((smell, i) => (
                <div key={i} className="bg-[#121214] rounded-xl p-4 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={12} className="text-orange-400" />
                      <span className="text-xs text-zinc-300 font-medium capitalize">{smell.type.replace(/_/g, " ")}</span>
                      {smell.location.line > 0 && (
                        <span className="text-[9px] text-zinc-600 font-mono">L{smell.location.line}</span>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${severityColors[smell.severity] || severityColors.medium}`}>
                      {smell.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">{smell.description}</p>
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                    <span className="text-[9px] text-blue-400 uppercase tracking-wider font-bold">Suggestion</span>
                    <p className="text-[11px] text-blue-300 mt-0.5">{smell.suggestion}</p>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center gap-2 py-6 text-zinc-600">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <p className="text-xs">No code smells detected. Clean code!</p>
                </div>
              )}
            </CollapsibleSection>

            {/* Fix Suggestions */}
            {result.fixSuggestions.length > 0 && (
              <CollapsibleSection
                title="Fix Suggestions"
                count={result.fixSuggestions.length}
                icon={<FileCode size={14} />}
                color="text-emerald-400"
                isOpen={expandedSection === "fixes"}
                onToggle={() => setExpandedSection(expandedSection === "fixes" ? null : "fixes")}
              >
                {result.fixSuggestions.map((fix, i) => (
                  <div key={i} className="bg-[#121214] rounded-xl p-4 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-medium">{fix.description}</span>
                      <span className="text-[9px] text-zinc-600 font-mono">{Math.round(fix.confidence * 100)}% confidence</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{fix.explanation}</p>

                    {/* Code diff */}
                    <pre className="bg-black/60 rounded-xl p-3 text-[10px] font-mono text-emerald-400 leading-relaxed overflow-x-auto border border-white/5">
                      {fix.code}
                    </pre>

                    {/* Side Effects */}
                    {fix.sideEffects.length > 0 && (
                      <div className="bg-amber-500/5 rounded-lg px-3 py-2 border border-amber-500/10">
                        <span className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">Side Effects</span>
                        <ul className="list-disc list-inside text-[10px] text-zinc-500 mt-1 space-y-0.5">
                          {fix.sideEffects.map((se, j) => <li key={j}>{se}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </CollapsibleSection>
            )}

            {/* Root Cause */}
            {result.rootCause && (
              <CollapsibleSection
                title="Root Cause Analysis"
                count={0}
                icon={<Lightbulb size={14} />}
                color="text-yellow-400"
                isOpen={expandedSection === "root"}
                onToggle={() => setExpandedSection(expandedSection === "root" ? null : "root")}
              >
                <div className="bg-[#121214] rounded-xl p-4 border border-white/5 space-y-4">
                  <div>
                    <span className="text-[9px] text-rose-400 uppercase tracking-wider font-bold">Primary Cause</span>
                    <p className="text-xs text-zinc-300 mt-1">{result.rootCause.primaryCause}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">Why It Happened</span>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{result.rootCause.whyItHappened}</p>
                  </div>
                  {result.rootCause.contributingFactors.length > 0 && (
                    <div>
                      <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">Contributing Factors</span>
                      <ul className="list-disc list-inside text-[10px] text-zinc-500 mt-1 space-y-0.5">
                        {result.rootCause.contributingFactors.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  {result.rootCause.preventionStrategies.length > 0 && (
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-3">
                      <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold">Prevention Strategies</span>
                      <ul className="list-disc list-inside text-[10px] text-emerald-300/70 mt-1.5 space-y-1">
                        {result.rootCause.preventionStrategies.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Next Steps */}
            {result.nextSteps.length > 0 && (
              <CollapsibleSection
                title="Next Steps"
                count={result.nextSteps.length}
                icon={<ArrowRight size={14} />}
                color="text-blue-400"
                isOpen={expandedSection === "steps"}
                onToggle={() => setExpandedSection(expandedSection === "steps" ? null : "steps")}
              >
                <div className="space-y-2">
                  {result.nextSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 bg-[#121214] rounded-xl p-3 border border-white/5">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[9px] text-blue-400 font-bold">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-zinc-300 font-medium capitalize">{step.action.replace(/_/g, " ")}</span>
                          <span className={`text-[9px] font-bold ${difficultyColors[step.difficulty] || 'text-zinc-500'}`}>
                            {step.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">{step.description}</p>
                        <p className="text-[10px] text-zinc-600 mt-0.5">→ {step.expectedOutcome}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Summary stats */}
            <div className="flex items-center gap-4 pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[9px] text-zinc-600">{result.bugHypotheses.length} bugs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="text-[9px] text-zinc-600">{result.codeSmells.length} smells</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[9px] text-zinc-600">{result.testCases.length} test cases</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-[9px] text-zinc-600">{result.nextSteps.length} steps</span>
              </div>
              {result.complexity && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-[9px] text-zinc-600 font-mono">{result.complexity.bigO}</span>
                </div>
              )}
            </div>

            {/* Complexity Card */}
            {result.complexity && (
              <div className="bg-[#121214] rounded-xl p-4 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-purple-400 uppercase tracking-wider font-bold">Complexity</span>
                  <span className="text-sm font-mono font-bold text-white">{result.complexity.bigO}</span>
                </div>
                <p className="text-[11px] text-zinc-500">{result.complexity.explanation}</p>
                {result.complexity.improvement && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                    <span className="text-[9px] text-amber-400 uppercase tracking-wider font-bold">Optimization Suggestion</span>
                    <p className="text-[11px] text-amber-300 mt-0.5">{result.complexity.improvement}</p>
                  </div>
                )}
              </div>
            )}

          </>
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
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 bg-[#0d0d10] hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2.5">
          <span className={color}>{icon}</span>
          <span className="text-[11px] font-bold tracking-wider text-zinc-300 uppercase">{title}</span>
          {count > 0 && <span className="text-[9px] text-zinc-600 font-mono">({count})</span>}
          {badge && <span className="text-[8px] text-zinc-700 font-mono ml-2">{badge}</span>}
        </div>
        {isOpen ? <ChevronDown size={14} className="text-zinc-600" /> : <ChevronRight size={14} className="text-zinc-600" />}
      </button>
      {isOpen && <div className="p-4 space-y-3 bg-[#050508]">{children}</div>}
    </div>
  );
}
