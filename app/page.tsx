'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { Navbar, HeroVideo } from '@/components/hero';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const textRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lines = gsap.utils.toArray('.hero-line');

    gsap.to(lines, {
      opacity: 0,
      y: -120,
      stagger: 0.12,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: '+=600',
        scrub: true,
      },
    });
  }, []);

  useEffect(() => {
    if (!pageRef.current) return;

    // Background transition is now handled by the high-performance overlay below
  }, []);
  return (
    <div
      ref={pageRef} 
      className="relative bg-white min-h-screen"
    >
      {/* Black Background Overlay (Optimized Transition) */}
      <div 
        className="fixed inset-0 bg-black pointer-events-none z-[-1] will-change-opacity"
        style={{ opacity: 0 }}
        id="bg-overlay"
      />

      <script dangerouslySetInnerHTML={{ __html: `
        window.addEventListener('scroll', () => {
          const overlay = document.getElementById('bg-overlay');
          if (!overlay) return;
          const progress = Math.min(window.scrollY / 1400, 1);
          overlay.style.opacity = progress;
        }, { passive: true });
      `}} />

      {/* Video Background */}
      <HeroVideo />

      {/* Navbar */}
      <Navbar />

      {/* Fixed Hero Section */}
      <section className="fixed inset-0 z-10 flex flex-col items-center justify-center px-6 text-center font-roboto-slab pointer-events-none">
        
        {/* TEXT */}
        <motion.div
          ref={textRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-medium text-white tracking-tight leading-[1.15] mb-0">
             <span className="hero-line block">
      The world's most important decisions
    </span>

    <span className="hero-line block">
      need reliable AI systems.
    </span>
          </h1>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="absolute bottom-10 right-10 flex items-center gap-3 text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <span className="text-[14px] font-medium tracking-wide">
            Scroll to explore
          </span>

          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-9 h-9 border border-white/40 rounded-lg flex items-center justify-center"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </section>

      {/* Scroll Space */}
      <section className="h-[2000vh]" />
    </div>
  );
}