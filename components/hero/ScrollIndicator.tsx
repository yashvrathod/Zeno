'use client';

export default function ScrollIndicator({ scrollPos }: { scrollPos: number }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 pointer-events-none"
      style={{ opacity: scrollPos > 200 ? 0 : 1, transition: 'opacity 0.4s' }}
    >
      <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-white/30">Scroll</span>
      <div className="w-px h-8 bg-gradient-to-b from-white/30 to-transparent" />
    </div>
  );
}
