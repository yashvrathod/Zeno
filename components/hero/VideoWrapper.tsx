'use client';

const badges = ['Graphs', 'Trees', 'DP', 'Sorting', 'Heaps'];

export default function VideoWrapper({ videoRef }: { videoRef: React.Ref<HTMLDivElement> }) {
  return (
    <div
      ref={videoRef}
      className="relative w-full h-full overflow-hidden rounded-2xl sm:rounded-[32px] lg:rounded-[42px] will-change-transform"
      style={{
        transformStyle: 'preserve-3d',
        boxShadow: '0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)',
      }}
    >
      <video
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/video/bore.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white/80" />
          <span className="text-[10px] sm:text-xs font-medium tracking-widest uppercase text-white/50">
            DSA Visualizer
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          {badges.map((b) => (
            <span
              key={b}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide text-white/60 border border-white/15 bg-white/5 backdrop-blur-sm"
            >
              {b}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/40 font-mono tracking-wider hidden sm:inline">LIVE</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 py-3 sm:py-4 flex items-end justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          {[
            { label: 'Problems',   value: '200+' },
            { label: 'Visualized', value: '100%' },
            { label: 'Step Trace', value: 'Real-time' },
          ].map(({ label, value }) => (
            <div key={label} className="hidden sm:block">
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-0.5">{label}</div>
              <div className="text-sm sm:text-base font-semibold text-white/80 tabular-nums">{value}</div>
            </div>
          ))}
        </div>
        <div className="text-[9px] sm:text-[10px] font-mono text-white/20 tracking-widest">
          © 2025 DSAVisual
        </div>
      </div>
    </div>
  );
}
