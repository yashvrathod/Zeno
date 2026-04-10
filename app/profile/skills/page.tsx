import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SkillTree } from "@/components/SkillTree";
import { Brain, TrendingUp, Target } from "lucide-react";

export default async function SkillsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-400">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0c]">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Brain size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-serif italic text-white">Skill Tree</h1>
              <p className="text-[13px] text-zinc-500">
                Track your DSA patterns and mastery progress
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Target size={16} className="text-yellow-400" />
              </div>
              <h3 className="font-medium text-white">Pattern Recognition</h3>
            </div>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              We track 8 common mistake patterns across your sessions. Master them one by one.
            </p>
          </div>

          <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-blue-400" />
              </div>
              <h3 className="font-medium text-white">Progress Tracking</h3>
            </div>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Red = needs work, Yellow = improving, Green = mastered. Click any skill for details.
            </p>
          </div>

          <div className="bg-[#0a0a0c] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Brain size={16} className="text-green-400" />
              </div>
              <h3 className="font-medium text-white">AI Guidance</h3>
            </div>
            <p className="text-[13px] text-zinc-500 leading-relaxed">
              Your AI mentor uses this data to provide targeted hints for your weak areas.
            </p>
          </div>
        </div>

        {/* Skill Tree Component */}
        <SkillTree userId={session.user.id} />

        {/* Tips Section */}
        <div className="mt-8 bg-[#0a0a0c] border border-white/10 rounded-xl p-6">
          <h3 className="text-[14px] font-bold tracking-widest text-zinc-400 uppercase mb-4">
            How to Use Your Skill Tree
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] text-zinc-500">
            <div className="space-y-2">
              <p>• Click any skill to see detailed feedback and how to fix it</p>
              <p>• Red skills (&gt;40% occurrence) are your top priority</p>
              <p>• Yellow skills (20-40%) are improving but need attention</p>
            </div>
            <div className="space-y-2">
              <p>• Green skills (&lt;20% occurrence) are nearly mastered</p>
              <p>• Gray skills mean no errors detected — keep it up!</p>
              <p>• Check back weekly to see your progress over time</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
