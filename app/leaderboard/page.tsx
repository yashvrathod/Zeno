'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Diamond, Crown, TrendingUp, Award, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Sidebar from '@/components/Sidebar';

interface LeaderboardUser {
  rank: number;
  name: string;
  username: string;
  avatar: string;
  points: number;
  reward: number;
  problemsSolved: number;
  streak: number;
  readiness: number;
}

interface TopThreeUser {
  rank: number;
  name: string;
  avatar: string;
  points: number;
  prize: number;
  position: string;
  problemsSolved: number;
  streak: number;
}

export default function LeaderboardPage() {
  const [topThree, setTopThree] = useState<TopThreeUser[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 10, hours: 23, minutes: 59, seconds: 29 });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard?limit=20');
        const data = await res.json();
        if (data.ok) {
          setTopThree(data.topThree || []);
          setLeaderboard(data.leaderboard || []);
          setTotalUsers(data.total || 0);
        }
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) { days = 0; hours = 0; minutes = 0; seconds = 0; }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
              <p className="text-gray-400">Compete with developers worldwide and win amazing prizes!</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Top 3 Podium */}
                <div className="mb-12">
                  <div className="grid grid-cols-3 gap-8 max-w-6xl mx-auto items-end mb-8">
                    {topThree.length > 0 ? topThree.map((winner) => (
                      <div key={winner.rank} className={`flex flex-col items-center ${winner.position === 'center' ? 'transform -translate-y-4' : ''}`}>
                        <div className={`relative mb-6 ${winner.position === 'center' ? 'mb-8' : ''}`}>
                          <div className={`rounded-full overflow-hidden border-4 ${
                            winner.position === 'center' ? 'border-yellow-500/50 w-32 h-32 shadow-xl shadow-yellow-500/20' :
                            winner.position === 'left' ? 'border-gray-600/50 w-28 h-28 shadow-lg shadow-gray-500/10' :
                            'border-orange-600/50 w-28 h-28 shadow-lg shadow-orange-500/10'
                          }`}>
                            <img src={winner.avatar} alt={winner.name} className="w-full h-full object-cover" />
                          </div>
                          <div className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold ${
                            winner.position === 'center' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black' :
                            winner.position === 'left' ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-black' :
                            'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                          }`}>#{winner.rank}</div>
                        </div>
                        <h3 className={`font-semibold text-white mb-4 ${winner.position === 'center' ? 'text-xl' : 'text-lg'}`}>{winner.name}</h3>
                        <Card className={`bg-[#1a1a1a] border-zinc-800 p-6 w-full text-center transition-all hover:bg-[#1f1f1f] ${winner.position === 'center' ? 'border-yellow-500/20 shadow-lg shadow-yellow-500/5' : ''}`}>
                          <div className="flex justify-center mb-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                              winner.position === 'center' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                              winner.position === 'left' ? 'bg-gradient-to-br from-gray-400 to-gray-600' :
                              'bg-gradient-to-br from-orange-400 to-orange-600'
                            }`}>
                              <Trophy className="w-7 h-7 text-white" />
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-4 mb-3 text-xs text-gray-400">
                            <span>{winner.problemsSolved} solved</span>
                            <span>{winner.streak}d streak</span>
                          </div>
                          <p className="text-xs text-gray-400 mb-3">Earn {winner.points.toLocaleString()} points</p>
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Diamond className="w-5 h-5 text-cyan-400" />
                            <span className={`font-bold text-white ${winner.position === 'center' ? 'text-3xl' : 'text-2xl'}`}>
                              {winner.prize.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">Prize Pool</p>
                        </Card>
                      </div>
                    )) : (
                      <div className="col-span-3 text-center py-16 text-zinc-600">
                        <Trophy size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No ranked users yet. Start solving problems!</p>
                      </div>
                    )}
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
                        {Object.entries(timeLeft).map(([key, val]) => (
                          <React.Fragment key={key}>
                            {key !== 'days' && <span className="text-2xl text-gray-600 font-bold">:</span>}
                            <div className="text-center">
                              <div className="bg-[#0f0f0f] rounded-lg px-4 py-3 min-w-[70px] border border-zinc-800">
                                <div className="text-3xl font-bold text-white">{String(val).padStart(2, '0')}</div>
                                <div className="text-xs text-gray-400 mt-1 capitalize">{key}</div>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 border-t border-zinc-800 pt-4">
                        <span>Ranked out of</span>
                        <span className="text-white font-semibold">{totalUsers.toLocaleString()} users</span>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Rankings Table */}
                <Card className="bg-[#1a1a1a] border-zinc-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800">
                    <h2 className="text-xl font-semibold text-white">Rankings</h2>
                    <p className="text-sm text-gray-400 mt-1">Top performers in the competition</p>
                  </div>
                  {leaderboard.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-[#0f0f0f] border-b border-zinc-800">
                          <tr>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Rank</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Problems</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Streak</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Points</th>
                            <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Reward</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboard.map((user) => (
                            <tr key={user.rank} className="border-b border-zinc-800 hover:bg-[#1f1f1f] transition-colors cursor-pointer">
                              <td className="px-6 py-5">
                                <span className="text-white font-bold text-lg">{user.rank}</span>
                              </td>
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
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <Award size={14} className="text-emerald-400" />
                                  <span className="text-gray-200 font-medium">{user.problemsSolved}</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-2">
                                  <Zap size={14} className="text-orange-400" />
                                  <span className="text-gray-200">{user.streak}d</span>
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <span className="text-white font-semibold">{user.points.toLocaleString()}</span>
                              </td>
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
                  ) : (
                    <div className="p-12 text-center text-zinc-600">
                      <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
                      <p>No rankings available yet. Solve problems to earn points!</p>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
