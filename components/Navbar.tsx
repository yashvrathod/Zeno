'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Search, Bell } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const NavLink = ({
    label,
    href,
    active = false,
  }: {
    label: string;
    href: string;
    active?: boolean;
  }) => (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-primary font-semibold'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="h-18 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Search */}
        <div className="flex items-center gap-6">
          {/* Search Bar */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search problems, concepts, mentors..."
              className="w-full h-11 pl-10 pr-4 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 hover:bg-secondary rounded-lg transition-colors">
            <Bell className="text-muted-foreground" size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>

          {/* Profile */}
          {session ? (
            <Link href="/profile" className="flex items-center gap-3 pl-4 border-l border-border">
              <Avatar className="w-10 h-10 rounded-xl border-2 border-transparent hover:border-primary transition-colors cursor-pointer">
                <AvatarImage src={session.user?.image ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {session.user?.name?.[0] ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-foreground">
                  {session.user?.username || session.user?.name?.split(' ')[0] || 'Member'}
                </p>
                <p className="text-xs text-muted-foreground">
                  View Profile
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="px-5">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="px-6 bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
