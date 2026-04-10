/**
 * LLM Client — Transport-Abstraction for AI API Calls
 *
 * Encapsulates:
 *  1. Error classification — determines if an error is retryable (429/5xx vs 4xx)
 *  2. Retry logic — exponential backoff with jitter + server-suggested Retry-After
 *  3. Response parsing — extracts assistant content, strips <think> blocks
 *  4. Provider-aware request building — auth header omission for Ollama
 *
 * Any module that needs to call an LLM API should use this instead of raw fetch().
 *
 * Usage:
 *   const { content } = await callLlm({
 *     apiBaseUrl: "https://api.groq.com/openai/v1",
 *     apiKey: "...",
 *     provider: "groq",
 *     messages,
 *     temperature: 0.6,
 *     maxTokens: 900,
 *   });
 */

import { reportKeyFailure } from "@/lib/api-key-pool";

// ──────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────

export type LlmProvider = "groq" | "openrouter" | "openai" | "google" | "ollama";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * Classification of LLM API error response codes.
 *
 * RETRYABLE: 429 (rate limit), 500-599 (server error)
 * NOT_RETRYABLE: 400-499 (client errors except 429)
 */
export type LlmErrorType = {
  retryable: boolean;
  statusCode: number;
  message: string;
  retryAfterMs: number | null; // Server-suggested wait time (from Retry-After header or response body)
};

/**
 * Result of a successful LLM call.
 */
export type LlmResult = {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

/**
 * Input for calling the LLM API.
 */
export type CallLlmParams = {
  /** Base URL of the provider (e.g., "https://api.groq.com/openai/v1") */
  apiBaseUrl: string;
  /** API key (use "ollama" string for local models) */
  apiKey: string;
  /** Provider name — affects headers and request body */
  provider: LlmProvider;
  /** Model identifier (e.g., "llama-3.3-70b-versatile") */
  model: string;
  /** Conversation messages */
  messages: ChatMessage[];
  /** Temperature for randomness (0–1) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** If using server pool, report 429s to the key pool for cooldown */
  serverKeyProvider?: "groq" | "openrouter" | null;
};

// ──────────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────────

/**
 * Call an LLM API with automatic retry on transient errors.
 *
 * Retries on: 429 rate limit, 500–599 server errors.
 * Does NOT retry on: 400, 401, 403, 404 (configuration errors).
 * Delays use exponential backoff with jitter, or server-suggested Retry-After.
 */
export async function callLlm(params: CallLlmParams): Promise<LlmResult> {
  const temperature = params.temperature ?? 0.6;
  const maxTokens = params.maxTokens ?? 900;
  const maxRetries = 4;
  const baseDelayMs = 2000;

  let lastErrorType: LlmErrorType | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await executeLlmCall(params, temperature, maxTokens);

    if (result.ok) {
      // Report recovery to key pool if this was a retry after failure
      if (attempt > 0 && params.serverKeyProvider) {
        console.log(`[LLM_CLIENT] Succeeded after ${attempt} retries`);
      }
      return result.data;
    }

    lastErrorType = result.error;

    if (!result.error.retryable) {
      throw new LlmApiError(
        result.error.message,
        result.error.statusCode,
        false /* retryable */,
      );
    }

    if (attempt === maxRetries) {
      throw new LlmApiError(
        `LLM API error ${result.error.statusCode} after ${maxRetries} retries: ${result.error.message}`,
        result.error.statusCode,
        true /* retryable */,
      );
    }

    // Calculate wait time: prefer server suggestion, fall back to backoff
    const serverWait = result.error.retryAfterMs;
    const backoff = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
    const waitMs = Math.max(serverWait ?? 0, backoff);

    await sleep(waitMs);
  }

  // Should not reach here, but satisfy TypeScript
  throw new LlmApiError(
    `LLM API call failed: ${lastErrorType?.message ?? "unknown error"}`,
    lastErrorType?.statusCode ?? 500,
    true,
  );
}

/**
 * Classify an HTTP response status from an LLM provider.
 * Returns structured error info — used by callers that handle their own retry logic.
 */
export function classifyLlmError(
  statusCode: number,
  rawBody: string,
): LlmErrorType {
  const retryable = statusCode === 429 || (statusCode >= 500 && statusCode < 600);
  return {
    retryable,
    statusCode,
    message: httpStatusMessage(statusCode),
    retryAfterMs: parseRetryAfter(statusCode, rawBody),
  };
}

// ──────────────────────────────────────────────────────────────────
// EXECUTE (makes the actual fetch+parse call)
// ──────────────────────────────────────────────────────────────────

