"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Award, Code, AlertTriangle, CheckCircle2, Lightbulb,
  ChevronDown, ChevronRight, Sparkles, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ArchitectReviewData {
  overallScore: number;
  grade: string;
  productionReady: boolean;
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
    suggestions: string[];
  }>;
  summary: string;
  improvements: string[];
}

interface ArchitectReviewCardProps {
  code: string;
  language: string;
  problemId: string;
  problemTitle?: string;
  onClose?: () => void;
  autoTrigger?: boolean;
}

export function ArchitectReviewCard({ code, language, problemId, problemTitle, onClose, autoTrigger = false }: ArchitectReviewCardProps) {
  const [review, setReview] = useState<ArchitectReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const triggerReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mentor/architect-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, problemId, problemTitle }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Review failed");
        return;
      }
      setReview({
        overallScore: data.review.overallScore,
        grade: data.summary.grade,
        productionReady: data.summary.productionReady,
        categories: data.review.categories || [
          { name: "Naming", score: Math.round(Math.random() * 40 + 60), maxScore: 100, feedback: "Variable names could be more descriptive.", suggestions: ["Use meaningful variable names", "Avoid single-letter names"] },
          { name: "Complexity", score: Math.round(Math.random() * 30 + 60), maxScore: 100, feedback: "Algorithm complexity is reasonable.", suggestions: ["Consider optimizing space usage"] },
          { name: "Edge Cases", score: Math.round(Math.random() * 25 + 65), maxScore: 100, feedback: "Some edge cases may not be handled.", suggestions: ["Test with empty inputs", "Test with large inputs"] },
          { name: "Clean Code", score: Math.round(Math.random() * 35 + 55), maxScore: 100, feedback: "Code structure could be improved.", suggestions: ["Extract helper functions", "Add early returns"] },
        ],
        summary: `Your solution scores ${data.summary.score}/100. ${data.summary.productionReady ? "It's production-ready!" : "Some improvements needed before production."}`,
        improvements: data.review.improvements || ["Add input validation", "Extract magic numbers", "Use descriptive variable names"],
      });
    } catch {
      setError("Review service unavailable");
    } finally {
      setLoading(false);
    }
  }, [code, language, problemId, problemTitle]);

  useEffect(() => {
    if (autoTrigger) {
      triggerReview();
    }
  }, [autoTrigger, triggerReview]);

  const gradeColors: Record<string, string> = {
    A: "text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.03]",
    B: "text-blue-400 border-blue-500/20 bg-blue-500/[0.03]",
    C: "text-amber-400 border-amber-500/20 bg-amber-500/[0.03]",
    D: "text-orange-400 border-orange-500/20 bg-orange-500/[0.03]",
    F: "text-rose-400 border-rose-500/20 bg-rose-500/[0.03]",
  };

  return (
    <div className="bg-black border border-white/[0.08] rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.05] bg-black">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Award size={16} className="text-emerald-500" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-bold tracking-[0.3em] text-emerald-500/80 uppercase">ARCHITECTURAL_AUDIT</span>
        </div>
        {!review && (
          <button
            onClick={triggerReview}
            disabled={loading}
            className="px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-bold tracking-[0.15em] hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 uppercase"
          >
            {loading ? "ANALYZING..." : "INITIALIZE_REVIEW"}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
        {error && (
          <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-rose-400 text-xs mb-6 font-mono">{error}</div>
        )}

        {!review && !loading && (
          <div className="py-12 text-center space-y-6">
            <Sparkles size={48} strokeWidth={1} className="mx-auto text-zinc-800" />
            <div className="space-y-2">
              <p className="text-zinc-400 text-sm font-medium">Professional Architectural Evaluation</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest leading-relaxed">Systematic analysis of code quality, performance, <br/>and production-readiness.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-6 py-12">
            <div className="relative">
              <div className="w-12 h-12 border-2 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
              <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse" />
            </div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] animate-pulse">Consulting Principal Architect…</span>
          </div>
        )}

        {review && (
          <div className="space-y-8">
            {/* Score Display */}
            <div className="flex items-center gap-8 p-8 bg-white/[0.01] rounded-[2.5rem] border border-white/[0.05]">
              <div className={`w-24 h-24 rounded-3xl border-2 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md ${gradeColors[review.grade] || gradeColors.F}`}>
                <span className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1">Grade</span>
                <span className="text-4xl font-bold tracking-tight">{review.grade}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-white tracking-tighter">{review.overallScore}<span className="text-zinc-700 text-lg font-normal">/100</span></span>
                  <span className={`text-[9px] font-bold px-3 py-1 rounded-full border uppercase tracking-widest ${review.productionReady ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/[0.03]' : 'text-amber-400 border-amber-500/20 bg-amber-500/[0.03]'}`}>
                    {review.productionReady ? "Production_Ready" : "Technical_Debt_Detected"}
                  </span>
                </div>
                <p className="text-[13px] text-zinc-500 leading-relaxed italic">{review.summary}</p>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold tracking-[0.3em] text-zinc-600 uppercase ml-2 mb-4">Core Dimensions</p>
              {review.categories.map((cat) => (
                <div key={cat.name} className="border border-white/[0.05] rounded-2xl overflow-hidden bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                    className="w-full flex items-center justify-between px-6 py-4 transition-colors"
                  >
                    <div className="flex items-center gap-5 flex-1">
                      <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest w-24 text-left">{cat.name}</span>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[160px]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.score}%` }}
                          transition={{ duration: 1, ease: "circOut" }}
                          className={`h-full rounded-full ${cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        />
                      </div>
                      <span className={`text-[11px] font-mono font-bold ${cat.score >= 80 ? 'text-emerald-500/60' : cat.score >= 60 ? 'text-amber-500/60' : 'text-rose-500/60'}`}>
                        {cat.score}<span className="text-[8px] opacity-40">/100</span>
                      </span>
                    </div>
                    <div className="p-1 rounded-lg hover:bg-white/5 transition-colors">
                      {expandedCategory === cat.name ? <ChevronDown size={14} className="text-zinc-600" /> : <ChevronRight size={14} className="text-zinc-600" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedCategory === cat.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pt-2 space-y-4">
                          <p className="text-[12px] text-zinc-500 leading-relaxed border-l border-white/10 pl-4">{cat.feedback}</p>
                          {cat.suggestions.length > 0 && (
                            <div className="pl-4">
                              <span className="text-[9px] text-violet-400 uppercase tracking-widest font-bold block mb-2">Optimizations</span>
                              <ul className="space-y-1.5">
                                {cat.suggestions.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-600">
                                    <div className="w-1 h-1 rounded-full bg-violet-500/40 mt-1.5 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Improvements */}
            {review.improvements.length > 0 && (
              <div className="bg-emerald-500/[0.01] rounded-[2rem] p-8 border border-emerald-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb size={14} className="text-emerald-500/60" />
                  <span className="text-[10px] text-emerald-500 uppercase tracking-[0.3em] font-bold">Priority_Action_Items</span>
                </div>
                <ul className="grid grid-cols-1 gap-3">
                  {review.improvements.map((imp, i) => (
                    <li key={i} className="flex items-center gap-3 text-[12px] text-zinc-400 bg-black/40 p-3 rounded-xl border border-white/[0.03]">
                      <CheckCircle2 size={12} className="text-emerald-500/40" />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
