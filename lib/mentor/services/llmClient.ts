/**
 * LLM Client Service — API Config, Key Rotation, and LLM Calls
 *
 * Responsible for:
 *  1. Resolving which API provider/key to use (user BYOK → server pool)
 *  2. Delegating actual LLM calls to the generic client in lib/clients/llmClient.ts
 *  3. Parsing the assistant content from OpenAI-compatible responses
 *
 * This module is pure infrastructure — no business logic.
 */

import { getKeyFromPool } from "@/lib/api-key-pool";
import { callLlm, type CallLlmParams, type LlmResult } from "@/lib/clients/llmClient";

// ───────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────────

/**
 * Fully resolved API configuration for making an LLM call.
 */
export type ApiConfig = {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  provider: "groq" | "openrouter" | "openai" | "google" | "ollama";
  isServerKey: boolean;
};

type UserAiSettings = {
  apiProvider?: string | null;
  groqApiKey?: string | null;
  openaiApiKey?: string | null;
  googleApiKey?: string | null;
  openrouterApiKey?: string | null;
  ollamaBaseUrl?: string | null;
  ollamaModel?: string | null;
  preferredFreeModel?: string | null;
};

/**
 * A single message in an LLM chat conversation.
 */
export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// API CONFIG RESOLUTION
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Resolve API config. Priority: user BYOK key → server key pool.
 */
export async function resolveApiConfig(
  userAiSettings: UserAiSettings | null,
): Promise<ApiConfig> {
  const provider = userAiSettings?.apiProvider || "server";

  // ── USER'S KEY (BYOK) — always takes priority ──
  if (provider === "openrouter" && userAiSettings?.openrouterApiKey) {
    return {
      apiKey: userAiSettings.openrouterApiKey!,
      apiBaseUrl: "https://openrouter.ai/api/v1",
      model: userAiSettings.preferredFreeModel || "deepseek/deepseek-chat-v3-0324:free",
      provider: "openrouter",
      isServerKey: false,
    };
  }
  if (provider === "groq" && userAiSettings?.groqApiKey) {
    return {
      apiKey: userAiSettings.groqApiKey!,
      apiBaseUrl: "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      provider: "groq",
      isServerKey: false,
    };
  }
  if (provider === "openai" && userAiSettings?.openaiApiKey) {
    return {
      apiKey: userAiSettings.openaiApiKey!,
      apiBaseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini",
      provider: "openai",
      isServerKey: false,
    };
  }
  if (provider === "google" && userAiSettings?.googleApiKey) {
    return {
      apiKey: userAiSettings.googleApiKey!,
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "gemini-1.5-flash",
      provider: "google",
      isServerKey: false,
    };
  }
  if (
    provider === "ollama" &&
    userAiSettings?.ollamaBaseUrl &&
    userAiSettings?.ollamaModel
  ) {
    return {
      apiKey: "ollama",
      apiBaseUrl: userAiSettings.ollamaBaseUrl!.replace(/\/+$/, "") + "/v1",
      model: userAiSettings.ollamaModel!,
      provider: "ollama",
      isServerKey: false,
    };
  }

  // ── SERVER KEY POOL ──
  const serverConfig = resolveServerPool();
  if (serverConfig) return serverConfig;

  // ── LAST RESORT — legacy single env vars ──
  const legacyOpenRouter = process.env.OPENROUTER || process.env.OPENROUTER_API_KEY;
  if (legacyOpenRouter) {
    return {
      apiKey: legacyOpenRouter,
      apiBaseUrl: "https://openrouter.ai/api/v1",
      model: "deepseek/deepseek-chat-v3-0324:free",
      provider: "openrouter",
      isServerKey: true,
    };
  }

  const legacyGroq = process.env.GROQ_API_KEY;
  if (legacyGroq) {
    return {
      apiKey: legacyGroq,
      apiBaseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      provider: "groq",
      isServerKey: true,
    };
  }

  throw new Error(
    "No AI provider available. Configure GROQ_API_KEY_1-N or OPENROUTER_API_KEY_1-N.",
  );
}

/**
 * Pick a key from the Groq or OpenRouter server pool.
 */
function resolveServerPool(): ApiConfig | null {
  const hasGroqKeys =
    !!process.env.GROQ_API_KEY || !!process.env.GROQ_API_KEY_1;
  const hasOrKeys =
    !!process.env.OPENROUTER ||
    !!process.env.OPENROUTER_API_KEY ||
    !!process.env.OPENROUTER_API_KEY_1;

  if (hasGroqKeys) {
    const key = getKeyFromPool("groq");
    if (!key) return null;
    return {
      apiKey: key,
      apiBaseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      provider: "groq",
      isServerKey: true,
    };
  }

  if (hasOrKeys) {
    const key = getKeyFromPool("openrouter");
    if (!key) return null;
    return {
      apiKey: key,
      apiBaseUrl: "https://openrouter.ai/api/v1",
      model: "deepseek/deepseek-chat-v3-0324:free",
      provider: "openrouter",
      isServerKey: true,
    };
  }

  return null;
}

// ───────────────────────────────────────────────────────────────────────────────
// LLM CALL — delegates to the generic client
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Make the LLM call and return the assistant's text content.
 * Delegates to lib/clients/llmClient which handles retry, backoff,
 * response parsing, and error classification.
 */
export async function callLlmAndExtract(params: {
  messages: LlmMessage[];
  temperature: number;
  maxTokens: number;
  apiConfig: ApiConfig;
}): Promise<string> {
  const { messages, temperature, maxTokens, apiConfig } = params;

  const callParams: CallLlmParams = {
    apiBaseUrl: apiConfig.apiBaseUrl,
    apiKey: apiConfig.apiKey,
    provider: apiConfig.provider,
    model: apiConfig.model,
    messages,
    temperature,
    maxTokens,
    // Only report to key pool if using server-managed keys
    serverKeyProvider: apiConfig.isServerKey
      ? (apiConfig.provider === "groq" ? "groq" : apiConfig.provider === "openrouter" ? "openrouter" : null)
      : null,
  };

  const result: LlmResult = await callLlm(callParams);
  return result.content;
}
