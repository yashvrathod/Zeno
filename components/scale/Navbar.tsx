'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

interface DropdownItem {
  label: string;
  href: string;
  description?: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
  dark?: boolean;
}

function NavDropdown({ label, items, dark }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`group relative flex items-center gap-1.5 text-[15px] font-medium tracking-tight transition-all duration-300 ${
          dark
            ? 'text-white/65 hover:text-white'
            : 'text-zinc-700 hover:text-black'
        }`}
      >
        <span className="relative">
          {label}

          <span
            className={`absolute -bottom-1 left-0 h-px w-0 transition-all duration-300 group-hover:w-full ${
              dark ? 'bg-white/70' : 'bg-black'
            }`}
          />
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 transition-all duration-300 ${
            isOpen ? 'rotate-180 translate-y-[1px]' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{
              duration: 0.22,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute top-full left-1/2 z-50 mt-5 w-[320px] -translate-x-1/2"
          >
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <div className="p-2">
                {items.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.03,
                    }}
                  >
                    <Link
                      href={item.href}
                      className="group flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-300 hover:bg-black/[0.03]"
                    >
                      <div>
                        <p className="text-[15px] font-medium text-zinc-900 transition-transform duration-300 group-hover:translate-x-[2px]">
                          {item.label}
                        </p>
                      </div>

                      <div className="opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100">
                        →
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const NAV_SECTIONS = [
  {
    label: 'Products',
    items: [
      { label: 'Data Engine', href: '/products/data-engine' },
      { label: 'Model Evaluation', href: '/products/model-eval' },
      { label: 'AI Trust', href: '/products/ai-trust' },
      { label: 'All Products', href: '/products' },
    ],
  },
  {
    label: 'Solutions',
    items: [
      { label: 'Autonomous Vehicles', href: '/solutions/autonomous' },
      { label: 'Enterprise AI', href: '/solutions/enterprise' },
      { label: 'Defense', href: '/solutions/defense' },
      { label: 'All Solutions', href: '/solutions' },
    ],
  },
  {
    label: 'Research',
    items: [
      { label: 'AI Safety', href: '/research/ai-safety' },
      { label: 'Publications', href: '/research/publications' },
      { label: 'Case Studies', href: '/research/cases' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Blog', href: '/blog' },
      { label: 'Documentation', href: '/docs' },
      { label: 'Community', href: '/community' },
      { label: 'Events', href: '/events' },
    ],
  },
];

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };

    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="px-5 sm:px-8 pt-5">
          <div className="flex h-[74px] items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
              }}
            >
              <Link
                href="/"
                className="group flex items-center gap-3"
              >
                <img
                  src="/logo.png"
                  alt="neXode"
                  className={`h-8 w-auto transition-all duration-500 ${
                    scrolled ? 'brightness-0 invert' : ''
                  }`}
                />

                <span
                  className={`text-[24px] font-black tracking-[-0.04em] transition-all duration-500 ${
                    scrolled ? 'text-white' : 'text-zinc-900'
                  }`}
                >
                  ne
                  <span className="text--500">X</span>
                  ode
                </span>
              </Link>
            </motion.div>

            {/* Desktop Nav */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.05,
              }}
              className="hidden lg:flex items-center gap-9"
            >
              {NAV_SECTIONS.map((section) => (
                <NavDropdown
                  key={section.label}
                  label={section.label}
                  items={section.items}
                  dark={scrolled}
                />
              ))}
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
              }}
              className="flex items-center gap-2"
            >
              <Link
                href="/auth/signin"
                className={`hidden sm:flex h-11 items-center rounded-full px-5 text-[15px] font-medium transition-all duration-300 ${
                  scrolled
                    ? 'text-white/65 hover:text-white'
                    : 'text-zinc-700 hover:text-black'
                }`}
              >
                Log In
              </Link>

              <Link
                href="/demo"
                className={`group relative flex h-11 items-center overflow-hidden rounded-full px-5 text-[15px] font-semibold transition-all duration-300 ${
                  scrolled
                    ? 'border border-white/10 text-white hover:border-white/20'
                    : 'bg-black text-white hover:bg-zinc-800'
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started

                  <span className="transition-transform duration-300 group-hover:translate-x-[2px]">
                    →
                  </span>
                </span>
              </Link>

              {/* Mobile Menu */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`lg:hidden flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
                  scrolled
                    ? 'text-white/70 hover:text-white'
                    : 'text-zinc-700 hover:text-black'
                }`}
              >
                <Menu size={18} />
              </button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="fixed bottom-0 left-0 right-0 z-[110] overflow-hidden rounded-t-[2rem] bg-white"
            >
              <div className="px-6 pb-10 pt-7">
                <div className="mb-10 flex items-center justify-between">
                  <Link
                    href="/"
                    className="flex items-center gap-3"
                  >
                    <img
                      src="/logo.png"
                      alt="neXode"
                      className="h-7 w-auto"
                    />

                    <span className="text-xl font-black tracking-tight">
                      ne<span className="text-emerald-500">X</span>ode
                    </span>
                  </Link>

                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-700"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-8">
                  {NAV_SECTIONS.map((section) => (
                    <div key={section.label}>
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
                        {section.label}
                      </p>

                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center justify-between rounded-2xl px-3 py-3 text-[19px] font-medium text-zinc-900 transition-all duration-300 hover:bg-zinc-100"
                          >
                            {item.label}

                            <span>→</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col gap-3 border-t border-zinc-100 pt-6">
                  <Link
                    href="/auth/signin"
                    className="flex h-12 items-center justify-center rounded-full border border-zinc-200 text-[15px] font-medium"
                  >
                    Log In
                  </Link>

                  <Link
                    href="/demo"
                    className="flex h-12 items-center justify-center rounded-full bg-black text-[15px] font-semibold text-white"
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
