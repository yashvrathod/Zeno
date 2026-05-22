import { classifyIntent } from './lib/mentor/intent/core.ts';

const tests = [
  "What's wrong with my code?",
  "I'm getting an error",
  "Why isn't this working?",
  "Can you give me a hint?",
  "I'm stuck, need some guidance",
  "What should I focus on?",
  "I don't understand the constraints",
  "How should I approach this?",
  "What's the best way to solve this?",
  "Which algorithm should I use?",
  "Ayúdame con este problema",
  "Can u giv me a hnt?",
];

for (const t of tests) {
  const r = classifyIntent(t);
  console.log(`${r.intent.padEnd(20)} ${r.confidence.padEnd(8)} ${r.reason}  |  ${t}`);
}
