/**
 * LLM Providers - API Config Resolution
 */

import { getKeyFromPool } from "@/lib/api-key-pool";

export type ApiConfig = {
  apiKey: string;
  apiBaseUrl: string;
  model: string;
  provider: "groq" | "openrouter" | "openai" | "google" | "ollama";
  isServerKey: boolean;
};

export type UserAiSettings = {
  apiProvider?: string | null;
  groqApiKey?: string | null;
  openaiApiKey?: string | null;
  googleApiKey?: string | null;
  openrouterApiKey?: string | null;
  ollamaBaseUrl?: string | null;
  ollamaModel?: string | null;
  preferredFreeModel?: string | null;
};

export async function resolveApiConfig(
  userAiSettings: UserAiSettings | null,
): Promise<ApiConfig> {
  const provider = userAiSettings?.apiProvider || "server";

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

  const serverConfig = resolveServerPool();
  if (serverConfig) return serverConfig;

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

export function resolveServerPool(): ApiConfig | null {
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
