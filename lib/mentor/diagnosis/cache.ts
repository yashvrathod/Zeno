/**
 * =============================================================================
 * CUD result cache — bounded LRU with TTL
 * =============================================================================
 *
 * In-memory only. For multi-instance deployments, swap the Map for Redis
 * with the same interface. The fingerprint is the key; the value is the
 * CUDResult (raw, before policy).
 *
 * Capacity: 1000 entries. TTL: 24 hours. Eviction: LRU on insert.
 *
 * Why in-memory: the cache is a quality optimization, not a correctness
 * dependency. If the process restarts, the cache rebuilds lazily from the
 * LLM judge. The system never behaves incorrectly because of a cache miss
 * — see JUDGE_INDEPENDENCE_INVARIANT in invariants.ts.
 */

import type { CUDResult } from "./types";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CAPACITY = 1000;

type Entry = { value: CUDResult; expiresAt: number };

export class CUDCache {
  private map = new Map<string, Entry>();
  private capacity: number;
  private ttlMs: number;

  constructor(capacity: number = DEFAULT_CAPACITY, ttlMs: number = DEFAULT_TTL_MS) {
    this.capacity = capacity;
    this.ttlMs = ttlMs;
  }

  get(key: string): CUDResult | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // LRU touch: reinsert to move to end (Map preserves insertion order).
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: CUDResult): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      // Evict oldest (first inserted).
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

// Module-level singleton. Tests can call `cudCache.clear()` to reset.
export const cudCache = new CUDCache();
