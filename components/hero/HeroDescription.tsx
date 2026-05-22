'use client';

import ScrollReveal from './ScrollReveal';

export default function HeroDescription() {
  return (
    <ScrollReveal delay={0.4} direction="up">
      <p className="text-base sm:text-lg text-zinc-500 leading-loose tracking-wide max-w-md">
        Stop struggling with algorithms alone.<br />
        Get step-by-step guidance, visual debugging,<br />
        and personalized AI mentorship.
      </p>
    </ScrollReveal>
  );
}
