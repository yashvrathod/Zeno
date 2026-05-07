'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Code,
  MoreHorizontal,
  TrendingUp,
  Heart,
  MessageSquare,
  Sparkles,
  Layers,
  Zap,
  Activity,
  ArrowUpRight,
  Share2,
  Terminal,
  Cpu,
  CheckCircle2,
  Circle,
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
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ApiOnboardingDialog from '@/components/ApiOnboardingDialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import MentorChat from '@/components/MentorChat';

type Post = {
  id: string;
  userId: string;
  content: string;
  codeSnippet?: string;
  language?: string;
  imageUrl?: string;
  tags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
  isLiked?: boolean;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
};

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

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function CodeZonePage() {
  const { data: session, status } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeFeed, setActiveFeed] = useState<'following' | 'featured' | 'rising'>('featured');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feed' | 'mentor'>('dashboard');

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/posts?feed=${activeFeed}&limit=20`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPosts(false);
    }
  }, [activeFeed]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsCreatingPost(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPostContent }),
      });
      if (res.ok) {
        setNewPostContent('');
        fetchPosts();
      }
    } finally {
      setIsCreatingPost(false);
    }
  };

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

  const stats = [
    { label: 'Problems Solved', value: '147', icon: CheckCircle2 },
    { label: 'Current Streak', value: '12', icon: Flame, suffix: 'days' },
    { label: 'Rank', value: '#2,847', icon: Trophy },
    { label: 'XP Earned', value: '8.4K', icon: Star },
  ];

  const recommendedProblems = [
    { id: '1', title: 'Two Sum', difficulty: 'Easy', tags: ['Array', 'Hash Table'], solved: true },
    { id: '2', title: 'Add Two Numbers', difficulty: 'Medium', tags: ['Linked List', 'Math'], solved: false },
    { id: '3', title: 'Longest Substring', difficulty: 'Medium', tags: ['String', 'Sliding Window'], solved: false },
    { id: '4', title: 'Median of Two Arrays', difficulty: 'Hard', tags: ['Array', 'Binary Search'], solved: false },
  ];

  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground font-sans">
      <Navbar />
      <ApiOnboardingDialog open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-background">
          {/* Tab Navigation */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="px-6 py-4">
              <div className="flex items-center gap-2 p-1 bg-secondary rounded-xl w-fit">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                  { id: 'mentor', label: 'AI Mentor', icon: Brain },
                  { id: 'feed', label: 'Community', icon: MessageSquare },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
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
              <div className="space-y-8">
                {/* Welcome Section */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      Welcome back
                    </h1>
                    <p className="text-muted-foreground">
                      Ready to continue your learning journey?
                    </p>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Play className="w-4 h-4 mr-2" />
                    Continue Learning
                  </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <Card key={index} className="border-border">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                              {stat.label}
                            </p>
                            <p className="text-3xl font-bold text-foreground">
                              {stat.value}
                              {stat.suffix && (
                                <span className="text-lg font-medium text-muted-foreground ml-1">
                                  {stat.suffix}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                            <stat.icon className="text-muted-foreground" size={24} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Learning Paths */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <BookOpen className="text-primary" size={22} />
                        Your Learning Paths
                      </h2>
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        View All
                        <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {learningPaths.map((path) => (
                        <Card key={path.id} className="border-border hover:border-border/80 transition-colors">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                                {path.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div>
                                    <h3 className="font-semibold text-foreground">
                                      {path.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                      {path.description}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className={`${
                                      path.difficulty === 'Beginner'
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : path.difficulty === 'Intermediate'
                                        ? 'bg-amber-500/10 text-amber-600'
                                        : 'bg-red-500/10 text-red-600'
                                    }`}
                                  >
                                    {path.difficulty}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                  <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    {path.timeEstimate}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Layers size={14} />
                                    {path.completedModules}/{path.totalModules} modules
                                  </span>
                                </div>

                                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                                  <div
                                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
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

                  {/* Recommended Problems */}
                  <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Target className="text-primary" size={22} />
                      For You
                    </h2>

                    <Card className="border-border">
                      <CardContent className="p-4 space-y-3">
                        {recommendedProblems.map((problem) => (
                          <div
                            key={problem.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {problem.solved ? (
                                <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                              ) : (
                                <Circle className="text-muted-foreground/40 shrink-0" size={20} />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {problem.title}
                                </p>
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 px-1.5 mt-1 rounded-md border-none ${
                                    problem.difficulty === 'Easy'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : problem.difficulty === 'Medium'
                                      ? 'bg-amber-500/10 text-amber-600'
                                      : 'bg-red-500/10 text-red-600'
                                  }`}
                                >
                                  {problem.difficulty}
                                </Badge>
                              </div>
                            </div>
                            <ChevronRight className="text-muted-foreground/40 shrink-0" size={18} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="bg-primary/5 border-border">
                      <CardContent className="p-6">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Lightbulb className="text-primary" size={18} />
                          Quick Actions
                        </h3>
                        <div className="space-y-2">
                          <Button
                            className="w-full justify-start bg-secondary hover:bg-secondary/80 text-foreground"
                            variant="outline"
                          >
                            <Zap className="mr-3" size={18} />
                            Daily Challenge
                          </Button>
                          <Button
                            className="w-full justify-start bg-secondary hover:bg-secondary/80 text-foreground"
                            variant="outline"
                          >
                            <Brain className="mr-3" size={18} />
                            Ask Mentor
                          </Button>
                          <Button
                            className="w-full justify-start bg-secondary hover:bg-secondary/80 text-foreground"
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

            {activeTab === 'feed' && (
              <div className="space-y-6 pb-8">
                {/* Feed Tabs */}
                <div className="flex items-center gap-2 p-1 bg-secondary rounded-xl w-fit">
                  {[
                    { id: 'featured', label: 'Featured', icon: <Sparkles size={15} /> },
                    { id: 'rising', label: 'Rising', icon: <TrendingUp size={15} /> },
                    { id: 'following', label: 'Following', icon: <Activity size={15} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFeed(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeFeed === tab.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Posts */}
                {loadingPosts ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-4">
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading feed...</span>
                  </div>
                ) : posts.length === 0 ? (
                  <Card className="border-border">
                    <CardContent className="py-16 text-center">
                      <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" size={48} />
                      <p className="text-foreground/60 font-medium mb-2">The feed is quiet right now</p>
                      <p className="text-muted-foreground text-sm">Be the first to share your insights!</p>
                    </CardContent>
                  </Card>
                ) : (
                  posts.map((post) => (
                    <Card key={post.id} className="border-border">
                      <CardHeader className="flex-row items-center justify-between space-y-0 p-6 pb-3">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-10 h-10 rounded-xl">
                            <AvatarImage src={post.user.image || ''} />
                            <AvatarFallback className="bg-secondary text-foreground text-sm font-semibold">
                              {post.user.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-semibold text-foreground">
                              {post.user.username || post.user.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {getTimeAgo(new Date(post.createdAt))}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                          <MoreHorizontal size={18} />
                        </Button>
                      </CardHeader>

                      <CardContent className="px-6 pb-4">
                        <p className="text-base text-foreground leading-relaxed">
                          {post.content}
                        </p>

                        {post.codeSnippet && (
                          <div className="mt-5 rounded-xl border border-border overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary">
                              <span className="text-xs text-muted-foreground font-medium">
                                {post.language || 'Code'}
                              </span>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                Copy
                              </Button>
                            </div>
                            <pre className="p-4 text-sm overflow-x-auto">
                              <code className="text-muted-foreground">{post.codeSnippet}</code>
                            </pre>
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="px-6 py-3 border-t border-border">
                        <div className="flex items-center gap-6 w-full">
                          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Heart size={18} />
                            <span className="text-sm font-medium">{post.likeCount}</span>
                          </button>
                          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <MessageSquare size={18} />
                            <span className="text-sm font-medium">{post.commentCount}</span>
                          </button>
                          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors ml-auto">
                            <Share2 size={18} />
                          </button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
