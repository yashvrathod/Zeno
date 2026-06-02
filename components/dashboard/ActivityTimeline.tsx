'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Code, Activity, Sparkles, Lightbulb, Search } from 'lucide-react';
import type { ActivityItem } from '@/lib/dashboard/types';

const typeConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  solved: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/25' },
  attempted: { icon: Code, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/25' },
  hint: { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/25' },
  debug: { icon: Search, color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/25' },
  review: { icon: Sparkles, color: 'text-nx-accent', bg: 'bg-nx-accent/15 border-nx-accent/25' },
};

const defaultConfig = { icon: Code, color: 'text-zinc-600', bg: 'bg-zinc-500/10 border-zinc-500/20' };

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

interface ActivityTimelineProps {
  items: ActivityItem[];
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  if (items.length === 0) {
    return <div className="py-8 text-center text-zinc-600 text-sm">No recent activity.</div>;
  }

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-nx-accent/20 via-zinc-700/30 to-transparent" />
      <div className="space-y-0">
        {items.slice(0, 5).map((item, i) => {
          const cfg = typeConfig[item.type] || defaultConfig;
          const Icon = cfg.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="relative flex items-start gap-4 py-2.5 pl-0 group"
            >
              <div className={`relative z-10 w-[30px] h-[30px] rounded-full ${cfg.bg} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                <Icon size={12} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm text-zinc-300 truncate font-medium group-hover:text-white transition-colors duration-200">{item.problemTitle}</p>
                <p className="text-[10px] text-zinc-600 truncate">{item.detail}</p>
              </div>
              <span className="text-[9px] text-zinc-700 font-mono whitespace-nowrap pt-1.5 shrink-0">
                {timeAgo(item.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
