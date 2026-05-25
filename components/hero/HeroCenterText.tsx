'use client';

export default function HeroCenterText() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 px-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-4 h-px bg-white/30" />
          <span
            className="hero-text-word text-[10px] sm:text-xs font-medium tracking-[0.2em] uppercase text-white/40"
            style={{ opacity: 0 }}
          >
            Interactive Learning
          </span>
          <span className="w-4 h-px bg-white/30" />
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.1] tracking-tight">
          <span className="hero-text-word" style={{ opacity: 0 }}>Master</span>{' '}
          <span
            className="hero-text-word"
            style={{
              opacity: 0,
              background: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.55) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            DSA
          </span>{' '}
          <span className="hero-text-word" style={{ opacity: 0 }}>Visually</span>
        </h1>

        <p
          className="hero-text-desc mt-4 text-sm sm:text-base md:text-lg lg:text-xl text-white/55 max-w-xs sm:max-w-md mx-auto leading-relaxed"
          style={{ opacity: 0 }}
        >
          Interactive visualizations for data structures & algorithms
        </p>

        <div
          className="hero-text-desc mt-6 sm:mt-8 flex items-center justify-center gap-3 sm:gap-4"
          style={{ opacity: 0 }}
        >
          <button className="px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-black bg-white rounded-full hover:bg-white/90 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            Get started free
          </button>
          <button className="px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-medium text-white/80 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
            See demo →
          </button>
        </div>
      </div>
    </div>
  );
}
