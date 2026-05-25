'use client';

export default function HologramCard() {
  return (
    <div
      className="
        relative w-full h-full
        rounded-[22px] border border-white/40
        bg-black/25
        backdrop-blur-[12px]
        shadow-[0_0_50px_rgba(255,255,255,0.1),0_0_0_1px_rgba(255,255,255,0.08)]
        overflow-hidden
      "
    >
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        <div className="absolute -top-20 right-[-10%] w-[200px] h-[200px] rounded-full bg-cyan-400/15 blur-[100px]" />
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(0,150,255,0.06) 100%)',
      }} />

      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }} />

      {/* <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-300/80 shadow-[0_0_6px_rgba(147,197,253,0.6)]" />
          <span className="text-white/80 text-[9px] sm:text-[11px] font-mono tracking-wide">
            Hologram Interface
          </span>
        </div>
        <span className="text-white/30 text-[8px] sm:text-[9px] font-mono">● LIVE</span>
      </div> */}

      {/* <div className="px-3 sm:px-4 py-3 space-y-2 font-mono text-[8px] sm:text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-blue-300/60 w-14 shrink-0">STATUS</span>
          <span className="text-white/70">active</span>
          <span className="text-green-400/60 ml-auto">● 98.7%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-300/60 w-14 shrink-0">SIGNAL</span>
          <div className="flex items-center gap-0.5">
            {[0.6, 0.8, 0.7, 0.9, 0.5, 0.85, 0.75, 0.95].map((h, i) => (
              <div key={i} className="w-[3px] bg-blue-300/60 rounded-full" style={{ height: `${h * 12}px` }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-300/60 w-14 shrink-0">NODES</span>
          <span className="text-white/50">12 connected</span>
        </div>
      </div> */}

      <div className="absolute bottom-2 right-3 text-[7px] font-mono text-white/20">
        ◇ holographic v2.1
      </div>

      <div
        className="absolute inset-0 pointer-events-none rounded-xl"
        style={{ boxShadow: 'inset 0 0 30px rgba(100,180,255,0.06)' }}
      />
    </div>
  );
}
