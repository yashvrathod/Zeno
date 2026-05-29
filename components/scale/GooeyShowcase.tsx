'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useRef, useState, useCallback, forwardRef } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { GooeyTile } from './GooeyTile';

gsap.registerPlugin(ScrollTrigger);

const cards = [
  {
    baseImg: '/gooey/woods-base.jpg',
    hoverImg: '/gooey/woods-hover.jpg',
    title: 'WOODS &\nFORESTS',
  },
  {
    baseImg: '/gooey/rocks-base.jpg',
    hoverImg: '/gooey/rocks-hover.jpg',
    title: 'ROCKS &\nMOUNTAINS',
  },
  {
    baseImg: '/gooey/cities-base.jpg',
    hoverImg: '/gooey/cities-hover.jpg',
    title: 'MODERN\nCITIES',
  },
  {
    baseImg: '/gooey/ocean.jpg',
    hoverImg: '/gooey/ocean-hover.jpg',
    title: 'OCEANS &\nWAVES',
  },
  {
    baseImg: '/gooey/desert.jpg',
    hoverImg: '/gooey/desert-hover.jpg',
    title: 'DESERT &\nSANDS',
  },
  {
    baseImg: '/gooey/snow.jpg',
    hoverImg: '/gooey/snow-hover.jpg',
    title: 'SNOW &\nICE',
  },
];

const positions = [
  [-14, -1.4, 0],
  [-7, 1.2, 0],
  [0, -0.8, 0],
  [7, 1.5, 0],
  [14, -1.2, 0],
  [21, 1.3, 0],
];

function FloatingTiles({
  progressMV,
  rawProgress,
  activeTile,
  onTileClick,
}: {
  progressMV: any;
  rawProgress: React.MutableRefObject<number>;
  activeTile: number | null;
  onTileClick: (i: number) => void;
}) {
  const { viewport } = useThree();
  const factor = Math.min(1, viewport.width / 16);
  const groupRef = useRef<THREE.Group>(null);
  const smoothRef = useRef(0);

  useFrame(() => {
    smoothRef.current = THREE.MathUtils.lerp(
      smoothRef.current,
      rawProgress.current,
      0.06
    );

    progressMV.set(smoothRef.current);

    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        -smoothRef.current * 42 * factor,
        0.06
      );
    }
  });

  return (
    <group ref={groupRef}>
      {cards.map((card, i) => (
        <group
          key={i}
          position={[positions[i][0] * factor, positions[i][1], positions[i][2]] as [number, number, number]}
          rotation={[0, 0, i % 2 === 0 ? -0.08 : 0.08]}
        >
          <GooeyTile
            baseImg={card.baseImg}
            hoverImg={card.hoverImg}
            position={[0, 0, 0]}
            scale={[4.2 * factor, 5.8 * factor]}
            onClick={() => onTileClick(i)}
            active={activeTile === i}
            dimmed={activeTile !== null && activeTile !== i}
          />
        </group>
      ))}
    </group>
  );
}

