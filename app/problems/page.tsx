'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  Users,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
} from 'lucide-react';

type ApiPattern = {
  id: string;
  name: string;
  description: string | null;
  problemCount: number;
  problems: Array<{ id: string; slug: string; title: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }>;
};

type UiPattern = {
  id: string;
  name: string;
  description: string;
  icon: string;
  problemCount: number;
  completed: number;
  difficulty: string;
  problems: Array<{ id: string; title: string; difficulty: string; leetcodeId: string; status: 'unsolved' | 'attempted' | 'solved' }>;
};

async function fetchPatterns(): Promise<ApiPattern[]> {
  const res = await fetch('/api/patterns', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load patterns');
  const data = (await res.json()) as { patterns: ApiPattern[] };
  return data.patterns;
}

export default function ProblemsPage() {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [apiPatterns, setApiPatterns] = useState<ApiPattern[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchPatterns()
      .then((p) => {
        if (mounted) setApiPatterns(p);
      })
      .catch(() => {
        // fallback to empty; keep UI intact
        if (mounted) setApiPatterns([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const patterns: UiPattern[] = useMemo(() => {
    // Map backend patterns into the exact UI structure expected by current markup.
    // We keep existing fields like icon/completed/status as placeholders for now.
    if (apiPatterns) {
      return apiPatterns.map((p, idx) => {
        const iconPool = ['👆', '🪟', '🐇🐢', '📊', '🔍', '🏆', '🌳', '🌲', '🧠', '🔗'];
        const icon = iconPool[idx % iconPool.length];
        return {
          id: p.id,
          name: p.name,
          description: p.description ?? '',
          icon,
          problemCount: p.problemCount,
          completed: 0,
          difficulty: 'Mixed',
          problems: p.problems.map((pr) => ({
            id: pr.id,
            title: pr.title,
            difficulty: pr.difficulty === 'EASY' ? 'Easy' : pr.difficulty === 'MEDIUM' ? 'Medium' : 'Hard',
            // keep navigation working without changing UI: previously used leetcodeId
            leetcodeId: pr.slug,
            status: 'unsolved',
          })),
        };
      });
    }

    // Initial render fallback (while loading)
    return [];
  }, [apiPatterns]);

  // Patterns are now fetched from the backend (/api/patterns) and mapped into the same UI shape.
  // The old hardcoded seed data was removed.

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'Easy': return 'text-green-500';
      case 'Medium': return 'text-orange-500';
      case 'Hard': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'solved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'attempted': return <Clock className="w-4 h-4 text-orange-500" />;
      default: return <Circle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div
      className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden"
      style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
    >
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header - Minimal */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-1">Problems</h1>
              <p className="text-sm text-gray-500">Organized by patterns • 241 problems</p>
            </div>

            {/* Tabs for View Selection */}
            <div className="flex items-center gap-6 border-b border-zinc-800 mb-6">
              <button className="pb-3 border-b-2 border-orange-500 text-orange-500 font-medium text-sm">
                By Patterns
              </button>
              <button className="pb-3 text-gray-400 hover:text-white text-sm transition-colors">
                All Problems
              </button>
              <button className="pb-3 text-gray-400 hover:text-white text-sm transition-colors">
                Difficulty
              </button>
            </div>

            {/* Professional Table Layout */}
            <div className="bg-[#0f0f0f] border border-zinc-800 rounded-lg overflow-hidden">
              {/* Table */}
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pattern
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Total
                    </th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Solved
                    </th>
                    <th className="px-6 py-4 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {patterns.map((pattern, idx) => (
                    <React.Fragment key={pattern.id}>
                      <tr 
                        className="border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedPattern(expandedPattern === pattern.name ? null : pattern.name)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{pattern.icon}</span>
                            <div>
                              <div className="text-white font-medium">{pattern.name}</div>
                              <div className="text-xs text-gray-500">{pattern.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">
                                {Math.round((pattern.completed / pattern.problemCount) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-1.5">
                              <div 
                                className="bg-orange-500 h-1.5 rounded-full"
                                style={{width: `${(pattern.completed / pattern.problemCount) * 100}%`}}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white font-medium">{pattern.problemCount}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-orange-500 font-medium">{pattern.completed}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <ChevronDown 
                              className={`w-4 h-4 text-gray-500 transition-transform ${
                                expandedPattern === pattern.name ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded Problems */}
                      {expandedPattern === pattern.name && (
                        <tr>
                          <td colSpan={5} className="px-0 py-0">
                            <div className="bg-black border-t border-zinc-800">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-zinc-800">
                                    <th className="text-left px-10 py-3 text-xs font-medium text-gray-600 uppercase w-16">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase w-20">ID</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase">Title</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-600 uppercase w-32">Difficulty</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pattern.problems.map((problem) => (
                                    <tr 
                                      key={problem.id}
                                      className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors cursor-pointer"
                                      onClick={() => window.location.href = `/problems/${problem.leetcodeId}`}
                                    >
                                      <td className="px-10 py-3">
                                        {getStatusIcon(problem.status)}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-gray-500 text-sm">{problem.leetcodeId}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-white hover:text-orange-400 transition-colors">
                                          {problem.title}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`text-sm font-medium ${getDifficultyColor(problem.difficulty)}`}>
                                          {problem.difficulty}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="px-6 py-4 text-center border-t border-zinc-800">
                                <button className="text-sm text-orange-400 hover:text-orange-300 font-medium">
                                  View all {pattern.problemCount} problems ΓåÆ
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Stats & Info */}
        <aside className="w-80 bg-[#0f0f0f] border-l border-zinc-800 p-4 hidden xl:block overflow-y-auto">
          {/* Daily Challenge */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-white" />
              <h3 className="text-white font-bold">Daily Challenge</h3>
            </div>
            <p className="text-sm text-orange-100 mb-3">
              Complete today&apos;s challenge and earn bonus points!
            </p>
            <button className="w-full bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-50 transition-colors">
              Start Challenge
            </button>
          </div>

          {/* Study Plan */}
          <div className="mb-6">
            <h3 className="text-white font-bold mb-4">Study Plans</h3>
            <div className="space-y-3">
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 cursor-pointer transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium">LeetCode 75</span>
                  <span className="text-xs text-gray-400">12/75</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{width: '16%'}}></div>
                </div>
              </div>
              
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 cursor-pointer transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white font-medium">Top Interview 150</span>
                  <span className="text-xs text-gray-400">5/150</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5">
                  <div className="bg-orange-500 h-1.5 rounded-full" style={{width: '3%'}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Popular Topics */}
          <div>
            <h3 className="text-white font-bold mb-4">Popular Topics</h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">Array</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">String</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">Dynamic Programming</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">Tree</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">Graph</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">Binary Search</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">Hash Table</span>
              <span className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer">Linked List</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
