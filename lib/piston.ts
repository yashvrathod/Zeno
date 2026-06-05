// Shared piston execution utility.

export const LANGUAGE_CONFIG: Record<string, { language: string; preferredVersion?: string }> = {
  // NOTE: versions differ per Piston deployment; we treat these as preferences.
  python: { language: 'python', preferredVersion: '3.10.0' },
  java: { language: 'java', preferredVersion: '15.0.2' },
  cpp: { language: 'c++', preferredVersion: '10.2.0' },
};

type PistonExecuteResponse = {
  language: string;
  version: string;
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
    output?: string;
  };
  compile?: {
    stdout: string;
    stderr: string;
    code: number;
    output?: string;
  };
};

type PistonRuntime = {
  language: string;
  version: string;
  aliases?: string[];
};

const runtimeCache = new Map<string, PistonRuntime[]>();

function semverKey(v: string) {
  // best-effort semver sorting (major.minor.patch...)
  return v
    .split(/[^0-9]+/g)
    .filter(Boolean)
    .map((x) => Number(x))
    .concat([0, 0, 0, 0])
    .slice(0, 4);
}

function compareSemverDesc(a: string, b: string) {
  const ak = semverKey(a);
  const bk = semverKey(b);
  for (let i = 0; i < Math.max(ak.length, bk.length); i++) {
    const d = (bk[i] ?? 0) - (ak[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

async function getRuntimes(apiUrl: string): Promise<PistonRuntime[]> {
  if (runtimeCache.has(apiUrl)) return runtimeCache.get(apiUrl)!;
  try {
    const res = await fetchWithTimeout(`${apiUrl}/runtimes`, {
      headers: { 'Content-Type': 'application/json' },
      timeoutMs: RUNTIMES_PROBE_TIMEOUT_MS,
    });
    if (!res.ok) {
      runtimeCache.set(apiUrl, []);
      return [];
    }
    const data = (await res.json()) as PistonRuntime[];
    runtimeCache.set(apiUrl, Array.isArray(data) ? data : []);
    return runtimeCache.get(apiUrl)!;
  } catch {
    // If runtime discovery fails (network/TLS/etc), fall back to configured versions.
    runtimeCache.set(apiUrl, []);
    return [];
  }
}

async function resolveRuntime(apiUrl: string, languageKey: keyof typeof LANGUAGE_CONFIG) {
  const cfg = LANGUAGE_CONFIG[languageKey];
  const runtimes = await getRuntimes(apiUrl);

  const candidates = runtimes.filter((r) => {
    const aliases = r.aliases ?? [];
    return r.language === cfg.language || aliases.includes(cfg.language);
  });

  if (candidates.length === 0) {
    // Fallback: use preferred version if provided.
    return { language: cfg.language, version: cfg.preferredVersion ?? '' };
  }

  // Prefer configured version if it exists.
  if (cfg.preferredVersion) {
    const exact = candidates.find((c) => c.version === cfg.preferredVersion);
    if (exact) return { language: exact.language, version: exact.version };
  }

  // Otherwise pick the latest version.
  const sorted = [...candidates].sort((a, b) => compareSemverDesc(a.version, b.version));
  return { language: sorted[0]!.language, version: sorted[0]!.version };
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 20_000, ...rest } = init;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Returns the list of Piston URLs to try, in order.
 *
 * Resolution order:
 *   1. `PISTON_LOCAL_URL` env var (e.g., a Docker container on the host).
 *      If unset, defaults to `http://localhost:2000/api/v2`.
 *   2. Additional URLs from `PISTON_EXTRA_URLS` (comma-separated).
 *   3. `PISTON_API_URL` ONLY if it is explicitly set in env.
 *
 * Critical: we no longer fall back to `emkc.org` silently. As of
 * 2/15/2026 the public Piston API is whitelist-only, so a dead
 * localhost would previously fall through to emkc.org and surface a
 * confusing 401. Now it surfaces a clear "no Piston reachable" error
 * naming the URLs that were tried. If you really want to use the
 * whitelisted public API, opt in via PISTON_API_URL explicitly.
 *
 * Returned as a frozen, deduplicated list.
 */
export function getPistonUrls(): readonly string[] {
  const localUrl =
    process.env.PISTON_LOCAL_URL && process.env.PISTON_LOCAL_URL.trim().length > 0
      ? process.env.PISTON_LOCAL_URL.trim()
      : "http://localhost:2000/api/v2";

  const extras = (process.env.PISTON_EXTRA_URLS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const explicitPrimary =
    process.env.PISTON_API_URL && process.env.PISTON_API_URL.trim().length > 0
      ? process.env.PISTON_API_URL.trim()
      : process.env.NEXT_PUBLIC_PISTON_API_URL &&
          process.env.NEXT_PUBLIC_PISTON_API_URL.trim().length > 0
        ? process.env.NEXT_PUBLIC_PISTON_API_URL.trim()
        : null;

  return Object.freeze(
    Array.from(
      new Set([localUrl, ...extras, ...(explicitPrimary ? [explicitPrimary] : [])]),
    ),
  );
}

/**
 * Smaller timeout used for "is this Piston reachable?" probes
 * (`/runtimes` GET). We don't want a dead localhost:2000 to add 25s of
 * latency to every run before the chain falls through.
 */
const RUNTIMES_PROBE_TIMEOUT_MS = 3_000;

/**
 * Timeout used for the `/execute` POST. Piston is mostly a fast round
 * trip; 25s is generous and only matters for genuinely long-running
 * code. If the URL is unreachable (connection refused), Node's fetch
 * fails immediately — the timeout is the upper bound.
 */
const EXECUTE_TIMEOUT_MS = 25_000;

export type PistonResult = {
  stdout: string;
  output: string;
  runtimeMs: number;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
  /** Which Piston URL actually served this request (useful for debugging). */
  servedBy: string;
};

/**
 * Error thrown when every URL in the chain failed. The `.tried` field
 * is preserved so the route can surface "we tried A, B, C and all
 * failed" instead of a generic "Piston error".
 */
export class PistonUnreachableError extends Error {
  tried: string[];
  cause: Error | null;
  constructor(tried: string[], cause: Error | null) {
    const urlList = tried.length > 0 ? tried.join(", ") : "(no URLs configured)";
    super(
      `No Piston instance reachable. Tried: ${urlList}. ` +
        `Last error: ${cause?.message ?? "unknown"}. ` +
        `Set PISTON_LOCAL_URL to your local instance (e.g. http://localhost:2000/api/v2).`,
    );
    this.name = "PistonUnreachableError";
    this.tried = tried;
    this.cause = cause;
  }
}

export async function runOnPiston({
  code,
  language,
  stdin,
  compileTimeoutMs,
  runTimeoutMs,
}: {
  code: string;
  language: keyof typeof LANGUAGE_CONFIG;
  stdin: string;
  compileTimeoutMs?: number;
  runTimeoutMs?: number;
}): Promise<PistonResult> {
  const langConfig = LANGUAGE_CONFIG[language];
  if (!langConfig) throw new Error(`Language ${language} not supported`);

  const tryUrls = [...getPistonUrls()];

  let lastErr: Error | null = null;
  for (const apiUrl of tryUrls) {
    const startedAt = Date.now();
    try {
      const runtime = await resolveRuntime(apiUrl, language);
      // Light-touch log so a production issue is easy to diagnose from
      // the access log alone (which Piston URL worked, which version
      // was selected). Kept as console.debug to avoid noise.
      if (process.env.PISTON_DEBUG === '1') {
        console.debug(`[piston] ${apiUrl} → ${runtime.language}@${runtime.version || '(default)'}`);
      }
      const body: Record<string, unknown> = {
        language: runtime.language,
        version: runtime.version,
        files: [{ name: fileName(language), content: code }],
        stdin,
      };
      if (compileTimeoutMs !== undefined) body.compile_timeout = compileTimeoutMs;
      if (runTimeoutMs !== undefined) body.run_timeout = runTimeoutMs;
      const res = await fetchWithTimeout(`${apiUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        timeoutMs: EXECUTE_TIMEOUT_MS,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        // 401/403 from a public Piston URL: treat as a hard failure for
        // THIS url, but try the next one in the chain. A dead localhost
        // shouldn't burn 25s on a whitelisted-API 401.
        const isAuth = res.status === 401 || res.status === 403;
        throw new Error(
          `Piston error: ${res.status} ${text ? `- ${text.slice(0, 300)}` : ''}`.trim() +
            (isAuth ? " (auth-required; skipping to next URL in chain)" : ""),
        );
      }

      const data = (await res.json()) as PistonExecuteResponse;
      const stdout = (data.run.stdout ?? '').toString();
      const stderr = (data.run.stderr ?? '').toString();
      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();

      return {
        stdout,
        output,
        runtimeMs: Date.now() - startedAt,
        stderr,
        exitCode: data.run.code ?? null,
        signal: data.run.signal ?? null,
        servedBy: apiUrl,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error('Unknown piston error');
    }
  }

  throw new PistonUnreachableError(tryUrls, lastErr);
}

function fileName(language: keyof typeof LANGUAGE_CONFIG) {
  if (language === 'python') return 'main.py';
  if (language === 'java') return 'Main.java';
  return 'main.cpp';
}
