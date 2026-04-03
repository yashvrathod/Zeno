/**
 * =============================================================================
 * DEBUG LOGGER FOR ALGOMENTOR
 * =============================================================================
 *
 * Color-coded console output for different systems.
 * Only logs when DEBUG=true in .env or NODE_ENV=development.
 * Prefix every log with timestamp + system name.
 *
 * USAGE:
 *   import { debug } from '@/lib/debug';
 *
 *   debug.mentor('routeInteraction called', { stage: 'APPROACH', userId });
 *   debug.cache('Redis search', { count: 12 });
 *   debug.ai('Calling Groq', { model: 'llama-3.3-70b' });
 *
 * EXPECTED OUTPUT:
 *   [12:34:01] 🧠 MENTOR  routeInteraction called { stage: 'APPROACH', userId: 'clx...' }
 *   [12:34:01] ⚡ CACHE   Redis search: 12 entries scanned
 *   [12:34:01] 🤖 AI      Calling Groq { model: 'llama-3.3-70b' }
 */

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

const DEBUG_ENABLED =
  process.env.DEBUG === "true" ||
  process.env.NODE_ENV === "development" ||
  process.env.DEBUG_MENTOR === "true";

// ─────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────

export type DebugSystem =
  | "MENTOR"
  | "CACHE"
  | "AI"
  | "STAGE"
  | "EMBED"
  | "DB"
  | "RATE"
  | "PATTERN";

interface DebugLogEntry {
  timestamp: Date;
  system: DebugSystem;
  message: string;
  data?: unknown;
}

interface TimerResult {
  label: string;
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────
// ANSI COLOR CODES
// ─────────────────────────────────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",

  // System colors
  mentor: "\x1b[35m",    // Magenta
  cache: "\x1b[33m",     // Yellow
  ai: "\x1b[36m",        // Cyan
  stage: "\x1b[34m",     // Blue
  embed: "\x1b[32m",     // Green
  db: "\x1b[31m",        // Red
  rate: "\x1b[38;5;208m", // Orange
  pattern: "\x1b[38;5;129m", // Purple

  // Emoji icons for each system
  icons: {
    MENTOR: "🧠",
    CACHE: "⚡",
    AI: "🤖",
    STAGE: "📍",
    EMBED: "🔢",
    DB: "🗄️",
    RATE: "🚦",
    PATTERN: "🔍",
  } as Record<DebugSystem, string>,
};

// ─────────────────────────────────────────────────────────────────────────
// CORE LOGGER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Formats a timestamp for debug output.
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Core logging function with color coding.
 */
