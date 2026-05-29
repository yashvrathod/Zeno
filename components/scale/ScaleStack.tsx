"use client";
import { useEffect, useState } from "react";
import CodeAnalysisCard from "./CodeAnalysisCard";
import HologramCard from "./HologramCard";
import TechOverlay from "./TechOverlay";
export default function ScaleStack({ isAnimated = true }: { isAnimated?: boolean }) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cardTx = isMobile ? -10 : -40;
  const cardTy = isMobile ? -8 : -35;
  const zStep = 80;

  const layerClass = `absolute inset-0 rounded-2xl overflow-hidden border transition-all duration-700 ${isAnimated ? 'opacity-0' : 'opacity-100'}`;

  return (
    <div
      className="relative w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[660px] mx-auto"
      style={{
        perspective: "1200px",
        willChange: "transform",
      }}
    >
      <div
        className="relative w-full"
        style={{
          aspectRatio: "16/9",
          transformStyle: "preserve-3d",
          transform: isMobile ? "rotateY(-10deg)" : "rotateY(-20deg)",
          transition: "transform 0.4s ease-out",
          willChange: "transform",
        }}
      >
        {/* Ambient glow behind all layers */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateZ(-200px)`,
            animation: 'glowPulse 4s ease-in-out infinite',
            willChange: 'opacity, transform',
          }}
        >
          <div className="absolute top-[10%] left-[0%] w-[120%] h-[80%] rounded-full blur-[60px] sm:blur-[100px]"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(139,157,195,0.4) 0%, rgba(176,196,222,0.15) 35%, transparent 70%)",
            }}
          />
        </div>

        {/* Hologram - Back */}
        <div
          data-layer="3"
          className={`${layerClass} z-0 border-white/20`}
          style={{
            transform: `rotateY(-10deg) translateX(${cardTx / 4}px) translateY(${cardTy - 10}px) translateZ(0px)`,
            willChange: "transform, opacity",
          }}
        >
          <HologramCard />
        </div>

        {/* Video - Center */}
        <div
          data-layer="2"
          className={`${layerClass} z-10 border-white/10`}
          style={{
            transform: `rotateY(-10deg) translateX(${cardTx}px) translateY(${cardTy - 10}px) translateZ(120px)`,
            willChange: "transform, opacity",
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/scale/desktop.png"
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.9) contrast(1.1)' }}
          >
            <source src="/video/bore.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-tr from-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Code Analysis - Front */}
        <div
          data-layer="4"
          className={`${layerClass} z-20 border-white/30`}
          style={{
            transform: `rotateY(-10deg) translateX(${cardTx * 3}px) translateY(${cardTy - 20}px) translateZ(160px)`,
            willChange: "transform, opacity",
          }}
        >
          <CodeAnalysisCard />
        </div>
      </div>
    </div>
  );
}
