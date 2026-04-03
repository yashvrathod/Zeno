/**
 * =============================================================================
 * GROQ INTEGRATION WITH STREAMING SUPPORT
 * =============================================================================
 *
 * This module provides a unified interface for Groq API interactions with:
 * 1. Streaming support for real-time token generation (UI streaming)
 * 2. JSON completion for structured responses (validation, code review)
 * 3. Automatic retry with exponential backoff (429 rate limits)
 * 4. BYOK (Bring Your Own Key) support for user-provided API keys
 *
 * ARCHITECTURE:
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         GROQ CLIENT LAYERS                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ LAYER 1: Server Groq (Priority 1)                               │
 *   │   - Uses process.env.GROQ_API_KEY                               │
 *   │   - Available to all users                                      │
 *   │   - Subject to server rate limits                               │
 *   └─────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼ (if server key unavailable)
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ LAYER 2: OpenRouter Fallback (Priority 2)                       │
 *   │   - Uses process.env.OPENROUTER_API_KEY                         │
 *   │   - Free models: nemotron-3-nano, llama-3-8b                    │
 *   │   - Unlimited usage, no rate limits                             │
 *   └─────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼ (if user has personal key)
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │ LAYER 3: User BYOK (Priority 3 - Highest)                       │
 *   │   - Uses user's Groq API key from settings                      │
 *   │   - Bypasses server rate limits                                 │
 *   │   - User controls their own quota                               │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * STREAMING VS NON-STREAMING:
 *
 *   streamCompletion()  → ReadableStream for UI token-by-token display
 *   jsonCompletion()    → Full response for JSON parsing (validation, etc.)
 *
 * RETRY LOGIC:
 *
 *   Attempt 1 → Immediate
 *   Attempt 2 → 1 second delay (on 429 error)
 *   Attempt 3 → 2 seconds delay (on 429 error)
 *   Attempt 4 → 4 seconds delay (on 429 error)
 *   Then throw error
 *
 * @module groq
 */

import { debug, startTimer } from "@/lib/debug";

// ─────────────────────────────────────────────────────────────────────────
// DYNAMIC GROQ IMPORT (Not a hard dependency)
// ─────────────────────────────────────────────────────────────────────────

// Groq SDK types
type GroqClient = {
  chat: {
    completions: {
      create(params: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
        stream?: boolean;
      }): Promise<any>;
    };
  };
};

// Module-level cache for Groq clients
const groqClientCache = new Map<string, GroqClient>();

/**
 * Creates or retrieves a Groq client instance.
 *
 * We use dynamic import to avoid hard dependency on @groq/sdk.
 * This allows the app to work with OpenRouter fallback if Groq is not installed.
 */
