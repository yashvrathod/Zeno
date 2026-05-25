'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import NeuralNetwork from '@/components/hero/NeuralNetwork';

gsap.registerPlugin(ScrollTrigger);

export default function Scale3DVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const nnLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !videoWrapperRef.current) return;

    // Reset initial state: perfectly flat, centered, full opacity image
    gsap.set(videoWrapperRef.current, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)',
      rotationY: 0,
      rotationX: 0,
      rotationZ: 0,
      scale: 1,
      force3D: true,
    });

    gsap.set(imageRef.current, { opacity: 1 });
    gsap.set(overlayRef.current, { opacity: 0 });
    gsap.set(nnLayerRef.current, { opacity: 0 });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
      }
    });

    // 1. FAST SHRINK (Anticipation)
    tl.to(videoWrapperRef.current, {
      scale: 0.98,
      clipPath: 'inset(1% 1% 1% 1% round 12px)',
      duration: 0.4,
      ease: 'power2.inOut',
    });

    // 2. THE SNAP TURN (Everything synced here)
    // We cross-fade the image to the video/3D layer EXACTLY as the rotation happens
    tl.to(videoWrapperRef.current, {
      clipPath: 'inset(20% 20% 20% 20% round 32px)',
      rotationY: -35,
      rotationX: 10,
      rotationZ: -1,
      scale: 0.9,
      duration: 1.2,
      ease: 'expo.out',
    }, 'turn');

    // Cross-fade image out
    tl.to(imageRef.current, {
      opacity: 0,
      duration: 0.8,
      ease: 'power2.inOut',
    }, 'turn');

    // Fade overlay and NeuralNetwork in
    tl.to([overlayRef.current, nnLayerRef.current], {
      opacity: 1,
      duration: 1,
      ease: 'power2.inOut',
    }, 'turn+=0.2');

    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-[180vh] bg-black">
      <div className="sticky top-0 w-full h-screen flex items-center justify-center overflow-hidden" style={{ perspective: '2000px' }}>
        
        <div
          ref={videoWrapperRef}
          className="relative w-full h-full overflow-hidden bg-black"
          style={{
            transformStyle: 'preserve-3d',
            boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          {/* BACKGROUND: Video (Always there, but behind image initially) */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/video/bore.mp4" type="video/mp4" />
            </video>
            {/* Overlay that darkens the video */}
            <div ref={overlayRef} className="absolute inset-0 bg-black/60 z-10" />
          </div>

          {/* MIDDLE: 3D Neural Network (Headless/Manual control) */}
          <div ref={nnLayerRef} className="absolute inset-0 pointer-events-none z-20" style={{ transform: 'translateZ(80px) scale(1.4)' }}>
            <NeuralNetwork manualControl={true} />
          </div>

          {/* TOP: Image Cover (Perfectly aligned with container) */}
          <div 
            ref={imageRef}
            className="absolute inset-0 z-30"
            style={{ 
              backgroundImage: 'url("/scale/desktop.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
}
