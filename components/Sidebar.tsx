'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  MessageSquare,
  Target,
  Award,
  Settings,
  UserCircle,
  ChevronDown,
  Terminal
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const SidebarItem = ({
    href,
    icon,
    label,
    active = false,
    badge,
    hasSubItems = false,
    isSubItem = false,
  }: {
    href: string;
    icon?: React.ReactNode;
    label: string;
    active?: boolean;
    badge?: string;
    hasSubItems?: boolean;
    isSubItem?: boolean;
  }) => (
    <Link
      href={href}
      className={`group/item flex items-center gap-3 px-4 py-3 transition-all duration-200 relative ${
        active
          ? 'text-white'
          : 'text-zinc-400 hover:text-zinc-200'
      } ${isSubItem ? 'pl-12 py-2' : ''}`}
    >
      {active && !isSubItem && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#4ade80] rounded-r-full shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
      )}
      
      {!isSubItem && icon && (
        <div className={`transition-transform duration-200 ${active ? 'text-white' : ''}`}>
          {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
      )}

      {isSubItem && (
        <div className={`w-1.5 h-1.5 rounded-full mr-2 ${active ? 'bg-[#4ade80]' : 'bg-zinc-600'}`} />
      )}

      <span className={`text-[13px] font-medium flex-1 ${isSubItem ? 'text-[12px]' : ''}`}>
        {label}
      </span>

      {badge && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
          {badge}
        </span>
      )}

      {hasSubItems && (
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${active ? 'rotate-180' : ''}`} />
      )}
    </Link>
  );

  return (
    <aside className="w-64 flex flex-col h-full bg-[#000000] border-r border-zinc-900 hidden lg:flex">
      {/* Logo */}
      <div className="h-20 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <Terminal className="text-black" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-white leading-tight uppercase tracking-wider">
              Core
            </span>
            <span className="text-[14px] font-bold text-white leading-tight uppercase tracking-wider">
              Developer
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 overflow-y-auto no-scrollbar">
        <nav className="space-y-1">
          <SidebarItem
            href="/dashboard"
            icon={<LayoutDashboard />}
            label="Dashboard"
            active={pathname === '/dashboard'}
          />
          
          <div>
            <SidebarItem
              href="/problems"
              icon={<BookOpen />}
              label="My Courses"
              active={pathname.startsWith('/problems')}
              hasSubItems={true}
            />
            {pathname.startsWith('/problems') && (
              <div className="mt-1">
                <SidebarItem
                  href="/problems?tag=ios"
                  label="iOS & Swift: Become..."
                  active={false}
                  isSubItem={true}
                />
                <SidebarItem
                  href="/problems"
                  label="Swift for Intermediate..."
                  active={true}
                  isSubItem={true}
                />
              </div>
            )}
          </div>

          <SidebarItem
            href="/explore"
            icon={<Compass />}
            label="Explore"
            active={pathname === '/explore'}
          />
          
          <SidebarItem
            href="/messages"
            icon={<MessageSquare />}
            label="Messages"
            active={pathname === '/messages'}
            badge="2"
          />

          <SidebarItem
            href="/skill-tests"
            icon={<Target />}
            label="Skill Tests"
            active={pathname === '/skill-tests'}
          />

          <SidebarItem
            href="/certificates"
            icon={<Award />}
            label="Certificates"
            active={pathname === '/certificates'}
          />
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="py-4 border-t border-zinc-900">
        <SidebarItem
          href="/settings"
          icon={<Settings />}
          label="Settings"
          active={pathname === '/settings'}
        />
        <SidebarItem
          href="/profile"
          icon={<UserCircle />}
          label="Account"
          active={pathname === '/profile'}
        />
      </div>
    </aside>
  );
}
