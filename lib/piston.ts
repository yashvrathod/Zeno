// Shared piston execution utility.

export const LANGUAGE_CONFIG: Record<string, { language: string; preferredVersion?: string }> = {
  // NOTE: versions differ per Piston deployment; we treat these as preferences.
  javascript: { language: 'javascript', preferredVersion: '18.15.0' },
  python: { language: 'python', preferredVersion: '3.10.0' },
  java: { language: 'java', preferredVersion: '15.0.2' },
  cpp: { language: 'c++', preferredVersion: '10.2.0' },
};

type PistonExecuteResponse = {
  run: {
    stdout: string;
    stderr: string;
    code: number;
    signal: string | null;
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
      timeoutMs: 10_000,
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

function getPistonUrls(): string[] {
  const localUrl = process.env.PISTON_LOCAL_URL || 'http://localhost:2000/api/v2';
  const primaryUrl = process.env.PISTON_API_URL || process.env.NEXT_PUBLIC_PISTON_API_URL || 'https://emkc.org/api/v2/piston';
  const fallbackUrl = process.env.PISTON_API_URL_FALLBACK || 'https://piston.rs/api/v2/piston';

  return [...new Set([localUrl, primaryUrl, fallbackUrl].filter(Boolean))];
}

export async function runOnPiston({
  code,
  language,
  stdin,
}: {
  code: string;
  language: keyof typeof LANGUAGE_CONFIG;
  stdin: string;
}): Promise<{ output: string; runtimeMs: number; stderr: string; exitCode: number | null; signal: string | null }> {
  const langConfig = LANGUAGE_CONFIG[language];
  if (!langConfig) throw new Error(`Language ${language} not supported`);

  const tryUrls = getPistonUrls();

  let lastErr: Error | null = null;
  for (const apiUrl of tryUrls) {
    const startedAt = Date.now();
    try {
      const runtime = await resolveRuntime(apiUrl, language);
      const res = await fetchWithTimeout(`${apiUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: runtime.language,
          version: runtime.version,
          files: [{ name: fileName(language), content: code }],
          stdin,
        }),
        timeoutMs: 25_000,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Piston error: ${res.status} ${text ? `- ${text.slice(0, 300)}` : ''}`.trim());
      }

      const data = (await res.json()) as PistonExecuteResponse;
      const stdout = (data.run.stdout ?? '').toString();
      const stderr = (data.run.stderr ?? '').toString();
      const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();

      return {
        output,
        runtimeMs: Date.now() - startedAt,
        stderr,
        exitCode: data.run.code ?? null,
        signal: data.run.signal ?? null,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error('Unknown piston error');
    }
  }

  throw lastErr ?? new Error('Piston error');
}

function fileName(language: keyof typeof LANGUAGE_CONFIG) {
  if (language === 'python') return 'main.py';
  if (language === 'java') return 'Main.java';
  if (language === 'cpp') return 'main.cpp';
  return 'main.js';
}
