/**
 * OpenRouter Free Models Configuration
 * These models are 100% free to use with unlimited requests
 * Perfect for unlimited usage without any cost concerns
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
  "nvidia/nemotron-3-nano-30b-a3b:free": {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "NVIDIA Nemotron 3 Nano 30B (Free)",
    description: "Excellent for coding and technical explanations - RECOMMENDED",
    contextLength: 256000,
    speed: "fast",
    quality: "excellent",
    bestFor: "All coding problems - best all-around free model",
  },
  "stepfun/step-3.5-flash:free": {
    id: "stepfun/step-3.5-flash:free",
    name: "StepFun Step 3.5 Flash (Free)",
    description: "Fast and capable general-purpose model",
    contextLength: 256000,
    speed: "fast",
    quality: "excellent",
    bestFor: "Quick responses with good quality",
  },
  "upstage/solar-pro-3:free": {
    id: "upstage/solar-pro-3:free",
    name: "Upstage Solar Pro 3 (Free)",
    description: "High-quality responses for complex queries",
    contextLength: 128000,
    speed: "medium",
    quality: "excellent",
    bestFor: "Detailed explanations and problem-solving",
  },
  "arcee-ai/trinity-large-preview:free": {
    id: "arcee-ai/trinity-large-preview:free",
    name: "Arcee AI Trinity Large (Free)",
    description: "Large context window for long conversations",
    contextLength: 131000,
    speed: "medium",
    quality: "good",
    bestFor: "Extended coding sessions",
  },
  "nvidia/nemotron-nano-12b-v2-vl:free": {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "NVIDIA Nemotron Nano 12B VL (Free)",
    description: "Smaller but efficient model",
    contextLength: 128000,
    speed: "fast",
    quality: "good",
    bestFor: "Quick hints and brief explanations",
  },
};

// Default model - NVIDIA Nemotron for best quality and reliability
export const DEFAULT_FREE_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

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
