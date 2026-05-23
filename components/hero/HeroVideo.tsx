'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CodeAnalysisCard from './CodeAnalysisCard';

gsap.registerPlugin(ScrollTrigger);

// ─── SCROLL TIMING CONFIG ──────────────────────────────────────────────
// All values in px of scroll distance from top
const S = {
  TOTAL: 6000,

  CODE_CARD_IN_START:  5500,
  CODE_CARD_IN_END:    6000,

  HOLOGRAM_IN_START:   5500,
  HOLOGRAM_IN_END:     6000,

  TEXT_IN_START:       6000,
  TEXT_IN_END:         6500,

  TEXT_OUT_START:      7000,
  TEXT_OUT_END:        7500,

  GROUP_START:         6000,
  GROUP_END:           9000,

  GROUP_LEFT_START:    9000,
  GROUP_LEFT_END:      12000,
} as const;

const DEBUG = false;

function st(start: number, end: number, opts?: Record<string, any>) {
  return {
    trigger: document.body,
    start: `+=${start} top`,
    end: `+=${end - start}`,
    scrub: true,
    ...(DEBUG ? { markers: { startColor: '#22c55e', endColor: '#ef4444', fontSize: '12px', indent: 20 } } : {}),
    ...opts,
  };
}

// ─── RESPONSIVE HELPERS ───────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState<'sm' | 'md' | 'lg'>('lg');
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setBp(w < 640 ? 'sm' : w < 1024 ? 'md' : 'lg');
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return bp;
}

