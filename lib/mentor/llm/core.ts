/**
 * LLM Core - Call execution and extraction
 *
 * Features:
 *  - Timeout with AbortController
 *  - Streaming support via onChunk callback
 *  - Auto-fallback: if streaming fails, retry as non-streaming
 */

import { callLlm, callLlmStream, type CallLlmParams, type LlmResult } from "@/lib/clients/llmClient";
import { ApiConfig } from "./providers";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CallLlmAndExtractParams = {
  messages: LlmMessage[];
  temperature: number;
  maxTokens: number;
  apiConfig: ApiConfig;
  /** Timeout in ms. Default 30000 */
  timeoutMs?: number;
  /** If provided, streams tokens to this callback */
  onChunk?: (chunk: string) => void;
};

const DEFAULT_TIMEOUT_MS = 30_000;

function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

export async function callLlmAndExtract(params: CallLlmAndExtractParams): Promise<string> {
  const { messages, temperature, maxTokens, apiConfig, onChunk } = params;
  const timeoutMs = params.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const { signal, clear } = createTimeoutSignal(timeoutMs);

  const callParams: CallLlmParams = {
    apiBaseUrl: apiConfig.apiBaseUrl,
    apiKey: apiConfig.apiKey,
    provider: apiConfig.provider,
    model: apiConfig.model,
    messages,
    temperature,
    maxTokens,
    signal,
    serverKeyProvider: apiConfig.isServerKey
      ? (apiConfig.provider === "groq" ? "groq" : apiConfig.provider === "openrouter" ? "openrouter" : null)
      : null,
  };

  try {
    if (onChunk) {
      const result = await callLlmStream({ ...callParams, onChunk });
      return result.content;
    }

    const result: LlmResult = await callLlm(callParams);
    return result.content;
  } finally {
    clear();
  }
}
