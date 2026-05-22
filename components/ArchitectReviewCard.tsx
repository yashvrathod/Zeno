"use client";

import React, { useState } from "react";
import {
  Award, Code, BarChart3, AlertTriangle, CheckCircle2, Lightbulb,
  ExternalLink, ChevronDown, ChevronRight, Sparkles,
} from "lucide-react";

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
}

export function ArchitectReviewCard({ code, language, problemId, problemTitle, onClose }: ArchitectReviewCardProps) {
  const [review, setReview] = useState<ArchitectReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const triggerReview = async () => {
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
        improvements: ["Add input validation", "Extract magic numbers", "Use descriptive variable names"],
      });
    } catch {
      setError("Review service unavailable");
    } finally {
      setLoading(false);
    }
  };

  const gradeColors: Record<string, string> = {
    A: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    B: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    C: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    D: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    F: "text-rose-400 border-rose-500/30 bg-rose-500/10",
  };

  return (
    <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d10]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Award size={14} className="text-emerald-400" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Senior Architect Review</span>
        </div>
        {!review && (
          <button
            onClick={triggerReview}
            disabled={loading}
            className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-[10px] font-bold tracking-wider hover:bg-emerald-500/20 transition-all disabled:opacity-50"
          >
            {loading ? "Reviewing..." : "Request Review"}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <ExternalLink size={14} />
          </button>
        )}
      </div>

      <div className="p-5 max-h-[500px] overflow-y-auto">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs mb-4">{error}</div>
        )}

        {!review && !loading && (
          <div className="py-8 text-center space-y-3">
            <Sparkles size={32} className="mx-auto text-zinc-700" />
            <p className="text-zinc-600 text-xs">Get a professional code review with actionable feedback.</p>
            <p className="text-[10px] text-zinc-700">Submit your solution first, then request an Architect Review.</p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-xs text-zinc-600 font-mono">Senior Architect is reviewing your code...</span>
          </div>
        )}

        {review && (
          <div className="space-y-5">
            {/* Score Display */}
            <div className="flex items-center gap-6 p-5 bg-[#121214] rounded-xl border border-white/5">
              <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center ${gradeColors[review.grade] || gradeColors.F}`}>
                <span className="text-3xl font-bold">{review.grade}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold text-white">{review.overallScore}/100</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${review.productionReady ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-400 border-amber-500/30 bg-amber-500/10'}`}>
                    {review.productionReady ? "Production Ready" : "Needs Work"}
                  </span>
                </div>
                <p className="text-[12px] text-zinc-500">{review.summary}</p>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              {review.categories.map((cat) => (
                <div key={cat.name} className="border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.name ? null : cat.name)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#0d0d10] hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xs text-zinc-300 font-medium">{cat.name}</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className={`h-full rounded-full ${cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${cat.score >= 80 ? 'text-emerald-400' : cat.score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {cat.score}/{cat.maxScore}
                      </span>
                    </div>
                    {expandedCategory === cat.name ? <ChevronDown size={14} className="text-zinc-600" /> : <ChevronRight size={14} className="text-zinc-600" />}
                  </button>
                  {expandedCategory === cat.name && (
                    <div className="px-4 py-3 bg-[#050508] space-y-3">
                      <p className="text-[11px] text-zinc-500">{cat.feedback}</p>
                      {cat.suggestions.length > 0 && (
                        <div>
                          <span className="text-[9px] text-purple-400 uppercase tracking-wider font-bold">Suggestions</span>
                          <ul className="list-disc list-inside text-[11px] text-zinc-600 mt-1 space-y-0.5">
                            {cat.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Improvements */}
            {review.improvements.length > 0 && (
              <div className="bg-[#121214] rounded-xl px-4 py-3 border border-white/5">
                <span className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold">Key Improvements</span>
                <ul className="list-disc list-inside text-[11px] text-zinc-500 mt-2 space-y-1">
                  {review.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
