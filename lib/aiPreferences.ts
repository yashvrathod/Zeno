export type Verbosity = "short" | "normal" | "detailed";

export function inferVerbosityFromText(text: string): Verbosity | null {
  const lower = text.toLowerCase();

  // Short indicators
  const shortPhrases = [
    "briefly",
    "quick",
    "tldr",
    "short answer",
    "in brief",
    "concise",
    "summarize",
  ];
  if (shortPhrases.some((phrase) => lower.includes(phrase))) {
    return "short";
  }

  // Detailed indicators
  const detailedPhrases = [
    "in detail",
    "detailed",
    "explain thoroughly",
    "step by step",
    "walk me through",
    "comprehensive",
    "elaborate",
  ];
  if (detailedPhrases.some((phrase) => lower.includes(phrase))) {
    return "detailed";
  }

  return null;
}

export function verbosityToModelMaxTokens(verbosity: Verbosity): number {
  switch (verbosity) {
    case "short":
      return 400;
    case "detailed":
      return 1200;
    case "normal":
    default:
      return 700;
  }
}

export function verbosityToStylePrompt(verbosity: Verbosity): string {
  switch (verbosity) {
    case "short":
      return "Be concise and direct. 3-5 sentences maximum. Get to the point quickly. Use bullet points if needed.";
    case "detailed":
      return "Be thorough and comprehensive. Provide step-by-step explanations. Include examples and multiple checkpoints. Take your time to explain nuances.";
    case "normal":
    default:
      return "Be conversational and balanced. Not too brief, not too verbose. 2-3 short paragraphs typically.";
  }
}
