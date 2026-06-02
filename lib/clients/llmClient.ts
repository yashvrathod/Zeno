/**
 * LLM Client — Transport-Abstraction for AI API Calls
 *
 * Features:
 *  1. Retry logic — exponential backoff with jitter + server-suggested Retry-After
 *  2. Streaming — SSE-based token streaming for real-time UX
 *  3. Timeout — AbortController-based timeout to prevent hanging
 *  4. Telemetry — latency, token usage, success/failure per provider+model
 *  5. Response parsing — extracts assistant content, strips <think> blocks
 *  6. Error classification — retryable (429/5xx) vs non-retryable (4xx)
 *
 * Any module that needs to call an LLM API should use this instead of raw fetch().
 */

import { reportKeyFailure, reportKeySuccess } from "@/lib/api-key-pool";

// ──────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────

export type LlmProvider = "groq" | "openrouter" | "openai" | "google" | "ollama";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmErrorType = {
  retryable: boolean;
  statusCode: number;
  message: string;
  retryAfterMs: number | null;
};

export type LlmResult = {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type CallLlmParams = {
  apiBaseUrl: string;
  apiKey: string;
  provider: LlmProvider;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  serverKeyProvider?: "groq" | "openrouter" | null;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
};

export type LlmCallTelemetry = {
  provider: LlmProvider;
  model: string;
  durationMs: number;
  success: boolean;
  statusCode: number;
  totalTokens?: number;
  errorMessage?: string;
};

// ──────────────────────────────────────────────────────────────────
// TELEMETRY COLLECTOR
// ──────────────────────────────────────────────────────────────────

const telemetryBuffer: LlmCallTelemetry[] = [];
const TELEMETRY_FLUSH_INTERVAL = 60_000;

let telemetryTimer: ReturnType<typeof setInterval> | null = null;

function ensureTelemetryTimer(): void {
  if (telemetryTimer) return;
  telemetryTimer = setInterval(() => {
    if (telemetryBuffer.length === 0) return;
    const batch = telemetryBuffer.splice(0);
    flushTelemetry(batch);
  }, TELEMETRY_FLUSH_INTERVAL);
  if (telemetryTimer && typeof telemetryTimer === "object" && "unref" in telemetryTimer) {
    (telemetryTimer as any).unref();
  }
}

function recordTelemetry(entry: LlmCallTelemetry): void {
  telemetryBuffer.push(entry);
  ensureTelemetryTimer();
}

function flushTelemetry(batch: LlmCallTelemetry[]): void {
  const byProvider = new Map<string, { calls: number; failures: number; totalMs: number; tokens: number }>();
  for (const t of batch) {
    const key = `${t.provider}:${t.model}`;
    const existing = byProvider.get(key) ?? { calls: 0, failures: 0, totalMs: 0, tokens: 0 };
    existing.calls++;
    if (!t.success) existing.failures++;
    existing.totalMs += t.durationMs;
    existing.tokens += t.totalTokens ?? 0;
    byProvider.set(key, existing);
  }

  const lines: string[] = [];
  for (const [key, stats] of byProvider) {
    const failRate = ((stats.failures / stats.calls) * 100).toFixed(1);
    const avgMs = (stats.totalMs / stats.calls).toFixed(0);
    lines.push(`${key}: ${stats.calls} calls, ${avgMs}ms avg, ${failRate}% fail, ${stats.tokens} tokens`);
  }
  console.debug("[LLM_METRICS]", lines.join(" | "));
}

export function getTelemetrySnapshot(): LlmCallTelemetry[] {
  return [...telemetryBuffer];
}

// ──────────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────────

export async function callLlm(params: CallLlmParams): Promise<LlmResult> {
  const temperature = params.temperature ?? 0.6;
  const maxTokens = params.maxTokens ?? 900;
  const maxRetries = 4;
  const baseDelayMs = 2000;
  const startTime = performance.now();

  let lastErrorType: LlmErrorType | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await executeLlmCall(params, temperature, maxTokens);

    if (result.ok) {
      const durationMs = performance.now() - startTime;
      recordTelemetry({
        provider: params.provider,
        model: params.model,
        durationMs: Math.round(durationMs),
        success: true,
        statusCode: 200,
        totalTokens: result.data.usage?.totalTokens,
      });
      if (params.serverKeyProvider) {
        reportKeySuccess(params.serverKeyProvider, params.apiKey);
        if (attempt > 0) console.debug("[LLM_CLIENT] Succeeded after", attempt, "retries");
      }
      return result.data;
    }

    lastErrorType = result.error;

    recordTelemetry({
      provider: params.provider,
      model: params.model,
      durationMs: Math.round(performance.now() - startTime),
      success: false,
      statusCode: result.error.statusCode,
      errorMessage: result.error.message.slice(0, 100),
    });

    if (!result.error.retryable) {
      throw new LlmApiError(result.error.message, result.error.statusCode, false);
    }

    if (attempt === maxRetries) {
      throw new LlmApiError(
        `LLM API error ${result.error.statusCode} after ${maxRetries} retries: ${result.error.message}`,
        result.error.statusCode,
        true,
      );
    }

    const serverWait = result.error.retryAfterMs;
    const backoff = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
    const waitMs = Math.max(serverWait ?? 0, backoff);

    await sleep(waitMs);
  }

  throw new LlmApiError(
    `LLM API call failed: ${lastErrorType?.message ?? "unknown error"}`,
    lastErrorType?.statusCode ?? 500,
    true,
  );
}

