'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const items = [
  { name: 'Built for AI', brand: 'Next-Gen Infrastructure', image: '/scale/image.png' },
  { name: 'Scale Smart', brand: 'Intelligent Automation', image: '/scale/firstpage.png' },
  { name: 'Zero Latency', brand: 'Real-Time Inference', image: '/scale/afterscrollign.png' },
  { name: 'Trust Layer', brand: 'Enterprise Security', image: '/scale/image.png' },
  { name: 'Data Fusion', brand: 'Multi-Modal Pipeline', image: '/scale/firstpage.png' },
  { name: 'Elegant DX', brand: 'Developer Experience', image: '/scale/afterscrollign.png' },
  { name: 'Model Mesh', brand: 'Distributed Compute', image: '/scale/image.png' },
  { name: 'Auto Pilot', brand: 'Self-Healing Ops', image: '/scale/firstpage.png' },
  { name: 'Insight Engine', brand: 'Analytics & Observability', image: '/scale/afterscrollign.png' },
  { name: 'Edge Ready', brand: 'Global Deployments', image: '/scale/image.png' },
];

export default function DualWaveSection({ progressRef }: { progressRef?: { current: number } }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const leftCol = leftRef.current;
    const rightCol = rightRef.current;
    const img = imgRef.current;
    if (!wrapper || !leftCol || !rightCol || !img) return;

    const leftTexts = gsap.utils.toArray<HTMLElement>(leftCol.querySelectorAll('.wave-text'));
    const rightTexts = gsap.utils.toArray<HTMLElement>(rightCol.querySelectorAll('.wave-text'));
    if (!leftTexts.length || !rightTexts.length) return;

    const leftSetters = leftTexts.map(t => gsap.quickTo(t, 'x', { duration: 0.6, ease: 'power4.out' }));
    const rightSetters = rightTexts.map(t => gsap.quickTo(t, 'x', { duration: 0.6, ease: 'power4.out' }));

    let currentImage = '';
    let leftRange = { minX: 0, maxX: 0 };
    let rightRange = { minX: 0, maxX: 0 };

    function calcRanges() {
      const maxLeftW = Math.max(...leftTexts.map(t => t.offsetWidth));
      const maxRightW = Math.max(...rightTexts.map(t => t.offsetWidth));
      leftRange = { minX: 0, maxX: Math.max(0, leftCol!.offsetWidth - maxLeftW) };
      rightRange = { minX: 0, maxX: Math.max(0, rightCol!.offsetWidth - maxRightW) };
    }
    calcRanges();

    function setInitPos(texts: HTMLElement[], range: { minX: number; maxX: number }, mult: number) {
      const size = range.maxX - range.minX;
      texts.forEach((t, i) => {
        const phase = 2 * Math.PI * (i / items.length) - Math.PI / 2;
        const prog = (Math.sin(phase) + 1) / 2;
        gsap.set(t, { x: (range.minX + prog * size) * mult });
      });
    }
    setInitPos(leftTexts, leftRange, 1);
    setInitPos(rightTexts, rightRange, -1);

    function findClosest() {
      const vpCenter = window.innerHeight / 2;
      let closest = 0, minDist = Infinity;
      leftTexts.forEach((t, i) => {
        const r = t.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - vpCenter);
        if (d < minDist) { minDist = d; closest = i; }
      });
      return closest;
    }

    function wavePos(index: number, progress: number, minX: number, rangeSize: number) {
      const phase = 2 * Math.PI * (index / items.length) + progress * 2 * Math.PI - Math.PI / 2;
      const prog = (Math.sin(phase) + 1) / 2;
      return minX + prog * rangeSize;
    }

    function updCol(texts: HTMLElement[], setters: Function[], range: { minX: number; maxX: number }, progress: number, focused: number, mult: number) {
      const size = range.maxX - range.minX;
      texts.forEach((t, i) => {
        const x = wavePos(i, progress, range.minX, size) * mult;
        setters[i](x);
        t.classList.toggle('focused', i === focused);
      });
    }

    let rafId: number;
    function tick() {
      const p = progressRef?.current ?? 0;
      const closest = findClosest();
      updCol(leftTexts, leftSetters, leftRange, p, closest, 1);
      updCol(rightTexts, rightSetters, rightRange, p, closest, -1);

      const focusedEl = leftTexts[closest];
      if (focusedEl) {
        const idx = leftTexts.indexOf(focusedEl);
        const src = leftTexts[idx]?.dataset.image || rightTexts[idx]?.dataset.image;
        if (src && src !== currentImage) {
          currentImage = src;
          img.src = src;
        }
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    const onResize = () => calcRanges();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0 flex z-20"
      style={{ gap: '25vw' }}
    >
      <div
        ref={leftRef}
        className="wave-column-left flex flex-1 flex-col justify-center gap-5 z-10"
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="wave-text block w-max uppercase text-[#7c6e59] font-light transition-colors duration-300 will-change-transform"
            data-image={item.image}
            style={{ fontSize: 'clamp(1.2rem, 4vw, 2.4rem)', lineHeight: 0.9 }}
          >
            {item.name}
          </span>
        ))}
      </div>

      <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[15vw] max-sm:w-[40vw] h-full z-[1] pointer-events-none grid place-items-center">
        <img
          ref={imgRef}
          className="wave-thumbnail w-auto h-auto max-w-full max-h-[30vh]"
          alt=""
        />
      </div>

      <div
        ref={rightRef}
        className="wave-column-right flex flex-1 flex-col justify-center gap-5 z-10 items-end"
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="wave-text block w-max uppercase text-[#7c6e59] font-light transition-colors duration-300 will-change-transform"
            style={{ fontSize: 'clamp(1.2rem, 4vw, 2.4rem)', lineHeight: 0.9 }}
          >
            {item.brand}
          </span>
        ))}
      </div>

      <style>{`
        .wave-text.focused {
          color: #4f4334;
          font-weight: 500;
        }
        .wave-column-left {
          align-items: flex-start;
          padding-left: clamp(1rem, 5vw, 4rem);
        }
        .wave-column-right {
          align-items: flex-end;
          padding-right: clamp(1rem, 5vw, 4rem);
        }
      `}</style>
    </div>
  );
}
