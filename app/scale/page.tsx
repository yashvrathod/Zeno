'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CodeAnalysisCard from '../../components/hero/CodeAnalysisCard';

gsap.registerPlugin(ScrollTrigger);

const S = {
  TOTAL: 6000,
} as const;

export default function HeroVideo() {
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const innerCubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoWrapperRef.current) return;

    const mm = gsap.matchMedia();

    // =========================
    // HOLOGRAM SHIMMER
    // =========================
    gsap.to('.holo-shimmer', {
      backgroundPosition: '0% 200%',
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // =========================
    // 3D CUBE ROTATION
    // =========================
    if (cubeRef.current) {
      gsap.to(cubeRef.current, {
        rotationX: 360,
        rotationY: 360,
        duration: 18,
        repeat: -1,
        ease: 'none',
      });
    }

    if (innerCubeRef.current) {
      gsap.to(innerCubeRef.current, {
        rotationX: -360,
        rotationY: 360,
        duration: 12,
        repeat: -1,
        ease: 'none',
      });
    }

    // =========================
    // MOBILE
    // =========================
    mm.add('(max-width: 639px)', () => {
      const vh = window.innerHeight;
      const parentH = videoWrapperRef.current!.parentElement!.clientHeight;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: `+=${S.TOTAL}`,
          scrub: true,
        },
      });

      tl.fromTo('.fade-in-content', { opacity: 0 }, { opacity: 1, duration: 2, ease: 'none' }, 0.8);

      tl.to(videoWrapperRef.current, {
        scaleX: 0.92,
        scaleY: (0.65 * vh) / parentH,
        rotationY: -12,
        rotationX: 2,
        y: -10,
        ease: 'none',
        duration: 1,
      });

      tl.to(videoWrapperRef.current, {
        scaleX: 0.78,
        scaleY: 120 / parentH,
        rotationY: -30,
        rotationX: 6,
        y: -80,
        ease: 'none',
        duration: 1.4,
      });
    });

    // =========================
    // TABLET
    // =========================
    mm.add('(min-width: 640px) and (max-width: 1023px)', () => {
      const vh = window.innerHeight;
      const parentH = videoWrapperRef.current!.parentElement!.clientHeight;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: `+=${S.TOTAL}`,
          scrub: true,
        },
      });

      tl.fromTo('.fade-in-content', { opacity: 0 }, { opacity: 1, duration: 2, ease: 'none' }, 0.8);

      tl.to(videoWrapperRef.current, {
        scaleX: 0.90,
        scaleY: (0.68 * vh) / parentH,
        rotationY: -12,
        rotationX: 2,
        y: 0,
        ease: 'none',
        duration: 1,
      });

      tl.to(videoWrapperRef.current, {
        scaleX: 0.62,
        scaleY: 170 / parentH,
        rotationY: -35,
        rotationX: 6,
        y: -120,
        ease: 'none',
        duration: 1.4,
      });
    });

    // =========================
    // DESKTOP
    // =========================
    mm.add('(min-width: 1024px)', () => {
      const vh = window.innerHeight;
      const parentH = videoWrapperRef.current!.parentElement!.clientHeight;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: `+=${S.TOTAL}`,
          scrub: true,
        },
      });

      tl.fromTo('.fade-in-content', { opacity: 0 }, { opacity: 1, duration: 2, ease: 'none' }, 0.8);

      tl.to(videoWrapperRef.current, {
        scaleX: 0.55,
        scaleY: (0.55 * vh) / parentH,
        rotationY: -12,
        y: 10,
        ease: 'none',
        duration: 1,
      });

      tl.to(videoWrapperRef.current, {
        scaleX: 0.12,
        scaleY: (0.20 * vh) / parentH,
        rotationY: -85,
        x: -10,
        y: -140,
        ease: 'none',
        duration: 1.4,
      });
    });

    return () => {
      mm.revert();
    };
  }, []);

  return (
    <>
      <div
        className="fixed inset-0 mt-20 z-0 flex items-center justify-center p-3 sm:p-4 md:p-6"
        style={{
          perspective: '1800px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          ref={videoWrapperRef}
          className="
            relative
            overflow-hidden

            rounded-2xl
            sm:rounded-3xl
            md:rounded-[42px]

            border border-white/20
            md:border-2 md:border-white/40

            shadow-[0_20px_60px_rgba(0,0,0,0.45)]
            md:shadow-[0_60px_180px_rgba(0,0,0,0.55)]

            will-change-transform
          "
          style={{
            width: '100%',
            height: '100%',
            contain: 'layout style paint',
            backfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            background: '#0a0a0a',
          }}
        >
          {/* ========================= */}
          {/* HOLOGRAM — behind video (Z back) */}
          {/* ========================= */}
          {/* LAYER 3 — furthest back */}
          <div
            className="fade-in-content opacity-0 pointer-events-none absolute inset-0 z-[1] rounded-2xl sm:rounded-3xl md:rounded-[42px] border border-white/10 bg-white/[0.02]"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translateZ(-80px) rotateX(4deg) rotateY(-6deg) rotateZ(0.5deg)',
              transformOrigin: 'center center',
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl sm:rounded-3xl md:rounded-[42px] opacity-[0.04]"
              style={{
                backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '100% 4px',
              }}
            />
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl md:rounded-[42px] shadow-[inset_0_0_30px_rgba(255,255,255,0.1)]" />
          </div>

          {/* LAYER 2 — middle back */}
          <div
            className="fade-in-content opacity-0 pointer-events-none absolute inset-0 z-[2] rounded-2xl sm:rounded-3xl md:rounded-[42px] border border-white/20 bg-white/[0.03] backdrop-blur-[1px]"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translateZ(-40px) rotateX(5deg) rotateY(-7deg) rotateZ(0.8deg)',
              transformOrigin: 'center center',
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl sm:rounded-3xl md:rounded-[42px] opacity-[0.05]"
              style={{
                backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '100% 4px',
              }}
            />
            <div className="absolute inset-4 sm:inset-6 md:inset-8 opacity-15">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/40" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/40" />
              <div className="absolute left-[25%] top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute top-[25%] left-0 right-0 h-px bg-white/15" />
              <div className="absolute top-[75%] left-0 right-0 h-px bg-white/15" />
            </div>
            <div className="absolute inset-0 text-[8px] sm:text-[9px] font-mono text-white/20">
              <span className="absolute top-[20%] left-[15%]">1010</span>
              <span className="absolute top-[30%] right-[18%]">0111</span>
              <span className="absolute bottom-[25%] left-[20%]">0011</span>
              <span className="absolute bottom-[40%] right-[22%]">1101</span>
            </div>
            <div
              className="holo-shimmer absolute inset-0 rounded-2xl sm:rounded-3xl md:rounded-[42px]"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.08) 45%, transparent 100%)',
                backgroundSize: '100% 250%',
                mixBlendMode: 'screen',
              }}
            />
          </div>

          {/* LAYER 1 — front hologram (Z=0, has cubes) */}
          <div
            className="
              fade-in-content opacity-0
              pointer-events-none
              absolute inset-0
              z-[3]
              rounded-2xl sm:rounded-3xl md:rounded-[42px]
              border border-white/30 md:border-white/50
              bg-white/5
              backdrop-blur-[2px]
              shadow-[0_0_60px_rgba(255,255,255,0.2),0_0_100px_rgba(255,255,255,0.1),inset_0_0_40px_rgba(255,255,255,0.08)]
            "
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translateZ(0px) rotateX(6deg) rotateY(-8deg) rotateZ(1deg)',
              transformOrigin: 'center center',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
            }}
          >
            <div
              className="absolute inset-0 rounded-2xl sm:rounded-3xl md:rounded-[42px] overflow-hidden opacity-[0.06]"
              style={{
                backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '100% 4px',
              }}
            />
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl md:rounded-[42px] shadow-[inset_0_0_40px_rgba(255,255,255,0.15)]" />
            <div className="absolute inset-4 sm:inset-6 md:inset-8 opacity-20">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
              <div className="absolute left-[25%] top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute top-[25%] left-0 right-0 h-px bg-white/20" />
              <div className="absolute top-[75%] left-0 right-0 h-px bg-white/20" />
            </div>
            <div className="absolute inset-0 text-[8px] sm:text-[9px] font-mono text-white/30 md:text-white/40">
              <span className="absolute top-[15%] left-[10%] sm:left-[12%]">0110</span>
              <span className="absolute top-[25%] right-[12%] sm:right-[15%]">1001</span>
              <span className="absolute bottom-[20%] left-[15%] sm:left-[18%]">1100</span>
              <span className="absolute top-[40%] right-[16%] sm:right-[20%]">0101</span>
              <span className="absolute bottom-[35%] right-[10%] sm:right-[12%]">1011</span>
            </div>
            <div
              className="holo-shimmer absolute inset-0 rounded-2xl sm:rounded-3xl md:rounded-[42px]"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.12) 45%, transparent 100%)',
                backgroundSize: '100% 250%',
                mixBlendMode: 'screen',
              }}
            />

            {/* 3D ROTATING OUTER CUBE */}
            <div
              ref={cubeRef}
              className="absolute bottom-4 sm:bottom-6 md:bottom-8 right-4 sm:right-6 md:right-8"
              style={{ transformStyle: 'preserve-3d', width: 36, height: 36 }}
            >
              <div className="absolute inset-0 border border-white/20 md:border-white/15 rounded-sm" style={{ transform: 'translateZ(18px)' }} />
              <div className="absolute inset-0 border border-white/20 md:border-white/15 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(18px)' }} />
              <div className="absolute inset-0 border border-white/20 md:border-white/15 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(18px)' }} />
              <div className="absolute inset-0 border border-white/20 md:border-white/15 rounded-sm" style={{ transform: 'translateZ(-18px)' }} />
              <div className="absolute inset-0 border border-white/20 md:border-white/15 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(18px)' }} />
              <div className="absolute inset-0 border border-white/20 md:border-white/15 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(18px)' }} />
              <div className="absolute inset-0 border border-white/5 rounded-sm" style={{ transform: 'translateZ(0px)', background: 'rgba(255,255,255,0.03)' }} />
            </div>

            {/* 3D ROTATING INNER CUBE */}
            <div
              ref={innerCubeRef}
              className="absolute bottom-[52px] right-[52px] hidden sm:block"
              style={{ transformStyle: 'preserve-3d', width: 18, height: 18 }}
            >
              <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'translateZ(9px)' }} />
              <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(9px)' }} />
              <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(9px)' }} />
              <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'translateZ(-9px)' }} />
              <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(9px)' }} />
              <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(9px)' }} />
            </div>
          </div>

          {/* ========================= */}
          {/* VIDEO — middle plane (Z=0) */}
          {/* ========================= */}
          <div className="absolute inset-0 z-[4] overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[42px]">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/video/bore.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />
          </div>

          {/* ========================= */}
          {/* CODE ANALYSIS — in front of video (Z front) */}
          {/* ========================= */}
          <div
            className="fade-in-content bg-white opacity-0 absolute inset-0 z-[5] overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[42px]"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'translate3d(-1200px, -20px, -160px) translate3d(80px, 10px, -80px) translate3d(0px, 0px, 0px)'
            }}
          >
            <CodeAnalysisCard className="w-full h-full" style={{ transform: 'none' }} />
          </div>
        </div>
      </div>

      {/* SCROLL SPACE */}
      <div className="h-[6000px] w-full bg-black" />
    </>
  );
}