export default function HeroVideo() {
  const videoWrapperRef  = useRef<HTMLDivElement>(null);
  const hologramRef      = useRef<HTMLDivElement>(null);
  const codeCardRef      = useRef<HTMLDivElement>(null);
  const heroGroupRef     = useRef<HTMLDivElement>(null);
  const cubeRef          = useRef<HTMLDivElement>(null);
  const innerCubeRef     = useRef<HTMLDivElement>(null);
  const leftContentRef   = useRef<HTMLDivElement>(null);
  const rightContentRef  = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const bp = useBreakpoint();

  useEffect(() => {
    const onScroll = () => setScrollPos(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!videoWrapperRef.current) return;

    const isMobile  = window.innerWidth < 640;
    const isTablet  = window.innerWidth < 1024;

    // ── Main video shrink & tilt ──────────────────────────────────────
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: `+=${S.TOTAL}`,
        scrub: true,
      },
    });

    tl.to(videoWrapperRef.current, {
      scaleX:    isMobile ? 0.88  : undefined,
      scaleY:    isMobile ? 0.66  : undefined,
      scale:     isMobile ? 0.95 : 0.9,
      rotationY: isMobile ? -6   : -12,
      rotationX: isMobile ? 1    : 2,
      y:         isMobile ? 6    : 10,
      ease: 'none',
      duration: 1,
    });

    tl.to(videoWrapperRef.current, {
      scaleX:    isMobile ? 0.78  : undefined,
      scaleY:    isMobile ? 0.26  : undefined,
      scale:     isMobile ? undefined : isTablet ? 0.42 : 0.35,
      rotationY: isMobile ? -35   : -35,
      rotationX: isMobile ? 10     : 6,
      x:         isMobile ? 12    : -10,
      y:         isMobile ? -210   : isTablet ? -110 : -140,
      ease: 'none',
      duration: 1.4,
    });

    // ── Hologram ──────────────────────────────────────────────────────
    gsap.fromTo(hologramRef.current,
      { opacity: 0, y: -60, scale: 0.75 },
      {
        opacity:    0.75,
        y:          isMobile ? 20   : 40,
        x:          isMobile ? -40  : -100,
        scale:      1,
        translateY: '10%',
        rotateX:    10,
        rotateY:    -35,
        rotateZ:    -1,
        z:          200,
        scrollTrigger: st(S.HOLOGRAM_IN_START, S.HOLOGRAM_IN_END),
      }
    );

    // ── Ambient particles ────────────────────────────────────────────
    gsap.to('.particle', {
      y:        (i: number) => -30 - Math.random() * 40,
      x:        (i: number) => (Math.random() - 0.5) * 20,
      opacity:  0,
      scale:    0.3,
      duration: (i: number) => 2 + Math.random() * 2,
      repeat:   -1,
      stagger:  { each: 0.3, from: 'random' },
      ease:     'power1.out',
    });

    gsap.to('.particle', {
      boxShadow: '0 0 20px rgba(255,255,255,1)',
      duration:  1.5,
      repeat:    -1,
      yoyo:      true,
      stagger:   { each: 0.2, from: 'random' },
      ease:      'sine.inOut',
    });

    gsap.to('.energy-line',      { strokeDashoffset: -200, duration: 2.5, repeat: -1, ease: 'none', stagger: { each: 0.08, from: 'random' } });
    gsap.to('.network-node',     { opacity: 0.15, duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: { each: 0.15, from: 'random' } });
    gsap.to('.network-node-core',{ opacity: 0.3,  duration: 1,   repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: { each: 0.1,  from: 'random' } });
    gsap.to('.edge-stream',      { strokeDashoffset: -300, duration: 3, repeat: -1, ease: 'none', stagger: { each: 0.2, from: 'random' } });

    // ── Code card ─────────────────────────────────────────────────────
    gsap.fromTo(
  codeCardRef.current,
  {
    opacity: 0,
    y: -80,
    scale: 0.75,
    rotateX: 25,
    rotateY: isMobile ? -20 : -35,
    rotateZ: isMobile ? 3 : 5,
    z: 10,
  },
  {
    opacity: 1,
    y: isMobile ? 50 : 50,
    x: isMobile ? 28 : -90,
    scale: 1,
    rotateX: isMobile ? 10 : 10,
    rotateY: isMobile ? -34 : -34,
    rotateZ: isMobile ? -1 : -1,
    z: isMobile ? 100 :200,
    scrollTrigger: st(S.CODE_CARD_IN_START, S.CODE_CARD_IN_END),
  }
);

    // ── Hero text ─────────────────────────────────────────────────────
    gsap.to('.hero-text-word, .hero-text-desc', {
      opacity: 1,
      stagger: 0.25,
      scrollTrigger: st(S.TEXT_IN_START, S.TEXT_IN_END),
    });
    gsap.to('.hero-text-word, .hero-text-desc', {
      opacity: 0,
      stagger: 0.15,
      scrollTrigger: st(S.TEXT_OUT_START, S.TEXT_OUT_END),
    });

    // ── Group moves ───────────────────────────────────────────────────
    const groupShiftX = isMobile ? 15 : isTablet ? 200 : 320;

    gsap.to(heroGroupRef.current, {
      x:         groupShiftX,
      y:         isMobile ? 40   : 100,
      scale:     isMobile ? 1.05 : 1.2,
      rotateX:   -30,
      rotationY: -15,
      scrollTrigger: st(S.GROUP_START, S.GROUP_END),
    });

    gsap.fromTo(leftContentRef.current,
      { opacity: 0, x: -60, y: 30, filter: 'blur(6px)' },
      { opacity: 1, x: 0,   y: 0,  filter: 'blur(0px)', scrollTrigger: st(S.GROUP_START, S.GROUP_END) }
    );

    gsap.to(heroGroupRef.current, {
      x:         -groupShiftX,
      y:         isMobile ? 60  : 180,
      scale:     isMobile ? 1.1 : 1.3,
      rotateX:   0,
      rotationY: 0,
      scrollTrigger: st(S.GROUP_LEFT_START, S.GROUP_LEFT_END),
    });

    gsap.to(leftContentRef.current, {
      opacity: 0,
      x:       -40,
      filter:  'blur(4px)',
      scrollTrigger: st(S.GROUP_LEFT_START, S.GROUP_LEFT_END),
    });

    gsap.fromTo(rightContentRef.current,
      { opacity: 0, x: 60, y: 30, filter: 'blur(6px)' },
      { opacity: 1, x: 0,  y: 0,  filter: 'blur(0px)', scrollTrigger: st(S.GROUP_LEFT_START, S.GROUP_LEFT_END) }
    );

    // ── Cubes ─────────────────────────────────────────────────────────
    if (cubeRef.current) {
      gsap.to(cubeRef.current, { rotationX: 360, rotationY: 360, duration: 18, repeat: -1, ease: 'none' });
    }
    if (innerCubeRef.current) {
      gsap.to(innerCubeRef.current, { rotationX: -360, rotationY: 360, duration: 12, repeat: -1, ease: 'none' });
    }
  }, []);

  // ── Badge labels ──────────────────────────────────────────────────────
  const badges = ['Graphs', 'Trees', 'DP', 'Sorting', 'Heaps'];

  return (
    <>
      {/* ─── HERO SCENE ────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 mt-16 sm:mt-20 z-0 flex items-center justify-center p-3 sm:p-6"
        style={{ perspective: '1800px', transformStyle: 'preserve-3d' }}
      >
        <div
          ref={heroGroupRef}
          className="relative w-full h-full"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ── VIDEO WRAPPER ──────────────────────────────────────────── */}
          <div
            ref={videoWrapperRef}
            className="relative w-full h-full overflow-hidden rounded-2xl sm:rounded-[32px] lg:rounded-[42px] will-change-transform"
            style={{
              transformStyle: 'preserve-3d',
              boxShadow: '0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)',
            }}
          >
            <video
              autoPlay muted loop playsInline
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="/video/bore.mp4" type="video/mp4" />
            </video>

            {/* Overlays */}
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

            {/* Top bar — scale.com style minimal chrome */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white/80" />
                <span className="text-[10px] sm:text-xs font-medium tracking-widest uppercase text-white/50">
                  DSA Visualizer
                </span>
              </div>
              {/* Algorithm badges — hidden on sm */}
              <div className="hidden sm:flex items-center gap-1.5">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide text-white/60 border border-white/15 bg-white/5 backdrop-blur-sm"
                  >
                    {b}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-white/40 font-mono tracking-wider hidden sm:inline">LIVE</span>
              </div>
            </div>

            {/* Bottom bar stats — scale.com data strip */}
            <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 py-3 sm:py-4 flex items-end justify-between">
              <div className="flex items-center gap-4 sm:gap-8">
                {[
                  { label: 'Problems',   value: '200+' },
                  { label: 'Visualized', value: '100%' },
                  { label: 'Step Trace', value: 'Real-time' },
                ].map(({ label, value }) => (
                  <div key={label} className="hidden sm:block">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">{label}</div>
                    <div className="text-sm sm:text-base font-semibold text-white/80 tabular-nums">{value}</div>
                  </div>
                ))}
              </div>
              <div className="text-[9px] sm:text-[10px] font-mono text-white/20 tracking-widest">
                © 2025 DSAVisual
              </div>
            </div>
          </div>

          {/* ── CODE ANALYSIS CARD ──────────────────────────────────────── */}
          <div
              ref={codeCardRef}
              className="absolute inset-0 pointer-events-none flex items-start justify-center"
              style={{
              transformStyle: 'preserve-3d',
              transformOrigin: 'top center',
              opacity: 0,
            }}>
                      {/* Scale down on mobile via CSS so the card fits the narrower layout */}
                      <div className="scale-[0.82] sm:scale-90 lg:scale-100 origin-top-left">
                        <CodeAnalysisCard />
                      </div>
          </div>

          {/* ── HOLOGRAM PANEL ──────────────────────────────────────────── */}
          <div
            ref={hologramRef}
            className="absolute inset-10 pointer-events-none flex items-start justify-center"
            style={{ opacity: 0, transformOrigin: 'bottom center' }}
          >
            <div
              className="rounded-2xl sm:rounded-[32px] lg:rounded-[42px] border border-white/60 bg-white/5 backdrop-blur-[2px]"
              style={{
                width:  'min(570px, calc(100vw - 80px))',
                height: 'clamp(200px, 25vw, 300px)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                boxShadow: '0 0 80px rgba(255,255,255,0.3), 0 0 120px rgba(255,255,255,0.15), inset 0 0 60px rgba(255,255,255,0.1)',
              }}
            >
              {/* Scanlines */}
              <div
                className="absolute inset-0 rounded-[42px] overflow-hidden opacity-[0.06]"
                style={{
                  backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
                  backgroundSize: '100% 4px',
                }}
              />
              <div className="absolute inset-0 rounded-[42px] shadow-[inset_0_0_40px_rgba(255,255,255,0.15)]" />

              {/* Grid lines */}
              <div className="absolute inset-8 opacity-20">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
                <div className="absolute left-[25%] top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute top-[25%] left-0 right-0 h-px bg-white/20" />
                <div className="absolute top-[75%] left-0 right-0 h-px bg-white/20" />
              </div>

              {/* Binary floats */}
              <div className="absolute inset-0 text-[9px] font-mono text-white/40">
                <span className="absolute top-[15%] left-[12%]">0110</span>
                <span className="absolute top-[25%] right-[15%]">1001</span>
                <span className="absolute bottom-[20%] left-[18%]">1100</span>
                <span className="absolute top-[40%] right-[20%]">0101</span>
                <span className="absolute bottom-[35%] right-[12%]">1011</span>
              </div>

              {/* 3-D rotating cube */}
              <div
                ref={cubeRef}
                className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8"
                style={{ transformStyle: 'preserve-3d', width: 40, height: 40 }}
              >
                {[-1, 1].flatMap((z) => [
                  <div key={`z${z}`} className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: `translateZ(${z * 20}px)` }} />,
                ])}
                <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(20px)' }} />
                <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(20px)' }} />
                <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(20px)' }} />
                <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(20px)' }} />
                <div className="absolute inset-0 border border-white/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>

              {/* Inner counter-rotating cube */}
              <div
                ref={innerCubeRef}
                className="absolute bottom-[44px] sm:bottom-[52px] right-[44px] sm:right-[52px]"
                style={{ transformStyle: 'preserve-3d', width: 20, height: 20 }}
              >
                {[-1, 1].flatMap((z) => [
                  <div key={`iz${z}`} className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: `translateZ(${z * 10}px)` }} />,
                ])}
                <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(10px)' }} />
                <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(10px)' }} />
                <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(10px)' }} />
                <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(10px)' }} />
              </div>
            </div>
          </div>

          {/* ── RIGHT CONTENT ────────────────────────────────────────────── */}
          <div
            ref={rightContentRef}
            className="absolute right-6 sm:right-8 lg:right-16 top-[30%] sm:top-1/4 -translate-y-1/2 z-40 pointer-events-none opacity-0 text-right"
            style={{ maxWidth: 'min(400px, calc(100vw - 64px))' }}
          >
            <div className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-white/30 rounded-full mb-5 sm:mb-8 ml-auto" />
            <h2 className="text-xl sm:text-3xl lg:text-[clamp(1.75rem,3vw,2.75rem)] font-semibold text-white leading-tight tracking-tight">
              Build Lasting Skills
            </h2>
            <p className="mt-3 sm:mt-5 text-xs sm:text-base lg:text-[clamp(0.85rem,1.2vw,1.05rem)] text-white/50 leading-relaxed ml-auto">
              Go beyond theory with hands-on practice, progress tracking, and a learning path designed to make DSA stick
            </p>
            <div className="mt-6 sm:mt-8 flex justify-end gap-3">
              <button className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-medium text-white/80 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
                Explore paths →
              </button>
            </div>
          </div>
        </div>

        {/* ── CENTERED HERO TEXT ─────────────────────────────────────────── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 px-6">
          <div className="text-center">
            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-4 h-px bg-white/30" />
              <span
                className="hero-text-word text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-white/40"
                style={{ opacity: 0 }}
              >
                Interactive Learning
              </span>
              <span className="w-4 h-px bg-white/30" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.1] tracking-tight">
              <span className="hero-text-word" style={{ opacity: 0 }}>Master</span>{' '}
              <span
                className="hero-text-word"
                style={{
                  opacity: 0,
                  background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.55) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                DSA
              </span>{' '}
              <span className="hero-text-word" style={{ opacity: 0 }}>Visually</span>
            </h1>

            <p
              className="hero-text-desc mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-white/55 max-w-xs sm:max-w-md mx-auto leading-relaxed"
              style={{ opacity: 0 }}
            >
              Interactive visualizations for data structures & algorithms
            </p>

            {/* CTA pair — scale.com style */}
            <div
              className="hero-text-desc mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4"
              style={{ opacity: 0 }}
            >
              <button className="px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-black bg-white rounded-full hover:bg-white/90 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Get started free
              </button>
              <button className="px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-medium text-white/80 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
                See demo →
              </button>
            </div>
          </div>
        </div>

        {/* ── LEFT CONTENT ─────────────────────────────────────────────────── */}
        <div
          ref={leftContentRef}
          className="absolute left-6 sm:left-8 lg:left-16 top-1/2 -translate-y-1/2 z-40 pointer-events-none opacity-0"
          style={{ maxWidth: 'min(400px, calc(100vw - 64px))' }}
        >
          <div className="w-8 sm:w-12 h-[1px] sm:h-[2px] bg-white/30 rounded-full mb-5 sm:mb-8" />
          <h2 className="text-2xl sm:text-3xl lg:text-[clamp(1.75rem,3vw,2.75rem)] font-semibold text-white leading-tight tracking-tight">
            Real-Time Visual Feedback
          </h2>
          <p className="mt-3 sm:mt-5 text-sm sm:text-base lg:text-[clamp(0.85rem,1.2vw,1.05rem)] text-white/50 leading-relaxed">
            Watch every algorithm come alive with step-by-step execution traces, live code analysis, and interactive 3D visualizations
          </p>
          {/* Feature chips */}
          <div className="mt-5 sm:mt-6 flex flex-wrap gap-2">
            {['Step trace', 'Complexity', '3D view'].map((feat) => (
              <span
                key={feat}
                className="px-3 py-1 text-[10px] sm:text-xs font-medium text-white/60 border border-white/15 rounded-full bg-white/5 backdrop-blur-sm"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SCROLL INDICATOR ──────────────────────────────────────────────── */}
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none"
        style={{ opacity: scrollPos > 200 ? 0 : 1, transition: 'opacity 0.4s' }}
      >
        <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-white/30">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
      </div>

      {/* ─── DEBUG OVERLAY ──────────────────────────────────────────────────── */}
      {DEBUG && (
        <div className="fixed bottom-4 left-4 z-[999] bg-black/85 text-white/90 font-mono text-[11px] leading-relaxed px-3 py-2.5 rounded-lg border border-white/20 pointer-events-none shadow-lg">
          <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1">Scroll Debug</div>
          <div className="text-yellow-300 font-bold mb-1">scrollY: {scrollPos}px</div>
          {([
            ['code',   S.CODE_CARD_IN_START,  S.CODE_CARD_IN_END],
            ['holo',   S.HOLOGRAM_IN_START,   S.HOLOGRAM_IN_END],
            ['text↑',  S.TEXT_IN_START,        S.TEXT_IN_END],
            ['text↓',  S.TEXT_OUT_START,       S.TEXT_OUT_END],
            ['group→', S.GROUP_START,          S.GROUP_END],
            ['group←', S.GROUP_LEFT_START,     S.GROUP_LEFT_END],
          ] as [string, number, number][]).map(([label, a, b]) => (
            <div key={label} className={scrollPos >= a ? 'text-green-400' : 'text-white/40'}>
              {label.padEnd(8)} {a}–{b}
            </div>
          ))}
        </div>
      )}
    </>
  );
}