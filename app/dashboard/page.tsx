'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Code,
  TrendingUp,
  Sparkles,
  Layers,
  Zap,
  Activity,
  ChevronRight,
  Flame,
  Star,
  Brain,
  BookOpen,
  Trophy,
  Target,
  Lightbulb,
  Clock,
  BarChart3,
  Play,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ApiOnboardingDialog from '@/components/ApiOnboardingDialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import MentorChat from '@/components/MentorChat';

type LearningPath = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  totalModules: number;
  completedModules: number;
  timeEstimate: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
};

type PatternIntelligence = {
  pattern: string;
  count: number;
  description: string;
  improvement: number;
};

type MomentumData = {
  consistency: number;
  improvement: number;
  speed: number;
  difficulty: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
  suffix,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="bg-[#1a1a2e]/50 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-purple-300/80 uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-3xl font-bold text-white">
              {value}
              {suffix && (
                <span className="text-lg font-medium text-purple-300/80 ml-1">
                  {suffix}
                </span>
              )}
            </p>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${
                trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-purple-300'
              }`}>
                <TrendingUp size={12} className={trend === 'down' ? 'rotate-180' : ''} />
                <span>{trend === 'up' ? 'Improving' : trend === 'down' ? 'Needs attention' : 'Stable'}</span>
              </div>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center border border-purple-500/30">
            <Icon className="text-purple-300" size={26} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatternCard({ pattern, count, description, improvement }: PatternIntelligence) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {pattern === 'Off-by-one' && <AlertTriangle className="text-amber-400" size={20} />}
          {pattern === 'Wrong base case' && <HelpCircle className="text-blue-400" size={20} />}
          {pattern === 'Greedy misapplication' && <AlertTriangle className="text-red-400" size={20} />}
          {pattern === 'Missing edge case' && <AlertTriangle className="text-orange-400" size={20} />}
          <div>
            <h4 className="font-semibold text-white text-sm">{pattern}</h4>
            <p className="text-xs text-purple-300/70 mt-0.5">{count} occurrences</p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
        >
          {improvement}% improving
        </Badge>
      </div>
      <p className="text-xs text-purple-200/70 leading-relaxed">{description}</p>
      <div className="mt-3 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${improvement}%` }}
        />
      </div>
    </div>
  );
}

function MomentumGauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="relative w-20 h-20 mx-auto mb-3">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-purple-900/50"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            stroke={`var(${color})`}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - value / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{value}%</span>
        </div>
      </div>
      <p className="text-xs text-purple-300/80 font-medium">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'problems' | 'mentor'>('dashboard');

  const stats = [
    { label: 'Problems Solved', value: '147', icon: CheckCircle2, trend: 'up' as const },
    { label: 'Current Streak', value: '12', icon: Flame, suffix: 'days', trend: 'up' as const },
    { label: 'Rank', value: '#2,847', icon: Trophy, trend: 'up' as const },
    { label: 'XP Earned', value: '8.4K', icon: Star, trend: 'neutral' as const },
  ];

  const learningPaths: LearningPath[] = [
    {
      id: '1',
      title: 'Arrays & Hashing',
      description: 'Master fundamental data structures',
      icon: <Layers className="w-5 h-5" />,
      progress: 67,
      totalModules: 12,
      completedModules: 8,
      timeEstimate: '4 hours',
      difficulty: 'Beginner',
    },
    {
      id: '2',
      title: 'Two Pointers',
      description: 'Optimize your array traversal',
      icon: <Target className="w-5 h-5" />,
      progress: 34,
      totalModules: 8,
      completedModules: 3,
      timeEstimate: '2.5 hours',
      difficulty: 'Intermediate',
    },
    {
      id: '3',
      title: 'Sliding Window',
      description: 'Efficient subarray problems',
      icon: <Zap className="w-5 h-5" />,
      progress: 0,
      totalModules: 10,
      completedModules: 0,
      timeEstimate: '3 hours',
      difficulty: 'Intermediate',
    },
    {
      id: '4',
      title: 'Dynamic Programming',
      description: 'Build optimal solutions bottom-up',
      icon: <Brain className="w-5 h-5" />,
      progress: 15,
      totalModules: 20,
      completedModules: 3,
      timeEstimate: '8 hours',
      difficulty: 'Advanced',
    },
  ];

  const patternIntelligence: PatternIntelligence[] = [
    {
      pattern: 'Off-by-one',
      count: 12,
      description: 'Common in loop boundaries and array indexing',
      improvement: 45,
    },
    {
      pattern: 'Wrong base case',
      count: 8,
      description: 'Recursive solutions need proper termination conditions',
      improvement: 62,
    },
    {
      pattern: 'Missing edge case',
      count: 15,
      description: 'Empty arrays, single elements, and boundary values',
      improvement: 38,
    },
    {
      pattern: 'Greedy misapplication',
      count: 5,
      description: 'Not all problems can be solved with greedy approach',
      improvement: 25,
    },
  ];

  const momentum: MomentumData = {
    consistency: 78,
    improvement: 85,
    speed: 67,
    difficulty: 72,
  };

  const recommendedProblems = [
    { id: '1', title: 'Two Sum', difficulty: 'Easy', tags: ['Array', 'Hash Table'], solved: true },
    { id: '2', title: 'Add Two Numbers', difficulty: 'Medium', tags: ['Linked List', 'Math'], solved: false },
    { id: '3', title: 'Longest Substring', difficulty: 'Medium', tags: ['String', 'Sliding Window'], solved: false },
    { id: '4', title: 'Median of Two Arrays', difficulty: 'Hard', tags: ['Array', 'Binary Search'], solved: false },
  ];

  return (
    <div className="relative flex flex-col h-screen bg-gradient-to-br from-[#0f0f1f] via-[#1a1a2e] to-[#16213e] text-foreground font-sans">
      <Navbar />
      <ApiOnboardingDialog open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          {/* Tab Navigation */}
          <div className="sticky top-0 z-20 bg-[#0f0f1f]/95 backdrop-blur-md border-b border-purple-500/20">
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 p-1 bg-purple-900/30 rounded-xl w-fit border border-purple-500/20">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                  { id: 'problems', label: 'Problems', icon: Code },
                  { id: 'mentor', label: 'AI Mentor', icon: Brain },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                          : 'text-purple-300/70 hover:text-purple-200 hover:bg-purple-500/10'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-8">
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Welcome Section */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                      Welcome back, {session?.user?.name || 'Developer'}!
                    </h1>
                    <p className="text-purple-300/70">
                      Continue your learning journey with personalized recommendations
                    </p>
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25">
                    <Play className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                  ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Learning Paths */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <BookOpen className="text-purple-400" size={22} />
                        Your Learning Paths
                      </h2>
                      <Button variant="ghost" size="sm" className="text-purple-300/70 hover:text-purple-200">
                        View All
                        <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {learningPaths.map((path) => (
                        <Card key={path.id} className="bg-[#1a1a2e]/50 border-purple-500/20 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center border border-purple-500/30">
                                {path.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div>
                                    <h3 className="font-semibold text-white">
                                      {path.title}
                                    </h3>
                                    <p className="text-sm text-purple-300/70 mt-0.5">
                                      {path.description}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className={`${
                                      path.difficulty === 'Beginner'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : path.difficulty === 'Intermediate'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    }`}
                                  >
                                    {path.difficulty}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-purple-300/70 mb-3">
                                  <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {path.timeEstimate}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Layers size={14} />
                                    {path.completedModules}/{path.totalModules} modules
                                  </span>
                                </div>

                                <div className="relative h-2 bg-purple-900/50 rounded-full overflow-hidden">
                                  <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${path.progress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Content */}
                  <div className="space-y-6">
                    {/* Pattern Intelligence */}
                    <Card className="bg-[#1a1a2e]/50 border-purple-500/20 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-white">
                          <Brain className="text-purple-400" size={20} />
                          Pattern Intelligence
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {patternIntelligence.map((pattern, index) => (
                          <PatternCard key={index} {...pattern} />
                        ))}
                      </CardContent>
                    </Card>

                    {/* Learning Momentum */}
                    <Card className="bg-[#1a1a2e]/50 border-purple-500/20 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-white">
                          <Activity className="text-purple-400" size={20} />
                          Learning Momentum
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <MomentumGauge
                            label="Consistency"
                            value={momentum.consistency}
                            color="--purple-400"
                          />
                          <MomentumGauge
                            label="Improvement"
                            value={momentum.improvement}
                            color="--emerald-400"
                          />
                          <MomentumGauge
                            label="Speed"
                            value={momentum.speed}
                            color="--amber-400"
                          />
                          <MomentumGauge
                            label="Difficulty"
                            value={momentum.difficulty}
                            color="--indigo-400"
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Recommended Problems */}
                    <Card className="bg-[#1a1a2e]/50 border-purple-500/20 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-white">
                          <Target className="text-purple-400" size={20} />
                          Recommended
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {recommendedProblems.map((problem) => (
                          <div
                            key={problem.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-purple-500/10 transition-colors cursor-pointer border border-transparent hover:border-purple-500/20"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {problem.solved ? (
                                <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-purple-500/40 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-white truncate text-sm">
                                  {problem.title}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 px-1.5 mt-1 rounded-md border-none ${
                                    problem.difficulty === 'Easy'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : problem.difficulty === 'Medium'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-red-500/20 text-red-300'
                                  }`}
                                >
                                  {problem.difficulty}
                                </Badge>
                              </div>
                            </div>
                            <ChevronRight className="text-purple-400/40 shrink-0" size={16} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border-purple-500/30 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                          <Lightbulb className="text-purple-400" size={18} />
                          Quick Actions
                        </h3>
                        <div className="space-y-2">
                          <Button
                            className="w-full justify-start bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30"
                            variant="outline"
                          >
                            <Zap className="mr-3" size={18} />
                            Daily Challenge
                          </Button>
                          <Button
                            className="w-full justify-start bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30"
                            variant="outline"
                          >
                            <Brain className="mr-3" size={18} />
                            Ask AI Mentor
                          </Button>
                          <Button
                            className="w-full justify-start bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30"
                            variant="outline"
                          >
                            <BarChart3 className="mr-3" size={18} />
                            View Analytics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mentor' && (
              <div className="h-[calc(100vh-280px)] px-6">
                <MentorChat
                  problemId="sample-problem"
                  problemTitle="Two Sum"
                  problemStatementMd="# Problem Statement\n\nGiven an array of integers, find two numbers that add up to a specific target."
                  problemConstraintsMd="- **Constraints**:\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9"
                  publicTestCases={[
                    { order: 1, input: '[2,7,11,15], target = 9', expected: '[0,1]' },
                  ]}
                  language="javascript"
                  userCode=""
                />
              </div>
            )}

            {activeTab === 'problems' && (
              <div className="flex items-center justify-center h-[60vh] text-center">
                <div>
                  <Code className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Problems Library</h2>
                  <p className="text-purple-300/70">Browse and solve coding problems</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}