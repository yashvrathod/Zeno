'use client';

import React from 'react';
import {
  ArrowLeft, MapPin, Linkedin, Github, Eye, Award, Edit,
  Brain, TrendingUp, Target, Layers, BookOpen, Zap, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Sidebar from '@/components/Sidebar';
import type { DashboardData, ConceptMasteryItem } from '@/lib/dashboard/types';

type ProblemRow = {
  title: string;
  topic: string;
  difficulty: string;
};

type ProfileUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  image: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  languages: string[];
  skills: string[];
  quote: string[];
};

async function fetchMe(): Promise<ProfileUser> {
  const res = await fetch('/api/profile/me', { cache: 'no-store' });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Failed to load profile');
  }
  const data = (await res.json()) as { user: ProfileUser };
  return data.user;
}

export default function ProfilePage() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession();
  const [user, setUser] = React.useState<ProfileUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState('');

  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    image: '',
    bio: '',
    location: '',
    websiteUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    languages: '',
    skills: '',
    quote: '',
  });

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [u, dashRes] = await Promise.all([
          fetchMe(),
          fetch('/api/dashboard').then(r => r.json()).catch(() => ({ data: null })),
        ]);
        if (!mounted) return;
        setUser(u);
        if (dashRes.data) setDashboardData(dashRes.data);
      } catch (e) {
        if (!mounted) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const isAuthed = sessionStatus === 'authenticated' && !!session?.user;
  const canEdit = !!user;

  const openEdit = () => {
    if (!user) return;
    setForm({
      name: user.name ?? '',
      image: user.image ?? '',
      bio: user.bio ?? '',
      location: user.location ?? '',
      websiteUrl: user.websiteUrl ?? '',
      linkedinUrl: user.linkedinUrl ?? '',
      githubUrl: user.githubUrl ?? '',
      languages: user.languages.join(', '),
      skills: user.skills.join(', '),
      quote: user.quote.join('\n'),
    });
    setEditOpen(true);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim() || null,
        image: form.image.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        websiteUrl: form.websiteUrl.trim() || null,
        linkedinUrl: form.linkedinUrl.trim() || null,
        githubUrl: form.githubUrl.trim() || null,
        languages: form.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        skills: form.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        quote: form.quote
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Failed to save profile');
      }
      const data = (await res.json()) as { user: ProfileUser };
      setUser(data.user);
      // Refresh NextAuth session so Navbar/Sidebar get the latest image/name immediately.
      await updateSession();
      setEditOpen(false);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.name ?? user?.username ?? 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  // Until we have real models for ranking/submissions, keep these UI fields as placeholders.
  const userData = {
    name: displayName,
    email: user?.email ?? '',
    avatar: user?.image ?? 'https://placehold.co/150x150?text=U',
    quote:
      user?.quote && user.quote.length
        ? user.quote
        : [
            "My code doesn't work",
            'I have no idea why',
            'My code works',
            'I have no idea why.',
          ],
    location: user?.location ?? '—',
    linkedin: user?.linkedinUrl ?? '—',
    github: user?.githubUrl ?? '—',
    views: 0,
    certificates: 0,
    globalRank: '—',
    countryRank: '—',
    percentile: '—',
    languages: user?.languages?.length ? user.languages : ['—'],
    skills: user?.skills?.length ? user.skills : ['—'],
    badges: [
      { icon: '🎓', achieved: true },
      { icon: '🎯', achieved: true },
      { icon: '👁️', achieved: false },
    ],
    longestStreak: 0,
    totalQuestions: '—',
    easyQuestions: { solved: 0, total: 0 },
    mediumQuestions: { solved: 0, total: 0 },
    hardQuestions: { solved: 0, total: 0 },
    problems: [] as ProblemRow[],
    initials,
  };

  // Generate streak calendar data (grid)
  // Generate randomness after mount to satisfy react-hooks/purity.
  const [streakData, setStreakData] = React.useState<number[]>([]);

  React.useEffect(() => {
    const data: number[] = [];

    for (let i = 0; i < 105; i++) {
      const intensity = Math.random() > 0.3 ? Math.floor(Math.random() * 4) : 0;
      data.push(intensity);
    }

    setStreakData(data);
  }, []);

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
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4 md:p-8">
          {loading ? (
            <div className="text-gray-400">Loading profile…</div>
          ) : !isAuthed ? (
            <div className="mb-6 rounded-lg border border-zinc-800 bg-[#0f0f0f] p-4 text-sm text-gray-300">
              <div className="mb-3">You need to sign in to view and edit your profile.</div>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => signIn(undefined, { callbackUrl: '/profile' })}
              >
                Sign in
              </Button>
            </div>
          ) : loadError ? (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {loadError}
            </div>
          ) : null}
          <button onClick={() => window.history.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="bg-[#1a1a1a] border-zinc-800 text-white">
                <DialogHeader>
                  <DialogTitle>Edit profile</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="bg-[#0f0f0f] border-zinc-700 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Avatar image URL</Label>
                    <Input
                      id="image"
                      value={form.image}
                      onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
                      className="bg-[#0f0f0f] border-zinc-700 text-white"
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Input
                      id="bio"
                      value={form.bio}
                      onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                      className="bg-[#0f0f0f] border-zinc-700 text-white"
                      placeholder="Short bio"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      className="bg-[#0f0f0f] border-zinc-700 text-white"
                      placeholder="City, Country"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn URL</Label>
                      <Input
                        id="linkedin"
                        value={form.linkedinUrl}
                        onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                        className="bg-[#0f0f0f] border-zinc-700 text-white"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github">GitHub URL</Label>
                      <Input
                        id="github"
                        value={form.githubUrl}
                        onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
                        className="bg-[#0f0f0f] border-zinc-700 text-white"
                        placeholder="https://github.com/..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                      id="website"
                      value={form.websiteUrl}
                      onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                      className="bg-[#0f0f0f] border-zinc-700 text-white"
                      placeholder="https://your-site.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages (comma separated)</Label>
                    <Input
                      id="languages"
                      value={form.languages}
                      onChange={(e) => setForm((f) => ({ ...f, languages: e.target.value }))}
                      className="bg-[#0f0f0f] border-zinc-700 text-white"
                      placeholder="Java, Python, C++"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma separated)</Label>
                    <Input
                      id="skills"
                      value={form.skills}
                      onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                      className="bg-[#0f0f0f] border-zinc-700 text-white"
                      placeholder="Dynamic Programming, Hash Table"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quote">Quote (one line per row)</Label>
                    <textarea
                      id="quote"
                      value={form.quote}
                      onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))}
                      className="w-full min-h-24 rounded-md bg-[#0f0f0f] border border-zinc-700 px-3 py-2 text-sm text-white outline-none focus-visible:border-orange-500"
                      placeholder="Write your favorite lines..."
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="secondary"
                    className="bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700 text-white"
                    onClick={() => setEditOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={save}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-5">
              <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                {/* Profile Header */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6 min-w-0">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={userData.avatar} />
                    <AvatarFallback>{userData.initials || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold mb-1 text-white break-words">{userData.name}</h1>
                    <p className="text-sm text-gray-400 break-all">{userData.email}</p>
                  </div>
                </div>

                {/* Quote */}
                <div className="bg-[#0f0f0f] rounded-lg p-4 mb-6">
                  {userData.quote.map((line, i) => (
                    <p key={i} className="text-sm text-gray-200">{line}</p>
                  ))}
                </div>

                {/* Edit Profile Button */}
                <Button
                  className="w-full mb-6 bg-[#0f0f0f] hover:bg-[#252525] border border-zinc-700 text-white"
                  onClick={openEdit}
                  disabled={loading || !canEdit}
                >
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
                      <span className="text-gray-200 break-all">{userData.linkedin}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Github className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-200 break-all">{userData.github}</span>
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
            <div className="lg:col-span-7 space-y-6 min-w-0">
              {/* Ranking Card */}
              <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                <h2 className="text-lg font-semibold mb-4 text-white">Ranking</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                <div className="relative h-48 bg-[#0f0f0f] rounded-lg p-4 overflow-hidden">
                  <svg
                    viewBox="0 0 550 200"
                    preserveAspectRatio="none"
                    width="100%"
                    height="100%"
                    className="block"
                  >
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="flex gap-6 px-4 md:px-6 pt-4 overflow-x-auto">
                    <button className="pb-3 border-b-2 border-purple-500 text-sm font-medium text-white">Problems</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Courses</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Hackathon</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Conference</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Internship</button>
                    <button className="pb-3 text-sm font-medium text-gray-400 hover:text-white">Job</button>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-4 md:p-6 border-b border-zinc-800">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
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
                  <table className="w-full min-w-[640px]">
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

              {/* Concept Mastery */}
              {dashboardData && dashboardData.conceptMastery.length > 0 && (
                <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Layers size={16} className="text-purple-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Concept Mastery</h2>
                    </div>
                    <Link href="/profile/skills" className="text-xs text-purple-400 hover:underline">View Skill Tree</Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {dashboardData.conceptMastery.slice(0, 12).map(c => (
                      <div key={c.concept} className={`rounded-xl border p-3 transition-all hover:scale-[1.02] ${
                        c.status === 'mastered' ? 'border-emerald-500/30 bg-emerald-500/10' :
                        c.status === 'learning' ? 'border-purple-500/30 bg-purple-500/10' :
                        c.status === 'blocked' ? 'border-rose-500/30 bg-rose-500/10' :
                        'border-zinc-700/30 bg-zinc-800/20'
                      }`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                          c.status === 'mastered' ? 'text-emerald-400' :
                          c.status === 'learning' ? 'text-purple-400' :
                          c.status === 'blocked' ? 'text-rose-400' : 'text-zinc-600'
                        }`}>
                          {c.concept.replace(/_/g, ' ')}
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
                          <div className={`h-full rounded-full transition-all duration-700 ${
                            c.status === 'mastered' ? 'bg-emerald-400' :
                            c.status === 'learning' ? 'bg-purple-400' : 'bg-zinc-700'
                          }`} style={{ width: `${c.mastery}%` }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-zinc-400">{c.mastery}%</span>
                          <span className="text-[8px] uppercase tracking-wider font-bold text-zinc-600">{c.status.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="text-[9px] text-zinc-600 mt-1">{c.practiceCount} practices</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Learning Path */}
              {dashboardData && (dashboardData.weakAreas.length > 0 || dashboardData.masteredPatterns.length > 0) && (
                <Card className="bg-[#1a1a1a] border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <BookOpen size={16} className="text-emerald-400" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Learning Path</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold tracking-widest text-rose-400 uppercase flex items-center gap-2">
                        <AlertTriangle size={12} /> Focus Areas
                      </h3>
                      {dashboardData.weakAreas.slice(0, 3).map(w => (
                        <div key={w.tag} className="bg-[#0f0f0f] rounded-lg p-3 border border-zinc-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-zinc-200">{w.friendlyName}</span>
                            <span className="text-[10px] text-rose-400 font-mono">{w.percentOfSessions.toFixed(0)}%</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full" style={{ width: `${Math.min(w.percentOfSessions, 100)}%` }} />
                          </div>
                          <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">{w.description.slice(0, 80)}</p>
                        </div>
                      ))}
                      {dashboardData.weakAreas.length === 0 && (
                        <p className="text-sm text-zinc-600">No weak areas detected. Great job!</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-2">
                        <CheckCircle2 size={12} /> Mastered Patterns
                      </h3>
                      {dashboardData.masteredPatterns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {dashboardData.masteredPatterns.map(p => (
                            <span key={p} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] text-emerald-400 font-medium">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-600">No mastered patterns yet.</p>
                      )}
                      <h3 className="text-[10px] font-bold tracking-widest text-orange-400 uppercase flex items-center gap-2 mt-4">
                        <Zap size={12} /> Review Queue
                      </h3>
                      {dashboardData.reviewQueue.length > 0 ? (
                        <div className="space-y-2">
                          {dashboardData.reviewQueue.slice(0, 3).map(r => (
                            <div key={r.concept} className="flex items-center justify-between bg-[#0f0f0f] rounded-lg px-3 py-2 border border-zinc-800">
                              <span className="text-sm text-zinc-300 capitalize">{r.concept.replace(/_/g, ' ')}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-zinc-600">{r.mastery}%</span>
                                <span className={`text-[9px] font-mono ${r.interval > 0 ? 'text-zinc-600' : 'text-rose-400'}`}>
                                  {r.interval > 0 ? `${r.interval}d` : 'Overdue'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-600">No reviews due.</p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
