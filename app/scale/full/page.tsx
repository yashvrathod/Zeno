'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScaleStack, ScaleBg } from '@/components/scale';
import { Navbar } from '@/components/hero';

gsap.registerPlugin(ScrollTrigger);

const headingWords = "AI DSA Mentor for Interview Prep".split(" ");

const subWords =
  "From arrays to graphs, master every pattern with guided reasoning and real interview-level challenges.".split(" ");

export default function ScaleFullPage() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !sectionRef.current ||
      !cardRef.current ||
      !stackRef.current ||
      !headingRef.current ||
      !mainRef.current ||
      !bgRef.current ||
      !wordsRef.current ||
      !typeRef.current
    )
      return;

    const wordEls =
      wordsRef.current.querySelectorAll<HTMLSpanElement>('.word');
    const layers = stackRef.current.querySelectorAll<HTMLElement>('[data-layer]');
    const headingChars = typeRef.current.querySelectorAll<HTMLElement>('.type-char-heading');
    const descChars = typeRef.current.querySelectorAll<HTMLElement>('.type-char-desc');
    const isMobile = window.innerWidth < 640;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=300%',
        pin: true,
        scrub: 1,
        markers: false,
      },
    });

    // Card animation
    tl.to(cardRef.current, {
      scale: 0.15,
      borderRadius: 32,
      opacity: 0,
      rotateY: -50,
      y: -80,
      ease: 'power2.inOut',
    }, 0);

    // Heading fade
    tl.to(headingRef.current, {
      opacity: 0,
      y: -80,
      ease: 'power2.inOut',
    }, 0);

    // Background fade in
    tl.to(bgRef.current, {
      opacity: 1,
      ease: 'power2.inOut',
    }, 0);

    // Z-layer stagger reveal
    gsap.set(layers, { autoAlpha: 0 });
tl.to(layers, {
  autoAlpha: 1,
  stagger: 0.08,
//   rotateY:'-30deg',
  ease: 'power3.out',
}, 0);

    // Words reveal
    tl.to(wordsRef.current, { opacity: 1 }, 0.15);

    tl.to(wordEls, {
      opacity: 1,
      y: 0,
      stagger: 0.02,
      ease: 'power2.out',
    }, 0.15);

    tl.to(wordsRef.current, {
      opacity: 0,
      ease: 'power2.inOut',
    }, 0.65);

    // Typing animation - heading + description on left
    tl.fromTo(headingChars,
      { opacity: 0 },
      { opacity: 1, stagger: 0.035, ease: 'none' },
      0.72
    );
    tl.fromTo(descChars,
      { opacity: 0 },
      { opacity: 1, stagger: 0.03, ease: 'none' },
      0.86
    );

    // 3D movement (no Y on mobile)
    tl.to(stackRef.current, {
      x: '25vw',
      ...(!isMobile ? { y: '15vh' } : {}),
      rotationY: -10,
      z: 80,
      transformOrigin: 'center center',
      ease: 'power3.out',
    }, 0.75);

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <main
      ref={mainRef}
      className="relative min-h-screen bg-white overflow-x-hidden"
    >
      <div className="absolute inset-0 bg-white z-0" />
      <ScaleBg ref={bgRef} />

      <div className="relative z-[2]">
        <Navbar />

        {/* 🔥 IMPORTANT: perspective moved here */}
        <section
          ref={sectionRef}
          className="relative w-full h-screen"
          style={{ perspective: 1200 }}
        >
          <div className="sticky top-0 w-full min-h-screen overflow-hidden">

            {/* Video Card */}
            <div
              ref={cardRef}
              className="absolute inset-x-4 sm:inset-x-8 md:inset-x-12 top-24 bottom-4 sm:bottom-8 md:bottom-12 rounded-2xl overflow-hidden shadow-2xl"
            >
              <video
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                poster="/scale/desktop.png"
                className="w-full h-full object-cover"
              >
                <source src="/video/bore.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Hero Heading */}
            <div
              ref={headingRef}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center pointer-events-none"
            >
              <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] font-medium text-white tracking-tight leading-[1.15]">
                <span className="block">Scale your AI</span>
                <span className="block">infrastructure.</span>
              </h1>
            </div>

            {/* 3D Stack (FIXED) */}
            <div
              ref={stackRef}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transformStyle: 'preserve-3d',
              }}
            >
              <ScaleStack />
            </div>

            {/* Words Section */}
            <div
              ref={wordsRef}
              className="absolute left-1/2 -translate-x-1/2 top-[78%] -translate-y-1/2 w-full max-w-4xl px-6 opacity-0 text-center"
            >
              <h2 className="text-[clamp(1.6rem,3.2vw,2.8rem)] font-medium text-white tracking-tight leading-[1.15] mb-4">
                {headingWords.map((word, i) => (
                  <span
                    key={i}
                    className="word inline-block opacity-0 translate-y-5 mr-[0.3em]"
                  >
                    {word}
                  </span>
                ))}
              </h2>

              <p className="text-[clamp(0.9rem,1.4vw,1.1rem)] text-white/60 leading-relaxed mx-auto max-w-2xl">
                {subWords.map((word, i) => (
                  <span
                    key={i}
                    className="word inline-block opacity-0 translate-y-5 mr-[0.3em]"
                  >
                    {word}
                  </span>
                ))}
              </p>
            </div>

            {/* Typing animation */}
            <div
                ref={typeRef}
                className="
                    absolute z-20 pointer-events-none
                    sm:left-[8%]
                    sm:top-1/2
                    sm:-translate-y-1/2
                    left-[8%]
                    top-[18%]
                    w-[85%]
                    sm:w-[520px]
                    text-left
                "
            >
              <p className="text-[clamp(1.6rem,3.2vw,2.8rem)] font-semibold text-white tracking-tight leading-[1.2] mb-2 sm:mb-3">
                {"Intelligent Code Analysis".split("").map((char, i) => (
                  <span key={i} className="type-char-heading inline-block">
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </p>
              <p className="text-[clamp(0.75rem,1.2vw,1rem)] text-white/60 leading-relaxed sm:max-w-md mx-auto sm:mx-0">
                {"Real-time AI-powered feedback on every line of code you write.".split("").map((char, i) => (
                  <span key={i} className="type-char-desc inline-block opacity-0">
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
                <span className="type-char-desc type-cursor ml-0.5 animate-cursor-blink opacity-0">|</span>
              </p>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