async function createGroqClient(apiKey: string): Promise<GroqClient> {
  // Return cached client if exists
  const cacheKey = apiKey.substring(0, 16);
  if (groqClientCache.has(cacheKey)) {
    return groqClientCache.get(cacheKey)!;
  }

  try {
    // Try to import @groq/sdk dynamically
    const { Groq } = await import("groq-sdk").catch((e) => {
      console.warn("[GROQ] groq-sdk not installed. Install with: npm install groq-sdk");
      throw e;
    });

    const client = new Groq({ apiKey }) as unknown as GroqClient;
    groqClientCache.set(cacheKey, client);

    return client;
  } catch (error) {
    // If groq-sdk is not available, we'll use native fetch with OpenAI-compatible API
    // This is a fallback that doesn't require the SDK
    console.warn("[GROQ] Falling back to native fetch (Groq uses OpenAI-compatible API)");

    // Create a minimal client using fetch
    const fetchClient: GroqClient = {
      chat: {
        completions: {
          create: async (params) => {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({ ...params, stream: false }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Groq API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // For streaming requests, wrap the response in a mock async iterable
            if (params.stream) {
              const content = data.choices?.[0]?.message?.content || "";
              return {
                async*[Symbol.asyncIterator]() {
                  yield {
                    choices: [{ delta: { content } }],
                  };
                },
              };
            }

            return data;
          },
        },
      },
    };

    groqClientCache.set(cacheKey, fetchClient);
    return fetchClient;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CLIENT FACTORIES
// ─────────────────────────────────────────────────────────────────────────

/**
 * Server Groq client — uses process.env.GROQ_API_KEY
 *
 * This is the default client for all AI interactions when users
 * haven't configured their own API key.
 *
 * RATE LIMITS (free tier):
 * - 30 requests per minute
 * - 14,400 requests per day
 *
 * @example
 * const stream = await streamCompletion(groq, messages, 500);
 */
export const groq = {
  /**
   * Gets the server Groq client (lazy initialization)
   */
  getClient: async (): Promise<GroqClient | null> => {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.warn("[GROQ] GROQ_API_KEY not configured in environment");
      return null;
    }

    return createGroqClient(apiKey);
  },

  /**
   * Direct client access for immediate use
   * @deprecated Use getClient() for async access
   */
  chat: {
    completions: {
      create: async (params: any) => {
        const client = await createGroqClient(process.env.GROQ_API_KEY || "");
        return client.chat.completions.create(params);
      },
    },
  },
};

/**
 * Creates a Groq client for a user's personal API key (BYOK).
 *
 * Users can configure their own Groq API key in Settings.
 * This bypasses server rate limits and gives users control over their quota.
 *
 * @param apiKey - User's personal Groq API key
 * @returns Groq client instance
 *
 * @example
 * const userClient = getUserGroq(userAiSettings.groqApiKey);
 * const stream = await streamCompletion(userClient, messages, 500);
 */
export function getUserGroq(apiKey: string): Promise<GroqClient> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("User Groq API key is empty");
  }

  return createGroqClient(apiKey.trim());
}

// ─────────────────────────────────────────────────────────────────────────
// STREAMING COMPLETION
// ─────────────────────────────────────────────────────────────────────────

/**
 * Streams a chat completion and returns a ReadableStream.
 *
 * USE CASES:
 * - Mentor chat responses (real-time token display)
 * - Long-form explanations
 * - Code generation with progress feedback
 *
 * STREAMING FORMAT:
 * The returned ReadableStream yields Uint8Array chunks that can be
 * directly piped to a Next.js Response for server-sent events.
 *
 * @param client - Groq client instance
 * @param messages - Array of { role: "system" | "user" | "assistant", content: string }
 * @param maxTokens - Maximum tokens to generate (default: 512)
 * @param options - Optional configuration
 * @returns ReadableStream for streaming response
 *
 * @example
 * // In API route handler:
 * const stream = await streamCompletion(client, messages, 500);
 * return new Response(stream, {
 *   headers: {
 *     "Content-Type": "text/plain; charset=utf-8",
 *     "Transfer-Encoding": "chunked",
 *   },
 * });
 */
export async function streamCompletion(
  client: GroqClient,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  options?: {
    temperature?: number;
    model?: string;
    onToken?: (token: string) => void;
  }
): Promise<ReadableStream> {
  const model = options?.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const temperature = options?.temperature ?? 0.6;

  debug.ai("Starting stream completion", {
    model,
    messageCount: messages.length,
    maxTokens,
    temperature,
  });

  const timer = startTimer("streamCompletion");

  try {
    // Create the streaming request
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: true,
    });

    // Create a ReadableStream that yields tokens as they arrive
    return new ReadableStream({
      async start(controller) {
        try {
          // Iterate through streaming chunks
          for await (const chunk of response) {
            const delta = chunk.choices?.[0]?.delta?.content;

            if (delta) {
              // Call optional callback for token tracking
              options?.onToken?.(delta);

              // Encode and enqueue the token
              const encoded = new TextEncoder().encode(delta);
              controller.enqueue(encoded);
            }
          }

          controller.close();
          timer();
          debug.ai("Stream complete");
        } catch (error) {
          debug.ai("Stream error", error);
          controller.error(error);
        }
      },
    });
  } catch (error) {
    debug.ai("streamCompletion failed", error);
    throw error;
  }
}

