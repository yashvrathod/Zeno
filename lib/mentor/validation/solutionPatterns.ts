export const SOLUTION_REQUEST_PHRASES = [
  "give me the solution",
  "give me solution",
  "what is the answer",
  "what's the answer",
  "just tell me the code",
  "show me the full solution",
  "write the code for me",
  "code this for me",
  "show me how to solve",
  "show me the answer",
  "tell me the answer",
  "i need the answer",
  "solve this for me",
  "do this for me",
  "complete the code",
  "finish the code",
  "fill in the blanks",
  "write the full code",
  "give me the full code",
  "paste the solution",
  "drop the solution",
  "show the complete",
  "show me complete",
  "show me the code",
  "show me how to code",
  "show me the full",
  "show me a working",
  "show full code",
  "just write it",
  "just code it",
  "write a solution",
  "give me code",
  "can you code this",
  "code the solution",
  "write me the code",
  "full solution",
  "complete solution",
  "provide the solution",
  "whats the solution",
  "complete code",
  "final code",
  "exact implementation",
  "implement this for me",
  "implement it for me",
  "do it for me",
  "solve it for me",
];

const AGGRESSIVE_SOLUTION_PATTERNS = [
  /^(show|give|write|paste|drop)\s+me\s+(the\s+)?(code|solution|implementation)/i,
  /^(just|simply|please)\s+(write|code|implement|give)\s+.*?(for\s+me|me|this)/i,
  /^(i\s+)?need\s+(the\s+)?(full\s+)?(code|solution)/i,
  /^(complete|full|working)\s+(code|solution|implementation)/i,
];

const LEARNING_PHRASES = [
  "how do i solve this",
  "what code should i write",
  "how would you write",
  "how should i write",
  "what should i write",
];

export function isHardSolutionRequest(input: string): boolean {
  const lower = input.toLowerCase().trim();
  if (LEARNING_PHRASES.some(p => lower.startsWith(p))) return false;
  return SOLUTION_REQUEST_PHRASES.some(p => lower.includes(p)) ||
         AGGRESSIVE_SOLUTION_PATTERNS.some(p => p.test(input));
}

export function isSolutionRequest(userMessage: string): boolean {
  const msg = userMessage.toLowerCase().trim();
  if (LEARNING_PHRASES.some(p => msg.startsWith(p))) return false;
  return SOLUTION_REQUEST_PHRASES.some(p => msg.includes(p));
}

export function looksLikeFullSolution(text: string): boolean {
  const blocks = text.match(/```[\s\S]*?```/g) ?? [];
  const totalChars = blocks.reduce((s, b) => s + b.length, 0);
  if (totalChars > 600) return true;
  if (blocks.length >= 2) return true;

  const lower = text.toLowerCase();
  const solutionSignals = [
    "class solution",
    "public static void main",
    "def solve(",
    "if __name__",
    "here's the complete",
    "here is the complete",
    "full implementation",
    "complete implementation",
    "here's the full code",
    "here is the full code",
    "complete code",
    "the answer is",
  ];
  return solutionSignals.some(signal => lower.includes(signal));
}

export function countCodeLines(text: string): number {
  const blocks = text.match(/```[\s\S]*?```/g) ?? [];
  return blocks
    .join("\n")
    .split("\n")
    .filter(line => line.trim().length > 0).length;
}
