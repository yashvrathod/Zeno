/**
 * Google Gemini rephrasing service.
 *
 * Used to rephrase cached mentor responses so users don't receive
 * identical text on repeated cache hits.
 *
 * Free tier: 1,500 requests/day — enough for caching scenario.
 *
 * Uses Google AI SDK (gemini-2.0-flash) via REST API.
 */

import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_REPHRASE_MODEL || "gemini-2.0-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const REPHRASE_SYSTEM_PROMPT = `You are a rephrasing engine for a DSA (data structures & algorithms) mentor chatbot.

Your job: take a mentor response and produce a semantically equivalent version that:
- SAYS THE SAME THING but uses different words / sentence structure
- Keeps all code snippets EXACTLY as-is (do NOT modify code blocks)
- Preserves the same tone, stage, and question
- Is natural and conversational, not robotic
- Returns ONLY the rephrased text, no preamble or explanation

Keep markdown formatting. Never add new information.`;

// ─────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────

export type RephraseDebug = {
  used: boolean;
  inputHash: string; // hash of original text for correlation
  originalLength: number;
  rephrasedLength: number;
  sent: string; // what was sent to Gemini
  received: string; // what Gemini returned
  error?: string;
};

// ─────────────────────────────────────────────────────────────────────────
// REPHRASE
// ─────────────────────────────────────────────────────────────────────────

/**
 * Rephrase a cached response using Gemini.
 * Falls back to the original text if Gemini is unavailable.
 */
export async function rephraseCachedResponse(
  cachedResponse: string,
  stage: string,
): Promise<{ text: string; debug: RephraseDebug }> {
  // Collect debug info
  const inputHash = crypto.createHash("md5").update(cachedResponse).digest("hex").slice(0, 12);
  const debug: RephraseDebug = {
    used: false,
    inputHash,
    originalLength: cachedResponse.length,
    rephrasedLength: cachedResponse.length,
    sent: "",
    received: "",
  };

  // If no Gemini key configured, skip rephrasing silently
  if (!GEMINI_API_KEY) {
    debug.error = "GEMINI_API_KEY not configured";
    return { text: cachedResponse, debug };
  }

  // Truncate very long responses (avoid token waste)
  const input = cachedResponse.length > 2000 ? cachedResponse.slice(0, 2000) + "\n\n[...truncated]" : cachedResponse;

  const prompt = `[Rephrasing task]
Stage: ${stage}
---
Rephrase the following mentor response using different words but keeping the same meaning, tone, and code:

${input}`;

  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: REPHRASE_SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      topP: 0.95,
    },
  };

  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Save what was sent
  debug.sent = prompt.slice(0, 500);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      debug.error = `Gemini API error ${response.status}: ${errText.slice(0, 200)}`;
      console.warn(`[GEMINI_REPHRASE] ${debug.error}`);
      return { text: cachedResponse, debug };
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      debug.error = "Gemini returned empty response";
      console.warn("[GEMINI_REPHRASE] Empty response from Gemini");
      return { text: cachedResponse, debug };
    }

    debug.used = true;
    debug.rephrasedLength = text.length;
    debug.received = text.slice(0, 500);

    return { text, debug };
  } catch (e) {
    debug.error = e instanceof Error ? e.message : String(e);
    console.warn(`[GEMINI_REPHRASE] Fetch error: ${debug.error}`);
    return { text: cachedResponse, debug };
  }
}
