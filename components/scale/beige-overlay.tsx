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
        className="fixed inset-0 z-[200] pointer-events-none will-change-transform"
      >
        <div
          ref={beigePanelRef}
          className="w-full h-full bg-[#efe6d8] shadow-[0_-40px_120px_rgba(0,0,0,0.25)] relative overflow-hidden pointer-events-auto"
        >
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:22px_22px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center justify-center h-full w-full max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-[clamp(2.8rem,8vw,7rem)] font-semibold tracking-[-0.04em] leading-[0.9] text-[#4f4334] w-full">
              Built for the <br />
              next era of AI
            </h2>
            <p className="mt-6 text-[clamp(1.1rem,2vw,1.5rem)] text-[#7c6e59] font-light tracking-wide max-w-3xl">
              Scale AI Infrastructure
            </p>
            <div className="mt-12 flex justify-center">
              <div className="h-px w-32 bg-[#cdbba2]" />
            </div>
          </div>

          <DualWaveSection progressRef={progressRef} />
        </div>
      </div>
    );
  },
);

BeigeOverlay.displayName = 'BeigeOverlay';
