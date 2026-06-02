'use client';

import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { ArrowRight, GraduationCap, Target, Rocket } from 'lucide-react';

const PATHS = [
  {
    id: 'beginner',
    title: 'Beginner Path',
    description: 'Start from zero. Master arrays, strings, sorting, and basic data structures.',
    icon: GraduationCap,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    steps: 6,
    href: '/roadmap/beginner',
  },
  {
    id: 'interview',
    title: 'Interview Prep',
    description: 'Crack FAANG & top tech interviews. Graphs, DP, trees, and advanced patterns.',
    icon: Target,
    gradient: 'from-violet-500/20 to-violet-600/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    steps: 8,
    href: '/roadmap/interview',
  },
  {
    id: 'advanced',
    title: 'Advanced DSA',
    description: 'Deep dive into advanced algorithms, competitive programming, and system design fundamentals.',
    icon: Rocket,
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    steps: 7,
    href: '/roadmap/advanced',
  },
];

export default function RoadmapPage() {
  return (
    <div className="flex h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white tracking-tight mb-3">Learning Roadmaps</h1>
            <p className="text-zinc-400 text-lg">Choose your path and master DSA step by step</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PATHS.map((path) => {
              const Icon = path.icon;
              return (
                <Link
                  key={path.id}
                  href={path.href}
                  className={`group relative overflow-hidden rounded-2xl border ${path.border} bg-gradient-to-br ${path.gradient} p-8 hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-white/5 border ${path.border} flex items-center justify-center mb-6`}>
                    <Icon className={`w-7 h-7 ${path.text}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">{path.title}</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed mb-6">{path.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${path.text} bg-white/5 px-3 py-1 rounded-full border ${path.border}`}>
                      {path.steps} milestones
                    </span>
                    <ArrowRight className={`w-5 h-5 ${path.text} opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