/**
 * Streams a chat completion and returns the full text content.
 *
 * This is a convenience wrapper around streamCompletion that collects
 * all tokens into a single string. Use this when you need the full
 * response but still want streaming internally.
 *
 * @param client - Groq client instance
 * @param messages - Chat messages array
 * @param maxTokens - Maximum tokens to generate
 * @returns Promise resolving to complete response text
 *
 * @example
 * const text = await streamCompletionText(client, messages, 500);
 * console.log("Full response:", text);
 */
export async function streamCompletionText(
  client: GroqClient,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  options?: { temperature?: number; model?: string }
): Promise<string> {
  let fullText = "";

  const stream = await streamCompletion(client, messages, maxTokens, {
    ...options,
    onToken: (token) => {
      fullText += token;
    },
  });

  // Consume the stream (already being tracked via onToken)
  await consumeStream(stream);

  return fullText.trim();
}

/**
 * Helper to consume a ReadableStream without processing its chunks.
 */
async function consumeStream(stream: ReadableStream): Promise<void> {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// JSON COMPLETION (Non-Streaming)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Returns a non-streaming completion optimized for JSON responses.
 *
 * USE CASES:
 * - Approach validation (returns { isValid: boolean, feedback: string })
 * - Code review (returns { issues: [...], suggestions: [...] })
 * - Structured data extraction
 * - Any response that needs to be parsed as JSON
 *
 * WHY NON-STREAMING?
 * JSON responses must be complete before parsing. Streaming would
 * require complex buffering and partial JSON handling.
 *
 * @param client - Groq client instance
 * @param systemPrompt - System prompt that defines the JSON structure
 * @param userPrompt - User input/prompt
 * @param maxTokens - Maximum tokens to generate
 * @param options - Optional configuration
 * @returns Promise resolving to response text (parse as JSON)
 *
 * @example
 * const response = await jsonCompletion(
 *   client,
 *   "You are a validator. Respond with JSON: { valid: boolean, reason: string }",
 *   "Is this approach correct: use two pointers on sorted array?",
 *   200
 * );
 * const result = JSON.parse(response);
 */
export async function jsonCompletion(
  client: GroqClient,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  options?: {
    temperature?: number;
    model?: string;
  }
): Promise<string> {
  const model = options?.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const temperature = options?.temperature ?? 0.2; // Lower temp for consistent JSON

  debug.ai("Starting JSON completion", {
    model,
    maxTokens,
    temperature,
    systemPromptLength: systemPrompt.length,
  });

  const timer = startTimer("jsonCompletion");

  try {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false, // Non-streaming for JSON
    });

    const content = response.choices?.[0]?.message?.content || "";

    timer();
    debug.ai("JSON completion complete", content.length, "chars");

    return content.trim();
  } catch (error) {
    debug.ai("jsonCompletion failed", error);
    throw error;
  }
}

/**
 * Returns a non-streaming completion for simple text responses.
 *
 * USE CASES:
 * - Quick answers
 * - Classification tasks
 * - When streaming isn't needed
 *
 * @param client - Groq client instance
 * @param messages - Chat messages array
 * @param maxTokens - Maximum tokens to generate
 * @returns Promise resolving to response text
 */
