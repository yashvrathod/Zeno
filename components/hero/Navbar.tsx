'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
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
  // const navRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//   if (!navRef.current) return;

//   gsap.to(navRef.current, {
//     backgroundColor: 'rgba(0,0,0,0.75)',
//     backdropFilter: 'blur(16px)',

//     scrollTrigger: {
//       trigger: document.body,
//       start: 'top top',
//       end: '+=1200',
//       scrub: true,
//     },
//   });
// }, []);

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

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);
  const isScrolledRef = useRef(false);
  const isHoveredRef = useRef(false);

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
  <div className="px-7 pt-5">
    <div
      className="
        h-[72px]
        flex
        items-center
        justify-between
      "
    >
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
            className="h-6 w-auto"
          />
        </Link>
      </motion.div>

      {/* Nav Links */}
      <motion.div
        className="hidden lg:flex items-center gap-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <NavDropdown
          label="Products"
          items={[
            { label: 'Data Engine', href: '/products/data-engine' },
            { label: 'Model Evaluation', href: '/products/model-eval' },
            { label: 'AI Trust', href: '/products/ai-trust' },
            { label: 'All Products', href: '/products' },
          ]}
        />

        <NavDropdown
          label="Solutions"
          items={[
            { label: 'Autonomous Vehicles', href: '/solutions/autonomous' },
            { label: 'Enterprise AI', href: '/solutions/enterprise' },
            { label: 'Defense', href: '/solutions/defense' },
            { label: 'All Solutions', href: '/solutions' },
          ]}
        />

        <NavDropdown
          label="Research"
          items={[
            { label: 'AI Safety', href: '/research/ai-safety' },
            { label: 'Publications', href: '/research/publications' },
            { label: 'Case Studies', href: '/research/cases' },
          ]}
        />

        <NavDropdown
          label="Resources"
          items={[
            { label: 'Blog', href: '/blog' },
            { label: 'Documentation', href: '/docs' },
            { label: 'Community', href: '/community' },
            { label: 'Events', href: '/events' },
          ]}
        />
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Link
          href="/auth/signin"
          className="
            h-11
            px-5
            flex
            items-center
            rounded-xl
            text-[15px]
            font-medium
            text-zinc-700
            hover:bg-black/[0.03]
            transition-colors
          "
        >
          Log In
        </Link>

        <Link
          href="/demo"
          className="
            h-11
            px-5
            flex
            items-center
            rounded-xl
            bg-black
            text-white
            text-[15px]
            font-medium
            hover:bg-zinc-800
            transition-colors
          "
        >
          Book Demo
        </Link>
      </motion.div>
    </div>
  </div>
</nav>
    </>
  );
}
