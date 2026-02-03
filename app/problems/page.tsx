'use client';

import React, { useState } from 'react';
import { 
  Home,
  Users,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Bell,
  Settings,
  Search,
  Code,
  Filter,
  ChevronDown,
  CheckCircle2,
  Circle,
  Clock,
  TrendingUp,
  BarChart3,
  Target
} from 'lucide-react';

export default function ProblemsPage() {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);

  const patterns = [
    {
      id: 1,
      name: "Two Pointers",
      description: "Use two pointers to solve problems efficiently in linear time",
      icon: "👆",
      problemCount: 25,
      completed: 8,
      difficulty: "Easy to Medium",
      problems: [
        { id: 1, title: "Two Sum II - Input Array Is Sorted", difficulty: "Easy", leetcodeId: 167, status: "solved" },
        { id: 11, title: "Container With Most Water", difficulty: "Medium", leetcodeId: 11, status: "solved" },
        { id: 15, title: "3Sum", difficulty: "Medium", leetcodeId: 15, status: "attempted" },
        { id: 42, title: "Trapping Rain Water", difficulty: "Hard", leetcodeId: 42, status: "unsolved" },
        { id: 125, title: "Valid Palindrome", difficulty: "Easy", leetcodeId: 125, status: "solved" },
      ]
    },
    {
      id: 2,
      name: "Sliding Window",
      description: "Master the sliding window technique for substring and subarray problems",
      icon: "🪟",
      problemCount: 20,
      completed: 5,
      difficulty: "Medium",
      problems: [
        { id: 3, title: "Longest Substring Without Repeating Characters", difficulty: "Medium", leetcodeId: 3, status: "solved" },
        { id: 76, title: "Minimum Window Substring", difficulty: "Hard", leetcodeId: 76, status: "unsolved" },
        { id: 438, title: "Find All Anagrams in a String", difficulty: "Medium", leetcodeId: 438, status: "attempted" },
        { id: 567, title: "Permutation in String", difficulty: "Medium", leetcodeId: 567, status: "unsolved" },
        { id: 424, title: "Longest Repeating Character Replacement", difficulty: "Medium", leetcodeId: 424, status: "solved" },
      ]
    },
    {
      id: 3,
      name: "Fast & Slow Pointers",
      description: "Detect cycles and find middle elements using two-speed pointers",
      icon: "🐢🐇",
      problemCount: 15,
      completed: 3,
      difficulty: "Easy to Medium",
      problems: [
        { id: 141, title: "Linked List Cycle", difficulty: "Easy", leetcodeId: 141, status: "solved" },
        { id: 142, title: "Linked List Cycle II", difficulty: "Medium", leetcodeId: 142, status: "solved" },
        { id: 876, title: "Middle of the Linked List", difficulty: "Easy", leetcodeId: 876, status: "solved" },
        { id: 202, title: "Happy Number", difficulty: "Easy", leetcodeId: 202, status: "unsolved" },
        { id: 287, title: "Find the Duplicate Number", difficulty: "Medium", leetcodeId: 287, status: "unsolved" },
      ]
    },
    {
      id: 4,
      name: "Merge Intervals",
      description: "Learn to merge and handle overlapping intervals efficiently",
      icon: "📊",
      problemCount: 12,
      completed: 2,
      difficulty: "Medium",
      problems: [
        { id: 56, title: "Merge Intervals", difficulty: "Medium", leetcodeId: 56, status: "solved" },
        { id: 57, title: "Insert Interval", difficulty: "Medium", leetcodeId: 57, status: "attempted" },
        { id: 252, title: "Meeting Rooms", difficulty: "Easy", leetcodeId: 252, status: "unsolved" },
        { id: 253, title: "Meeting Rooms II", difficulty: "Medium", leetcodeId: 253, status: "unsolved" },
        { id: 435, title: "Non-overlapping Intervals", difficulty: "Medium", leetcodeId: 435, status: "unsolved" },
      ]
    },
    {
      id: 5,
      name: "Binary Search",
      description: "Master binary search variations and applications",
      icon: "🔍",
      problemCount: 30,
      completed: 10,
      difficulty: "Easy to Hard",
      problems: [
        { id: 704, title: "Binary Search", difficulty: "Easy", leetcodeId: 704, status: "solved" },
        { id: 33, title: "Search in Rotated Sorted Array", difficulty: "Medium", leetcodeId: 33, status: "solved" },
        { id: 4, title: "Median of Two Sorted Arrays", difficulty: "Hard", leetcodeId: 4, status: "unsolved" },
        { id: 153, title: "Find Minimum in Rotated Sorted Array", difficulty: "Medium", leetcodeId: 153, status: "attempted" },
        { id: 74, title: "Search a 2D Matrix", difficulty: "Medium", leetcodeId: 74, status: "solved" },
      ]
    },
    {
      id: 6,
      name: "Top K Elements",
      description: "Use heaps to efficiently find top K elements",
      icon: "🏆",
      problemCount: 18,
      completed: 4,
      difficulty: "Medium to Hard",
      problems: [
        { id: 215, title: "Kth Largest Element in an Array", difficulty: "Medium", leetcodeId: 215, status: "solved" },
        { id: 347, title: "Top K Frequent Elements", difficulty: "Medium", leetcodeId: 347, status: "solved" },
        { id: 692, title: "Top K Frequent Words", difficulty: "Medium", leetcodeId: 692, status: "attempted" },
        { id: 973, title: "K Closest Points to Origin", difficulty: "Medium", leetcodeId: 973, status: "unsolved" },
        { id: 767, title: "Reorganize String", difficulty: "Medium", leetcodeId: 767, status: "unsolved" },
      ]
    },
    {
      id: 7,
      name: "Tree BFS",
      description: "Level-order traversal and breadth-first search in trees",
      icon: "🌳",
      problemCount: 16,
      completed: 6,
      difficulty: "Easy to Medium",
      problems: [
        { id: 102, title: "Binary Tree Level Order Traversal", difficulty: "Medium", leetcodeId: 102, status: "solved" },
        { id: 107, title: "Binary Tree Level Order Traversal II", difficulty: "Medium", leetcodeId: 107, status: "solved" },
        { id: 103, title: "Binary Tree Zigzag Level Order Traversal", difficulty: "Medium", leetcodeId: 103, status: "attempted" },
        { id: 637, title: "Average of Levels in Binary Tree", difficulty: "Easy", leetcodeId: 637, status: "solved" },
        { id: 199, title: "Binary Tree Right Side View", difficulty: "Medium", leetcodeId: 199, status: "unsolved" },
      ]
    },
    {
      id: 8,
      name: "Tree DFS",
      description: "Depth-first search patterns for tree problems",
      icon: "🌲",
      problemCount: 20,
      completed: 7,
      difficulty: "Easy to Hard",
      problems: [
        { id: 112, title: "Path Sum", difficulty: "Easy", leetcodeId: 112, status: "solved" },
        { id: 113, title: "Path Sum II", difficulty: "Medium", leetcodeId: 113, status: "solved" },
        { id: 257, title: "Binary Tree Paths", difficulty: "Easy", leetcodeId: 257, status: "solved" },
        { id: 124, title: "Binary Tree Maximum Path Sum", difficulty: "Hard", leetcodeId: 124, status: "unsolved" },
        { id: 543, title: "Diameter of Binary Tree", difficulty: "Easy", leetcodeId: 543, status: "attempted" },
      ]
    },
    {
      id: 9,
      name: "Graph BFS/DFS",
      description: "Graph traversal algorithms and applications",
      icon: "🕸️",
      problemCount: 25,
      completed: 3,
      difficulty: "Medium to Hard",
      problems: [
        { id: 200, title: "Number of Islands", difficulty: "Medium", leetcodeId: 200, status: "solved" },
        { id: 133, title: "Clone Graph", difficulty: "Medium", leetcodeId: 133, status: "attempted" },
        { id: 207, title: "Course Schedule", difficulty: "Medium", leetcodeId: 207, status: "unsolved" },
        { id: 417, title: "Pacific Atlantic Water Flow", difficulty: "Medium", leetcodeId: 417, status: "unsolved" },
        { id: 127, title: "Word Ladder", difficulty: "Hard", leetcodeId: 127, status: "unsolved" },
      ]
    },
    {
      id: 10,
      name: "Dynamic Programming",
      description: "Master DP patterns: 1D, 2D, knapsack, LIS, and more",
      icon: "💡",
      problemCount: 40,
      completed: 5,
      difficulty: "Medium to Hard",
      problems: [
        { id: 70, title: "Climbing Stairs", difficulty: "Easy", leetcodeId: 70, status: "solved" },
        { id: 198, title: "House Robber", difficulty: "Medium", leetcodeId: 198, status: "solved" },
        { id: 322, title: "Coin Change", difficulty: "Medium", leetcodeId: 322, status: "attempted" },
        { id: 300, title: "Longest Increasing Subsequence", difficulty: "Medium", leetcodeId: 300, status: "unsolved" },
        { id: 72, title: "Edit Distance", difficulty: "Hard", leetcodeId: 72, status: "unsolved" },
      ]
    },
    {
      id: 11,
      name: "Backtracking",
      description: "Explore all possibilities: permutations, combinations, subsets",
      icon: "🔄",
      problemCount: 22,
      completed: 4,
      difficulty: "Medium to Hard",
      problems: [
        { id: 78, title: "Subsets", difficulty: "Medium", leetcodeId: 78, status: "solved" },
        { id: 46, title: "Permutations", difficulty: "Medium", leetcodeId: 46, status: "solved" },
        { id: 39, title: "Combination Sum", difficulty: "Medium", leetcodeId: 39, status: "attempted" },
        { id: 51, title: "N-Queens", difficulty: "Hard", leetcodeId: 51, status: "unsolved" },
        { id: 79, title: "Word Search", difficulty: "Medium", leetcodeId: 79, status: "unsolved" },
      ]
    },
    {
      id: 12,
      name: "Greedy Algorithms",
      description: "Make locally optimal choices for global optimization",
      icon: "🎯",
      problemCount: 18,
      completed: 6,
      difficulty: "Medium",
      problems: [
        { id: 55, title: "Jump Game", difficulty: "Medium", leetcodeId: 55, status: "solved" },
        { id: 45, title: "Jump Game II", difficulty: "Medium", leetcodeId: 45, status: "attempted" },
        { id: 134, title: "Gas Station", difficulty: "Medium", leetcodeId: 134, status: "unsolved" },
        { id: 763, title: "Partition Labels", difficulty: "Medium", leetcodeId: 763, status: "solved" },
        { id: 621, title: "Task Scheduler", difficulty: "Medium", leetcodeId: 621, status: "unsolved" },
      ]
    },
  ];

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
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
      {/* Top Header */}
      <header className="bg-[#0f0f0f] border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Code className="w-6 h-6 text-white" />
            <span className="text-white font-semibold text-lg">code.zone</span>
          </div>
          
          <div className="hidden md:flex items-center bg-[#1a1a1a] rounded-lg px-4 py-2 w-64 lg:w-96">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input 
              type="text" 
              placeholder="Search problems..."
              className="bg-transparent border-none outline-none text-sm text-gray-300 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-400 hover:text-white text-sm hidden lg:block">Feed</a>
          <a href="/problems" className="text-orange-500 hover:text-orange-400 text-sm hidden lg:block">Problems</a>
          <button className="text-gray-400 hover:text-white text-sm hidden lg:block">Discuss</button>
          <a href="/profile">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
              alt="Profile"
              className="w-8 h-8 rounded-full hover:opacity-80 transition-opacity cursor-pointer"
            />
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-[#0f0f0f] border-r border-zinc-800 p-4 hidden lg:block overflow-y-auto">
          <nav className="space-y-1">
            <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
              My Feed
            </a>
            <a href="/problems" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-orange-500/20 to-orange-600/10 text-orange-400 font-medium">
              <Target className="w-5 h-5" />
              Problems
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
              Progress
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-zinc-900 hover:text-white transition-colors">
              <Users className="w-5 h-5" />
              Leaderboard
            </a>
          </nav>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Your Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Easy</span>
                <span className="text-sm text-green-500 font-semibold">12/150</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{width: '8%'}}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Medium</span>
                <span className="text-sm text-orange-500 font-semibold">8/200</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full" style={{width: '4%'}}></div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Hard</span>
                <span className="text-sm text-red-500 font-semibold">0/100</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5">
                <div className="bg-red-500 h-1.5 rounded-full" style={{width: '0%'}}></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <a href="/profile" className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-900 rounded-lg transition-colors">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"
                alt="Robert J."
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Robert J.</p>
                <p className="text-xs text-gray-400">@robert_dev</p>
              </div>
            </a>
          </div>
        </aside>

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
                                  View all {pattern.problemCount} problems →
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
              Complete today's challenge and earn bonus points!
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
