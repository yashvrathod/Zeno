/**
 * OpenRouter Free Models Configuration
 * Updated for maximum intelligence — DeepSeek V3 as primary, Gemini Flash as backup.
 * All models are 100% free (:free suffix = zero cost).
 */

export type FreeModelConfig = {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  speed: "fast" | "medium" | "slow";
  quality: "excellent" | "good" | "decent";
  bestFor: string;
};

export const FREE_MODELS: Record<string, FreeModelConfig> = {
  "deepseek/deepseek-chat-v3-0324:free": {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek Chat V3 (Free)",
    description: "Top-tier reasoning for coding, math, and DSA — RECOMMENDED DEFAULT",
    contextLength: 131072,
    speed: "medium",
    quality: "excellent",
    bestFor: "Complex DSA problem-solving and detailed explanations",
  },
  "google/gemini-2.0-flash-exp:free": {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Google Gemini 2.0 Flash (Free)",
    description: "Fast, capable model — great backup for when DeepSeek is rate-limited",
    contextLength: 1048576,
    speed: "fast",
    quality: "excellent",
    bestFor: "Quick responses, fallback when DeepSeek busy",
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Meta Llama 3.3 70B (Free)",
    description: "Strong general-purpose model with large parameter count",
    contextLength: 131072,
    speed: "fast",
    quality: "excellent",
    bestFor: "General mentoring and pattern recognition",
  },
  "nvidia/nemotron-3-nano-30b-a3b:free": {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "NVIDIA Nemotron 3 Nano 30B (Free)",
    description: "Lightweight but capable model for faster responses",
    contextLength: 256000,
    speed: "fast",
    quality: "good",
    bestFor: "Quick hints and brief responses",
  },
  "qwen/qwen3.5:free": {
    id: "qwen/qwen3.5:free",
    name: "Qwen 3.5 (Free)",
    description: "Strong coding model, especially good at algorithmic problems",
    contextLength: 131072,
    speed: "medium",
    quality: "excellent",
    bestFor: "Algorithmic problem-solving and code review",
  },
};

// Default model - DeepSeek V3 for best reasoning quality
export const DEFAULT_FREE_MODEL = "deepseek/deepseek-chat-v3-0324:free";

// Get model configuration by ID
export function getFreeModelConfig(modelId: string): FreeModelConfig {
  return FREE_MODELS[modelId] || FREE_MODELS[DEFAULT_FREE_MODEL];
}

// Get all free models as array for dropdown
export function getAllFreeModels(): FreeModelConfig[] {
  return Object.values(FREE_MODELS);
}

// Check if a model is free
export function isFreeModel(modelId: string): boolean {
  return modelId in FREE_MODELS;
}
