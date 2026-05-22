'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface FeatureCard {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  x: number;
  y: number;
  z: number;
  rotateY: number;
  rotateX: number;
}

const cards: FeatureCard[] = [
  {
    id: 0,
    title: 'Code Analysis',
    subtitle: 'Real-time complexity',
    icon: '⚡',
    x: -35,
    y: -25,
    z: 40,
    rotateY: 15,
    rotateX: -5,
  },
  {
    id: 1,
    title: 'Pattern Recognition',
    subtitle: 'AI-powered detection',
    icon: '🔍',
    x: 35,
    y: -20,
    z: 60,
    rotateY: -12,
    rotateX: 3,
  },
  {
    id: 2,
    title: 'O(n) Optimization',
    subtitle: 'Optimal solutions',
    icon: '📊',
    x: -30,
    y: 30,
    z: 20,
    rotateY: 10,
    rotateX: 8,
  },
  {
    id: 3,
    title: 'Adaptive Learning',
    subtitle: 'Personalized paths',
    icon: '🧠',
    x: 30,
    y: 35,
    z: 50,
    rotateY: -15,
    rotateX: -3,
  },
  {
    id: 4,
    title: 'Live Debugging',
    subtitle: 'Instant feedback',
    icon: '🛠️',
    x: 0,
    y: -40,
    z: 80,
    rotateY: 0,
    rotateX: -8,
  },
];

export default function FeatureCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    gsap.fromTo(containerRef.current, {
      opacity: 0,
      scale: 0.85,
    }, {
      opacity: 1,
      scale: 1,
      scrollTrigger: {
        trigger: document.body,
        start: '+=200 top',
        end: '+=700',
        scrub: true,
      },
    });

    cardRefs.current.forEach((card, i) => {
      if (!card) return;

      gsap.to(card, {
        y: `random(-6, 6)`,
        x: `random(-3, 3)`,
        duration: `random(2.5, 4)`,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.2,
      });

      gsap.to(card.querySelector('.card-glow'), {
        opacity: 0.6,
        duration: `random(1.5, 3)`,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.15,
      });
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none flex items-center justify-center"
      style={{
        transformStyle: 'preserve-3d',
        transform: 'translateY(-8%) translateZ(100px)',
      }}
    >
      <div className="relative w-full h-full max-w-4xl max-h-[500px]">
        {cards.map((card, i) => (
          <div
            key={card.id}
            ref={(el) => { cardRefs.current[i] = el; }}
            className="absolute left-1/2 top-1/2"
            style={{
              transformStyle: 'preserve-3d',
              transform: `translate(${card.x}%, ${card.y}%) translateZ(${card.z}px) rotateY(${card.rotateY}deg) rotateX(${card.rotateX}deg)`,
            }}
          >
            <div
              className="
                relative
                px-5 py-3
                rounded-2xl
                border border-white/40
                bg-white/5
                backdrop-blur-[8px]
                shadow-[0_0_30px_rgba(255,255,255,0.15)]
              "
            >
              {/* GLOW */}
              <div
                className="card-glow absolute inset-0 rounded-2xl opacity-30"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
                }}
              />

              {/* CONTENT */}
              <div className="relative flex items-center gap-3">
                <span className="text-lg">{card.icon}</span>
                <div>
                  <div className="text-white text-[13px] font-medium tracking-wide">
                    {card.title}
                  </div>
                  <div className="text-white/50 text-[10px] font-mono">
                    {card.subtitle}
                  </div>
                </div>
              </div>

              {/* EDGE LINE */}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