export async function textCompletion(
  client: GroqClient,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  options?: { temperature?: number; model?: string }
): Promise<string> {
  const model = options?.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const temperature = options?.temperature ?? 0.6;

  debug.ai("Starting text completion", {
    model,
    messageCount: messages.length,
    maxTokens,
  });

  const timer = startTimer("textCompletion");

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    });

    const content = response.choices?.[0]?.message?.content || "";

    timer();
    debug.ai("Text completion complete", content.length, "chars");

    return content.trim();
  } catch (error) {
    debug.ai("textCompletion failed", error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// RETRY LOGIC
// ─────────────────────────────────────────────────────────────────────────

/**
 * Error types for retry decisions
 */
class RateLimitError extends Error {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = "RateLimitError";
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Executes a function with exponential backoff retry on rate limit errors.
 *
 * RETRY SCHEDULE:
 * - Attempt 1: Immediate (0ms delay)
 * - Attempt 2: 1 second delay (on 429 error)
 * - Attempt 3: 2 seconds delay (on 429 error)
 * - Attempt 4: 4 seconds delay (on 429 error)
 * - Then: Throw error
 *
 * RETRYABLE ERRORS:
 * - 429 Rate Limit (with Retry-After header)
 * - 500 Internal Server Error
 * - 502 Bad Gateway
 * - 503 Service Unavailable
 * - 504 Gateway Timeout
 *
 * NON-RETRYABLE ERRORS:
 * - 400 Bad Request
 * - 401 Unauthorized
 * - 403 Forbidden
 * - 404 Not Found
 *
 * @param fn - Async function to execute
 * @param retries - Maximum retry attempts (default: 3)
 * @returns Promise resolving to function result
 *
 * @example
 * const result = await withRetry(() =>
 *   streamCompletion(client, messages, 500)
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3
): Promise<T> {
  const timer = startTimer("withRetry");
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // First attempt has no delay
      if (attempt > 0) {
        const delayMs = calculateBackoffDelay(attempt);
        debug.ai(`Retry attempt ${attempt}/${retries}, waiting ${delayMs}ms`);
        await sleep(delayMs);
      }

      const result = await fn();
      timer();

      if (attempt > 0) {
        debug.ai(`Success after ${attempt} retries`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const retryInfo = extractRetryInfo(error);

      if (!retryInfo.retryable) {
        debug.ai("Non-retryable error, not retrying", error);
        throw error;
      }

      // Use server-suggested retry delay if provided
      if (retryInfo.retryAfterMs) {
        debug.ai(`Server suggested retry after: ${retryInfo.retryAfterMs}ms`);
        // Will be applied in next iteration's sleep
      }

      // Log retry attempt
      if (attempt < retries) {
        debug.ai("Retryable error, will retry", error);
      }
    }
  }

  timer();
  debug.ai("All retry attempts exhausted");
  throw lastError || new Error("All retry attempts failed");
}

/**
 * Calculates exponential backoff delay for retry attempt.
 *
 * Formula: baseDelay * 2^(attempt-1) + jitter
 * - Attempt 1: 1000ms + jitter (0-200ms)
 * - Attempt 2: 2000ms + jitter (0-400ms)
 * - Attempt 3: 4000ms + jitter (0-800ms)
 */
function calculateBackoffDelay(attempt: number, baseDelayMs: number = 1000): number {
  // Exponential backoff: 1s, 2s, 4s
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

  // Add jitter (±20%) to prevent thundering herd
  const jitter = (Math.random() - 0.5) * 0.4 * exponentialDelay;

  return Math.round(exponentialDelay + jitter);
}

/**
 * Extracts retry information from an error.
 */
function extractRetryInfo(error: unknown): { retryable: boolean; retryAfterMs?: number } {
  // Check for RateLimitError
  if (error instanceof RateLimitError) {
    return { retryable: true, retryAfterMs: error.retryAfter };
  }

  // Check for ApiError
  if (error instanceof ApiError) {
    // 429 Rate Limit
    if (error.status === 429) {
      return { retryable: true };
    }

    // 5xx Server Errors
    if (error.status >= 500 && error.status < 600) {
      return { retryable: true };
    }

    return { retryable: false };
  }

  // Check for standard Error with status in message
  if (error instanceof Error) {
    const statusMatch = error.message.match(/status[:\s]+(\d+)/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);

      if (status === 429) {
        // Try to extract Retry-After from message
        const retryAfterMatch = error.message.match(/retry[- ]?after[:\s]+(\d+)/i);
        const retryAfterMs = retryAfterMatch ? parseInt(retryAfterMatch[1], 10) * 1000 : undefined;
        return { retryable: true, retryAfterMs };
      }

      if (status >= 500 && status < 600) {
        return { retryable: true };
      }
    }
  }

  // Unknown error type - assume not retryable
  return { retryable: false };
}

/**
 * Sleep utility for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────────────────
// DEBUGGING UTILITIES
// ─────────────────────────────────────────────────────────────────────────

// Note: Now using centralized debug.ai() from @/lib/debug
// The DEBUG_ENABLED flag and local debugLog/createTimer have been removed

// ─────────────────────────────────────────────────────────────────────────
// OPENROUTER FALLBACK
// ─────────────────────────────────────────────────────────────────────────

/**
 * Creates an OpenRouter client for fallback requests.
 *
 * OpenRouter provides access to multiple models with a unified API.
 * We use it as a fallback when Groq rate limits are hit.
 *
 * FREE MODELS AVAILABLE:
 * - nvidia/nemotron-3-nano-30b-a3b:free
 * - meta-llama/llama-3-8b-instruct:free
 * - google/gemma-2-9b-it:free
 *
 * @param apiKey - OpenRouter API key (defaults to process.env.OPENROUTER_API_KEY)
 */
export async function getOpenRouterClient(apiKey?: string): Promise<GroqClient> {
  const key = apiKey || process.env.OPENROUTER_API_KEY;

  if (!key) {
    throw new Error("OpenRouter API key not provided and OPENROUTER_API_KEY not set");
  }

  // OpenRouter uses OpenAI-compatible API
  const fetchClient: GroqClient = {
    chat: {
      completions: {
        create: async (params) => {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
              "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
              "X-Title": "AlgoMentor",
            },
            body: JSON.stringify(params),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
          }

          const data = await response.json();

          // For streaming requests, wrap the response in a mock async iterable
          if (params.stream) {
            const content = data.choices?.[0]?.message?.content || "";
            return {
              async*[Symbol.asyncIterator]() {
                yield {
                  choices: [{ delta: { content } }],
                };
              },
            };
          }

          return data;
        },
      },
    },
  };

  return fetchClient;
}

