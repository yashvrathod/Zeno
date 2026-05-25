"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Navbar } from "@/components/hero";

gsap.registerPlugin(ScrollTrigger);

export default function FreshPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let mm = gsap.matchMedia();

    mm.add({
      isDesktop: "(min-width: 1024px)",
      isTablet: "(min-width: 641px) and (max-width: 1023px)",
      isMobile: "(max-width: 640px)",
    }, (context) => {
      const { isDesktop, isTablet, isMobile } = context.conditions!;

      // Adjusted settings to ensure a consistent "rectangular" look across different screen ratios
      let insetX = 25; // Desktop: balanced wide rectangle
      let insetY = 15; 
      let borderRadius = "40px";
      let textExitY = -150;

      if (isTablet) {
        insetX = 15;   // Tablet: allow more width
        insetY = 25;   // and less height to keep rectangle shape
        borderRadius = "30px";
      } else if (isMobile) {
        insetX = 8;    // Mobile: very little side crop (wide)
        insetY = 35;   // significant top/bottom crop (shorter)
        borderRadius = "20px";
        textExitY = -100;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=2000",
          scrub: 1,
          pin: true,
          anticipatePin: 1,
        },
      });

      // 1. Fade and move text out
      tl.to([headingRef.current, subtextRef.current], {
        y: textExitY,
        opacity: 0,
        stagger: 0.1,
        ease: "power2.inOut",
      }, 0);

      // 2. Animate main video wrapper to vertical shape
      tl.to(videoWrapperRef.current, {
        clipPath: `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${borderRadius})`,
        borderColor: "rgba(255, 255, 255, 0.8)", // Highly visible white border
        ease: "power4.inOut",
      }, 0);

      // 3. Scale content slightly
      tl.fromTo(videoRef.current, {
        scale: 1,
        filter: "brightness(1)",
      }, {
        scale: 0.25,
        filter: "brightness(1.1)",
        ease: "power2.inOut",
        immediateRender: false,
      }, 0);

      return () => {
        // Cleanup handled by mm.revert()
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <main className="bg-black font-sans antialiased overflow-x-hidden">
      <Navbar />
      {/* Scroll Transition Section */}
      <section ref={containerRef} className="relative h-screen w-full">
        {/* Video Wrapper */}
        <div
          ref={videoWrapperRef}
          className="absolute inset-4 sm:inset-8 md:inset-12 z-0 overflow-hidden will-change-[clip-path,filter] border-2 border-white/0 shadow-[0_0_50px_rgba(255,255,255,0.1)]"
          style={{ clipPath: "inset(0% 0% 0% 0% round 0px)" }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          >
            <source src="/video/bore.mp4" type="video/mp4" />
          </video>
          
          {/* Darker overlay for text contrast */}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        {/* Hero Content */}
        <div
          ref={textRef}
          className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        >
          <div className="overflow-hidden">
            <h1 
              ref={headingRef}
              className="text-white text-5xl sm:text-7xl md:text-9xl font-black uppercase tracking-tight leading-none"
            >
              Perspective
            </h1>
          </div>
          <p 
            ref={subtextRef}
            className="text-white/60 text-lg sm:text-xl md:text-2xl mt-6 max-w-2xl font-light tracking-wide"
          >
            Scroll to discover the architecture of movement and space.
          </p>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
            <div className="w-1 h-12 bg-gradient-to-b from-white/50 to-transparent rounded-full animate-bounce" />
        </div>
      </section>

      {/* Next Section to show the end of the pin */}
      <section className="relative min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-6 py-24">
        <div className="max-w-4xl w-full">
          <h2 className="text-white text-4xl md:text-6xl font-bold mb-8">
            The Reveal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-zinc-400 text-lg">
                Our approach combines technical precision with creative vision. By transforming the viewing experience, we create moments of impact that resonate across all platforms.
              </p>
              <div className="h-px w-20 bg-white/20" />
              <p className="text-zinc-500">
                Responsive by design, impactful by nature.
              </p>
            </div>
            <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-2xl">
                <div className="text-3xl font-mono text-white mb-2">01</div>
                <div className="text-zinc-400">Dynamic scaling and clipping using GSAP ScrollTrigger for seamless device compatibility.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="h-[50vh] bg-black" />
    </main>
  );
}
