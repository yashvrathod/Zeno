'use client';

import { forwardRef } from 'react';

const navLinks = ['Product', 'Docs', 'Blog', 'Pricing', 'API', 'About'];
const socialLinks = ['GitHub', 'Twitter', 'LinkedIn'];

export const DarkFooter = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <footer
      ref={ref}
      className="relative z-[1] min-h-screen bg-[#050505] flex flex-col items-center justify-center text-center px-6"
    >
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#efe6d8] to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div data-footer-item className="mb-14">
          <span className="text-3xl font-semibold text-white/80 tracking-tight">scale</span>
        </div>

        <nav data-footer-item className="mb-14">
          <ul className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm tracking-[0.1em] uppercase text-white/40">
            {navLinks.map((link) => (
              <li key={link}>
                <a href="#" className="hover:text-white/80 transition-colors duration-300">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div data-footer-item className="mx-auto h-px w-24 bg-white/10 mb-10" />

        <div
          data-footer-item
          className="flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-white/30"
        >
          <span>&copy; 2025 Scale AI</span>
          <span className="hidden sm:inline">&middot;</span>
          <div className="flex items-center gap-5">
            {socialLinks.map((link) => (
              <a key={link} href="#" className="hover:text-white/60 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
});

DarkFooter.displayName = 'DarkFooter';