function log(
  system: DebugSystem,
  message: string,
  data?: unknown,
  useColor: boolean = true
): void {
  if (!DEBUG_ENABLED) return;

  const timestamp = formatTimestamp(new Date());
  const icon = COLORS.icons[system];
  const colorCode = COLORS[system.toLowerCase() as keyof typeof COLORS] || COLORS.reset;

  // Format the main message
  const systemLabel = `${icon} ${system}`.padEnd(10);

  if (useColor && typeof process !== "undefined" && process.stdout?.isTTY) {
    // Color output for terminals
    console.log(
      `[${timestamp}] ${colorCode}${systemLabel}${COLORS.reset} ${message}`,
      data !== undefined ? data : ""
    );
  } else {
    // Plain output for logs/files
    console.log(
      `[${timestamp}] ${systemLabel} ${message}`,
      data !== undefined ? JSON.stringify(data, null, 2) : ""
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SYSTEM-SPECIFIC LOGGERS
// ─────────────────────────────────────────────────────────────────────────

export const debug = {
  /**
   * Mentor system logs (interaction routing, response generation)
   */
  mentor: (message: string, data?: unknown) => log("MENTOR", message, data),

  /**
   * Cache system logs (Redis/DB lookups, hit/miss events)
   */
  cache: (message: string, data?: unknown) => log("CACHE", message, data),

  /**
   * AI provider logs (Groq/OpenRouter calls, completions)
   */
  ai: (message: string, data?: unknown) => log("AI", message, data),

  /**
   * Stage engine logs (transitions, session management)
   */
  stage: (message: string, data?: unknown) => log("STAGE", message, data),

  /**
   * Embedding system logs (generation, similarity search)
   */
  embed: (message: string, data?: unknown) => log("EMBED", message, data),

  /**
   * Database logs (Prisma queries, transactions)
   */
  db: (message: string, data?: unknown) => log("DB", message, data),

  /**
   * Rate limiting logs (checks, throttling)
   */
  rate: (message: string, data?: unknown) => log("RATE", message, data),

  /**
   * Pattern tracking logs (weak pattern detection)
   */
  pattern: (message: string, data?: unknown) => log("PATTERN", message, data),
};

// ─────────────────────────────────────────────────────────────────────────
// PERFORMANCE TIMER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Creates a performance timer that logs elapsed time when stopped.
 *
 * @param label - Label for the timer (shown in log output)
 * @returns Function that stops the timer and logs elapsed time
 *
 * @example
 * const end = debug.timer("embedding lookup");
 * // ... do work ...
 * end(); // logs "⏱ embedding lookup: 234ms"
 */
export function startTimer(label: string): () => number {
  const start = performance.now();
  let ended = false;

  return () => {
    if (ended) return 0;
    ended = true;

    const duration = performance.now() - start;
    const timestamp = formatTimestamp(new Date());

    if (DEBUG_ENABLED) {
      console.log(`[${timestamp}] ⏱️  ${label}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  };
}

/**
 * Async timer wrapper for measuring async operations.
 *
 * @param label - Label for the timer
 * @param fn - Async function to time
 * @returns Promise resolving to the function's result
 *
 * @example
 * const result = await debug.timeAsync("cache lookup", () =>
 *   prisma.cacheEntry.findMany({ where: { userId } })
 * );
 */
export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const end = startTimer(label);
  try {
    return await fn();
  } finally {
    end();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// INTERACTION TRACER
// ─────────────────────────────────────────────────────────────────────────

/**
 * Traces the full lifecycle of a mentor interaction.
 * Logs: start → route decision → cache check → AI call (if any) → end
 * Shows total time and which path was taken.
 *
 * @param label - Label for this interaction trace
 * @param fn - The async function to trace
 * @returns Promise resolving to the function's result
 *
 * @example
 * const result = await debug.traceInteraction("approach validation", async () => {
 *   const decision = await routeInteraction(input, session, problem);
 *   if (decision.type === "AI_NEEDED") {
 *     return await callGroq(messages);
 *   }
 *   return decision.entry.response;
 * });
 */
export async function traceInteraction<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = new Date();
  const endTimer = startTimer(label);

  debug.mentor(`Starting: ${label}`);

  try {
    const result = await fn();
    const totalMs = endTimer();

    debug.mentor(`Completed: ${label} in ${totalMs.toFixed(2)}ms`);

    return result;
  } catch (error) {
    endTimer();
    debug.mentor(`Failed: ${label}`, { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// LOG HISTORY (for debug panel)
// ─────────────────────────────────────────────────────────────────────────

const LOG_HISTORY: DebugLogEntry[] = [];
const MAX_HISTORY_LENGTH = 100;

/**
 * Records a log entry to the in-memory history.
 * Used by the DebugPanel component to show recent logs.
 */
function recordLogEntry(system: DebugSystem, message: string, data?: unknown): void {
  const entry: DebugLogEntry = {
    timestamp: new Date(),
    system,
    message,
    data,
  };

  LOG_HISTORY.push(entry);

  // Trim history if too long
  if (LOG_HISTORY.length > MAX_HISTORY_LENGTH) {
    LOG_HISTORY.shift();
  }
}

/**
 * Gets recent log entries for the debug panel.
 */
export function getLogHistory(options?: {
  system?: DebugSystem;
  limit?: number;
}): DebugLogEntry[] {
  let history = [...LOG_HISTORY];

  if (options?.system) {
    history = history.filter((entry) => entry.system === options.system);
  }

  const limit = options?.limit ?? MAX_HISTORY_LENGTH;
  return history.slice(-limit);
}

/**
 * Clears the log history.
 */
export function clearLogHistory(): void {
  LOG_HISTORY.length = 0;
}

/**
 * Gets log statistics.
 */
export function getLogStats(): Record<string, number> {
  const stats: Record<string, number> = {};

  for (const entry of LOG_HISTORY) {
    stats[entry.system] = (stats[entry.system] ?? 0) + 1;
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────

export { log };
export default debug;
