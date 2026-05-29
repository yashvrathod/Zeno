'use client';

import { forwardRef } from 'react';

export const CodeShowcaseSection = forwardRef<HTMLDivElement>((_, sectionRef) => {
  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ background: 'linear-gradient(160deg, #080b0f 0%, #0b0e14 30%, #06080c 70%, #030407 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 70%)',
        }}
      />

      <div
        className="absolute -top-[15%] left-[5%] h-[80vw] w-[80vw] max-h-[500px] max-w-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(165,140,255,0.12) 0%, transparent 65%)',
          filter: 'blur(120px)',
        }}
      />
      <div
        className="absolute -bottom-[10%] right-[10%] h-[70vw] w-[70vw] max-h-[400px] max-w-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(120,190,255,0.08) 0%, transparent 65%)',
          filter: 'blur(120px)',
        }}
      />
      <div
        className="absolute top-[30%] right-[40%] h-[50vw] w-[50vw] max-h-[300px] max-w-[300px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(180,220,255,0.05) 0%, transparent 65%)',
          filter: 'blur(100px)',
        }}
      />

      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#080b0f] to-transparent pointer-events-none z-[1]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030407] to-transparent pointer-events-none z-[1]" />
    </section>
  );
});

CodeShowcaseSection.displayName = 'CodeShowcaseSection';
