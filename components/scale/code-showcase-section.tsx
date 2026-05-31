'use client';

import { forwardRef } from 'react';

export const CodeShowcaseSection = forwardRef<HTMLDivElement>((_, sectionRef) => {
  return (
    <section
      ref={sectionRef}
      className="relative w-full py-32 sm:py-48 overflow-hidden"
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

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium uppercase tracking-widest mb-6">
              <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
              Advanced Analysis
            </div>
            <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-8 leading-[1.1]">
              Code Intelligence <br />
              <span className="text-white/40 italic font-serif">Redefined.</span>
            </h2>
            <p className="text-white/50 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0 font-light">
              Our AI doesn&apos;t just find bugs; it understands intent. Get real-time feedback on complexity, 
              edge cases, and architectural patterns.
            </p>

            <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0b0e14] bg-zinc-800 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="" />
                  </div>
                ))}
              </div>
              <p className="text-white/40 text-sm">
                Joined by <span className="text-white font-medium">2,000+</span> engineers this week
              </p>
            </div>
          </div>

          <div className="flex-1 w-full lg:w-auto">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl opacity-30" />
              <div className="relative rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-1 overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
                  </div>
                  <div className="ml-4 text-[10px] text-white/30 font-mono tracking-wider uppercase">
                    analysis.ts — 42KB
                  </div>
                </div>
                <div className="p-6 font-mono text-sm sm:text-base">
                  <div className="flex gap-4">
                    <div className="text-white/20 select-none text-right w-8">1</div>
                    <div className="text-blue-400">async <span className="text-purple-400">function</span> <span className="text-emerald-400">analyzePattern</span>(code) {'{'}</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-white/20 select-none text-right w-8">2</div>
                    <div className="pl-4 text-white/80">  <span className="text-purple-400">const</span> results = <span className="text-purple-400">await</span> ai.process(code);</div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="text-white/20 select-none text-right w-8">3</div>
                    <div className="pl-4 p-2 bg-emerald-500/10 border-l-2 border-emerald-500/50 w-full rounded-r">
                      <div className="text-emerald-400 text-xs mb-1 font-bold">// AI SUGGESTION</div>
                      <div className="text-emerald-300/80 italic">Optimizing for O(N) complexity using a hash map...</div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="text-white/20 select-none text-right w-8">4</div>
                    <div className="pl-4 text-white/80">  <span className="text-purple-400">return</span> results.map(r ={'>'} r.optimize());</div>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-white/20 select-none text-right w-8">5</div>
                    <div className="text-blue-400">{'}'}</div>
                  </div>
                </div>
              </div>

              {/* Floating element */}
              <div className="absolute -right-8 -bottom-8 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-xl hidden sm:block animate-bounce-slow">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Complexity</div>
                    <div className="text-sm text-white font-medium">Optimal O(N)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
