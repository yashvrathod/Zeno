'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { LearningVelocityPoint } from '@/lib/dashboard/types';

interface EnhancementChartProps {
  points: LearningVelocityPoint[];
}

interface TooltipData {
  x: number;
  y: number;
  date: string;
  mastery: number;
  solved: number;
}

export function EnhancementChart({ points }: EnhancementChartProps) {
  const prefersReduced = useReducedMotion();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const dims = useMemo(() => {
    if (points.length === 0) return null;
    const maxSolved = Math.max(...points.map(p => p.problemsSolved), 1);
    const maxMastery = 100;
    const w = 600;
    const h = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;
    const pointSpacing = Math.max(12, Math.min(plotW / (points.length - 1 || 1), plotW / 6));
    const totalW = Math.max(w, points.length * pointSpacing + padding.left + padding.right);

    const toX = (i: number) => padding.left + i * pointSpacing;
    const toYMastery = (v: number) => padding.top + plotH - (v / maxMastery) * plotH;
    const toYSolved = (v: number) => padding.top + plotH - (v / maxSolved) * plotH;

    const masteryPath = points.map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd}${toX(i)},${toYMastery(p.overallMastery)}`;
    }).join(' ');

    const solvedPath = points.map((p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${cmd}${toX(i)},${toYSolved(p.problemsSolved)}`;
    }).join(' ');

    const areaPath = masteryPath + ` L${toX(points.length - 1)},${padding.top + plotH} L${toX(0)},${padding.top + plotH} Z`;

    const labelIndices = points.length <= 6
      ? points.map((_, i) => i)
      : points.filter((_, i) => i % Math.floor(points.length / 6) === 0).map((_, i) => i * Math.floor(points.length / 6));

    const lastVal = points[points.length - 1];
    const firstVal = points[0];
    const velocity = lastVal && firstVal ? ((lastVal.overallMastery - firstVal.overallMastery) / Math.max(points.length, 1)).toFixed(1) : '0';

    return { totalW, h, padding, pointSpacing, toX, toYMastery, toYSolved, masteryPath, solvedPath, areaPath, labelIndices, velocity, maxMastery, maxSolved, plotH };
  }, [points]);

  const dataPoints = useMemo(() => {
    if (!dims) return [];
    return points.map((p, i) => ({
    x: dims.toX(i),
    y: dims.toYMastery(p.overallMastery),
      date: p.date,
      mastery: p.overallMastery,
      solved: p.problemsSolved,
    }));
  }, [points, dims]);

  if (!dims || points.length === 0) {
    return <div className="py-8 text-center text-zinc-600 text-sm">No data yet</div>;
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-5 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-nx-accent shadow-[0_0_8px_rgba(201,168,76,0.2)]" />
          <span className="text-[10px] text-zinc-600">Mastery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          <span className="text-[10px] text-zinc-600">Problems Solved</span>
        </div>
        <div className="ml-auto text-[9px] text-zinc-700 font-mono">+{dims.velocity}%/day</div>
      </div>

      <svg viewBox={`0 0 ${dims.totalW} ${dims.h}`} className="w-full h-48" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          d={dims.areaPath}
          fill="url(#chartAreaGrad)"
          initial={{ opacity: prefersReduced ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        <motion.path
          d={dims.masteryPath}
          fill="none"
          stroke="#c9a84c"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: prefersReduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />

        <motion.path
          d={dims.solvedPath}
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 4"
          initial={{ pathLength: prefersReduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
        />

        {dataPoints.map((dp, i) => (
          <motion.circle
            key={i}
              cx={dp.x}
              cy={dp.y}
            r="3"
            fill="#c9a84c"
            className="cursor-pointer"
            initial={{ opacity: prefersReduced ? 1 : 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2 + i * 0.02 }}
            onMouseEnter={() => setTooltip(dp)}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {dims.labelIndices.map((idx: number) => {
          const x = dims.toX(idx);
          return (
            <text
              key={idx}
              x={x}
              y={dims.h - 5}
              textAnchor="middle"
              className="fill-zinc-700 text-[7px] font-mono"
            >
              {points[idx].date.slice(5)}
            </text>
          );
        })}
      </svg>

      {tooltip && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-zinc-900 border border-white/[0.08] rounded-xl px-4 py-2.5 shadow-2xl pointer-events-none"
        >
          <div className="text-[10px] text-zinc-400 font-mono mb-1">{tooltip.date}</div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-nx-accent" />
              <span className="text-[10px] text-zinc-300">{tooltip.mastery}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-zinc-300">{tooltip.solved} solved</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
