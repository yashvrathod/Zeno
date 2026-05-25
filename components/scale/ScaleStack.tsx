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
  const cardTy = isMobile ? -8 : -30;
  const cardTz = 50;
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
        {/* <div data-layer="1" className="absolute inset-0 rounded-2xl " style={{ transform: "rotateY(-10deg) translateZ(-20px)" }}>
          <div className="absolute inset-0 rounded-2xl opacity-30" style={{
            backgroundImage: `
              linear-gradient(rgba(0, 180, 255, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 180, 255, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            boxShadow: 'inset 0 0 80px rgba(0, 180, 255, 0.2), 0 0 60px rgba(0, 150, 255, 0.15)',
          }} />
        </div> */}
        <div data-layer="2" className="absolute inset-0 rounded-2xl overflow-hidden opacity-0" style={{ transform: "rotateY(-10deg) translateZ(0px)" }}>
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
          <TechOverlay />
          <div className="absolute inset-x-0 top-0 h-1/4 pointer-events-none" style={{
            background: "linear-gradient(to bottom,rgba(255,255,255,0.04) 0%,transparent 100%)",
          }} />
        </div>
        <div
          data-layer="3"
          className="absolute z-[110] opacity-0"
          style={{
            inset: "0",
            transform: `rotateY(-10deg) translateX(${cardTx}px) translateY(${cardTy-15}px) translateZ(${cardTz - 15}px)`,
          }}
        >
          <HologramCard />
        </div>
        <div
          data-layer="4"
          className="absolute z-20 opacity-0"
          style={{
            inset: "0",
            transform: `rotateY(-10deg) translateX(${cardTx-45}px) translateY(${cardTy-50}px) translateZ(${cardTz+15}px)`,
          }}
        >
          <CodeAnalysisCard />
        </div>
        {/* <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none z-30" /> */}
      </div>
    </div>
  );
}
