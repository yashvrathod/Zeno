'use client';

import React from 'react';
import { ArrowLeft, MapPin, Linkedin, Github, Eye, Award, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function ProfilePage() {
  // Mock data based on the image
  const userData = {
    name: "Ishaan Gupta",
    email: "ishaangupta2817@gmail.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    quote: [
      "My code doesn't work",
      "I have no idea why",
      "My code works",
      "I have no idea why."
    ],
    location: "New Delhi, India",
    linkedin: "linkedin.com/manthan_kumar",
    github: "github.com/manthan_kumar",
    views: 146,
    certificates: 4,
    globalRank: "1,84,372",
    countryRank: "12,327",
    percentile: "91.8%",
    languages: ["Java", "Python", "C++"],
    skills: ["Dynamic Programming", "Hash Table", "Array", "String", "Matrix"],
    badges: [
      { icon: "🎓", achieved: true },
      { icon: "🎯", achieved: true },
      { icon: "👁️", achieved: false }
    ],
    longestStreak: 20,
    totalQuestions: "6/1200",
    easyQuestions: { solved: 2, total: 400 },
    mediumQuestions: { solved: 3, total: 400 },
    hardQuestions: { solved: 1, total: 400 },
    problems: [
      { title: "Reverse Linked List", status: "solved", topic: "Linked List", difficulty: "Medium" }
    ]
  };

  // Generate streak calendar data (grid)
  const generateStreakData = () => {
    const data = [];
    
    for (let i = 0; i < 105; i++) {
      const intensity = Math.random() > 0.3 ? Math.floor(Math.random() * 4) : 0;
      data.push(intensity);
    }
    return data;
  };

  const streakData = generateStreakData();

  // Chart data for ranking graph
  const chartPoints = [
    { x: 0, y: 13500 },
    { x: 10, y: 13800 },
    { x: 20, y: 13600 },
    { x: 30, y: 14000 },
    { x: 40, y: 13900 },
    { x: 50, y: 14200 },
    { x: 60, y: 14500 },
    { x: 70, y: 14300 },
    { x: 80, y: 14800 },
    { x: 90, y: 15200 },
    { x: 100, y: 15000 }
  ];

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Profile Card */}
            <div className="col-span-5">
              <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                {/* Profile Header */}
                <div className="flex gap-4 mb-6">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={userData.avatar} />
                    <AvatarFallback>IG</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="text-xl font-semibold mb-1 text-white">{userData.name}</h1>
                    <p className="text-sm text-gray-400">{userData.email}</p>
                  </div>
                </div>

                {/* Quote */}
                <div className="bg-[#0f0f0f] rounded-lg p-4 mb-6">
                  {userData.quote.map((line, i) => (
                    <p key={i} className="text-sm text-gray-200">{line}</p>
                  ))}
                </div>

                {/* Edit Profile Button */}
                <Button className="w-full mb-6 bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700 text-white">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mb-1">
                      <Eye className="w-4 h-4" />
                      Views
                    </div>
                    <div className="text-2xl font-semibold text-white">{userData.views}</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-xs mb-1">
                      <Award className="w-4 h-4" />
                      Certificates
                    </div>
                    <div className="text-2xl font-semibold text-white">{userData.certificates}</div>
                  </div>
                </div>

                {/* Basic Information */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Basic Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-200">{userData.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Linkedin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-200">{userData.linkedin}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Github className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-200">{userData.github}</span>
                    </div>
                  </div>
                </div>

                {/* Language */}
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Language</h3>
                  <div className="flex gap-2">
                    {userData.languages.map((lang) => (
                      <Badge key={lang} variant="secondary" className="bg-[#0f0f0f] text-gray-100 hover:bg-[#252525] border border-zinc-700">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {userData.skills.map((skill, idx) => (
                      <Badge key={skill} variant="secondary" className="bg-[#0f0f0f] text-gray-100 hover:bg-[#252525] border border-zinc-700">
                        {skill}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="bg-[#0f0f0f] text-purple-400 hover:bg-[#252525] border border-zinc-700">
                      See all
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column */}
            <div className="col-span-7 space-y-6">
              {/* Ranking Card */}
              <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                <h2 className="text-lg font-semibold mb-4 text-white">Ranking</h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <span>🌍</span> Global Rank
                    </div>
                    <div className="text-xl font-semibold text-white">{userData.globalRank}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <span>🇮🇳</span> Country Rank
                    </div>
                    <div className="text-xl font-semibold text-white">{userData.countryRank}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <span>📊</span> Percentile
                    </div>
                    <div className="text-xl font-semibold text-white">{userData.percentile}</div>
                  </div>
                </div>

                {/* Chart */}
                <div className="relative h-48 bg-[#0f0f0f] rounded-lg p-4">
                  <svg width="100%" height="100%" className="overflow-visible">
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#a78bfa" />
                      </linearGradient>
                    </defs>
                    {/* Y-axis labels */}
                    <text x="5" y="20" fill="#555" fontSize="10">15,000</text>
                    <text x="5" y="60" fill="#555" fontSize="10">14,000</text>
                    <text x="5" y="100" fill="#555" fontSize="10">13,000</text>
                    <text x="5" y="140" fill="#555" fontSize="10">12,000</text>
                    <text x="5" y="180" fill="#555" fontSize="10">11,500</text>

                    {/* X-axis labels */}
                    <text x="60" y="195" fill="#555" fontSize="10">Jul 19</text>
                    <text x="180" y="195" fill="#555" fontSize="10">Jul 29</text>
                    <text x="300" y="195" fill="#555" fontSize="10">Aug 8</text>
                    <text x="420" y="195" fill="#555" fontSize="10">Aug 19</text>

                    {/* Line path */}
                    <polyline
                      points={chartPoints.map((p, i) => `${50 + i * 50},${180 - (p.y - 11500) / 40}`).join(' ')}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </Card>

              {/* Achievement and Streak */}
              <div className="grid grid-cols-2 gap-6">
                {/* Achievement */}
                <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white">Achievement</h3>
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-white">‹</button>
                      <button className="text-gray-400 hover:text-white">›</button>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mb-4">
                    {userData.badges.map((badge, idx) => (
                      <div
                        key={idx}
                        className={`relative w-20 h-24 ${
                          badge.achieved ? 'bg-gradient-to-b from-purple-900/40 to-purple-950/40' : 'bg-gray-900/40'
                        } rounded-lg border ${
                          badge.achieved ? 'border-purple-700/50' : 'border-gray-800'
                        } flex items-center justify-center`}
                        style={{
                          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
                        }}
                      >
                        <div className="text-3xl">{badge.icon}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 text-center">Badges Achieved: <span className="text-white">5/12</span></p>
                </Card>

                {/* Streak */}
                <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white">Streak</h3>
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-white">‹</button>
                      <button className="text-gray-400 hover:text-white">›</button>
                    </div>
                  </div>
                  
                  {/* Streak Calendar Grid */}
                  <div className="mb-4">
                    <div className="flex gap-1 mb-2 text-xs text-gray-500 justify-between">
                      <span>Oct</span>
                      <span>Sep</span>
                      <span>Aug</span>
                    </div>
                    <div className="grid grid-cols-15 gap-[2px]" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
                      {streakData.map((intensity, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-sm ${
                            intensity === 0 ? 'bg-gray-800' :
                            intensity === 1 ? 'bg-purple-900/40' :
                            intensity === 2 ? 'bg-purple-700/60' :
                            'bg-purple-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Longest Streak: <span className="text-white">{userData.longestStreak} days</span></p>
                </Card>
              </div>

              {/* Tabs and Table */}
              <Card className="bg-[#1a1a1a] border-zinc-800">
                <div className="border-b border-zinc-800">
                  <div className="flex gap-6 px-6 pt-4">
                    <button className="pb-3 border-b-2 border-purple-500 text-sm font-medium text-white">Problems</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Courses</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Hackathon</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Conference</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Internship</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Job</button>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-6 border-b border-zinc-800">
                  <div className="flex items-center gap-8">
                    <div className="text-sm text-gray-300">
                      Total Question Attempt: <span className="font-semibold text-white">{userData.totalQuestions}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        Easy <span className="text-green-400">{userData.easyQuestions.solved}/{userData.easyQuestions.total}</span>
                      </div>
                      <div>
                        Medium <span className="text-yellow-400">{userData.mediumQuestions.solved}/{userData.mediumQuestions.total}</span>
                      </div>
                      <div>
                        Hard <span className="text-red-400">{userData.hardQuestions.solved}/{userData.hardQuestions.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f0f0f]">
                      <tr className="text-xs text-gray-400">
                        <th className="text-left px-6 py-3 font-medium">Status</th>
                        <th className="text-left px-6 py-3 font-medium">Title</th>
                        <th className="text-left px-6 py-3 font-medium">Topic</th>
                        <th className="text-left px-6 py-3 font-medium">Difficulty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userData.problems.map((problem, idx) => (
                        <tr key={idx} className="border-t border-zinc-800 hover:bg-[#212121]">
                          <td className="px-6 py-4">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </td>
                          <td className="px-6 py-4 text-sm text-white">{problem.title}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{problem.topic}</td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                              {problem.difficulty}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