function OverlayContent({ progressMV }: { progressMV: any }) {
  const mm = typeof window !== 'undefined' ? Math.min(1, window.innerWidth / 1920) : 1;
  const parallax = useTransform(progressMV, [0, 1], [0, -4300 * mm]);
  const textParallax = useTransform(parallax, (v: number) => v * 0.35);

  return (
    <>
      {/* Huge Background Text */}
      <motion.div
        style={{ x: textParallax }}
        className="absolute inset-0 z-10 pointer-events-none flex items-center"
      >
        <div className="min-w-max px-[8vw]">
          <h1
            className="text-[10vw] leading-[0.82] uppercase font-serif tracking-[-0.07em] text-[#76807b]/20 select-none"
            style={{ mixBlendMode: 'soft-light' }}
          >
            WHAT'S YOUR NEXT
            <br />
            DESTINATION
          </h1>
        </div>
      </motion.div>

      {/* Labels */}
      <motion.div
        style={{ x: parallax }}
        className="absolute inset-0 z-20 pointer-events-none"
      >
        {cards.map((card, i) => {
          const [px, py] = positions[i];

          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `calc(50% + ${px * 170 * mm}px)`,
                top: `calc(50% + ${py * 90 * mm}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="translate-y-[60px] md:translate-y-[170px]">
                <h2 className="whitespace-pre-line text-[clamp(1.5rem,5vw,4.5rem)] leading-[0.9] uppercase font-serif tracking-[-0.05em] text-[#efe4db]">
                  {card.title}
                </h2>

                <div className="mt-5">
                  <p className="text-[#efe4db] text-sm mb-2">See more</p>
                  <div className="w-16 h-[1px] bg-[#efe4db]/80" />
                </div>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Bottom Right */}
      <div className="absolute bottom-10 right-10 z-30">
        <p className="text-white/70 text-sm leading-relaxed text-right">
          With NexCode, nothing stands between your ideas
          <br />
          and the final result.
        </p>
        <p className="text-white/30 text-xs mt-4 text-right">
          Built for developers
        </p>
      </div>

      {/* Bottom Center Line */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <div className="w-40 h-[2px] rounded-full bg-white/30" />
      </div>
    </>
  );
}

const GooeyMagazineScroll = forwardRef<HTMLDivElement>((_, ref) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const handleClick = useCallback((i: number) => setActiveTile(i), []);
  const handleClose = useCallback(() => setActiveTile(null), []);

  const setSectionRef = useCallback(
    (el: HTMLDivElement | null) => {
      internalRef.current = el;
      if (ref) {
        if (typeof ref === 'function') ref(el);
        else (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    },
    [ref],
  );

  const progressMV = useMotionValue(0);
  const rawProgress = useRef(0);

  useGSAP(() => {
    if (!internalRef.current) return;

    ScrollTrigger.create({
      trigger: internalRef.current,
      pin: true,
      scrub: 1,
      end: "+=70%",
      onUpdate: (self) => {
        rawProgress.current = self.progress;
      },
    });
  }, []);

  return (
    <section
      ref={setSectionRef}
      data-gooey-section
      className="relative h-screen overflow-hidden bg-gradient-to-b from-black via-[#4f5855] to-black z-10"
    >
      <div className="relative h-screen overflow-hidden">
        {/* Atmosphere */}
        <div className="absolute inset-0 z-0 backdrop-blur-[20px] md:backdrop-blur-[40px]" style={{ transform: 'translateZ(0)' }} />

        {/* Canvas */}
        <Canvas
          className="z-10"
          camera={{ position: [0, 0, 11], fov: 45 }}
          dpr={typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : [1, 1.5]}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={2} />

            <FloatingTiles
              progressMV={progressMV}
              rawProgress={rawProgress}
              activeTile={activeTile}
              onTileClick={handleClick}
            />
          </Suspense>
        </Canvas>

        {/* Overlay */}
        {activeTile === null && <OverlayContent progressMV={progressMV} />}

        {/* Expanded Detail */}
        {activeTile !== null && (
          <div className="absolute inset-0 z-50">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-xl" onClick={handleClose} />

            <div className="absolute inset-0 flex items-center justify-center px-10">
              <div className="relative max-w-5xl w-full">
                <button
                  onClick={handleClose}
                  className="absolute -top-14 right-0 text-white/50 hover:text-white uppercase tracking-[0.2em] text-xs transition-colors"
                >
                  Close ✕
                </button>

                <div className="border-t border-white/20 pt-10">
                  <h2 className="text-7xl sm:text-9xl uppercase leading-[0.85] tracking-[-0.06em] font-serif text-[#efe4db] whitespace-pre-line">
                    {cards[activeTile].title}
                  </h2>

                  <p className="mt-10 max-w-2xl text-lg leading-relaxed text-white/60">
                    Explore immersive landscapes and cinematic storytelling with rich motion, fluid interaction,
                    and modern visual experiences crafted for high-end interfaces.
                  </p>

                  <div className="mt-10 flex items-center gap-6">
                    <span className="uppercase tracking-[0.2em] text-sm text-white/40">Explore</span>
                    <span className="text-white/20 text-2xl">→</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export default GooeyMagazineScroll;
