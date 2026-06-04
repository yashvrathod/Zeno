'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  LayoutGrid,
  Brain,
  Trophy,
  Code2,
  Search,
  Settings,
  User,
} from 'lucide-react';

const items = [
  { href: '/dashboard', icon: LayoutGrid },
  { href: '/problems', icon: Code2 },
  { href: '/profile/skills', icon: Brain },
  { href: '/leaderboard', icon: Trophy },
  { href: '/search', icon: Search },
];

const bottomNavItems = [
  { href: '/', icon: LayoutGrid, label: 'Workbench' },
  { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/problems', icon: Code2, label: 'Learn' },
  { href: '/profile/skills', icon: Brain, label: 'Skills' },
  { href: '/leaderboard', icon: Trophy, label: 'Rank' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/problems') return pathname.startsWith('/problems');
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop floating icon-only sidebar */}
      <aside className="hidden md:flex relative flex-col items-center h-[calc(100vh-1.5rem)] my-3 ml-3 w-[88px] shrink-0 rounded-2xl bg-nx-sidebar border border-white/[0.04] z-50 overflow-hidden">
        {/* Logo */}
        <div className="pt-6 pb-10">
          <Link href="/" className="block">
            <div className="w-12 h-12 rounded-2xl  flex items-center justify-center shadow-[0_4px_16px_rgba(212,165,83,0.2)]">
              <img
                src="/logo.png"
                alt="neXode"
                className="w-7 h-7 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
              />
            </div>
          </Link>
        </div>

        {/* Nav */}
        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.href.replace('/', '').replace('-', ' ') || 'home'}
                className={`
                  w-12 h-12 rounded-xl
                  flex items-center justify-center
                  transition-all duration-300
                  ${
                    active
                      ? 'bg-nx-text-bright text-nx-bg shadow-[0_4px_14px_rgba(240,234,216,0.15)]'
                      : 'bg-white/[0.02] text-nx-muted hover:bg-white/[0.06] hover:text-nx-text border border-white/[0.04]'
                  }
                `}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.75} />
              </Link>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Bottom: settings + profile */}
        <div className="pb-6 flex flex-col items-center gap-3">
          <Link
            href="/settings"
            title="Settings"
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
              pathname === '/settings'
                ? 'bg-nx-text-bright text-nx-bg'
                : 'bg-white/[0.02] text-nx-muted hover:bg-white/[0.06] hover:text-nx-text border border-white/[0.04]'
            }`}
          >
            <Settings size={18} strokeWidth={pathname === '/settings' ? 2 : 1.75} />
          </Link>

          <Link
            href="/profile"
            title={session?.user?.name || 'Profile'}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-white/[0.06] overflow-hidden hover:scale-105 transition-transform"
          >
            {session?.user?.image ? (
              <img src={session.user.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-nx-muted" />
            )}
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 z-50 bg-nx-sidebar/95 backdrop-blur-2xl border border-white/[0.04] rounded-2xl safe-area-bottom">
        <div className="flex items-center justify-around h-[56px] px-2">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                  active ? 'text-nx-accent' : 'text-nx-muted hover:text-nx-text'
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2 : 1.75} />
                <span className={`text-[8px] font-bold tracking-[0.15em] uppercase ${
                  active ? 'text-nx-accent' : 'text-nx-muted'
                }`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-nx-accent" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
