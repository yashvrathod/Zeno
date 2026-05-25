export default function TechOverlay() {
  return (
    <div
      className="
        absolute inset-0 w-full h-full pointer-events-none
        rounded-xl border border-white/20
        bg-black/30
        backdrop-blur-[6px]
        shadow-[0_0_40px_rgba(255,255,255,0.06),0_0_0_1px_rgba(255,255,255,0.04)]
        overflow-hidden
      "
    >
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }} />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 720 405"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.5, mixBlendMode: "screen" }}
      >
      <path d="M200 180 Q280 120 360 160 Q440 200 520 150 Q580 120 640 160" stroke="white" strokeWidth="0.8" opacity="0.6" />
      <path d="M160 220 Q260 150 360 200 Q460 250 560 190 Q620 160 680 200" stroke="white" strokeWidth="0.8" opacity="0.5" />
      <path d="M180 260 Q280 200 380 240 Q480 280 580 220" stroke="white" strokeWidth="0.7" opacity="0.4" />
      <path d="M220 300 Q320 250 420 280 Q500 300 560 265" stroke="white" strokeWidth="0.6" opacity="0.35" />

      <path d="M300 100 Q340 80 380 100 Q430 125 440 160 Q455 200 430 240 Q400 275 360 270 Q310 265 285 235 Q260 205 265 165 Q270 125 300 100 Z"
        stroke="white" strokeWidth="1" fill="none" opacity="0.5" strokeDasharray="4 3" />
      <path d="M260 90 Q330 60 410 85 Q470 110 490 165 Q510 220 480 270 Q445 315 380 320 Q305 320 265 275 Q230 235 230 175 Q230 115 260 90 Z"
        stroke="white" strokeWidth="0.7" fill="none" opacity="0.28" />

      <line x1="240" y1="80" x2="500" y2="80" stroke="white" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.4" />
      <line x1="240" y1="330" x2="500" y2="330" stroke="white" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.4" />
      <line x1="240" y1="80" x2="240" y2="330" stroke="white" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.4" />
      <line x1="500" y1="80" x2="500" y2="330" stroke="white" strokeWidth="0.6" strokeDasharray="3 5" opacity="0.4" />

      <path d="M250 90 L240 90 L240 100" stroke="white" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M490 90 L500 90 L500 100" stroke="white" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M250 320 L240 320 L240 310" stroke="white" strokeWidth="1.2" fill="none" opacity="0.7" />
      <path d="M490 320 L500 320 L500 310" stroke="white" strokeWidth="1.2" fill="none" opacity="0.7" />

      <circle cx="370" cy="160" r="2" fill="white" opacity="0.5" />
      <line x1="364" y1="160" x2="376" y2="160" stroke="white" strokeWidth="0.8" opacity="0.5" />
      <line x1="370" y1="154" x2="370" y2="166" stroke="white" strokeWidth="0.8" opacity="0.5" />

      {[[190,200],[210,300],[560,130],[640,320],[100,150],[670,250],[580,370],[130,360]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="1.5" fill="white" opacity="0.3" />
      ))}

      <line x1="100" y1="200" x2="240" y2="200" stroke="white" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.3" />
      <line x1="500" y1="200" x2="650" y2="200" stroke="white" strokeWidth="0.6" strokeDasharray="2 6" opacity="0.3" />
      <path d="M110 197 L100 200 L110 203" stroke="white" strokeWidth="0.8" fill="none" opacity="0.35" />
      <path d="M640 197 L650 200 L640 203" stroke="white" strokeWidth="0.8" fill="none" opacity="0.35" />

      <text x="245" y="77" fill="white" fontSize="7" fontFamily="monospace" opacity="0.45">[0.94]</text>
      <text x="505" y="77" fill="white" fontSize="7" fontFamily="monospace" opacity="0.45">‹ 1.00 ›</text>
      <text x="505" y="340" fill="white" fontSize="7" fontFamily="monospace" opacity="0.45">△ 0.87</text>

      {[0,1,2,3].map(i => (
        <line key={i} x1={660+i*6} y1="170" x2={660+i*6} y2="175" stroke="white" strokeWidth="0.8" opacity="0.4" />
      ))}
    </svg>
    </div>
  );
}
