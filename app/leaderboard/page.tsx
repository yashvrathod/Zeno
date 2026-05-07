'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Diamond, Crown, ArrowUpRight, Medal, Timer, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function LeaderboardPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 10,
    hours: 23,
    minutes: 59,
    seconds: 29
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const topThree = [
    {
      rank: 2,
      name: 'Brian Ngo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
      points: 2000,
      prize: 50000,
    },
    {
      rank: 1,
      name: 'Jolie Joie',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
      points: 2000,
      prize: 100000,
    },
    {
      rank: 3,
      name: 'David Do',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
      points: 2000,
      prize: 20000,
    }
  ];

  const leaderboardData = [
    { rank: 4, name: "Henrietta O'Connell", username: '@henrietta', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces', points: 2114424 },
    { rank: 5, name: 'Darrel Bins', username: '@darrel', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces', points: 2101424 },
    { rank: 6, name: 'Alicia Morrison', username: '@alicia', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces', points: 1987654 },
    { rank: 7, name: 'Samuel Chen', username: '@samuel', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces', points: 1876543 },
    { rank: 8, name: 'Emma Rodriguez', username: '@emma', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces', points: 1765432 },
  ];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-background/30 no-scrollbar">
          <div className="max-w-6xl mx-auto px-10 py-16">
            
            {/* Header */}
            <div className="mb-20 space-y-6 text-center max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2">
                 <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Trophy size={18} className="text-primary" />
                 </div>
                 <Badge variant="secondary" className="bg-transparent border-none text-primary font-black uppercase tracking-[0.2em] text-[10px]">Network Rankings</Badge>
              </div>
              <h1 className="text-7xl font-serif font-medium tracking-tighter text-foreground">The Global Hierarchy.</h1>
              <p className="text-xl text-muted-foreground/80 leading-relaxed font-serif italic max-w-2xl mx-auto">
                Measuring computational velocity and algorithmic precision across the entire neural network.
              </p>
            </div>

            {/* Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20 items-end">
              {topThree.map((winner) => (
                <div key={winner.rank} className={`flex flex-col items-center ${winner.rank === 1 ? 'order-2' : winner.rank === 2 ? 'order-1' : 'order-3'}`}>
                  <div className="relative mb-8">
                    <Avatar className={`rounded-[32px] border-4 ${winner.rank === 1 ? 'w-40 h-40 border-primary shadow-2xl shadow-primary/20 scale-110' : 'w-28 h-28 border-background shadow-lg'}`}>
                      <AvatarImage src={winner.avatar} />
                      <AvatarFallback className="bg-secondary text-primary font-black">{winner.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-1.5 rounded-full text-[10px] font-black tracking-widest shadow-xl uppercase ${
                      winner.rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground border border-border/40'
                    }`}>
                      RANK {winner.rank}
                    </div>
                    {winner.rank === 1 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce">
                         <Crown size={32} className="text-primary fill-primary/20" />
                      </div>
                    )}
                  </div>
                  
                  <Card className={`w-full p-10 text-center border-border/40 shadow-[0_2px_15px_rgba(0,0,0,0.02)] rounded-[32px] ${winner.rank === 1 ? 'bg-gradient-to-b from-card to-primary/5 border-primary/20' : 'bg-card'}`}>
                    <h3 className="text-2xl font-serif font-medium mb-3">{winner.name}</h3>
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex items-center gap-2">
                         <Diamond size={16} className="text-primary" />
                         <span className="text-4xl font-black tracking-tighter text-foreground tabular-nums">{(winner.prize / 1000).toFixed(0)}k</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">Neural Credits</span>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* Status & Timer */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-20">
              <Card className="md:col-span-8 p-12 bg-secondary/20 border-border/20 rounded-[40px] overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-700">
                  <Medal size={200} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-10">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-600">Season_Live</span>
                  </div>
                  <div className="flex gap-16">
                    {Object.entries(timeLeft).map(([label, value]) => (
                      <div key={label} className="space-y-2 text-center">
                        <p className="text-5xl font-black tracking-tighter tabular-nums">{String(value).padStart(2, '0')}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground/60">
                     <Timer size={16} />
                     <p className="text-sm font-serif italic">
                       The current cycle concludes in the timeframe above. Precision is paramount.
                     </p>
                  </div>
                </div>
              </Card>

              <Card className="md:col-span-4 p-12 flex flex-col justify-between border-primary/10 rounded-[40px] bg-card shadow-sm">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Personal Stand</span>
                <div className="space-y-3">
                  <p className="text-6xl font-black tracking-tighter tabular-nums">#2,841</p>
                  <div className="flex items-center gap-2.5 px-3 py-1 bg-emerald-50 w-fit rounded-full text-emerald-600 border border-emerald-100">
                    <TrendingUp size={14} />
                    <span className="text-[11px] font-black uppercase tracking-tighter">+14 Slots</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full h-14 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] border-border/60 hover:bg-secondary transition-all mt-8">View Journey</Button>
              </Card>
            </div>

            {/* Leaderboard Table */}
            <div className="space-y-4">
               <div className="px-12 mb-6 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">
                 <div className="flex items-center gap-16">
                   <span className="w-12">Rank</span>
                   <span>Architect</span>
                 </div>
                 <span>Sync Points</span>
               </div>
               
               {leaderboardData.map((user) => (
                 <Card key={user.rank} className="flex items-center justify-between p-8 hover:bg-secondary/10 transition-all border-border/30 rounded-[28px] group bg-card shadow-sm hover:shadow-md">
                   <div className="flex items-center gap-16">
                     <span className="w-12 text-3xl font-black tracking-tighter text-muted-foreground/20 group-hover:text-primary transition-colors tabular-nums">
                       {String(user.rank).padStart(2, '0')}
                     </span>
                     <div className="flex items-center gap-5 text-left">
                       <Avatar className="w-14 h-14 rounded-2xl border-2 border-background shadow-sm group-hover:scale-105 transition-transform duration-300">
                         <AvatarImage src={user.avatar} />
                         <AvatarFallback className="bg-secondary text-primary font-black">{user.name[0]}</AvatarFallback>
                       </Avatar>
                       <div className="flex flex-col">
                         <span className="text-lg font-bold text-foreground leading-tight">{user.name}</span>
                         <span className="text-[11px] text-muted-foreground/60 font-black uppercase tracking-widest">{user.username}</span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="flex items-center gap-3">
                     <Diamond size={16} className="text-primary/40 group-hover:text-primary transition-colors" />
                     <span className="text-2xl font-black tracking-tighter tabular-nums">{user.points.toLocaleString()}</span>
                   </div>
                 </Card>
               ))}
            </div>

            <div className="mt-20 text-center">
              <Button variant="ghost" className="text-muted-foreground/60 hover:text-primary gap-3 font-black text-xs uppercase tracking-[0.3em] transition-all">
                Load Neural Archives
                <ArrowUpRight size={16} />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
