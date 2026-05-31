'use client';

import { forwardRef } from 'react';

const navLinks = ['Product', 'Docs', 'Blog', 'Pricing', 'API', 'About'];
const socialLinks = ['GitHub', 'Twitter', 'LinkedIn'];

export const DarkFooter = forwardRef<HTMLElement>((_props, ref) => {
  return (
    <footer
      ref={ref}
      className="relative z-[1] min-h-screen bg-[#050505] flex flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Top Transition Gradient */}
      <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#efe6d8] to-transparent pointer-events-none opacity-20" />

      {/* Background Decorative Text */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <h2 className="text-[30vw] font-black text-white/[0.02] tracking-tighter leading-none transform translate-y-1/4">
          SCALE
        </h2>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto py-24 flex flex-col h-full">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-32">
          <div data-footer-item className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <img src="/logo.png" alt="Logo" className="h-8 brightness-0 invert" />
              <span className="text-2xl font-bold text-white tracking-tighter">neXode</span>
            </div>
            <p className="text-white/40 text-lg leading-relaxed max-w-sm mb-10 font-light">
              Accelerating the transition to intelligent systems with industry-leading AI infrastructure.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'GitHub', 'LinkedIn'].map(social => (
                <a key={social} href="#" className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-all duration-300">
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 bg-current" style={{ maskImage: `url(/icons/${social.toLowerCase()}.svg)`, maskSize: 'contain', maskRepeat: 'no-repeat' }} />
                </a>
              ))}
            </div>
          </div>

          <div data-footer-item>
            <h4 className="text-white font-semibold mb-8 uppercase tracking-[0.2em] text-xs">Product</h4>
            <ul className="space-y-4">
              {['Data Engine', 'Model Evaluation', 'AI Trust', 'Infrastructure', 'Solutions'].map(item => (
                <li key={item}>
                  <a href="#" className="text-white/40 hover:text-white transition-colors text-sm font-light">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div data-footer-item>
            <h4 className="text-white font-semibold mb-8 uppercase tracking-[0.2em] text-xs">Company</h4>
            <ul className="space-y-4">
              {['About Us', 'Careers', 'Partners', 'Newsroom', 'Contact'].map(item => (
                <li key={item}>
                  <a href="#" className="text-white/40 hover:text-white transition-colors text-sm font-light">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Big Bottom Section */}
        <div data-footer-item className="mt-auto pt-16 border-t border-white/5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex flex-wrap justify-center lg:justify-start gap-8">
              {['Privacy Policy', 'Terms of Service', 'Cookie Settings', 'Security'].map(item => (
                <a key={item} href="#" className="text-[10px] uppercase tracking-widest text-white/20 hover:text-white transition-colors">{item}</a>
              ))}
            </div>
            
            <div className="text-[10px] uppercase tracking-widest text-white/20">
              © 2026 NEXODE AI. ALL RIGHTS RESERVED.
            </div>
          </div>
        </div>
      </div>

      {/* Floating Gradient */}
      <div className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
    </footer>
  );
});

DarkFooter.displayName = 'DarkFooter';
