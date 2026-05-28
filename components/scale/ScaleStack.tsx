"use client";
import { useEffect, useState } from "react";
import CodeAnalysisCard from "./CodeAnalysisCard";
import HologramCard from "./HologramCard";
import TechOverlay from "./TechOverlay";
export default function ScaleStack() {
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
  return (
    <div
      className="relative w-full max-w-[360px] sm:max-w-[460px] md:max-w-[560px] lg:max-w-[660px] -mt-8 sm:-mt-12 mb-10 sm:mb-14"
      style={{
        perspective: "1200px",
      }}
    >
      <div
        className="relative w-full"
        style={{
          aspectRatio: "16/9",
          transformStyle: "preserve-3d",
          transform: "rotateY(-20deg)",
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* Ambient glow behind all layers */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateZ(-200px)`,
            animation: 'glowPulse 4s ease-in-out infinite',
          }}
        >
          <div className="absolute top-[10%] left-[0%] w-[120%] h-[80%] rounded-full blur-[100px]"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(139,157,195,0.5) 0%, rgba(176,196,222,0.2) 35%, transparent 70%)",
            }}
          />
          <div className="absolute top-[30%] right-[-10%] w-[80%] h-[60%] rounded-full blur-[70px]"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(176,196,222,0.25) 0%, transparent 60%)",
            }}
          />
          <div className="absolute bottom-[5%] left-[20%] w-[70%] h-[50%] rounded-full blur-[80px]"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, rgba(139,157,195,0.15) 0%, transparent 60%)",
            }}
          />
        </div>

        {/* Hologram - Back */}
        <div
          data-layer="3"
          className="absolute inset-0 z-0 opacity-0 rounded-2xl overflow-hidden border-2 border-white"
          style={{
            transform: `rotateY(-10deg) translateX(${cardTx / 4}px) translateY(${cardTy - 10}px) translateZ(0px)`,
          }}
        >
          <HologramCard />
        </div>

        {/* Video - Center */}
        <div data-layer="2" className="absolute inset-0 z-10 opacity-0 rounded-2xl overflow-hidden border" style={{ transform: `rotateY(-10deg) translateX(${cardTx}px) translateY(${cardTy - 10}px) translateZ(120px)` }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster="/scale/desktop.png"
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.9) contrast(1.1)' }}
          >
            <source src="/video/bore.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse at 60% 40%,transparent 25%,rgba(0,0,0,0.6) 100%)",
          }} />
          {/* <TechOverlay /> */}
          <div className="absolute inset-x-0 top-0 h-1/4 pointer-events-none" style={{
            background: "linear-gradient(to bottom,rgba(255,255,255,0.04) 0%,transparent 100%)",
          }} />
        </div>

        {/* Code Analysis - Front */}
        <div
          data-layer="4"
          className="absolute inset-0 z-20 opacity-0 rounded-2xl overflow-hidden border-2 border-white"
          style={{
            transform: `rotateY(-10deg) translateX(${cardTx * 3}px) translateY(${cardTy - 20}px) translateZ(160px)`,
          }}
        >
          <CodeAnalysisCard />
        </div>
      </div>
    </div>
  );
}
