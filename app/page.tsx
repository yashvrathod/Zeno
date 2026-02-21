'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import {
  Camera,
  Code,
  MoreVertical,
  ThumbsUp,
  TrendingUp,
  Flame,
  Heart,
  Rocket,
  MessageCircle,
  X,
  Send,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ApiOnboardingDialog from '@/components/ApiOnboardingDialog';

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

type TrendingTopic = {
  id: string;
  tag: string;
  postCount: number;
  weekCount: number;
};

type Discussion = {
  id: string;
  content: string;
  commentCount: number;
  createdAt: string;
};

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function CodeZonePage() {
  const { data: session, status } = useSession();
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = React.useState(false);
  
  // Feed state
  const [activeFeed, setActiveFeed] = React.useState<'following' | 'featured' | 'rising'>('following');
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = React.useState(true);
  
  // New post state
  const [newPostContent, setNewPostContent] = React.useState('');
  const [newPostCode, setNewPostCode] = React.useState('');
  const [isCreatingPost, setIsCreatingPost] = React.useState(false);
  
  // Trending & discussions
  const [trendingTopics, setTrendingTopics] = React.useState<TrendingTopic[]>([]);
  const [topDiscussions, setTopDiscussions] = React.useState<Discussion[]>([]);
  const [followedChannels, setFollowedChannels] = React.useState<Set<string>>(new Set());

  // Fetch posts
  const fetchPosts = React.useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/posts?feed=${activeFeed}&limit=20`);
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [activeFeed]);

  // Fetch trending topics
  const fetchTrending = async () => {
    try {
      const res = await fetch('/api/trending?limit=10');
      const data = await res.json();
      setTrendingTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to fetch trending topics:', error);
    }
  };

  // Fetch top discussions
  const fetchDiscussions = async () => {
    try {
      const res = await fetch('/api/discussions/top?limit=5');
      const data = await res.json();
      setTopDiscussions(data.discussions || []);
    } catch (error) {
      console.error('Failed to fetch discussions:', error);
    }
  };

  // Create new post
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    
    setIsCreatingPost(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPostContent,
          codeSnippet: newPostCode || undefined,
          language: newPostCode ? 'javascript' : undefined,
        }),
      });

      if (res.ok) {
        setNewPostContent('');
        setNewPostCode('');
        fetchPosts(); // Refresh feed
      }
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsCreatingPost(false);
    }
  };

  // Toggle like on post
  const handleToggleLike = async (postId: string, isLiked: boolean) => {
    try {
      const method = isLiked ? 'DELETE' : 'POST';
      const res = await fetch(`/api/posts/${postId}/like`, { method });

      if (res.ok) {
        setPosts(prev => prev.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isLiked: !isLiked,
                likeCount: isLiked ? post.likeCount - 1 : post.likeCount + 1
              }
            : post
        ));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // Toggle follow channel
  const handleToggleChannel = async (channelId: string) => {
    try {
      const isFollowing = followedChannels.has(channelId);
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(`/api/channels/${channelId}/follow`, { method });

      if (res.ok) {
        setFollowedChannels(prev => {
          const next = new Set(prev);
          if (isFollowing) {
            next.delete(channelId);
          } else {
            next.add(channelId);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to toggle channel follow:', error);
    }
  };

  // Check if user needs onboarding
  React.useEffect(() => {
    if (status === 'authenticated' && !hasCheckedOnboarding) {
      setHasCheckedOnboarding(true);
      
      // Check if user has completed onboarding
      fetch('/api/settings/ai')
        .then(res => res.json())
        .then(data => {
          if (!data.hasCompletedOnboarding) {
            // Show onboarding after a short delay for better UX
            setTimeout(() => setShowOnboarding(true), 1000);
          }
        })
        .catch(err => console.error('Failed to check onboarding status:', err));
    }
  }, [status, hasCheckedOnboarding]);

  // Fetch posts when feed changes
  React.useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Fetch trending and discussions on mount
  React.useEffect(() => {
    fetchTrending();
    fetchDiscussions();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
      <Navbar />
      
      {/* API Onboarding Dialog */}
      <ApiOnboardingDialog 
        open={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          <div className="max-w-3xl mx-auto p-4">
            {/* New Post Section */}
            {status === 'authenticated' && (
              <div className="bg-[#0f0f0f] border border-zinc-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <img 
                    src={session?.user?.image || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop"}
                    alt="User"
                    className="w-10 h-10 rounded-full"
                  />
                  <textarea 
                    placeholder="Share your coding insights..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-gray-300 placeholder:text-gray-600 resize-none"
                    rows={newPostContent ? 3 : 1}
                  />
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <button className="p-2 hover:bg-zinc-900 rounded-lg transition-colors" title="Add image (coming soon)">
                    <Camera className="w-5 h-5" />
                  </button>
                  <button 
                    className="p-2 hover:bg-zinc-900 rounded-lg transition-colors"
                    title="Add code snippet (coming soon)"
                  >
                    <Code className="w-5 h-5" />
                  </button>
                  <span className="text-sm ml-2 text-gray-600">Use #hashtags</span>
                  <button 
                    onClick={handleCreatePost}
                    disabled={!newPostContent.trim() || isCreatingPost}
                    className="ml-auto bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreatingPost ? 'Posting...' : <><Send className="w-4 h-4" /> Post</>}
                  </button>
                </div>
              </div>
            )}

            {/* Feed Tabs */}
            <div className="flex items-center gap-6 mb-6 border-b border-zinc-800">
              <button 
                onClick={() => setActiveFeed('following')}
                className={`flex items-center gap-2 px-1 pb-3 border-b-2 font-medium transition-colors ${
                  activeFeed === 'following' 
                    ? 'border-pink-500 text-pink-500' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${activeFeed === 'following' ? 'fill-current' : ''}`} />
                Following
              </button>
              <button 
                onClick={() => setActiveFeed('featured')}
                className={`flex items-center gap-2 px-1 pb-3 border-b-2 font-medium transition-colors ${
                  activeFeed === 'featured' 
                    ? 'border-orange-500 text-orange-500' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Flame className={`w-4 h-4 ${activeFeed === 'featured' ? 'fill-current' : ''}`} />
                Featured
              </button>
              <button 
                onClick={() => setActiveFeed('rising')}
                className={`flex items-center gap-2 px-1 pb-3 border-b-2 font-medium transition-colors ${
                  activeFeed === 'rising' 
                    ? 'border-blue-500 text-blue-500' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Rocket className={`w-4 h-4 ${activeFeed === 'rising' ? 'fill-current' : ''}`} />
                Rising
              </button>
            </div>

            {/* Posts Feed */}
            {loadingPosts ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading posts...
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-2">No posts yet in this feed.</p>
                {activeFeed === 'following' && (
                  <p className="text-sm">Follow users to see their posts here!</p>
                )}
              </div>
            ) : (
              posts.map((post) => {
                const timeAgo = getTimeAgo(new Date(post.createdAt));
                
                return (
                  <article key={post.id} className="bg-[#0f0f0f] border border-zinc-800 rounded-lg overflow-hidden mb-6">
                    <div className="p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <img 
                          src={post.user.image || `https://ui-avatars.com/api/?name=${post.user.name || 'User'}&background=random`}
                          alt={post.user.name || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">{post.user.username || post.user.name || 'Anonymous'}</span>
                            <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                          </div>
                          <span className="text-sm text-gray-500">{timeAgo}</span>
                        </div>
                        <button className="ml-auto text-gray-500 hover:text-white">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="mb-4">
                        {post.codeSnippet && (
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-4 h-4 text-blue-400" />
                            <span className="text-sm text-gray-400">{post.language || 'Code'}</span>
                          </div>
                        )}
                        
                        <p className="text-gray-300 mb-4 leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>

                        {post.codeSnippet && (
                          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-zinc-800 mb-3">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
                              <span className="text-xs text-gray-500">{post.language || 'Code snippet'}</span>
                              <button className="text-gray-500 hover:text-white">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>
                            </div>
                            <pre className="text-sm overflow-x-auto" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                              <code className="text-gray-300" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                                {post.codeSnippet}
                              </code>
                            </pre>
                          </div>
                        )}
                      </div>

                      {post.tags.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                          {post.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs text-gray-500 px-2 py-1 bg-zinc-900 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-6 pt-4 border-t border-zinc-800">
                        <button 
                          onClick={() => handleToggleLike(post.id, post.isLiked || false)}
                          className={`flex items-center gap-2 transition-colors ${
                            post.isLiked ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'
                          }`}
                          disabled={status !== 'authenticated'}
                        >
                          <ThumbsUp className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{post.likeCount}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-400 hover:text-blue-500 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm">{post.commentCount}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-400 hover:text-green-500 transition-colors">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm">{post.shareCount}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="w-80 bg-[#0f0f0f] border-l border-zinc-800 p-4 hidden xl:block overflow-y-auto">
          {/* Introducing Pro Banner */}
          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-4 mb-6 relative overflow-hidden">
            <button className="absolute top-2 right-2 text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-2 mb-2">
              <span className="text-orange-200 text-lg">🌟</span>
              <h3 className="text-white font-bold">Introducing Pro</h3>
            </div>
            <p className="text-sm text-orange-100 mb-4">
              Boost your publishing with our new premium features.
            </p>
            <div className="flex gap-2">
              <button className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-50 transition-colors">
                Upgrade Now
              </button>
              <button className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors">
                Explore
              </button>
            </div>
          </div>

          {/* Trending Topics */}
          <div className="mb-6">
            <h3 className="text-white font-bold mb-4">Trending Topics</h3>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.length === 0 ? (
                <p className="text-sm text-gray-500">No trending topics yet</p>
              ) : (
                trendingTopics.map((topic) => (
                  <span 
                    key={topic.id} 
                    className="px-3 py-1 bg-zinc-900 text-gray-300 rounded-full text-sm hover:bg-zinc-800 cursor-pointer"
                  >
                    #{topic.tag}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Official Channels */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-white font-bold">Official Channels</h3>
              <span className="text-orange-500">🌟</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  VS
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">VS Code</div>
                </div>
                <button 
                  onClick={() => handleToggleChannel('vscode')}
                  className="text-xs text-gray-400 hover:text-white px-3 py-1 border border-zinc-700 rounded hover:border-zinc-600 transition-colors"
                >
                  {followedChannels.has('vscode') ? 'Following' : 'Follow'}
                </button>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  R
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">React</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                  <Code className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">Shadcn/UI</div>
                </div>
                <button 
                  onClick={() => handleToggleChannel('shadcn')}
                  className="text-xs text-gray-400 hover:text-white px-3 py-1 border border-zinc-700 rounded hover:border-zinc-600 transition-colors"
                >
                  {followedChannels.has('shadcn') ? 'Following' : 'Follow'}
                </button>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  C
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">ChatGPT</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                <div className="w-8 h-8 bg-sky-600 rounded flex items-center justify-center text-white text-xs font-bold">
                  T
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white">Tailwind CSS</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Discussions */}
          <div>
            <h3 className="text-white font-bold mb-4">Top Discussions this Week</h3>
            <div className="space-y-4">
              {topDiscussions.length === 0 ? (
                <p className="text-sm text-gray-500">No discussions yet</p>
              ) : (
                topDiscussions.map((discussion) => (
                  <div key={discussion.id} className="text-sm">
                    <p className="text-gray-300 hover:text-white cursor-pointer mb-1 line-clamp-2">
                      {discussion.content.substring(0, 100)}...
                    </p>
                    <span className="text-xs text-gray-500">{discussion.commentCount} comments</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
