'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import CodeAnalysisCard from './CodeAnalysisCard';

gsap.registerPlugin(ScrollTrigger);

// === SCROLL TIMING CONFIG ===
const S = {
  TOTAL: 6000,

  CODE_CARD_IN_START:  5500,
  CODE_CARD_IN_END: 6000,

  HOLOGRAM_IN_START: 5500,
  HOLOGRAM_IN_END: 6000,

  TEXT_IN_START: 6000,
  TEXT_IN_END: 6500,

  TEXT_OUT_START: 7000,
  TEXT_OUT_END: 7500,

  GROUP_START: 6000,
  GROUP_END: 9000,

  GROUP_LEFT_START: 9000,
  GROUP_LEFT_END: 12000,
} as const;

const DEBUG = true;

function st(start: number, end: number, opts?: Record<string, any>) {
  const duration = end - start;
  return {
    trigger: document.body,
    start: `+=${start} top`,
    end: `+=${duration}`,
    scrub: true,
    ...(DEBUG ? { markers: { startColor: '#22c55e', endColor: '#ef4444', fontSize: '12px', indent: 20 } } : {}),
    ...opts,
  };
}

export default function HeroVideo() {
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const hologramRef = useRef<HTMLDivElement>(null);
  const codeCardRef = useRef<HTMLDivElement>(null);
  const heroGroupRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const innerCubeRef = useRef<HTMLDivElement>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollPos(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!videoWrapperRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: `+=${S.TOTAL}`,
        scrub: true,
      },
    });

    tl.to(videoWrapperRef.current, {
      scale: 0.9,
      rotationY: -12,
      rotationX: 2,
      y: 10,
      ease: 'none',
      duration: 1,
    });

    tl.to(videoWrapperRef.current, {
      scale: 0.35,
      rotationY: -35,
      rotationX: 6,
      x: -10,
      y: -140,
      ease: 'none',
      duration: 1.4,
    });


    //  transform: 'translateY(18%) rotateX(10deg) rotateY(-35deg) rotateZ(5deg) translateZ(155px)',

    gsap.fromTo(hologramRef.current, {
      opacity: 0,
      y: -60,
      scale: 0.75,
    }, {
      opacity: 0.75,
      y: 40,
      x:-100,
      scale: 1,
      translateY: "10%",
      rotateX: 10,
      rotateY: -35,
      rotateZ: -1,
      z: 200,
      scrollTrigger: st(S.HOLOGRAM_IN_START, S.HOLOGRAM_IN_END),
    });

    // PARTICLE ANIMATIONS
    gsap.to('.particle', {
      y: (i) => -30 - Math.random() * 40,
      x: (i) => (Math.random() - 0.5) * 20,
      opacity: 0,
      scale: 0.3,
      duration: (i) => 2 + Math.random() * 2,
      repeat: -1,
      stagger: {
        each: 0.3,
        from: 'random',
      },
      ease: 'power1.out',
    });

    gsap.to('.particle', {
      boxShadow: '0 0 20px rgba(255,255,255,1)',
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      stagger: {
        each: 0.2,
        from: 'random',
      },
      ease: 'sine.inOut',
    });

    gsap.to('.energy-line', {
      strokeDashoffset: -200,
      duration: 2.5,
      repeat: -1,
      ease: 'none',
      stagger: {
        each: 0.08,
        from: 'random',
      },
    });

    gsap.to('.network-node', {
      opacity: 0.15,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: {
        each: 0.15,
        from: 'random',
      },
    });

    gsap.to('.network-node-core', {
      opacity: 0.3,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: {
        each: 0.1,
        from: 'random',
      },
    });

    gsap.to('.edge-stream', {
      strokeDashoffset: -300,
      duration: 3,
      repeat: -1,
      ease: 'none',
      stagger: {
        each: 0.2,
        from: 'random',
      },
    });

    gsap.fromTo(codeCardRef.current, {
      opacity: 0,
      y: -200,
      rotateX: 25,
      scale: 0.85,
    }, {
      opacity: 1,
      y: -200,
      x: -90,
      rotateX: 0,
      scale: 1,
      scrollTrigger: st(S.CODE_CARD_IN_START, S.CODE_CARD_IN_END),
    });

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

    gsap.to(heroGroupRef.current, {
      x: 320,
      y: 100,
      scale:1.2,
      rotateX:-30,
      rotationY: -15,
      scrollTrigger: st(S.GROUP_START, S.GROUP_END),
    });

    gsap.fromTo(leftContentRef.current, {
      opacity: 0,
      x: -60,
      y: 30,
      filter: 'blur(6px)',
    }, {
      opacity: 1,
      x: 0,
      y: 0,
      filter: 'blur(0px)',
      scrollTrigger: st(S.GROUP_START, S.GROUP_END),
    });

    gsap.to(heroGroupRef.current, {
      x: -320,
      y: 180,
      scale: 1.3,
      rotateX: 0,
      rotationY: 0,
      scrollTrigger: st(S.GROUP_LEFT_START, S.GROUP_LEFT_END),
    });

    gsap.to(leftContentRef.current, {
      opacity: 0,
      x: -40,
      filter: 'blur(4px)',
      scrollTrigger: st(S.GROUP_LEFT_START, S.GROUP_LEFT_END),
    });

    gsap.fromTo(rightContentRef.current, {
      opacity: 0,
      x: 60,
      y: 30,
      filter: 'blur(6px)',
    }, {
      opacity: 1,
      x: 0,
      y: 0,
      filter: 'blur(0px)',
      scrollTrigger: st(S.GROUP_LEFT_START, S.GROUP_LEFT_END),
    });

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

  }, []);

  return (
      <>
        <div
      className="fixed inset-0 mt-20 z-0 flex items-center justify-center p-6"
      style={{
        perspective: '1800px',
        transformStyle: 'preserve-3d',
    }}
  >
    <div
      ref={heroGroupRef}
      className="relative w-full h-full"
      style={{ transformStyle: 'preserve-3d' }}
    >
    <div
      ref={videoWrapperRef}
        style={{
          transformStyle: 'preserve-3d',
          // transform:'translateY(10%)',
        }}
        className="
          relative
          w-full
          h-full
          overflow-hidden
          rounded-[42px]
          shadow-[0_60px_180px_rgba(0,0,0,0.55)]
          border-2 border-white/40
          will-change-transform
        "
      >
        {/* VIDEO */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover border-white"
        >
          <source src="/video/bore.mp4" type="video/mp4" />
        </video>

        {/* OVERLAYS */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />
      </div>

      {/* LIVE CODE ANALYSIS CARD ABOVE VIDEO */}
      <div
        ref={codeCardRef}
        className="absolute inset-0 pointer-events-none flex items-start justify-center"
        style={{
          transformStyle: 'preserve-3d',
          transform: 'translateZ(160px) rotateX(-15deg)',
          transformOrigin: 'bottom center',
          opacity: 0,
        }}
      >
        <CodeAnalysisCard />
      </div>

      {/* HOLOGRAM ABOVE VIDEO */}
      <div
        ref={hologramRef}
        className="absolute inset-10 pointer-events-none flex items-start justify-center"
        style={{
          opacity: 0,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="
            w-[570px]
            h-[300px]
            rounded-[42px]
            border border-white/60
            bg-white/5
            backdrop-blur-[2px]
            shadow-[0_0_80px_rgba(255,255,255,0.3),0_0_120px_rgba(255,255,255,0.15),inset_0_0_60px_rgba(255,255,255,0.1)]
          "
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          }}
        >
          <div
            className="absolute inset-0 rounded-[42px] overflow-hidden opacity-[0.06]"
            style={{
              backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '100% 4px',
            }}
          />

          <div className="absolute inset-0 rounded-[42px] shadow-[inset_0_0_40px_rgba(255,255,255,0.15)]" />

          <div className="absolute inset-8 opacity-20">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
            <div className="absolute left-[25%] top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute top-[25%] left-0 right-0 h-px bg-white/20" />
            <div className="absolute top-[75%] left-0 right-0 h-px bg-white/20" />
          </div>

          <div className="absolute inset-0 text-[9px] font-mono text-white/40">
            <span className="absolute top-[15%] left-[12%]">0110</span>
            <span className="absolute top-[25%] right-[15%]">1001</span>
            <span className="absolute bottom-[20%] left-[18%]">1100</span>
            <span className="absolute top-[40%] right-[20%]">0101</span>
            <span className="absolute bottom-[35%] right-[12%]">1011</span>
          </div>

          {/* PARTICLES */}
          {/* <div className="particle absolute top-[80%] left-[20%] w-1 h-1 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <div className="particle absolute top-[70%] left-[50%] w-1.5 h-1.5 rounded-full bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
          <div className="particle absolute top-[60%] left-[80%] w-1 h-1 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
          <div className="particle absolute top-[50%] left-[30%] w-1.5 h-1.5 rounded-full bg-white/50 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          <div className="particle absolute top-[40%] left-[60%] w-1 h-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          <div className="particle absolute top-[30%] left-[15%] w-1 h-1 rounded-full bg-white/60 shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
          <div className="particle absolute top-[20%] left-[70%] w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
          <div className="particle absolute top-[15%] left-[45%] w-1 h-1 rounded-full bg-white/50 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          <div className="particle absolute top-[45%] left-[90%] w-1 h-1 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
          <div className="particle absolute top-[55%] left-[10%] w-1.5 h-1.5 rounded-full bg-white/60 shadow-[0_0_8px_rgba(255,255,255,0.7)]" /> */}

          {/* 3D GLOWING NETWORK - ENERGY FLOW LINES + EDGE RAILS */}
          {/* <svg className="absolute inset-0 w-full h-full" viewBox="0 0 540 340" fill="none">
            <defs>
              <filter id="glow-edge" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-intense" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g filter="url(#glow-edge)">
              <rect x="4" y="4" width="532" height="332" rx="38" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <rect x="8" y="8" width="524" height="324" rx="34" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            </g>

            <g opacity="0.3" filter="url(#glow)">
              <line x1="30" y1="100" x2="270" y2="85" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
              <line x1="270" y1="85" x2="510" y2="100" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
              <line x1="80" y1="180" x2="270" y2="170" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
              <line x1="270" y1="170" x2="460" y2="180" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
              <line x1="30" y1="280" x2="270" y2="300" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
              <line x1="270" y1="300" x2="510" y2="280" stroke="rgba(255,255,255,0.5)" strokeWidth="3" />
              <line x1="30" y1="100" x2="80" y2="180" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
              <line x1="80" y1="180" x2="30" y2="280" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
              <line x1="270" y1="85" x2="270" y2="170" stroke="rgba(255,255,255,0.45)" strokeWidth="3" />
              <line x1="270" y1="170" x2="270" y2="230" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
              <line x1="270" y1="230" x2="270" y2="300" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
              <line x1="510" y1="100" x2="460" y2="180" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
              <line x1="460" y1="180" x2="510" y2="280" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
              <line x1="30" y1="100" x2="270" y2="170" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <line x1="510" y1="100" x2="270" y2="170" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <line x1="80" y1="180" x2="270" y2="300" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <line x1="460" y1="180" x2="270" y2="300" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <line x1="30" y1="280" x2="270" y2="170" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <line x1="510" y1="280" x2="270" y2="170" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
              <line x1="80" y1="180" x2="460" y2="180" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              <line x1="30" y1="100" x2="30" y2="280" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <line x1="510" y1="100" x2="510" y2="280" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            </g>

            <g filter="url(#glow)">
              <line x1="30" y1="100" x2="270" y2="85" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" stroke-dasharray="5 7" className="energy-line" />
              <line x1="270" y1="85" x2="510" y2="100" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" stroke-dasharray="5 7" className="energy-line" />
              <line x1="80" y1="180" x2="270" y2="170" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" stroke-dasharray="5 7" className="energy-line" />
              <line x1="270" y1="170" x2="460" y2="180" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" stroke-dasharray="5 7" className="energy-line" />
              <line x1="30" y1="280" x2="270" y2="300" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" stroke-dasharray="5 7" className="energy-line" />
              <line x1="270" y1="300" x2="510" y2="280" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" stroke-dasharray="5 7" className="energy-line" />
              <line x1="30" y1="100" x2="80" y2="180" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" stroke-dasharray="4 8" className="energy-line" />
              <line x1="80" y1="180" x2="30" y2="280" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" stroke-dasharray="4 8" className="energy-line" />
              <line x1="510" y1="100" x2="460" y2="180" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" stroke-dasharray="4 8" className="energy-line" />
              <line x1="460" y1="180" x2="510" y2="280" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" stroke-dasharray="4 8" className="energy-line" />
              <line x1="270" y1="85" x2="270" y2="170" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" stroke-dasharray="5 7" className="energy-line" />
              <line x1="270" y1="170" x2="270" y2="230" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" stroke-dasharray="4 8" className="energy-line" />
              <line x1="270" y1="230" x2="270" y2="300" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" stroke-dasharray="4 8" className="energy-line" />
              <line x1="30" y1="100" x2="270" y2="170" stroke="rgba(255,255,255,0.5)" strokeWidth="1" stroke-dasharray="4 10" className="energy-line" />
              <line x1="510" y1="100" x2="270" y2="170" stroke="rgba(255,255,255,0.5)" strokeWidth="1" stroke-dasharray="4 10" className="energy-line" />
              <line x1="80" y1="180" x2="270" y2="300" stroke="rgba(255,255,255,0.5)" strokeWidth="1" stroke-dasharray="4 10" className="energy-line" />
              <line x1="460" y1="180" x2="270" y2="300" stroke="rgba(255,255,255,0.5)" strokeWidth="1" stroke-dasharray="4 10" className="energy-line" />
              <line x1="30" y1="280" x2="270" y2="170" stroke="rgba(255,255,255,0.5)" strokeWidth="1" stroke-dasharray="4 10" className="energy-line" />
              <line x1="510" y1="280" x2="270" y2="170" stroke="rgba(255,255,255,0.5)" strokeWidth="1" stroke-dasharray="4 10" className="energy-line" />
            </g>


            <g filter="url(#glow-intense)">
              <line x1="4" y1="80" x2="4" y2="260" stroke="rgba(255,255,255,0.2)" strokeWidth="2" stroke-dasharray="3 12" className="edge-stream" />
              <line x1="536" y1="80" x2="536" y2="260" stroke="rgba(255,255,255,0.2)" strokeWidth="2" stroke-dasharray="3 12" className="edge-stream" />
              <line x1="80" y1="336" x2="460" y2="336" stroke="rgba(255,255,255,0.15)" strokeWidth="2" stroke-dasharray="3 12" className="edge-stream" />
              <line x1="80" y1="4" x2="460" y2="4" stroke="rgba(255,255,255,0.1)" strokeWidth="2" stroke-dasharray="3 12" className="edge-stream" />
            </g>


            <g filter="url(#glow)">
              <circle cx="30" cy="100" r="3" fill="rgba(255,255,255,0.6)" className="network-node" />
              <circle cx="270" cy="85" r="3.5" fill="rgba(255,255,255,0.7)" className="network-node" />
              <circle cx="510" cy="100" r="3" fill="rgba(255,255,255,0.6)" className="network-node" />
              <circle cx="80" cy="180" r="3.5" fill="rgba(255,255,255,0.7)" className="network-node" />
              <circle cx="270" cy="170" r="5" fill="rgba(255,255,255,0.85)" className="network-node" />
              <circle cx="460" cy="180" r="3.5" fill="rgba(255,255,255,0.7)" className="network-node" />
              <circle cx="30" cy="280" r="3" fill="rgba(255,255,255,0.6)" className="network-node" />
              <circle cx="270" cy="300" r="4" fill="rgba(255,255,255,0.75)" className="network-node" />
              <circle cx="510" cy="280" r="3" fill="rgba(255,255,255,0.6)" className="network-node" />
              <circle cx="270" cy="230" r="3" fill="rgba(255,255,255,0.65)" className="network-node" />
            </g>


            <g>
              <circle cx="30" cy="100" r="2" fill="white" opacity="0.9" className="network-node-core" />
              <circle cx="270" cy="85" r="2.5" fill="white" opacity="1" className="network-node-core" />
              <circle cx="510" cy="100" r="2" fill="white" opacity="0.9" className="network-node-core" />
              <circle cx="80" cy="180" r="2" fill="white" opacity="0.9" className="network-node-core" />
              <circle cx="270" cy="170" r="3" fill="white" opacity="1" className="network-node-core" />
              <circle cx="460" cy="180" r="2" fill="white" opacity="0.9" className="network-node-core" />
              <circle cx="30" cy="280" r="2" fill="white" opacity="0.9" className="network-node-core" />
              <circle cx="270" cy="300" r="2.5" fill="white" opacity="1" className="network-node-core" />
              <circle cx="510" cy="280" r="2" fill="white" opacity="0.9" className="network-node-core" />
              <circle cx="270" cy="230" r="2" fill="white" opacity="0.95" className="network-node-core" />
            </g>
          </svg> */}

          {/* 3D ROTATING CUBE */}
          <div
            ref={cubeRef}
            className="absolute bottom-8 right-8"
            style={{ transformStyle: 'preserve-3d', width: 48, height: 48 }}
          >
            <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'translateZ(24px)' }} />
            <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(24px)' }} />
            <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(24px)' }} />
            <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'translateZ(-24px)' }} />
            <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(24px)' }} />
            <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(24px)' }} />
            <div className="absolute inset-0 border border-white/5 rounded-sm" style={{ transform: 'translateZ(0px)', background: 'rgba(255,255,255,0.03)' }} />
          </div>

          {/* 3D INNER CUBE (nested, counter-rotating) */}
          <div
            ref={innerCubeRef}
            className="absolute bottom-[52px] right-[52px]"
            style={{ transformStyle: 'preserve-3d', width: 24, height: 24 }}
          >
            <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'translateZ(12px)' }} />
            <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(12px)' }} />
            <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(12px)' }} />
            <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'translateZ(-12px)' }} />
            <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(12px)' }} />
            <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(12px)' }} />
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT — appears when group shifts left */}
      <div
        ref={rightContentRef}
        className="absolute right-8 md:right-16 top-1/2 -translate-y-1/2 max-w-xl z-40 pointer-events-none opacity-0 text-right"
      >
        <div className="w-12 h-[2px] bg-white/30 rounded-full mb-8 ml-auto" />
        <h2 className="text-[clamp(1.75rem,3vw,2.75rem)] font-semibold text-white leading-tight tracking-tight">
          Build Lasting Skills
        </h2>
        <p className="mt-5 text-[clamp(0.85rem,1.2vw,1.05rem)] text-white/50 leading-relaxed max-w-lg ml-auto">
          Go beyond theory with hands-on practice, progress tracking, and a learning path designed to make DSA stick
        </p>
      </div>
      </div>

      {/* TEXT - centered */}
      <div className="absolute inset-0 mt-100 flex items-center justify-center pointer-events-none z-50">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-semibold text-white">
            <span className="hero-text-word" style={{ opacity: 0 }}>Master</span>{' '}
            <span className="hero-text-word" style={{ opacity: 0 }}>DSA</span>{' '}
            <span className="hero-text-word" style={{ opacity: 0 }}>Visually</span>
          </h1>
          <p className="hero-text-desc mt-4 text-lg md:text-xl text-white/70" style={{ opacity: 0 }}>
            Interactive visualizations for data structures & algorithms
          </p>
        </div>
      </div>

      {/* LEFT CONTENT — appears when group shifts right */}
      <div
        ref={leftContentRef}
        className="absolute left-8 md:left-16 top-1/2 -translate-y-1/2 max-w-xl z-40 pointer-events-none opacity-0"
      >
        <div className="w-12 h-[2px] bg-white/30 rounded-full mb-8" />
        <h2 className="text-[clamp(1.75rem,3vw,2.75rem)] font-semibold text-white leading-tight tracking-tight">
          Real-Time Visual Feedback
        </h2>
        <p className="mt-5 text-[clamp(0.85rem,1.2vw,1.05rem)] text-white/50 leading-relaxed max-w-lg">
          Watch every algorithm come alive with step-by-step execution traces, live code analysis, and interactive 3D visualizations
        </p>
      </div>
      </div>
      {DEBUG && (
        <div className="fixed bottom-4 left-4 z-[999] bg-black/85 text-white/90 font-mono text-[11px] leading-relaxed px-3 py-2.5 rounded-lg border border-white/20 pointer-events-none shadow-lg">
          <div className="text-white/60 text-[10px] uppercase tracking-wider mb-1">Scroll Debug</div>
          <div className="text-yellow-300 font-bold mb-1">scrollY: {scrollPos}px</div>
          <div className={scrollPos >= S.CODE_CARD_IN_START ? 'text-green-400' : 'text-white/40'}>
            code  {S.CODE_CARD_IN_START}–{S.CODE_CARD_IN_END}
          </div>
          <div className={scrollPos >= S.HOLOGRAM_IN_START ? 'text-green-400' : 'text-white/40'}>
            holo  {S.HOLOGRAM_IN_START}–{S.HOLOGRAM_IN_END}
          </div>
          <div className={scrollPos >= S.TEXT_IN_START ? 'text-green-400' : 'text-white/40'}>
            text  {S.TEXT_IN_START}–{S.TEXT_IN_END}
          </div>
          <div className={scrollPos >= S.TEXT_OUT_START ? 'text-green-400' : 'text-white/40'}>
            text↓ {S.TEXT_OUT_START}–{S.TEXT_OUT_END}
          </div>
          <div className={scrollPos >= S.GROUP_START ? 'text-green-400' : 'text-white/40'}>
            group {S.GROUP_START}–{S.GROUP_END}
          </div>
          <div className={scrollPos >= S.GROUP_START ? 'text-green-400' : 'text-white/40'}>
            left  {S.GROUP_START}–{S.GROUP_END}
          </div>
          <div className={scrollPos >= S.GROUP_LEFT_START ? 'text-green-400' : 'text-white/40'}>
            group← {S.GROUP_LEFT_START}–{S.GROUP_LEFT_END}
          </div>
          <div className={scrollPos >= S.GROUP_LEFT_START ? 'text-green-400' : 'text-white/40'}>
            right {S.GROUP_LEFT_START}–{S.GROUP_LEFT_END}
          </div>
        </div>
      )}
    </>
    
  );
}
