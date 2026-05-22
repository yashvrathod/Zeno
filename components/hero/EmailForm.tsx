'use client';

import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import ScrollReveal from './ScrollReveal';

export default function EmailForm() {
  const [email, setEmail] = useState('');

  return (
    <ScrollReveal delay={0.5} direction="up">
      <div className="mt-8 backdrop-blur-xl bg-white/60 border border-white/50 rounded-full p-1.5 shadow-lg shadow-purple-500/5 flex items-center">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 sm:px-5 py-3 sm:py-4 bg-transparent rounded-full text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none border-0"
        />
        <button className="bg-zinc-900 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors whitespace-nowrap flex items-center gap-2 shadow-lg">
          Start Free
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </ScrollReveal>
  );
}
