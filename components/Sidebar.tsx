'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { 
  Home,
  Users,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Bell,
  Settings,
  Code,
  User,
  LayoutGrid,
  Trophy,
  Activity,
  Zap,
} from 'lucide-react';

export default function Sidebar() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const isLoading = status === 'loading';
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: <Home className="w-5 h-5" />, label: 'My Feed' },
    { href: '/problems', icon: <LayoutGrid className="w-5 h-5" />, label: 'Problems' },
    { href: '/leaderboard', icon: <Trophy className="w-5 h-5" />, label: 'Leaderboard' },
    { href: '/discussions', icon: <MessageCircle className="w-5 h-5" />, label: 'Discussions', badge: 5 },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="w-72 bg-[#050507] border-r border-white/5 p-6 hidden lg:flex flex-col h-full overflow-y-auto" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
      <div className="space-y-8 flex-1">
        <div>
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase mb-6 px-4">Navigation</h3>
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group ${
                  isActive(item.href) 
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                    : 'text-white/40 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <div className={`${isActive(item.href) ? 'text-purple-400' : 'text-white/20 group-hover:text-white transition-colors'}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-purple-500 text-white text-[10px] font-bold rounded-lg px-2 py-0.5 shadow-lg shadow-purple-900/40">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase mb-6 px-4">Insights</h3>
          <div className="space-y-2 px-4">
            <button className="flex items-center gap-4 text-white/40 hover:text-white transition-all w-full group">
              <Activity className="w-4 h-4 text-white/10 group-hover:text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Activity Log</span>
            </button>
            <button className="flex items-center gap-4 text-white/40 hover:text-white transition-all w-full group">
              <Zap className="w-4 h-4 text-white/10 group-hover:text-orange-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Streaks</span>
            </button>
            <button className="flex items-center gap-4 text-white/40 hover:text-white transition-all w-full group">
              <Bookmark className="w-4 h-4 text-white/10 group-hover:text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest">Saved Solutions</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-6">
        <div className="pt-6 border-t border-white/5 space-y-2">
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl text-white/40 hover:bg-white/5 hover:text-white transition-all w-full group">
            <Bell className="w-5 h-5 text-white/10 group-hover:text-purple-400" />
            <span className="text-sm font-bold tracking-tight">Notifications</span>
            <span className="ml-auto w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
          </button>
          <button className="flex items-center gap-4 px-4 py-3 rounded-2xl text-white/40 hover:bg-white/5 hover:text-white transition-all w-full group">
            <Settings className="w-5 h-5 text-white/10 group-hover:text-white" />
            <span className="text-sm font-bold tracking-tight">Settings</span>
          </button>
        </div>

        <div className="p-1 bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden">
          {isLoading ? (
            <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />
          ) : user ? (
            <Link href="/profile" className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all group">
              <div className="relative">
                <img
                  src={user.image ?? 'https://placehold.co/80x80?text=U'}
                  alt="Profile"
                  className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover:border-purple-500/40 transition-colors"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#050507] rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{user.name ?? 'User'}</p>
                <p className="text-[10px] text-white/30 truncate">@{user.username || 'user'}</p>
              </div>
            </Link>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                  <User className="w-5 h-5 text-white/20" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Anonymous</p>
                  <p className="text-[8px] text-white/20 uppercase tracking-tight">Guest Explorer</p>
                </div>
              </div>
              <button
                className="w-full py-3 bg-purple-500 text-white rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-purple-600 transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                onClick={() => signIn(undefined, { callbackUrl: '/' })}
              >
                Access Account
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
