'use client';

import { useEffect, useRef } from 'react';

interface Dot {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  initialOpacity: number;
  phase: number;
}

export function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let dots: Dot[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initDots() {
      if (!canvas) return;
      dots = Array.from({ length: 20 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 2 + Math.random() * 2,
        speedX: (Math.random() - 0.5) * 0.15,
        speedY: (Math.random() - 0.5) * 0.15,
        initialOpacity: 0.15 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = performance.now();

      dots.forEach((dot) => {
        dot.x += dot.speedX;
        dot.y += dot.speedY;

        if (dot.x < 0) dot.x = canvas.width;
        if (dot.x > canvas.width) dot.x = 0;
        if (dot.y < 0) dot.y = canvas.height;
        if (dot.y > canvas.height) dot.y = 0;

        const pulse = 0.5 + 0.5 * Math.sin(now * 0.001 + dot.phase);
        const opacity = dot.initialOpacity * pulse;

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, ${opacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 168, 76, ${opacity * 0.15})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    initDots();
    draw();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
