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
  Globe,
  Radio,
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

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Signal Live';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

export default function CodeZonePage() {
  const { data: session, status } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeFeed, setActiveFeed] = useState<'following' | 'featured' | 'rising'>('featured');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isCreatingPost, setIsCreatingPost] = useState(false);

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

  return (
    <div className="relative flex flex-col h-screen bg-[#010103] text-zinc-400 font-sans overflow-hidden selection:bg-purple-500/30">
      
      {/* Immersive Aether Engine (Multi-layered Nebula) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-purple-600/10 blur-[160px] rounded-full animate-pulse transition-opacity duration-1000" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-orange-600/10 blur-[160px] rounded-full animate-pulse [animation-delay:3s]" />
        <div className="absolute top-[30%] right-[5%] w-[40%] h-[40%] bg-blue-600/5 blur-[140px] rounded-full animate-pulse [animation-delay:6s]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      <Navbar />
      <ApiOnboardingDialog open={showOnboarding} onClose={() => setShowOnboarding(false)} />

      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />

        <main className="flex-1 overflow-y-auto border-l border-white/5 bg-transparent scroll-smooth">
          <div className="max-w-4xl mx-auto px-8 py-16">
            
            {/* The "Energy Core" Post Creator */}
            {status === 'authenticated' && (
              <div className="mb-24 relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-orange-500 rounded-[2.5rem] blur opacity-20 group-focus-within:opacity-60 transition-all duration-1000 group-focus-within:animate-pulse" />
                
                <div className="relative bg-[#050507]/80 backdrop-blur-3xl border border-white/20 rounded-[2.2rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <div className="flex gap-8">
                    <div className="shrink-0">
                      <div className="relative p-[2px] rounded-2xl bg-gradient-to-br from-white/40 to-transparent group-focus-within:from-purple-400 transition-all duration-700 shadow-2xl">
                        <img 
                          src={session?.user?.image || "https://ui-avatars.com/api/?name=User"}
                          className="w-14 h-14 rounded-[14px] bg-[#010103]"
                          alt="Me"
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-8">
                      <textarea 
                        placeholder="Broadcast your technical perspective..."
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-white placeholder:text-zinc-800 resize-none font-sans text-2xl leading-relaxed tracking-tight font-light"
                        rows={newPostContent ? 4 : 1}
                      />
                      <div className={`flex items-center justify-between transition-all duration-700 ${newPostContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 h-0 overflow-hidden'}`}>
                        <div className="flex items-center gap-8">
                          <button className="flex items-center gap-3 text-zinc-500 hover:text-purple-400 transition-all group/icon">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover/icon:bg-purple-500/20 group-hover/icon:border-purple-500/40 transition-all shadow-xl">
                              <Terminal size={22} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.3em] font-mono">Module</span>
                          </button>
                          <button className="flex items-center gap-3 text-zinc-500 hover:text-orange-400 transition-all group/icon">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover/icon:bg-orange-500/20 group-hover/icon:border-orange-500/40 transition-all shadow-xl">
                              <Radio size={22} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.3em] font-mono">Signal</span>
                          </button>
                        </div>
                        <button 
                          onClick={handleCreatePost}
                          disabled={isCreatingPost}
                          className="relative px-12 py-4 bg-white text-black rounded-2xl text-[11px] font-bold uppercase tracking-[0.4em] overflow-hidden group/btn hover:text-white transition-colors shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-purple-500/40"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                          <span className="relative z-10">{isCreatingPost ? 'SYNCING...' : 'BROADCAST'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* High-End Cinematic Tabs */}
            <div className="flex items-center gap-16 mb-24 px-4 border-b border-white/5 relative">
              {[
                { id: 'featured', label: 'Signal', icon: <Sparkles size={18} />, color: 'text-purple-400' },
                { id: 'rising', label: 'Velocity', icon: <TrendingUp size={18} />, color: 'text-orange-400' },
                { id: 'following', label: 'Network', icon: <Activity size={18} />, color: 'text-emerald-400' },
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveFeed(tab.id as any)}
                  className={`group flex items-center gap-4 text-[13px] font-bold uppercase tracking-[0.4em] transition-all relative pb-10 ${
                    activeFeed === tab.id ? 'text-white' : 'text-zinc-700 hover:text-zinc-400'
                  }`}
                >
                  <span className={`${activeFeed === tab.id ? tab.color : 'group-hover:text-white'} transition-colors`}>{tab.icon}</span>
                  {tab.label}
                  {activeFeed === tab.id && (
                    <>
                      <div className="absolute bottom-[-1px] left-0 w-full h-[3px] bg-white shadow-[0_0_25px_rgba(255,255,255,1)] z-20" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Kinetic "Data Module" Feed */}
            <div className="space-y-20">
              {loadingPosts ? (
                <div className="flex flex-col items-center justify-center py-40 gap-8">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-purple-500/10 rounded-full" />
                    <div className="absolute inset-0 border-t-4 border-purple-500 rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.4)]" />
                  </div>
                  <span className="text-[12px] font-bold uppercase tracking-[0.6em] text-zinc-800 animate-pulse font-mono">Neural_Sync_Active</span>
                </div>
              ) : posts.map((post) => (
                <article key={post.id} className="group relative bg-[#050507]/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-12 transition-all hover:bg-[#08080a]/60 hover:border-white/20 hover:shadow-[0_40px_100px_rgba(0,0,0,0.6)] duration-700">
                  {/* Iridescent Light-Leak Effect */}
                  <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  
                  <div className="flex gap-12">
                    <div className="shrink-0 pt-2">
                      <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-white/20 to-transparent group-hover:from-purple-500/60 transition-all duration-700 shadow-2xl group-hover:scale-110">
                        <img 
                          src={post.user.image || `https://ui-avatars.com/api/?name=${post.user.name}`}
                          className="w-16 h-16 rounded-[15px] bg-[#010103]"
                          alt={post.user.name || ''}
                        />
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#050507] border border-white/10 rounded-full flex items-center justify-center shadow-2xl">
                          <span className="text-[9px] font-bold text-emerald-400 font-mono">Lv.{Math.floor(Math.random()*50)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-10">
                        <div className="flex flex-col gap-1">
                          <span className="text-xl font-bold text-white tracking-tighter transition-all group-hover:text-purple-400 group-hover:translate-x-1 duration-500">
                            {post.user.username || post.user.name}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-[0.4em] font-mono">
                              Auth_ID: {post.id.slice(0, 8).toUpperCase()}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-zinc-800" />
                            <span className="text-[10px] font-bold text-purple-500/60 uppercase tracking-[0.2em] font-mono">
                              {getTimeAgo(new Date(post.createdAt))}
                            </span>
                          </div>
                        </div>
                        <button className="text-zinc-800 hover:text-zinc-400 transition-colors p-3 hover:bg-white/5 rounded-2xl">
                          <MoreHorizontal size={24} />
                        </button>
                      </div>

                      <div className="space-y-12">
                        <p className="text-[20px] text-zinc-200 font-sans leading-[1.8] font-light tracking-tight selection:bg-purple-500/40">
                          {post.content}
                        </p>

                        {post.codeSnippet && (
                          <div className="relative rounded-[2rem] border border-white/10 bg-black shadow-2xl overflow-hidden group/code">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                            <div className="px-8 py-5 flex items-center justify-between border-b border-white/5 bg-white/[0.03]">
                              <div className="flex items-center gap-6">
                                <div className="flex gap-2">
                                  <div className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]" />
                                  <div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]" />
                                  <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
                                </div>
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.4em] font-mono">{post.language} module</span>
                              </div>
                              <Share2 size={16} className="text-zinc-700 hover:text-white transition-colors cursor-pointer" />
                            </div>
                            <pre className="p-12 text-[16px] text-zinc-400 overflow-x-auto font-mono leading-relaxed bg-gradient-to-b from-transparent to-purple-500/[0.03]">
                              <code>{post.codeSnippet}</code>
                            </pre>
                          </div>
                        )}

                        <div className="flex items-center gap-16 pt-4">
                          <button className="flex items-center gap-5 group/btn transition-all text-zinc-700 hover:text-rose-500">
                            <div className={`p-4 rounded-[1.5rem] border border-white/10 transition-all group-hover/btn:border-rose-500/40 group-hover/btn:bg-rose-500/10 group-hover/btn:shadow-[0_0_30px_rgba(244,63,94,0.2)] ${post.isLiked ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.2)]' : 'bg-white/5'}`}>
                              <Heart size={26} className={post.isLiked ? 'fill-rose-500' : 'group-hover/btn:scale-125 transition-transform'} />
                            </div>
                            <span className="text-sm font-bold font-mono group-hover/btn:text-white transition-colors">{post.likeCount}</span>
                          </button>
                          
                          <button className="flex items-center gap-5 group/btn transition-all text-zinc-700 hover:text-purple-400">
                            <div className="p-4 rounded-[1.5rem] border border-white/10 bg-white/5 transition-all group-hover/btn:border-purple-500/40 group-hover/btn:bg-purple-500/10 group-hover/btn:shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                              <MessageSquare size={26} className="group-hover/btn:scale-125 transition-transform" />
                            </div>
                            <span className="text-sm font-bold font-mono group-hover/btn:text-white transition-colors">{post.commentCount}</span>
                          </button>
                          
                          <button className="flex items-center gap-5 group/btn transition-all text-zinc-700 hover:text-white ml-auto">
                            <ArrowUpRight size={28} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform group-hover/btn:text-purple-400" />
                            <span className="text-[12px] font-bold uppercase tracking-[0.4em] group-hover/btn:text-white transition-all">Link Signal</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
