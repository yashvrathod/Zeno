'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Background() {
  const pathname = usePathname();
  
  // Don't render background effects on home page (Scale AI design uses image background)
  if (pathname === '/') {
    return null;
  }

  return (
    <>
      {/* Base: Deep Black */}
      <div className="fixed inset-0 bg-black" />

      {/* Soft top fade */}
      <div className="fixed inset-0 bg-gradient-to-b from-white/5 via-transparent to-black" />

      {/* Purple top glow */}
      <div
        className="fixed inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(124, 58, 237, 0.08) 0%, transparent 60%)',
        }}
      />

      {/* Center glow (purple + teal mix) */}
      <div
        className="fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(124, 58, 237, 0.10) 0%, rgba(20, 184, 166, 0.06) 40%, transparent 70%)',
        }}
      />

      {/* Animated glow orbs */}
      <div className="fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 60%)',
            filter: 'blur(120px)',
            top: '-10%',
            left: '10%',
          }}
          animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(20, 184, 166, 0.10) 0%, transparent 60%)',
            filter: 'blur(120px)',
            bottom: '-10%',
            right: '5%',
          }}
          animate={{ x: [0, -25, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Grid (subtle on black) */}
      <div
        className="fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
          `,
          backgroundSize: '120px 120px',
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${10 + (i * 8) % 80}%`,
              top: `${15 + (i * 7) % 70}%`,
            }}
            animate={{
              y: [0, -25, 0],
              opacity: [0.05, 0.2, 0.05],
            }}
            transition={{
              duration: 6 + Math.random() * 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </>
  );
}