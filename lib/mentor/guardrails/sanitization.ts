/**
 * Guardrails - Sanitization and Marker Parsing
 */

import { countCodeLines, looksLikeFullSolution } from "./validation";

export function sanitizeResponse(
  text: string,
  allowFullSolution: boolean,
): { text: string; wasViolation: boolean } {
  if (allowFullSolution) return { text, wasViolation: false };

  // Allow tiny illustrative snippets (≤3 non-empty lines, ≤180 chars inner)
  const sanitized = text.replace(/```[\s\S]*?```/g, (block) => {
    const inner = block.replace(/^```[^\n]*\n/, "").replace(/```\s*$/, "");
    const lines = inner.split("\n").filter((line) => line.trim().length > 0);
    if (lines.length <= 3 && inner.length <= 180) return block;
    return "```\n[snippet hidden — let's reason through this together first]\n```";
  });

  const codeLineCount = countCodeLines(sanitized);
  const stillLooksLikeSolution = looksLikeFullSolution(sanitized);

  if (codeLineCount > 5 || stillLooksLikeSolution) {
    // Replace oversized blocks with a placeholder
    const heavilySanitized = sanitized.replace(
      /```[\s\S]*?```/g,
      "[full solution hidden — let me guide you instead]",
    );
    return { text: heavilySanitized, wasViolation: true };
  }

  return { text: sanitized, wasViolation: false };
}

const ANIM_MARKER = "{{ANIMATION}}";

export function parseAnimationMarker(text: string): { text: string; wantsAnimation: boolean } {
  const idx = text.indexOf(ANIM_MARKER);
  if (idx === -1) return { text, wantsAnimation: false };
  return { text: text.replace(ANIM_MARKER, "").trim(), wantsAnimation: true };
}

const MEM_MARKER = "\n---MENTOR_MEM---\n";

export function parseMentorMemory(text: string): { text: string; memoryJson: string | null } {
  let idx = text.lastIndexOf(MEM_MARKER);

  // Fallback 1: LLM sometimes wraps JSON in ```json blocks
  if (idx === -1) {
    const jsonCodeBlock = text.match(/```\s*json\s*\n([\s\S]*?)```/);
    if (jsonCodeBlock) {
      const jsonContent = jsonCodeBlock[1].trim();
      try { JSON.parse(jsonContent); } catch { return { text, memoryJson: null }; }
      return { text: text.replace(jsonCodeBlock[0], "").trim(), memoryJson: jsonContent };
    }
  }

  // Fallback 2: try to find JSON object near the end
  if (idx === -1) {
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace !== -1) {
      const openBrace = text.lastIndexOf("{", lastBrace);
      if (openBrace !== -1 && lastBrace - openBrace > 10) {
        const jsonCandidate = text.slice(openBrace, lastBrace + 1);
        try { JSON.parse(jsonCandidate); } catch { return { text, memoryJson: null }; }
        const parsed = jsonCandidate as string;
        const hasKeys = ["s", "stage", "w", "d"].some((k) => parsed.includes(k));
        if (hasKeys) {
          return { text: text.slice(0, openBrace).trim(), memoryJson: jsonCandidate };
        }
      }
    }
  }

  if (idx === -1) return { text, memoryJson: null };
  const memoryBlock = text.slice(idx + MEM_MARKER.length).trim();
  return { text: text.slice(0, idx), memoryJson: memoryBlock };
}

const ANIMATION_TRIGGER_PHRASES = [
  "how does this work",
  "how does it work",
  "how it works",
  "visualize",
  "show me how",
  "show me visual",
  "brute force",
  "bruteforce",
  "time complexity",
  "space complexity",
  "why is this slow",
  "why is this o(",
  "tc is high",
  "step by step",
  "step-by-step",
  "explain it",
  "explain this",
  "how it internally",
  "how internally",
  "how things work",
  "i can't write code",
  "i cant write",
  "help me write",
  "explain time complexity",
  "explain space complexity",
  "explain the algorithm",
  "walk me through",
];

export function shouldTriggerAnimation(userMessage: string): boolean {
  const msg = userMessage.toLowerCase().trim();
  return ANIMATION_TRIGGER_PHRASES.some((phrase) => msg.includes(phrase));
}
