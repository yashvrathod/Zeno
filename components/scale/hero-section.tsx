'use client';

import { forwardRef, useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScaleStack } from '@/components/scale';

interface HeroSectionProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  stackRef: React.RefObject<HTMLDivElement | null>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  wordsRef: React.RefObject<HTMLDivElement | null>;
  typeRef: React.RefObject<HTMLDivElement | null>;
  typeRef2: React.RefObject<HTMLDivElement | null>;
}

const ROTATING_WORDS = ['OFFER', 'SKILLS', 'FUTURE', 'CAREER', 'SUCCESS'];

const headingWords = "AI DSA Mentor for Interview Prep".split(' ');
const subWords =
  "From arrays to graphs, master every pattern with guided reasoning and real interview-level challenges.".split(' ');

export const HeroSection = forwardRef<HTMLDivElement, HeroSectionProps>(
  ({ cardRef, stackRef, headingRef, wordsRef, typeRef, typeRef2 }, sectionRef) => {
    const [wordIndex, setWordIndex] = useState(0);
    const rotatingRef = useRef<HTMLSpanElement>(null);
    const rotatingInnerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const interval = setInterval(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
      }, 2400);
      return () => clearInterval(interval);
    }, []);

    useEffect(() => {
      const word = ROTATING_WORDS[wordIndex];
      const tl = gsap.timeline();

      if (rotatingRef.current) {
        tl.to(rotatingRef.current, {
          width: `${word.length}ch`,
          duration: 0.7,
          ease: 'power2.inOut',
        }, 0);
      }

      if (rotatingInnerRef.current) {
        tl.to(rotatingInnerRef.current, {
          y: `${-wordIndex}em`,
          duration: 0.7,
          ease: 'power2.inOut',
        }, 0);
      }

      return () => { tl.kill(); };
    }, [wordIndex]);

    return (
      <section
        ref={sectionRef}
        className="relative w-full h-screen"
        style={{ perspective: 1200 }}
      >
        <div className="sticky top-0 w-full min-h-screen overflow-hidden">
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
              {/* <source src="/video/claude.webm" type="video/webm" /> */}
              <source src="/video/bore.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />
          </div>

          <div
            ref={headingRef}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center pointer-events-none"
          >
            <div className="relative mb-6 inline-flex overflow-hidden rounded-full border border-white/20 px-6 py-2.5">

                {/* Gradient/Image Background */}
                <div className="absolute inset-0">
                    <img
                    src="/hero-card.png"
                    alt=""
                    className="h-full w-full object-cover opacity-70"
                    />

                    {/* Dark overlay for readability */}
                    {/* <div className="absolute inset-0 bg-black/20" /> */}
                </div>

                {/* Content */}
                <div className="relative z-10 flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.3em] text-white backdrop-blur-sm">
                    AI <span className="italic font-semibold tracking-[0.25em]">DSA</span> Mentor
                </div>
            </div>
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-semibold tracking-tight leading-[0.95] text-white flex flex-col sm:block items-center sm:items-start text-center sm:text-left">
              <span className="bg-[linear-gradient(to_bottom,#ffffff,#ffffffcc,#ffffff55)] bg-clip-text text-transparent sm:mr-4">ENGINEER YOUR</span>
              <span ref={rotatingRef} className="relative inline-block overflow-hidden h-[1em] align-top italic mt-2 sm:mt-0"
                style={{ perspective: '400px' }}>
                <span ref={rotatingInnerRef} className="block">
                  {ROTATING_WORDS.map((w) => (
                    <span key={w} className="block h-[1em] bg-[linear-gradient(to_bottom,#ffffff,#ffffffcc,#ffffff55)] bg-clip-text text-transparent">
                      {w}
                    </span>
                  ))}
                </span>
              </span>
            </h1>
            <p className="text-[clamp(0.9rem,1.5vw,1.15rem)] text-white max-w-2xl mt-8 leading-relaxed px-4 sm:px-0">
              Master every DSA pattern with AI-powered guidance and real interview-level challenges.
            </p>
            <p className="text-[clamp(0.75rem,1.05vw,0.9rem)] text-white/70 mt-4">
              No credit card required. Start solving in 60 seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 w-full px-6 sm:px-0">
              <button className="w-full sm:w-auto px-10 py-4 rounded-full text-[clamp(0.85rem,1.1vw,0.95rem)] font-bold tracking-wider text-white
                bg-gradient-to-r from-blue-600 to-violet-600
                hover:shadow-[0_0_40px_-5px_rgba(37,99,235,0.5)] transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95">
                Start Coding Free
              </button>
              <button className="w-full sm:w-auto px-10 py-4 rounded-full text-[clamp(0.85rem,1.1vw,0.95rem)] font-bold tracking-wider text-white/80 border border-white/10
                bg-white/5 backdrop-blur-xl hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95">
                View Roadmap
              </button>
            </div>
            <div className="hidden sm:flex items-center justify-center gap-8 mt-12">
              {['DSA Patterns', 'AI-Guided', 'Interview Ready'].map((item) => (
                <span key={item} className="flex items-center gap-2 text-[clamp(0.75rem,0.9vw,0.85rem)] uppercase tracking-[0.2em] text-white/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            ref={stackRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <ScaleStack />
          </div>

          <div
            ref={wordsRef}
            className="absolute left-1/2 -translate-x-1/2 top-[78%] -translate-y-1/2 w-full max-w-4xl px-6 opacity-0 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d9c3a7]/50" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-[#d9c3a7]/70 font-light">
                AI Learning Platform
              </span>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d9c3a7]/50" />
            </div>

            <h2
              className="text-[clamp(1.6rem,3.2vw,2.8rem)] font-medium tracking-tight leading-[1.15] mb-4 text-[#f6f1ea]"
              style={{
                textShadow: `0 0 25px rgba(255,220,180,0.08), 0 0 60px rgba(180,160,255,0.08)`,
              }}
            >
              {headingWords.map((word, i) => (
                <span
                  key={i}
                  className="word inline-block opacity-0 translate-y-5 mr-[0.3em] bg-white  bg-clip-text text-transparent"
                >
                  {word}
                </span>
              ))}
            </h2>

            <p className="text-[clamp(0.9rem,1.4vw,1.1rem)] leading-relaxed mx-auto max-w-2xl text-[#cfc7bc] font-light">
              {subWords.map((word, i) => (
                <span key={i} className="word inline-block opacity-0 translate-y-5 mr-[0.3em]">
                  {word}
                </span>
              ))}
            </p>

            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[220px] w-[500px] rounded-full blur-3xl opacity-30"
              style={{
                background:
                  'radial-gradient(circle, rgba(245,220,190,0.18) 0%, rgba(180,160,255,0.10) 45%, transparent 75%)',
              }}
            />
          </div>

          <div
  ref={typeRef}
  className="
    absolute z-20 pointer-events-none
    left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2
    w-full px-6
    sm:left-[8%] sm:-translate-x-0 sm:w-[560px] sm:px-0
    text-center sm:text-left

    opacity-0 translate-y-6
  "
>
  {/* Ambient Glow */}
  <div
    className="
      glow-orb
      absolute left-[-12%] top-[-18%]
      h-[220px] w-[220px]
      rounded-full blur-3xl opacity-40
      -z-10
    "
    style={{
      background:
        "radial-gradient(circle, rgba(96,165,250,0.16) 0%, rgba(168,139,250,0.10) 45%, transparent 75%)",
    }}
  />

  {/* Top Badge */}
  <div
    className="
      feature-pill
      inline-flex items-center gap-2
      rounded-full
      border border-white/[0.08]
      bg-white/[0.03]
      backdrop-blur-xl
      px-3 py-1.5
      mb-4
      shadow-[0_0_40px_rgba(255,255,255,0.02)]
    "
  >
    <div className="icon-box relative">
      <div className="w-2 h-2 rounded-full bg-sky-300" />
      <div className="absolute inset-0 rounded-full bg-sky-300 blur-[6px] opacity-70" />
    </div>

    <span className="text-[10px] uppercase tracking-[0.24em] text-white/55 font-medium">
      AI DSA Mentor
    </span>
  </div>

  {/* Heading */}
  <p
    className="
      text-[clamp(2rem,3.5vw,3rem)]
      font-semibold
      tracking-[-0.045em]
      leading-[1.08]
      mb-3
    "
    style={{
      textShadow:
        "0 0 25px rgba(96,165,250,0.08), 0 0 45px rgba(168,139,250,0.06)",
    }}
  >
    {"Intelligent Problem Solving".split("").map((char, i) => (
      <span
        key={i}
        className="
          type-char-heading
          inline-block opacity-0
          text-white
        "
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ))}
  </p>

  {/* Description */}
  <p
    className="
      text-[clamp(0.78rem,1vw,0.95rem)]
      text-white/58
      leading-relaxed
      max-w-[360px]
    "
  >
    {"Master DSA with AI-generated hints, optimized approaches, and interview-level feedback in real time."
      .split("")
      .map((char, i) => (
        <span
          key={i}
          className="type-char-desc inline-block opacity-0"
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}

    <span className="type-char-desc type-cursor ml-0.5 animate-cursor-blink opacity-0">
      |
    </span>
  </p>

  {/* Features */}
<div className="mt-5 flex flex-wrap gap-2 max-w-[360px]">

  {/* Pill 1 */}
  <div
    className="
      feature-pill
      group
      flex items-center gap-2
      rounded-full
      border border-white/[0.08]
      bg-white/[0.03]
      px-3 py-1.5
      backdrop-blur-xl
      shadow-[0_0_20px_rgba(255,255,255,0.015)]
      transition-all duration-300
      hover:bg-white/[0.05]
      hover:border-white/[0.12]
    "
  >
    <div
      className="
        icon-box
        flex items-center justify-center
        h-5 w-5
        rounded-full
        bg-white/[0.05]
        border border-white/[0.06]
      "
    >
      <svg
        className="w-2.5 h-2.5 text-white/65"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 17v-2a4 4 0 014-4h2"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7h4v4"
        />
      </svg>
    </div>

    <span
      className="
        text-[10px]
        tracking-[0.18em]
        uppercase
        text-white/58
        group-hover:text-white/78
        transition-colors
      "
    >
      Smart Hints
    </span>
  </div>

  {/* Pill 2 */}
  <div
    className="
      feature-pill
      group
      flex items-center gap-2
      rounded-full
      border border-white/[0.08]
      bg-white/[0.03]
      px-3 py-1.5
      backdrop-blur-xl
      shadow-[0_0_20px_rgba(255,255,255,0.015)]
      transition-all duration-300
      hover:bg-white/[0.05]
      hover:border-white/[0.12]
    "
  >
    <div
      className="
        icon-box
        flex items-center justify-center
        h-5 w-5
        rounded-full
        bg-white/[0.05]
        border border-white/[0.06]
      "
    >
      <svg
        className="w-2.5 h-2.5 text-white/65"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6l4 2"
        />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </div>

    <span
      className="
        text-[10px]
        tracking-[0.18em]
        uppercase
        text-white/58
        group-hover:text-white/78
        transition-colors
      "
    >
      Complexity Scan
    </span>
  </div>

  {/* Pill 3 */}
  <div
    className="
      feature-pill
      group
      flex items-center gap-2
      rounded-full
      border border-white/[0.08]
      bg-white/[0.03]
      px-3 py-1.5
      backdrop-blur-xl
      shadow-[0_0_20px_rgba(255,255,255,0.015)]
      transition-all duration-300
      hover:bg-white/[0.05]
      hover:border-white/[0.12]
    "
  >
    <div
      className="
        icon-box
        flex items-center justify-center
        h-5 w-5
        rounded-full
        bg-white/[0.05]
        border border-white/[0.06]
      "
    >
      <svg
        className="w-2.5 h-2.5 text-white/65"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>

    <span
      className="
        text-[10px]
        tracking-[0.18em]
        uppercase
        text-white/58
        group-hover:text-white/78
        transition-colors
      "
    >
      Interview Ready
    </span>
  </div>

</div>

  {/* Glassmorphed DSA Logos */}
  <div className="mt-5 flex flex-wrap gap-2.5 max-w-[360px]">
    {[
      { label: 'Graphs', cls: 'border-violet-400/15 bg-violet-400/[0.05] text-violet-300' },
      { label: 'Trees', cls: 'border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300' },
      { label: 'DP', cls: 'border-amber-400/15 bg-amber-400/[0.05] text-amber-300' },
      { label: 'Strings', cls: 'border-rose-400/15 bg-rose-400/[0.05] text-rose-300' },
    ].map((item) => (
      <div
        key={item.label}
        className={`feature-pill flex items-center gap-2 rounded-xl border backdrop-blur-xl px-3.5 py-2.5 ${item.cls}`}
      >
        <span className="text-[12px] font-semibold tracking-wide">
          {item.label}
        </span>
      </div>
    ))}
  </div>

  {/* Bottom Label */}
  <div data-bottom-label className="mt-6 flex items-center gap-3">
    <div className="h-px w-14 bg-gradient-to-r from-sky-300/40 to-transparent" />

    <span className="text-[9px] uppercase tracking-[0.28em] text-white/28">
      Personalized AI Guidance
    </span>
  </div>
</div>

          <div
  ref={typeRef2}
  className="
    absolute z-20 pointer-events-none
    left-1/2 -translate-x-1/2 top-1/4
    w-full px-6
    sm:right-[8%] sm:left-auto sm:-translate-x-0 sm:w-[540px] sm:px-0
    text-center sm:text-left

    opacity-0 translate-y-6
  "
>
  {/* Ambient Glow */}
  <div
    className="
      glow-orb-2
      absolute left-[-12%] top-[-18%]
      h-[220px] w-[220px]
      rounded-full blur-3xl opacity-40
      -z-10
    "
    style={{
      background:
        "radial-gradient(circle, rgba(168,139,250,0.16) 0%, rgba(96,165,250,0.10) 45%, transparent 75%)",
    }}
  />

  {/* Top Badge */}
  <div
    className="
      feature-pill-2
      inline-flex items-center gap-2
      rounded-full
      border border-white/[0.08]
      bg-white/[0.03]
      backdrop-blur-xl
      px-3 py-1.5
      mb-4
      shadow-[0_0_40px_rgba(255,255,255,0.02)]
    "
  >
    <div className="icon-box relative">
      <div className="w-2 h-2 rounded-full bg-violet-300" />
      <div className="absolute inset-0 rounded-full bg-violet-300 blur-[6px] opacity-70" />
    </div>

    <span className="text-[10px] uppercase tracking-[0.24em] text-white/55 font-medium">
      Core Features
    </span>
  </div>

  {/* Heading */}
  <p
    className="
      text-[clamp(2rem,3.5vw,3rem)]
      font-semibold
      tracking-[-0.045em]
      leading-[1.08]
      mb-3
    "
    style={{
      textShadow:
        "0 0 25px rgba(168,139,250,0.08), 0 0 45px rgba(96,165,250,0.06)",
    }}
  >
    {"AI-Powered Analysis".split("").map((char, i) => (
      <span
        key={i}
        className="
          type-char-heading-2
          inline-block opacity-0
          text-white
        "
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ))}
  </p>

  {/* Description */}
  <p
    className="
      text-[clamp(0.78rem,1vw,0.95rem)]
      text-white/58
      leading-relaxed
      max-w-[360px]
    "
  >
    {"Real-time AI analysis with intelligent pattern recognition and FAANG-level interview feedback."
      .split("")
      .map((char, i) => (
        <span
          key={i}
          className="type-char-desc-2 inline-block opacity-0"
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}

    <span className="type-char-desc-2 type-cursor ml-0.5 animate-cursor-blink opacity-0">
      |
    </span>
  </p>

  {/* Feature Pills */}
  <div className="mt-5 flex flex-wrap gap-2 max-w-[360px]">
    {['Pattern Matching', 'Complexity Scan', 'Smart Hints'].map((label) => (
      <div
        key={label}
        className="
          feature-pill-2
          group
          flex items-center gap-2
          rounded-full
          border border-white/[0.08]
          bg-white/[0.03]
          px-3 py-1.5
          backdrop-blur-xl
          shadow-[0_0_20px_rgba(255,255,255,0.015)]
          transition-all duration-300
          hover:bg-white/[0.05]
          hover:border-white/[0.12]
        "
      >
        <span
          className="
            text-[10px]
            tracking-[0.18em]
            uppercase
            text-white/58
            group-hover:text-white/78
            transition-colors
          "
        >
          {label}
        </span>
      </div>
    ))}
  </div>

  {/* Glassmorphed DSA Logos */}
  <div className="mt-5 flex flex-wrap gap-2.5 max-w-[360px]">
    {[
      { label: 'Python', cls: 'border-sky-400/15 bg-sky-400/[0.05] text-sky-300' },
      { label: 'Java', cls: 'border-amber-400/15 bg-amber-400/[0.05] text-amber-300' },
      { label: 'C++', cls: 'border-blue-400/15 bg-blue-400/[0.05] text-blue-300' },
      { label: 'JS', cls: 'border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-300' },
    ].map((item) => (
      <div
        key={item.label}
        data-logo-2
        className={`feature-pill-2 flex items-center gap-2 rounded-xl border backdrop-blur-xl px-3.5 py-2.5 ${item.cls}`}
      >
        <span className="text-[12px] font-semibold tracking-wide">
          {item.label}
        </span>
      </div>
    ))}
  </div>

  {/* Bottom Label */}
  <div data-bottom-label-2 className="mt-6 flex items-center gap-3">
    <span className="text-[9px] uppercase tracking-[0.28em] text-white/28">
      500+ DSA Patterns
    </span>
    <div className="h-px w-14 bg-gradient-to-l from-violet-300/40 to-transparent" />
  </div>
</div>
        </div>
      </section>
    );
  },
);

HeroSection.displayName = 'HeroSection';
