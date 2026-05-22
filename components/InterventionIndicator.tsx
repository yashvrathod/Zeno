"use client";

import React from "react";
import { AlertCircle, Brain, Sparkles, Heart, Zap } from "lucide-react";

export type InterventionType = "frustration" | "confusion" | "stuck" | "insight" | "encouragement";

interface InterventionIndicatorProps {
  type: InterventionType;
  message: string;
  onDismiss?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

const interventionConfig: Record<InterventionType, { icon: React.ReactNode; color: string; bg: string }> = {
  frustration: {
    icon: <AlertCircle size={16} />,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
  confusion: {
    icon: <Brain size={16} />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  stuck: {
    icon: <Zap size={16} />,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  insight: {
    icon: <Sparkles size={16} />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  encouragement: {
    icon: <Heart size={16} />,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
  },
};

export function InterventionIndicator({ type, message, onDismiss, onAction, actionLabel }: InterventionIndicatorProps) {
  const config = interventionConfig[type] || interventionConfig.encouragement;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${config.bg} animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`mt-0.5 ${config.color}`}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${config.color}`}>
          {type}
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">{message}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className={`mt-2 px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider ${config.color} border ${config.bg} hover:opacity-80 transition-all`}
          >
            {actionLabel}
          </button>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
          <span className="text-[14px] leading-none">&times;</span>
        </button>
      )}
    </div>
  );
}
