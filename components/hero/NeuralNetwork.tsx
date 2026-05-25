'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Node {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  layer: number;
}

interface Connection {
  from: number;
  to: number;
  opacity: number;
}

export default function NeuralNetwork({ manualControl = false }: { manualControl?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const mouse = useRef({ x: 0, y: 0 });

  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);

  // ... (nodes and connections definitions remain the same)

  useEffect(() => {
    if (!containerRef.current || !networkRef.current) return;

    if (!manualControl) {
      // =========================
      // SCROLL REVEAL (Only if not manually controlled)
      // =========================
      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
          scale: 0.8,
          filter: 'blur(20px)',
        },
        {
          opacity: 1,
          scale: 1,
          filter: 'blur(0px)',
          scrollTrigger: {
            trigger: document.body,
            start: '+=400 top',
            end: '+=1200',
            scrub: true,
          },
        }
      );
    } else {
      // If manual, ensure it's visible by default so parent can animate opacity
      gsap.set(containerRef.current, {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
      });
    }

    // =========================
    // FLOATING NODES (Always active)
    // =========================

    nodesRef.current.forEach((node, i) => {
      if (!node) return;

      gsap.to(node, {
        y: `random(-12, 12)`,
        x: `random(-8, 8)`,
        duration: `random(2, 5)`,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: i * 0.08,
      });

      gsap.to(node, {
        boxShadow: '0 0 26px rgba(255,255,255,0.95)',
        duration: `random(1.2, 2.5)`,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });

    // =========================
    // CONNECTION PULSE
    // =========================

    gsap.to('.connection-line', {
      opacity: () => 0.25 + Math.random() * 0.5,
      duration: `random(1.5, 3)`,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      stagger: {
        each: 0.04,
        from: 'random',
      },
    });

    // =========================
    // MOUSE PARALLAX
    // =========================

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;

      gsap.to(networkRef.current, {
        rotationY: mouse.current.x * 12,
        rotationX: -mouse.current.y * 8,
        duration: 1.8,
        ease: 'power3.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="
        absolute
        inset-0
        pointer-events-none
        flex
        items-center
        justify-center
        opacity-0
      "
      style={{
        perspective: '2400px',
      }}
    >
      {/* MAIN NETWORK */}
      <div
        ref={networkRef}
        className="absolute w-[92%] h-[72%]"
        style={{
          // transformStyle: 'preserve-3d',
          // transform: 'translateY(-5%) translateZ(120px)',
          transform: 'translateY(22%) rotateX(10deg) rotateY(-35deg) rotateZ(5deg) translateZ(220px)',
        }}
      >
        {/* ========================= */}
        {/* BACK GLASS PANELS */}
        {/* ========================= */}

        <div
          className="
            absolute
            inset-[10%]
            rounded-[44px]
            border border-white/20
            opacity-40
          "
          style={{
            transform:
              'translateZ(-260px) rotateY(-18deg) rotateX(8deg) rotateZ(-5deg)',
          }}
        />

        <div
          className="
            absolute
            inset-[16%]
            rounded-[36px]
            border border-white/20
            opacity-30
          "
          style={{
            transform:
              'translateZ(120px) rotateY(12deg) rotateX(6deg) rotateZ(4deg)',
          }}
        />

        {/* ========================= */}
        {/* CONNECTIONS */}
        {/* ========================= */}

        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="lineGradient">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
          </defs>

          {connections.map((conn, i) => (
            <g key={i}>
              {/* MAIN LINE */}

              <line
                className="connection-line"
                x1={nodes[conn.from].x}
                y1={nodes[conn.from].y}
                x2={nodes[conn.to].x}
                y2={nodes[conn.to].y}
                stroke="url(#lineGradient)"
                strokeWidth="0.22"
                opacity={conn.opacity}
              />

              {/* MOVING ENERGY PULSE */}

              <circle r="0.5" fill="white">
                <animateMotion
                  dur={`${2 + Math.random() * 3}s`}
                  repeatCount="indefinite"
                  path={`M ${nodes[conn.from].x} ${nodes[conn.from].y}
                         L ${nodes[conn.to].x} ${nodes[conn.to].y}`}
                />
              </circle>
            </g>
          ))}
        </svg>

        {/* ========================= */}
        {/* NODES */}
        {/* ========================= */}

        {nodes.map((node, i) => (
          <div
            key={node.id}
            ref={(el) => {
              nodesRef.current[i] = el;
            }}
            className="absolute rounded-full bg-white"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              width: `${node.radius}px`,
              height: `${node.radius}px`,

              transform: `translateZ(${node.z}px)`,

              filter: `blur(${Math.abs(node.z) * 0.012}px)`,

              opacity: 1 - Math.abs(node.z) * 0.0025,

              boxShadow: '0 0 14px rgba(255,255,255,0.85)',
            }}
          />
        ))}

        {/* ========================= */}
        {/* GLOW ORBS */}
        {/* ========================= */}

        <div className="absolute inset-0">

          <div
            className="
              absolute
              left-[30%]
              top-[40%]
              w-24
              h-24
              rounded-full
              opacity-20
              blur-[50px]
              bg-white
            "
          />

          <div
            className="
              absolute
              right-[28%]
              top-[30%]
              w-32
              h-32
              rounded-full
              opacity-10
              blur-[70px]
              bg-white
            "
          />

          <div
            className="
              absolute
              left-1/2
              top-1/2
              -translate-x-1/2
              -translate-y-1/2
              w-44
              h-44
              rounded-full
              opacity-15
              blur-[90px]
              bg-white
            "
          />
        </div>

        {/* ========================= */}
        {/* SCANLINES */}
        {/* ========================= */}

        <div
          className="
            absolute
            inset-0
            opacity-[0.04]
            mix-blend-screen
          "
          style={{
            backgroundImage:
              'linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '100% 5px',
          }}
        />

        {/* ========================= */}
        {/* GRAIN */}
        {/* ========================= */}

        <div
          className="
            absolute
            inset-0
            opacity-[0.03]
            mix-blend-screen
          "
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.5px)',
            backgroundSize: '6px 6px',
          }}
        />

        {/* ========================= */}
        {/* CENTER LIGHT */}
        {/* ========================= */}

        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,255,255,0.18), transparent 65%)',
          }}
        />
      </div>
    </div>
  );
}