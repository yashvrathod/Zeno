'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Diamond, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function LeaderboardPage() {
  const [timeLeft, setTimeLeft] = useState({
    days: 10,
    hours: 23,
    minutes: 59,
    seconds: 29
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        
        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          days--;
        }
        if (days < 0) {
          days = 0;
          hours = 0;
          minutes = 0;
          seconds = 0;
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Top 3 winners data
  const topThree = [
    {
      rank: 2,
      name: 'Brian Ngo',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces',
      points: 2000,
      prize: 50000,
      position: 'left'
    },
    {
      rank: 1,
      name: 'Jolie Joie',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces',
      points: 2000,
      prize: 100000,
      position: 'center'
    },
    {
      rank: 3,
      name: 'David Do',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces',
      points: 2000,
      prize: 20000,
      position: 'right'
    }
  ];

  // Leaderboard data (rank 4+)
  const leaderboardData = [
    {
      rank: 4,
      name: "Henrietta O'Connell",
      username: '@henrietta',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces',
      followers: 12241,
      points: 2114424,
      reward: 1000
    },
    {
      rank: 5,
      name: 'Darrel Bins',
      username: '@darrel',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=faces',
      followers: 10341,
      points: 2101424,
      reward: 1000
    },
    {
      rank: 6,
      name: 'Alicia Morrison',
      username: '@alicia',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces',
      followers: 9876,
      points: 1987654,
      reward: 900
    },
    {
      rank: 7,
      name: 'Samuel Chen',
      username: '@samuel',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces',
      followers: 8543,
      points: 1876543,
      reward: 800
    },
    {
      rank: 8,
      name: 'Emma Rodriguez',
      username: '@emma',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces',
      followers: 7654,
      points: 1765432,
      reward: 700
    },
    {
      rank: 9,
      name: 'Michael Kim',
      username: '@michael',
      avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=faces',
      followers: 6789,
      points: 1654321,
      reward: 600
    },
    {
      rank: 10,
      name: 'Sarah Johnson',
      username: '@sarah',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=faces',
      followers: 5678,
      points: 1543210,
      reward: 500
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
              <p className="text-gray-400">Compete with developers worldwide and win amazing prizes!</p>
            </div>

            {/* Top 3 Podium */}
            <div className="mb-12">
              <div className="grid grid-cols-3 gap-8 max-w-6xl mx-auto items-end mb-8">
                {topThree.map((winner) => (
                  <div 
                    key={winner.rank}
                    className={`flex flex-col items-center ${winner.position === 'center' ? 'transform -translate-y-4' : ''}`}
                  >
                    {/* Avatar */}
                    <div className={`relative mb-6 ${winner.position === 'center' ? 'mb-8' : ''}`}>
                      <div className={`rounded-full overflow-hidden border-4 ${
                        winner.position === 'center' 
                          ? 'border-yellow-500/50 w-32 h-32 shadow-xl shadow-yellow-500/20' 
                          : winner.position === 'left'
                          ? 'border-gray-600/50 w-28 h-28 shadow-lg shadow-gray-500/10'
                          : 'border-orange-600/50 w-28 h-28 shadow-lg shadow-orange-500/10'
                      }`}>
                        <img 
                          src={winner.avatar}
                          alt={winner.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Rank Badge */}
                      <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold ${
                        winner.position === 'center' 
                          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black'
                          : winner.position === 'left'
                          ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-black'
                          : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                      }`}>
                        #{winner.rank}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className={`font-semibold text-white mb-4 ${
                      winner.position === 'center' ? 'text-xl' : 'text-lg'
                    }`}>{winner.name}</h3>

                    {/* Card */}
                    <Card className={`bg-[#1a1a1a] border-zinc-800 p-6 w-full text-center transition-all hover:bg-[#1f1f1f] ${
                      winner.position === 'center' ? 'border-yellow-500/20 shadow-lg shadow-yellow-500/5' : ''
                    }`}>
                      {/* Medal Icon */}
                      <div className="flex justify-center mb-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                          winner.position === 'center' 
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
                            : winner.position === 'left'
                            ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                            : 'bg-gradient-to-br from-orange-400 to-orange-600'
                        }`}>
                          <Trophy className="w-7 h-7 text-white" />
                        </div>
                      </div>

                      {/* Points to Earn */}
                      <p className="text-xs text-gray-400 mb-3">Earn {winner.points.toLocaleString()} points</p>

                      {/* Prize */}
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Diamond className="w-5 h-5 text-cyan-400" />
                        <span className={`font-bold text-white ${
                          winner.position === 'center' ? 'text-3xl' : 'text-2xl'
                        }`}>
                          {winner.prize.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Prize Pool</p>
                    </Card>
                  </div>
                ))}
              </div>

              {/* Timer */}
              <div className="text-center">
                <Card className="bg-[#1a1a1a] border-zinc-800 p-6 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-2xl">⏰</span>
                    </div>
                    <span className="text-gray-300 text-base font-medium">Competition Ends in</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="text-center">
                      <div className="bg-[#0f0f0f] rounded-lg px-4 py-3 min-w-[70px] border border-zinc-800">
                        <div className="text-3xl font-bold text-white">{String(timeLeft.days).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400 mt-1">Days</div>
                      </div>
                    </div>
                    <span className="text-2xl text-gray-600 font-bold">:</span>
                    <div className="text-center">
                      <div className="bg-[#0f0f0f] rounded-lg px-4 py-3 min-w-[70px] border border-zinc-800">
                        <div className="text-3xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400 mt-1">Hours</div>
                      </div>
                    </div>
                    <span className="text-2xl text-gray-600 font-bold">:</span>
                    <div className="text-center">
                      <div className="bg-[#0f0f0f] rounded-lg px-4 py-3 min-w-[70px] border border-zinc-800">
                        <div className="text-3xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400 mt-1">Minutes</div>
                      </div>
                    </div>
                    <span className="text-2xl text-gray-600 font-bold">:</span>
                    <div className="text-center">
                      <div className="bg-[#0f0f0f] rounded-lg px-4 py-3 min-w-[70px] border border-zinc-800">
                        <div className="text-3xl font-bold text-white">{String(timeLeft.seconds).padStart(2, '0')}</div>
                        <div className="text-xs text-gray-400 mt-1">Seconds</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 border-t border-zinc-800 pt-4">
                    <span>You earned</span>
                    <Diamond className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-semibold">5 points</span>
                    <span>today • Ranked out of</span>
                    <span className="text-white font-semibold">23,141 users</span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Leaderboard Table */}
            <Card className="bg-[#1a1a1a] border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h2 className="text-xl font-semibold text-white">Rankings</h2>
                <p className="text-sm text-gray-400 mt-1">Top performers in the competition</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0f0f0f] border-b border-zinc-800">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">User name</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Followers</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Points</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((user, index) => (
                      <tr 
                        key={user.rank}
                        className="border-b border-zinc-800 hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                      >
                        {/* Rank */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-lg">{user.rank}</span>
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-11 h-11 border-2 border-zinc-800">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback>{user.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-white font-medium text-sm">{user.name}</p>
                              <p className="text-xs text-gray-400">{user.username}</p>
                            </div>
                          </div>
                        </td>

                        {/* Followers */}
                        <td className="px-6 py-5">
                          <span className="text-gray-200 font-medium">{user.followers.toLocaleString()}</span>
                        </td>

                        {/* Points */}
                        <td className="px-6 py-5">
                          <span className="text-white font-semibold">{user.points.toLocaleString()}</span>
                        </td>

                        {/* Reward */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Diamond className="w-4 h-4 text-cyan-400" />
                            <span className="text-cyan-400 font-bold">{user.reward}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Load More */}
              <div className="p-6 text-center border-t border-zinc-800">
                <button className="px-6 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 text-sm font-medium rounded-lg transition-colors border border-cyan-500/20">
                  Load more rankings
                </button>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
