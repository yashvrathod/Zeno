'use client';

import { forwardRef } from 'react';

export const CodeShowcaseSection = forwardRef<HTMLDivElement>((_, sectionRef) => {
  return (
    <section
      ref={sectionRef}
      className="relative w-full py-32 sm:py-48 overflow-hidden bg-[#020604]"
    >
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-800/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            DSA Intelligence
          </div>
          <h2 className="text-5xl sm:text-7xl font-bold text-white tracking-[-0.04em] mb-8 leading-[1]">
            Engineered for <br />
            <span className="text-emerald-400/30 italic font-serif">Mastery.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
          {/* Main Large Card */}
          <div className="md:col-span-2 md:row-span-2 premium-border rounded-3xl overflow-hidden bg-emerald-950/5 backdrop-blur-md group border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex flex-col h-full">
              <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/10" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/5" />
                </div>
                <div className="text-[10px] text-emerald-500/20 font-mono uppercase tracking-widest">AI Code Analysis</div>
              </div>
              <div className="p-8 font-mono text-sm sm:text-lg flex-1 overflow-hidden">
                <div className="space-y-2">
                  <div className="flex gap-6"><span className="text-emerald-500/10 w-8">01</span><span className="text-emerald-400">class</span> <span className="text-white">Optimizer</span> {'{'}</div>
                  <div className="flex gap-6"><span className="text-emerald-500/10 w-8">02</span>  <span className="text-emerald-400">async</span> <span className="text-emerald-200">process</span>(stream) {'{'}</div>
                  <div className="flex gap-6"><span className="text-emerald-500/10 w-8">03</span>    <span className="text-emerald-400/40">return</span> stream.<span className="text-emerald-200">pipe</span>({'{'}</div>
                  <div className="flex gap-6 py-3 bg-emerald-500/5 border-l-2 border-emerald-500/50 -mx-8 px-14">
                    <span className="text-emerald-500/30 w-8">04</span>
                    <span className="text-emerald-400">strategy: <span className="text-white">&apos;aggressive-cache&apos;</span></span>
                  </div>
                  <div className="flex gap-6"><span className="text-emerald-500/10 w-8">05</span>    {'}'});</div>
                  <div className="flex gap-6"><span className="text-emerald-500/10 w-8">06</span>  {'}'}</div>
                  <div className="flex gap-6"><span className="text-emerald-500/10 w-8">07</span>{'}'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Card 1 */}
          <div className="premium-border rounded-3xl p-8 bg-emerald-950/5 backdrop-blur-md flex flex-col justify-between group border border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Algorithm Mastery</h3>
              <p className="text-white/40 text-sm leading-relaxed">Master every DSA pattern with AI-guided reasoning and real-time feedback.</p>
            </div>
          </div>

          {/* Side Card 2 */}
          <div className="premium-border rounded-3xl p-8 bg-emerald-950/5 backdrop-blur-md flex flex-col justify-between group border border-white/5">
             <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Pattern Recognition</h3>
              <p className="text-white/40 text-sm leading-relaxed">AI detects patterns across arrays, graphs, trees, and DP in real time.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

CodeShowcaseSection.displayName = 'CodeShowcaseSection';
