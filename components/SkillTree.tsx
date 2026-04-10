"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Target, Zap, AlertTriangle, CheckCircle, TrendingUp, Shield, Code, Layers } from "lucide-react";

interface Pattern {
  tag: string;
  count: number;
  friendlyName: string;
  description: string;
  howToFix: string;
  percentOfSessions: number;
}

interface SkillCategory {
  name: string;
  icon: React.ReactNode;
  color: string;
  skills: string[];
}

interface SkillTreeProps {
  userId?: string;
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    name: "Array & String",
    icon: <Layers size={18} />,
    color: "from-blue-500/20 to-blue-600/20",
    skills: ["missed-edge-case", "off-by-one", "index-out-of-bounds"],
  },
  {
    name: "Logic & Flow",
    icon: <Code size={18} />,
    color: "from-yellow-500/20 to-yellow-600/20",
    skills: ["infinite-loop-risk", "wrong-base-case", "null-check-missing"],
  },
  {
    name: "Optimization",
    icon: <Zap size={18} />,
    color: "from-green-500/20 to-green-600/20",
    skills: ["wrong-complexity", "suboptimal-approach"],
  },
];

const SKILL_METADATA: Record<string, { icon: React.ReactNode; color: string }> = {
  "missed-edge-case": { icon: <AlertTriangle size={14} />, color: "text-yellow-400" },
  "off-by-one": { icon: <Target size={14} />, color: "text-orange-400" },
  "index-out-of-bounds": { icon: <Shield size={14} />, color: "text-red-400" },
  "infinite-loop-risk": { icon: <Zap size={14} />, color: "text-purple-400" },
  "wrong-base-case": { icon: <Brain size={14} />, color: "text-pink-400" },
  "null-check-missing": { icon: <AlertTriangle size={14} />, color: "text-yellow-400" },
  "wrong-complexity": { icon: <TrendingUp size={14} />, color: "text-blue-400" },
  "suboptimal-approach": { icon: <CheckCircle size={14} />, color: "text-green-400" },
};

export function SkillTree({ userId }: SkillTreeProps) {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Pattern | null>(null);

  useEffect(() => {
    const fetchWeaknesses = async () => {
      try {
        const res = await fetch("/api/user/weakness-map");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setPatterns(data.patterns || []);
      } catch (err) {
        setError("Could not load skill tree");
      } finally {
        setLoading(false);
      }
    };

    fetchWeaknesses();
  }, []);

  const getPatternByTag = (tag: string): Pattern | undefined => {
    return patterns.find((p) => p.tag === tag);
  };

  const getSkillLevel = (pattern?: Pattern): "weak" | "developing" | "strong" | "mastered" => {
    if (!pattern || pattern.count === 0) return "mastered";
    if (pattern.percentOfSessions > 40) return "weak";
    if (pattern.percentOfSessions > 20) return "developing";
    if (pattern.percentOfSessions > 5) return "strong";
    return "mastered";
  };

  const getLevelColor = (level: string): string => {
    switch (level) {
      case "weak":
        return "bg-red-500/30 border-red-500/50 text-red-300";
      case "developing":
        return "bg-yellow-500/30 border-yellow-500/50 text-yellow-300";
      case "strong":
        return "bg-blue-500/30 border-blue-500/50 text-blue-300";
      case "mastered":
        return "bg-green-500/30 border-green-500/50 text-green-300";
      default:
        return "bg-zinc-500/20 border-zinc-500/30 text-zinc-400";
    }
  };

  const totalWeakPatterns = patterns.reduce((sum, p) => sum + p.count, 0);
  const topWeakness = patterns[0];

  if (loading) {
    return (
      <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-8 min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-[13px]">Loading skill tree...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-8 min-h-[400px] flex items-center justify-center">
        <div className="text-zinc-500 text-[13px]">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-4">
          <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1">Weak Patterns</div>
          <div className="text-2xl font-bold text-white">{totalWeakPatterns}</div>
          <div className="text-[11px] text-zinc-600">across {patterns.length} categories</div>
        </div>
        <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-4">
          <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1">Top Focus</div>
          <div className="text-lg font-bold text-purple-400 truncate">
            {topWeakness?.friendlyName || "None"}
          </div>
          <div className="text-[11px] text-zinc-600">{topWeakness ? `${topWeakness.count} occurrences` : "All clear!"}</div>
        </div>
        <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-4">
          <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1">Overall Status</div>
          <div className={`text-lg font-bold ${patterns.some(p => p.percentOfSessions > 40) ? "text-red-400" : patterns.some(p => p.percentOfSessions > 20) ? "text-yellow-400" : "text-green-400"}`}>
            {patterns.some(p => p.percentOfSessions > 40) ? "Needs Work" : patterns.some(p => p.percentOfSessions > 20) ? "Improving" : "Strong"}
          </div>
          <div className="text-[11px] text-zinc-600">based on recent sessions</div>
        </div>
      </div>

      {/* Skill Tree Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {SKILL_CATEGORIES.map((category, catIdx) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIdx * 0.1 }}
            className="bg-[#0a0a0c] border border-white/10 rounded-xl overflow-hidden"
          >
            {/* Category Header */}
            <div className={`p-4 bg-gradient-to-r ${category.color} border-b border-white/10`}>
              <div className="flex items-center gap-3">
                <div className="text-zinc-300">{category.icon}</div>
                <span className="font-medium text-white">{category.name}</span>
              </div>
            </div>

            {/* Skills List */}
            <div className="p-4 space-y-3">
              {category.skills.map((skillTag) => {
                const pattern = getPatternByTag(skillTag);
                const level = getSkillLevel(pattern);
                const meta = SKILL_METADATA[skillTag];

                return (
                  <motion.button
                    key={skillTag}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => pattern && setSelectedSkill(pattern)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      level === "mastered"
                        ? "bg-zinc-500/10 border-zinc-500/20 opacity-60"
                        : getLevelColor(level)
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={meta?.color || "text-zinc-400"}>{meta?.icon}</span>
                        <span className="text-[13px] font-medium">
                          {pattern?.friendlyName || skillTag.replace(/-/g, " ")}
                        </span>
                      </div>
                      {level !== "mastered" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {level}
                        </span>
                      )}
                    </div>
                    {pattern && level !== "mastered" && (
                      <div className="mt-2 text-[11px] opacity-80">
                        {pattern.count} times ({pattern.percentOfSessions.toFixed(1)}% of sessions)
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSkill(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a0c] border border-white/10 rounded-xl max-w-lg w-full p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Brain size={18} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{selectedSkill.friendlyName}</h3>
                  <p className="text-[11px] text-zinc-500">{selectedSkill.count} occurrences</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-[13px] text-zinc-300 leading-relaxed">
                  {selectedSkill.description}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold tracking-widest text-purple-400 uppercase mb-2">
                  How to Fix
                </h4>
                <p className="text-[13px] text-zinc-400 leading-relaxed">
                  {selectedSkill.howToFix}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                  <span>Present in {selectedSkill.percentOfSessions.toFixed(1)}% of your sessions</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
