'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';

interface DropdownItem {
  label: string;
  href: string;
  description?: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
}

function NavDropdown({ label, items }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="flex items-center gap-1.5 text-[15px] text-zinc-700 hover:text-zinc-900 transition-colors font-medium">
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 mt-3 w-72 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-100 py-3 z-50"
        >
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block px-5 py-2.5 text-[15px] text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </motion.div>
      )}
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
  const isScrolledRef = useRef(false);
  const isHoveredRef = useRef(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const update = () => {
      if (isScrolledRef.current && !isHoveredRef.current) {
        gsap.to(nav, { y: '-100%', duration: 0.35, ease: 'power2.inOut', overwrite: 'auto' });
      } else {
        gsap.to(nav, { y: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      }
    };

    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      if (scrolled !== isScrolledRef.current) {
        isScrolledRef.current = scrolled;
        update();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showNav = () => {
    isHoveredRef.current = true;
    if (isScrolledRef.current && navRef.current) {
      gsap.to(navRef.current, { y: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    }
  };

  const hideNav = () => {
    isHoveredRef.current = false;
    if (isScrolledRef.current && navRef.current) {
      gsap.to(navRef.current, { y: '-100%', duration: 0.3, ease: 'power2.in', overwrite: 'auto' });
    }
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-40 h-10"
        onMouseEnter={showNav}
      />
      <nav
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50"
        onMouseEnter={showNav}
        onMouseLeave={hideNav}
      >
        <div className="px-4 sm:px-7 pt-5">
          <div className="h-[72px] flex items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Link href="/" className="flex items-center">
                <img
                  src="/ui/imwewage.png"
                  alt="Scale AI"
                  className="h-5 sm:h-6 w-auto"
                />
              </Link>
            </motion.div>

            {/* Desktop Nav Links */}
            <motion.div
              className="hidden lg:flex items-center gap-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {NAV_SECTIONS.map((section) => (
                <NavDropdown key={section.label} label={section.label} items={section.items} />
              ))}
            </motion.div>

            {/* Actions */}
            <motion.div
              className="flex items-center gap-2 sm:gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <Link
                href="/auth/signin"
                className="h-11 px-4 sm:px-5 flex items-center rounded-xl text-[15px] font-medium text-zinc-700 hover:bg-black/[0.03] dark:text-zinc-400 dark:hover:bg-white/5 transition-colors"
              >
                <span className="hidden sm:inline">Log In</span>
                <span className="sm:hidden">Log in</span>
              </Link>

              <Link
                href="/demo"
                className="h-11 px-4 sm:px-5 flex items-center rounded-xl bg-black dark:bg-white text-white dark:text-black text-[15px] font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Book Demo
              </Link>

              {/* Hamburger — visible below lg */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden h-11 w-11 flex items-center justify-center rounded-xl text-zinc-700 dark:text-zinc-400 hover:bg-black/[0.03] dark:hover:bg-white/5 transition-colors"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer — slides up from bottom (Scale.ai pattern) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: [0.34, 0.34, 0.28, 0.78] }}
              className="fixed bottom-0 left-0 right-0 z-[110] bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
            >
              <div className="px-6 py-8">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-sm font-semibold text-zinc-500 tracking-widest uppercase">Menu</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-6">
                  {NAV_SECTIONS.map((section) => (
                    <div key={section.label}>
                      <span className="text-xs font-semibold text-zinc-400 tracking-widest uppercase block mb-3">
                        {section.label}
                      </span>
                      <div className="space-y-1">
                        {section.items.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2.5 text-[17px] font-medium text-zinc-800 hover:text-black transition-colors"
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col gap-3">
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full h-12 flex items-center justify-center rounded-xl border border-zinc-200 text-[15px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/demo"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full h-12 flex items-center justify-center rounded-xl bg-black text-white text-[15px] font-medium hover:bg-zinc-800 transition-colors"
                  >
                    Book Demo
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
