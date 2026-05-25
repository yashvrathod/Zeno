'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScaleStack, ScaleBg } from '@/components/scale';
import { Navbar } from '@/components/hero';
import { motion } from 'framer-motion';

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
  const typeRef2 = useRef<HTMLDivElement>(null);
  const imgSlideRef = useRef<HTMLDivElement>(null);
  const oldLabelRef = useRef<HTMLSpanElement>(null);
  const newLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (
      !sectionRef.current ||
      !cardRef.current ||
      !stackRef.current ||
      !headingRef.current ||
      !mainRef.current ||
      !bgRef.current ||
      !wordsRef.current ||
      !typeRef.current ||
      !typeRef2.current
    )
      return;

    const wordEls =
      wordsRef.current.querySelectorAll<HTMLSpanElement>('.word');
    const layers = stackRef.current.querySelectorAll<HTMLElement>('[data-layer]');
    const headingChars = typeRef.current.querySelectorAll<HTMLElement>('.type-char-heading');
    const descChars = typeRef.current.querySelectorAll<HTMLElement>('.type-char-desc');
    const headingChars2 = typeRef2.current.querySelectorAll<HTMLElement>('.type-char-heading-2');
    const descChars2 = typeRef2.current.querySelectorAll<HTMLElement>('.type-char-desc-2');
    const isMobile = window.innerWidth < 640;

    const tl = gsap.timeline({
  scrollTrigger: {
    trigger: sectionRef.current,
    start: 'top top',
    end: '+=1600%',
    pin: true,
    scrub: 1,
    markers: false,
  },
});

    /* INITIAL STATES */
    // AI DSA Mentor section appears
    tl.to(wordsRef.current, {
    opacity: 1,
    duration: 0.4,
    }, 1.2);

    tl.to(wordEls, {
    opacity: 1,
    y: 0,
    stagger: 0.03,
    ease: 'power3.out',
    duration: 0.8,
    }, 1.3);

    // STACK APPEARS SAME TIME
    tl.to(layers, {
    autoAlpha: 1,
    y: 0,
    z: 0,
    scale: 1,
    rotateX: 0,
    filter: 'blur(0px)',
    stagger: {
        each: 0.15,
    },
    duration: 1.5,
    ease: 'expo.out',
    }, 1.25);

    /* HERO COLLAPSE */
    tl.to(cardRef.current, {
    scale: 0.15,
    borderRadius: 32,
    opacity: 0,
    rotateY: -50,
    y: -80,
    ease: 'power2.inOut',
    duration: 1.2,
    }, 0);

    tl.to(headingRef.current, {
    opacity: 0,
    y: -80,
    ease: 'power2.inOut',
    duration: 1,
    }, 0);

    tl.to(bgRef.current, {
    opacity: 1,
    ease: 'power2.inOut',
    duration: 1,
    }, 0);

    /* WORDS APPEAR */
    tl.to(wordsRef.current, {
    opacity: 1,
    duration: 0.4,
    }, 1.2);

    tl.to(wordEls, {
    opacity: 1,
    y: 0,
    stagger: 0.03,
    ease: 'power3.out',
    duration: 0.8,
    }, 1.3);

    /* WORDS FADE */
    tl.to(wordsRef.current, {
    opacity: 0,
    ease: 'power2.inOut',
    duration: 0.8,
    }, 2.3);

    /* STACK REVEAL */
    tl.to(layers, {
    autoAlpha: 1,
    y: 0,
    z: 0,
    scale: 1,
    rotateX: 0,
    rotationY: -10,
    filter: 'blur(0px)',
    stagger: {
        each: 0.22,
    },
    duration: 1.8,
    ease: 'expo.out',
    }, 2.6);

    /* LEFT TEXT TYPE */
    tl.fromTo(
    headingChars,
    { opacity: 0 },
    {
        opacity: 1,
        stagger: 0.035,
        ease: 'none',
        duration: 1,
    },
    4.2
    );

    tl.fromTo(
    descChars,
    { opacity: 0 },
    {
        opacity: 1,
        stagger: 0.02,
        ease: 'none',
        duration: 1,
    },
    4.6
    );

    /* STACK MOVES RIGHT */
    tl.to(stackRef.current, {
    x: '12vw',
    ...(!isMobile ? { y: '15vh' } : {}),
    rotationY: -10,
    z: 80,
    transformOrigin: 'center center',
    ease: 'power3.out',
    duration: 2,
    }, 5.2);

    /* LAYERS ROTATE ON RIGHTWARDS MOVE */
    tl.to(layers, {
    rotationY: -20,
    stagger: { each: 0.1, from: 'end' },
    ease: 'power3.out',
    duration: 2,
    }, 5.2);

    /* LEFT TEXT FADE */
    tl.to(typeRef.current, {
    opacity: 0,
    ease: 'power2.inOut',
    duration: 1,
    }, 7.5);

    /* STACK MOVES LEFT */
    tl.to(stackRef.current, {
    x: '-12vw',
    rotationY: 10,
    ease: 'power3.inOut',
    duration: 2,
    }, 7.6);

    /* LAYERS ROTATE ON LEFTWARDS MOVE */
    tl.to(layers, {
    rotationY: 0,
    stagger: { each: 0.1, from: 'end' },
    ease: 'power3.inOut',
    duration: 2,
    }, 7.6);
    /* RIGHT TEXT TYPE */
    tl.fromTo(
    headingChars2,
    { opacity: 0 },
    {
        opacity: 1,
        stagger: 0.035,
        ease: 'none',
        duration: 1,
    },
    9.3
    );

    tl.fromTo(
    descChars2,
    { opacity: 0 },
    {
        opacity: 1,
        stagger: 0.02,
        ease: 'none',
        duration: 1,
    },
    9.7
    );

    /* FINAL FADE */
    tl.to(stackRef.current, {
    opacity: 0,
    ease: 'power2.inOut',
    duration: 1.5,
    }, 12);

    tl.to(typeRef2.current, {
    opacity: 0,
    ease: 'power2.inOut',
    duration: 1.5,
    }, 12);

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  // Bottom section: image slide-up + text morph
 useEffect(() => {
  const section = imgSlideRef.current?.closest('section');

  if (
    !section ||
    !imgSlideRef.current ||
    !oldLabelRef.current ||
    !newLabelRef.current
  ) return;

  const ctx = gsap.context(() => {

    gsap.set(newLabelRef.current, {
      opacity: 0,
      y: 20,
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: '+=200%',
        scrub: 1,
      },
    });

    // Image moves up
    tl.to(imgSlideRef.current, {
      y: '-40%',
      ease: 'power2.inOut',
      duration: 1.5,
    });

    // ✅ Old text fades out
    tl.to(oldLabelRef.current, {
      opacity: 0,
      y: -15,
      filter: 'blur(8px)',
      ease: 'power2.out',
      duration: 0.5,
    });

    // ✅ New text appears
    tl.to(newLabelRef.current, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      ease: 'power3.out',
      duration: 0.7,
    });

  });

  return () => ctx.revert();
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
  {/* Small premium label */}
  <div className="flex items-center justify-center gap-3 mb-5">
    <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d9c3a7]/50" />

    <span
      className="
        text-[10px]
        uppercase
        tracking-[0.35em]
        text-[#d9c3a7]/70
        font-light
      "
    >
      AI Learning Platform
    </span>

    <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d9c3a7]/50" />
  </div>

  {/* Heading */}
  <h2
    className="
      text-[clamp(1.6rem,3.2vw,2.8rem)]
      font-medium
      tracking-tight
      leading-[1.15]
      mb-4
      text-[#f6f1ea]
    "
    style={{
      textShadow: `
        0 0 25px rgba(255,220,180,0.08),
        0 0 60px rgba(180,160,255,0.08)
      `,
    }}
  >
    {headingWords.map((word, i) => (
      <span
        key={i}
        className="
          word
          inline-block
          opacity-0
          translate-y-5
          mr-[0.3em]
          bg-gradient-to-r
          from-[#fff6ea]
          via-[#f3d6bb]
          to-[#d8c6ff]
          bg-clip-text
          text-transparent
        "
      >
        {word}
      </span>
    ))}
  </h2>

  {/* Subtext */}
  <p className="text-[clamp(0.9rem,1.4vw,1.1rem)] leading-relaxed mx-auto max-w-2xl text-[#cfc7bc] font-light">
    {subWords.map((word, i) => (
      <span
        key={i}
        className="word inline-block opacity-0 translate-y-5 mr-[0.3em]"
      >
        {word}
      </span>
    ))}
  </p>

  {/* Glow */}
  <div
    className="
      absolute
      left-1/2
      top-1/2
      -translate-x-1/2
      -translate-y-1/2
      -z-10
      h-[220px]
      w-[500px]
      rounded-full
      blur-3xl
      opacity-30
    "
    style={{
      background:
        "radial-gradient(circle, rgba(245,220,190,0.18) 0%, rgba(180,160,255,0.10) 45%, transparent 75%)",
    }}
  />
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

            {/* Second typing text - right side */}
            <div
                ref={typeRef2}
                className="
                    absolute z-20 pointer-events-none
                    sm:right-[8%]
                    sm:top-1/2
                    sm:-translate-y-1/2
                    right-[8%]
                    top-[18%]
                    w-[85%]
                    sm:w-[520px]
                    text-right
                "
            >
              <p className="text-[clamp(1.6rem,3.2vw,2.8rem)] font-semibold text-white tracking-tight leading-[1.2] mb-2 sm:mb-3">
                {"Seamless Integration".split("").map((char, i) => (
                  <span key={i} className="type-char-heading-2 inline-block opacity-0">
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </p>
              <p className="text-[clamp(0.75rem,1.2vw,1rem)] text-white/60 leading-relaxed sm:max-w-md ml-auto">
                {"Works with your existing tools, frameworks, and workflows.".split("").map((char, i) => (
                  <span key={i} className="type-char-desc-2 inline-block opacity-0">
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
                <span className="type-char-desc-2 type-cursor ml-0.5 animate-cursor-blink opacity-0">|</span>
              </p>
            </div>

          </div>
        </section>

        {/* Bottom reveal section - 2 column */}
       <motion.section
  initial={{ y: 120, opacity: 0 }}
  whileInView={{ y: 0, opacity: 1 }}
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.9, ease: "easeOut" }}
   className="relative z-30 w-full overflow-hidden -mt-[30vh]"
>
  <div className="relative w-full min-h-screen flex items-end px-5 sm:px-8 lg:px-12 gap-6">

      {/* LEFT IMAGE at bottom */}
      <div
    ref={imgSlideRef}
    className="
      w-[22%]
      shrink-0
      rounded-[2rem]
      overflow-hidden
      will-change-transform
    "
  >
        <div className="relative">
          <img
            src="/scale/image.png"
            alt="Scale feature"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span ref={oldLabelRef} className="absolute inset-0 flex items-center justify-center text-white text-[clamp(1.5rem,3.5vw,3rem)] font-semibold tracking-tight text-center leading-tight px-2">
              AI <span className="bg-gradient-to-r from-[#93c5fd] via-[#d8b4fe] to-[#6ee7b7] bg-clip-text text-transparent">DSA</span> Mentor
            </span>
            <span ref={newLabelRef} className="absolute inset-0 flex items-center justify-center opacity-0 text-white text-[clamp(1.5rem,3.5vw,3rem)] font-semibold tracking-tight text-center leading-tight px-2">
              Zeno
            </span>
          </div>
        </div>
      </div>

      {/* HUGE RIGHT CARD (stays in place) */}
      <div
  className="
    w-full
    rounded-[2.5rem]

    p-10
    sm:p-16
    lg:p-20

    flex flex-col justify-start
  "
  style={{
    background:
      "linear-gradient(135deg,#0c3b28 0%,#12452e 100%)",
  }}
>
        <h2
          className="
            text-[clamp(3rem,6vw,7rem)]
            font-medium
            tracking-tight
            leading-[0.95]
            text-[#f5f5f0]
            max-w-5xl
          "
        >
          90% of the world's leading generative AI model builders are powered by Scale.
        </h2>
      </div>

  </div>
</motion.section>

      </div>
    </main>
  );
}
