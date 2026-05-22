'use client';

import { useEffect, useRef, useState } from 'react';

export default function CursorGradient() {
  const [renderPos, setRenderPos] = useState({ x: -500, y: -500 });

  const targetPos = useRef({ x: -500, y: -500 });
  const currentPos = useRef({ x: -500, y: -500 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetPos.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    const animate = () => {
      currentPos.current.x +=
        (targetPos.current.x - currentPos.current.x) * 0.07;

      currentPos.current.y +=
        (targetPos.current.y - currentPos.current.y) * 0.07;

      setRenderPos({
        x: currentPos.current.x,
        y: currentPos.current.y,
      });

      requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 overflow-hidden">
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: renderPos.x,
          top: renderPos.y,
          width: '1200px',
          height: '1200px',
          background: `
  radial-gradient(
    ellipse 140% 90% at 50% 50%,
    rgba(245, 220, 185, 0.60) 0%,
    rgba(230, 200, 160, 0.38) 28%,
    rgba(210, 175, 130, 0.20) 55%,
    rgba(170, 135, 100, 0.10) 72%,
    transparent 90%
  ),

  radial-gradient(
    ellipse 110% 65% at 50% 78%,
    rgba(128, 31, 218, 0.10) 0%,
    rgba(60, 9, 179, 0.05) 45%,
    transparent 85%
  )
`,
          filter: 'blur(160px)',
          // transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}