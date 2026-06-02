'use client';

import { forwardRef } from 'react';
import { DualWaveSection } from '@/components/scale';
import type { MutableRefObject } from 'react';

interface BeigeOverlayProps {
  beigePanelRef: React.RefObject<HTMLDivElement | null>;
  progressRef: MutableRefObject<number>;
}

export const BeigeOverlay = forwardRef<HTMLDivElement, BeigeOverlayProps>(
  ({ beigePanelRef, progressRef }, wrapRef) => {
    return (
      <div
        ref={wrapRef}
        className="fixed inset-0 z-[200] pointer-events-none overflow-hidden"
        style={{ clipPath: 'circle(100% at 50% 50%)' }}
      >
        <div
          ref={beigePanelRef}
          className="w-full h-full bg-[#efe6d8] relative overflow-hidden pointer-events-auto"
        >
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:22px_22px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-[clamp(2.8rem,8vw,7rem)] font-bold tracking-[-0.05em] leading-[0.9] text-[#4f4334] w-full">
              Master DSA with <br />
              <span className="text-[#4f4334]/30 italic font-serif">AI Guidance.</span>
            </h2>
            <p className="mt-8 text-[clamp(1.1rem,2vw,1.4rem)] text-[#7c6e59] font-medium tracking-tight max-w-2xl">
              Your personal AI mentor for data structures, algorithms, and interview success.
            </p>
            <div className="mt-12 flex justify-center">
              <div className="h-px w-32 bg-[#cdbba2]/50" />
            </div>
          </div>

          <DualWaveSection progressRef={progressRef} />
        </div>
      </div>
    );
  },
);

BeigeOverlay.displayName = 'BeigeOverlay';
