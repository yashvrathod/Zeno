/**
 * Tests for the Piston URL chain behavior.
 *
 * Why this matters: as of 2/15/2026 the public emkc.org Piston API is
 * whitelist-only and returns 401. If a developer's local Docker Piston
 * is unreachable, the executor MUST surface a clear "no Piston
 * reachable" error instead of silently falling through to emkc.org and
 * 401-ing with a confusing message.
 *
 * These tests pin the URL chain: emkc.org is NEVER a default fallback.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { getPistonUrls, PistonUnreachableError } from "../../piston";

describe("getPistonUrls", () => {
  const KEYS_TO_RESET = [
    "PISTON_LOCAL_URL",
    "PISTON_API_URL",
    "NEXT_PUBLIC_PISTON_API_URL",
    "PISTON_EXTRA_URLS",
  ] as const;
  const originalEnv: Record<string, string | undefined> = {};
  for (const k of KEYS_TO_RESET) originalEnv[k] = process.env[k];

  beforeEach(() => {
    for (const k of KEYS_TO_RESET) delete process.env[k];
  });
  afterEach(() => {
    for (const k of KEYS_TO_RESET) {
      if (originalEnv[k] === undefined) delete process.env[k];
      else process.env[k] = originalEnv[k];
    }
  });

  it("defaults to localhost:2000 when no env vars are set", () => {
    expect([...getPistonUrls()]).toEqual(["http://localhost:2000/api/v2"]);
  });

  it("does NOT silently include emkc.org as a fallback", () => {
    const urls = [...getPistonUrls()].join(",");
    expect(urls).not.toContain("emkc.org");
    expect(urls).not.toContain("piston.rs");
  });

  it("honors PISTON_LOCAL_URL when set", () => {
    process.env.PISTON_LOCAL_URL = "http://my-piston.internal:9000/api/v2";
    expect([...getPistonUrls()]).toEqual(["http://my-piston.internal:9000/api/v2"]);
  });

  it("trims whitespace from PISTON_LOCAL_URL", () => {
    process.env.PISTON_LOCAL_URL = "  http://my-piston:9000/api/v2  ";
    expect([...getPistonUrls()]).toEqual(["http://my-piston:9000/api/v2"]);
  });

  it("appends PISTON_EXTRA_URLS in order, deduplicated", () => {
    process.env.PISTON_EXTRA_URLS = "http://a:1, http://b:2, http://a:1";
    const urls = [...getPistonUrls()];
    expect(urls[0]).toBe("http://localhost:2000/api/v2");
    expect(urls).toContain("http://a:1");
    expect(urls).toContain("http://b:2");
    // Dedupe: a:1 should appear once
    expect(urls.filter((u) => u === "http://a:1")).toHaveLength(1);
  });

  it("includes PISTON_API_URL when set (opt-in whitelisted public API)", () => {
    process.env.PISTON_API_URL = "https://whitelisted.example.com/api/v2/piston";
    const urls = [...getPistonUrls()];
    expect(urls).toContain("http://localhost:2000/api/v2");
    expect(urls).toContain("https://whitelisted.example.com/api/v2/piston");
  });

  it("returns a frozen array (callers cannot accidentally mutate the chain)", () => {
    const urls = getPistonUrls();
    expect(Object.isFrozen(urls)).toBe(true);
  });
});

describe("PistonUnreachableError", () => {
  it("names every tried URL in the error message", () => {
    const e = new PistonUnreachableError(
      ["http://localhost:2000/api/v2", "https://other.example.com/api/v2"],
      new Error("connection refused"),
    );
    expect(e.message).toContain("localhost:2000");
    expect(e.message).toContain("other.example.com");
    expect(e.message).toContain("connection refused");
    expect(e.tried).toEqual([
      "http://localhost:2000/api/v2",
      "https://other.example.com/api/v2",
    ]);
    expect(e.name).toBe("PistonUnreachableError");
  });

  it("handles empty tried-list gracefully", () => {
    const e = new PistonUnreachableError([], null);
    expect(e.message).toContain("(no URLs configured)");
  });
});