/**
 * Stream tokens from an LLM API via Server-Sent Events.
 * Calls onChunk for each text delta. Returns the full concatenated content.
 */
export async function callLlmStream(
  params: CallLlmParams & { onChunk: (chunk: string) => void },
): Promise<LlmResult> {
  const temperature = params.temperature ?? 0.6;
  const maxTokens = params.maxTokens ?? 900;
  const startTime = performance.now();
  const signal = params.signal;

  const headers = buildRequestHeaders(params.provider, params.apiKey);
  const body = buildRequestBody(params, temperature, maxTokens, true);

  try {
    const response = await fetch(`${params.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const raw = await response.text();
      const errorType = classifyLlmError(response.status, raw);
      if (params.serverKeyProvider) {
        reportKeyFailure(params.serverKeyProvider, response.status, params.apiKey);
      }
      recordTelemetry({
        provider: params.provider,
        model: params.model,
        durationMs: Math.round(performance.now() - startTime),
        success: false,
        statusCode: response.status,
        errorMessage: errorType.message,
      });
      if (!errorType.retryable) {
        throw new LlmApiError(errorType.message, errorType.statusCode, false);
      }
      throw new LlmApiError(errorType.message, errorType.statusCode, true);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new LlmApiError("No response body", 0, true);

    const decoder = new TextDecoder();
    let fullContent = "";
    let buffer = "";
    let usage: LlmResult["usage"] | undefined;

    while (true) {
      if (signal?.aborted) {
        throw new LlmApiError("Request timed out or was cancelled", 0, true);
      }

      const readResult = await reader.read();
      const { done, value } = readResult;
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            params.onChunk(delta);
          }
          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens,
              completionTokens: parsed.usage.completion_tokens,
              totalTokens: parsed.usage.total_tokens,
            };
          }
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }

    // Strip <think> blocks from streamed content
    if (fullContent.includes("<think>")) {
      fullContent = fullContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    }

    const durationMs = performance.now() - startTime;
    recordTelemetry({
      provider: params.provider,
      model: params.model,
      durationMs: Math.round(durationMs),
      success: true,
      statusCode: 200,
      totalTokens: usage?.totalTokens,
    });

    if (params.serverKeyProvider) {
      reportKeySuccess(params.serverKeyProvider, params.apiKey);
    }

    return { content: fullContent, usage };
  } catch (e) {
    const durationMs = performance.now() - startTime;
    if (e instanceof LlmApiError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      recordTelemetry({
        provider: params.provider,
        model: params.model,
        durationMs: Math.round(durationMs),
        success: false,
        statusCode: 0,
        errorMessage: "Request timed out",
      });
      throw new LlmApiError("Request timed out", 0, true);
    }
    recordTelemetry({
      provider: params.provider,
      model: params.model,
      durationMs: Math.round(durationMs),
      success: false,
      statusCode: 0,
      errorMessage: e instanceof Error ? e.message.slice(0, 100) : "Network error",
    });
    throw new LlmApiError(e instanceof Error ? e.message : "Network error", 0, true);
  }
}

/**
 * Classify an HTTP response status from an LLM provider.
 */
export function classifyLlmError(statusCode: number, rawBody: string): LlmErrorType {
  const retryable = statusCode === 429 || (statusCode >= 500 && statusCode < 600);
  return {
    retryable,
    statusCode,
    message: httpStatusMessage(statusCode),
    retryAfterMs: parseRetryAfter(statusCode, rawBody),
  };
}

// ──────────────────────────────────────────────────────────────────
// EXECUTE
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
  const body = buildRequestBody(params, temperature, maxTokens, false);

  try {
    const response = await fetch(`${params.apiBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: params.signal,
    });

    const raw = await response.text();

    if (response.ok) {
      return { ok: true, data: parseLlmResponse(raw) };
    }

    const errorType = classifyLlmError(response.status, raw);

    if (params.serverKeyProvider) {
      reportKeyFailure(params.serverKeyProvider, response.status, params.apiKey);
    }

    return { ok: false, error: errorType };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        ok: false,
        error: {
          retryable: true,
          statusCode: 0,
          message: "Request timed out",
          retryAfterMs: null,
        },
      };
    }
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
    headers["HTTP-Referer"] = process.env.NEXTAUTH_URL || "http://localhost:3000";
    headers["X-Title"] = "neXode";
  }
  return headers;
}

function buildRequestBody(
  params: CallLlmParams,
  temperature: number,
  maxTokens: number,
  stream: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature,
    max_tokens: maxTokens,
    stream,
  };

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
    return { content: raw.trim() };
  }

  const content = extractAssistantContent(parsed);
  const usage = extractUsage(parsed);

  return { content, usage };
}

function extractAssistantContent(parsed: unknown): string {
  if (!isRecord(parsed)) return "";
  const choices = parsed.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first = choices[0];
  if (!isRecord(first)) return "";
  const message = first.message;
  if (!isRecord(message)) return "";

  let content = typeof message.content === "string" ? message.content.trim() : "";

  if (content.includes("<think>")) {
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  }

  return content;
}

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