type LlmOutcome =
  | { ok: true; data: LlmResult }
  | { ok: false; error: LlmErrorType };

async function executeLlmCall(
  params: CallLlmParams,
  temperature: number,
  maxTokens: number,
): Promise<LlmOutcome> {
  const headers = buildRequestHeaders(params.provider, params.apiKey);
  const body = buildRequestBody(params, temperature, maxTokens);

  try {
    const response = await fetch(`${params.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const raw = await response.text();

    if (response.ok) {
      return { ok: true, data: parseLlmResponse(raw) };
    }

    const errorType = classifyLlmError(response.status, raw);

    // Report failure to key pool if using server-managed keys
    if (params.serverKeyProvider) {
      reportKeyFailure(params.serverKeyProvider, response.status, params.apiKey);
    }

    return { ok: false, error: errorType };
  } catch (e) {
    return {
      ok: false,
      error: {
        retryable: true,
        statusCode: 0,
        message: e instanceof Error ? e.message : "Network error",
        retryAfterMs: null,
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────────
// REQUEST BUILDING
// ──────────────────────────────────────────────────────────────────

function buildRequestHeaders(provider: LlmProvider, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider !== "ollama") {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  if (provider === "openrouter") {
    // OpenRouter tracks usage per application, not per key
    headers["HTTP-Referer"] = process.env.NEXTAUTH_URL || "http://localhost:3000";
    headers["X-Title"] = "code.zone";
  }
  return headers;
}

function buildRequestBody(
  params: CallLlmParams,
  temperature: number,
  maxTokens: number,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };

  // Groq and OpenAI support extra generation params
  if (params.provider === "groq" || params.provider === "openai") {
    body.top_p = 0.95;
    body.frequency_penalty = 0.4;
    body.presence_penalty = 0.3;
  }

  return body;
}

// ──────────────────────────────────────────────────────────────────
// RESPONSE PARSING
// ──────────────────────────────────────────────────────────────────

function parseLlmResponse(raw: string): LlmResult {
  const parsed = parseJson(raw);
  if (!parsed) {
    // If it's not JSON, return raw as content (edge case)
    return { content: raw.trim() };
  }

  // Navigate OpenAI-compatible response shape
  const content = extractAssistantContent(parsed);

  const usage = extractUsage(parsed);

  return { content, usage };
}

/**
 * Extract assistant text from an OpenAI-compatible response.
 * Strips <think> blocks (DeepSeek-style reasoning).
 */
function extractAssistantContent(parsed: unknown): string {
  if (!isRecord(parsed)) return "";
  const choices = parsed.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first = choices[0];
  if (!isRecord(first)) return "";
  const message = first.message;
  if (!isRecord(message)) return "";

  let content = typeof message.content === "string" ? message.content.trim() : "";

  // Strip DeepSeek-style <think> blocks
  if (content.includes("<think>") || content.includes("<think>")) {
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  }

  return content;
}

/**
 * Extract token usage info if present in the response.
 */
function extractUsage(parsed: unknown): LlmResult["usage"] | undefined {
  if (!isRecord(parsed)) return undefined;
  const usage = parsed.usage;
  if (!isRecord(usage)) return undefined;
  return {
    promptTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    completionTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
  };
}

// ──────────────────────────────────────────────────────────────────
// ERROR CLASSIFICATION HELPERS
// ──────────────────────────────────────────────────────────────────

function parseRetryAfter(statusCode: number, rawBody: string): number | null {
  // We can't read response headers here (already read text),
  // but we can parse Retry-After from response body text if present
  const match = rawBody.match(/try again in\s+(\d+(?:\.\d+)?)s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds * 1000);
  }
  return null;
}

function httpStatusMessage(code: number): string {
  switch (code) {
    case 400: return "Bad Request";
    case 401: return "Unauthorized — invalid API key";
    case 403: return "Forbidden — insufficient permissions";
    case 404: return "Not Found — invalid model or endpoint";
    case 429: return "Rate Limited — please retry after cooldown";
    case 500: return "Internal Server Error";
    case 502: return "Bad Gateway";
    case 503: return "Service Unavailable";
    case 504: return "Gateway Timeout";
    default: return `HTTP ${code}`;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────────────────────────
// CUSTOM ERROR CLASSES
// ──────────────────────────────────────────────────────────────────

/**
 * Thrown when the LLM API returns a non-retryable error after retries.
 * Callers can check `error.retryable` to decide whether to fall back.
 */
export class LlmApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "LlmApiError";
  }
}

// ──────────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────────

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
