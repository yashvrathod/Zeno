'use client';

interface HologramPanelProps {
  hologramRef: React.Ref<HTMLDivElement>;
  cubeRef: React.Ref<HTMLDivElement>;
  innerCubeRef: React.Ref<HTMLDivElement>;
}

export default function HologramPanel({ hologramRef, cubeRef, innerCubeRef }: HologramPanelProps) {
  return (
    <div
      ref={hologramRef}
      className="absolute inset-10 pointer-events-none flex items-start justify-center"
      style={{ opacity: 0, transformOrigin: 'bottom center' }}
    >
      <div
        className="rounded-2xl sm:rounded-[32px] lg:rounded-[42px] border border-white/60 bg-white/5 backdrop-blur-[2px]"
        style={{
          width:  'min(570px, calc(100vw - 80px))',
          height: 'clamp(200px, 25vw, 300px)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
          boxShadow: '0 0 80px rgba(255,255,255,0.3), 0 0 120px rgba(255,255,255,0.15), inset 0 0 60px rgba(255,255,255,0.1)',
        }}
      >
        <div
          className="absolute inset-0 rounded-[42px] overflow-hidden opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '100% 4px',
          }}
        />
        <div className="absolute inset-0 rounded-[42px] shadow-[inset_0_0_40px_rgba(255,255,255,0.15)]" />

        <div className="absolute inset-8 opacity-20">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/50" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-white/50" />
          <div className="absolute left-[25%] top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/20" />
          <div className="absolute top-[25%] left-0 right-0 h-px bg-white/20" />
          <div className="absolute top-[75%] left-0 right-0 h-px bg-white/20" />
        </div>

        <div className="absolute inset-0 text-[9px] font-mono text-white/40">
          <span className="absolute top-[15%] left-[12%]">0110</span>
          <span className="absolute top-[25%] right-[15%]">1001</span>
          <span className="absolute bottom-[20%] left-[18%]">1100</span>
          <span className="absolute top-[40%] right-[20%]">0101</span>
          <span className="absolute bottom-[35%] right-[12%]">1011</span>
        </div>

        <div
          ref={cubeRef}
          className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8"
          style={{ transformStyle: 'preserve-3d', width: 40, height: 40 }}
        >
          {[-1, 1].flatMap((z) => [
            <div key={`z${z}`} className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: `translateZ(${z * 20}px)` }} />,
          ])}
          <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(20px)' }} />
          <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(20px)' }} />
          <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(20px)' }} />
          <div className="absolute inset-0 border border-white/15 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(20px)' }} />
          <div className="absolute inset-0 border border-white/5 rounded-sm" style={{ background: 'rgba(255,255,255,0.03)' }} />
        </div>

        <div
          ref={innerCubeRef}
          className="absolute bottom-[44px] sm:bottom-[52px] right-[44px] sm:right-[52px]"
          style={{ transformStyle: 'preserve-3d', width: 20, height: 20 }}
        >
          {[-1, 1].flatMap((z) => [
            <div key={`iz${z}`} className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: `translateZ(${z * 10}px)` }} />,
          ])}
          <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(90deg) translateZ(10px)' }} />
          <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(90deg) translateZ(10px)' }} />
          <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateY(-90deg) translateZ(10px)' }} />
          <div className="absolute inset-0 border border-white/30 rounded-sm" style={{ transform: 'rotateX(-90deg) translateZ(10px)' }} />
        </div>
      </div>
    </div>
  );
}
