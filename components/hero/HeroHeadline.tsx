'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollReveal from './ScrollReveal';

const words = ['DSA', 'Algorithms', 'Coding', 'Arrays'];

export default function HeroHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollReveal delay={0.3} direction="up">
      <h1 className="font-display text-[3.2rem] sm:text-[4rem] lg:text-[5.5rem] xl:text-[6.5rem] font-bold leading-[0.95] tracking-[-0.03em] text-zinc-900">

        <div>
          All your{' '}
          <span className="text-zinc-300 relative inline-block min-w-[3ch]">
            <AnimatePresence mode="wait">
              <motion.span
                key={words[index]}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="inline-block"
              >
                {words[index]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>

        <div>problems solved with</div>

        <div className="mt-2">
          <span className="font-display text-[3.8rem] sm:text-[5rem] lg:text-[6.5rem] xl:text-[7.5rem] font-extrabold leading-[0.9] tracking-[-0.03em] bg-gradient-to-r from-purple-600 via-pink-500 to-teal-600 bg-clip-text text-transparent">
            AI mentorship
          </span>
        </div>

      </h1>
    </ScrollReveal>
  );
}