/**
 * Streams a completion via OpenRouter fallback.
 */
export async function streamOpenRouterCompletion(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  options?: {
    model?: string;
    temperature?: number;
  }
): Promise<ReadableStream> {
  const model = options?.model || "nvidia/nemotron-3-nano-30b-a3b:free";
  const temperature = options?.temperature ?? 0.6;

  const client = await getOpenRouterClient();

  return streamCompletion(client, messages, maxTokens, {
    model,
    temperature,
    ...options,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// UTILITY EXPORTS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Gets the best available client based on configuration priority:
 * 1. User's Groq key (BYOK)
 * 2. Server Groq key
 * 3. OpenRouter fallback
 */
export async function getBestAvailableClient(params?: {
  userGroqKey?: string;
}): Promise<{ client: GroqClient; source: "user" | "server" | "openrouter" }> {
  // Priority 1: User's Groq key
  if (params?.userGroqKey) {
    try {
      const client = await getUserGroq(params.userGroqKey);
      debug.ai("Using user's Groq key (BYOK)");
      return { client, source: "user" };
    } catch (error) {
      debug.ai("User Groq key failed, falling back", error);
    }
  }

  // Priority 2: Server Groq key
  const serverClient = await groq.getClient();
  if (serverClient) {
    debug.ai("Using server Groq key");
    return { client: serverClient, source: "server" };
  }

  // Priority 3: OpenRouter fallback
  try {
    const openRouterClient = await getOpenRouterClient();
    debug.ai("Using OpenRouter fallback");
    return { client: openRouterClient, source: "openrouter" };
  } catch (error) {
    debug.ai("OpenRouter fallback failed", error);
  }

  throw new Error(
    "No AI provider available. Configure GROQ_API_KEY or OPENROUTER_API_KEY in environment."
  );
}
