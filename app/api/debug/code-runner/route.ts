import { NextRequest, NextResponse } from "next/server";
import { getPistonUrls, LANGUAGE_CONFIG } from "@/lib/piston";

type ApiCallLog = {
  id: number;
  type: "info" | "success" | "error" | "warn";
  timestamp: string;
  message: string;
  url?: string;
  endpoint?: string;
  method?: string;
  durationMs?: number;
  statusCode?: number;
  requestBody?: unknown;
  responsePreview?: string;
  err?: string;
};

let logId = 0;

function makeEntry(
  type: ApiCallLog["type"],
  message: string,
  opts?: Partial<Omit<ApiCallLog, "id" | "type" | "timestamp" | "message">>,
): ApiCallLog {
  return {
    id: logId++,
    type,
    timestamp: new Date().toLocaleTimeString(),
    message,
    ...opts,
  };
}

type RuntimeInfo = {
  language: string;
  version: string;
  aliases?: string[];
};

async function probeUrl(
  url: string,
  logs: ApiCallLog[],
): Promise<{ reachable: boolean; runtimes?: RuntimeInfo[]; status?: number; err?: string; ms: number }> {
  const start = Date.now();
  logs.push(makeEntry("info", `Probing ${url}/runtimes...`, { url, endpoint: "/runtimes", method: "GET" }));
  try {
    const res = await fetch(`${url}/runtimes`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3_000),
    });
    const ms = Date.now() - start;
    if (res.ok) {
      const data = (await res.json()) as RuntimeInfo[];
      const runtimes = Array.isArray(data) ? data : [];
      logs.push(makeEntry("success", `${url}/runtimes → ${res.status} (${ms}ms)`, {
        url, endpoint: "/runtimes", method: "GET", durationMs: ms, statusCode: res.status,
        responsePreview: `${runtimes.length} runtimes available`,
      }));
      return { reachable: true, runtimes, ms };
    }
    logs.push(makeEntry("error", `${url}/runtimes → ${res.status} (${ms}ms)`, {
      url, endpoint: "/runtimes", method: "GET", durationMs: ms, statusCode: res.status,
    }));
    return { reachable: false, status: res.status, ms };
  } catch (e) {
    const ms = Date.now() - start;
    const err = e instanceof Error ? e.message.slice(0, 200) : String(e);
    logs.push(makeEntry("error", `${url}/runtimes → FAIL (${ms}ms): ${err}`, {
      url, endpoint: "/runtimes", method: "GET", durationMs: ms, err,
    }));
    return { reachable: false, err, ms };
  }
}

export async function POST(request: NextRequest) {
  logId = 0;
  const logs: ApiCallLog[] = [];
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as {
      code?: string;
      language?: string;
      stdin?: string;
      compileTimeoutMs?: number;
      runTimeoutMs?: number;
    };

    const { code, language, stdin = "", compileTimeoutMs, runTimeoutMs } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ ok: false, logs, error: "Missing code" }, { status: 400 });
    }
    if (!language || !(language in LANGUAGE_CONFIG)) {
      return NextResponse.json({ ok: false, logs, error: `Unsupported language: ${language}` }, { status: 400 });
    }

    const langKey = language as keyof typeof LANGUAGE_CONFIG;

    logs.push(makeEntry("info", `Starting code-runner trace for ${language}`));
    logs.push(makeEntry("info", `Code length: ${code.length} chars, stdin: "${stdin.slice(0, 50)}${stdin.length > 50 ? "..." : ""}"`));

    // 1. Show configured URLs
    const urls = [...getPistonUrls()];
    logs.push(makeEntry("info", `Configured Piston URLs: ${urls.length > 0 ? urls.join(", ") : "(none)"}`));

    if (urls.length === 0) {
      return NextResponse.json({
        ok: false,
        logs,
        error: "No Piston URLs configured",
      });
    }

    // 2. Probe all URLs
    logs.push(makeEntry("info", "Probing all configured Piston URLs for connectivity..."));
    const probeResults = await Promise.all(urls.map((url) => probeUrl(url, logs)));

    const reachable = probeResults.filter((p) => p.reachable);
    logs.push(makeEntry("info", `Probe complete: ${reachable.length}/${urls.length} reachable`));

    if (reachable.length === 0) {
      return NextResponse.json({
        ok: false,
        logs,
        error: "No Piston instances reachable",
        probeResults,
      });
    }

    // 3. Try execution on each URL
    const langConfig = LANGUAGE_CONFIG[langKey];
    let executed = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let execResult: any = null;

    for (let i = 0; i < urls.length; i++) {
      const apiUrl = urls[i]!;
      const runtime = probeResults[i]?.runtimes as RuntimeInfo[] | undefined;

      logs.push(makeEntry("info", `Attempting execution on ${apiUrl}...`, {
        url: apiUrl, endpoint: "/execute", method: "POST",
      }));

      const execStart = Date.now();
      try {
        let resolvedVersion = langConfig.preferredVersion ?? "";
        if (Array.isArray(runtime) && runtime.length > 0) {
          const candidates = runtime.filter((r) => {
            const aliases = r.aliases ?? [];
            return r.language === langConfig.language || aliases.includes(langConfig.language);
          });
          if (langConfig.preferredVersion) {
            const exact = candidates.find((c) => c.version === langConfig.preferredVersion);
            if (exact) resolvedVersion = exact.version;
          }
          if (!resolvedVersion && candidates.length > 0) {
            resolvedVersion = candidates.sort((a, b) => {
              const ak = (a.version ?? "").split(/[^0-9]+/g).filter(Boolean).map(Number);
              const bk = (b.version ?? "").split(/[^0-9]+/g).filter(Boolean).map(Number);
              for (let i = 0; i < Math.max(ak.length, bk.length); i++) {
                const d = (bk[i] ?? 0) - (ak[i] ?? 0);
                if (d !== 0) return d;
              }
              return 0;
            })[0]?.version ?? "";
          }
        }

        const execBody: Record<string, unknown> = {
          language: langConfig.language,
          version: resolvedVersion || undefined,
          files: [{ name: fileName(langKey), content: code }],
          stdin,
        };
        if (compileTimeoutMs !== undefined) execBody.compile_timeout = compileTimeoutMs;
        if (runTimeoutMs !== undefined) execBody.run_timeout = runTimeoutMs;

        logs.push(makeEntry("info", `POST ${apiUrl}/execute`, {
          url: apiUrl, endpoint: "/execute", method: "POST",
          requestBody: { language: langConfig.language, version: resolvedVersion, stdin: stdin.slice(0, 100) },
        }));

        const res = await fetch(`${apiUrl}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(execBody),
          signal: AbortSignal.timeout(60_000),
        });

        const execMs = Date.now() - execStart;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (await res.json()) as any;

        if (res.ok) {
          logs.push(makeEntry("success", `${apiUrl}/execute → ${res.status} (${execMs}ms)`, {
            url: apiUrl, endpoint: "/execute", method: "POST", durationMs: execMs, statusCode: res.status,
            responsePreview: `stdout: ${(data.run?.stdout ?? "").slice(0, 200)}, exit: ${data.run?.code}`,
          }));
          execResult = {
            servedBy: apiUrl,
            stdout: data.run?.stdout ?? "",
            stderr: data.run?.stderr ?? "",
            output: ((data.run?.stdout ?? "") + "\n" + (data.run?.stderr ?? "")).trim(),
            exitCode: data.run?.code ?? null,
            signal: data.run?.signal ?? null,
            language: data.language,
            version: data.version,
            compileOutput: data.compile || null,
            execMs,
          };
          executed = true;
          break;
        } else {
          const text = typeof data === "object" ? JSON.stringify(data).slice(0, 300) : String(data).slice(0, 300);
          const isAuth = res.status === 401 || res.status === 403;
          logs.push(makeEntry("error", `${apiUrl}/execute → ${res.status} (${execMs}ms): ${text.slice(0, 150)}${isAuth ? " (auth-required)" : ""}`, {
            url: apiUrl, endpoint: "/execute", method: "POST", durationMs: execMs, statusCode: res.status,
          }));
        }
      } catch (e) {
        const execMs = Date.now() - execStart;
        const err = e instanceof Error ? e.message.slice(0, 200) : String(e);
        logs.push(makeEntry("error", `${apiUrl}/execute → FAIL (${execMs}ms): ${err}`, {
          url: apiUrl, endpoint: "/execute", method: "POST", durationMs: execMs, err,
        }));
      }
    }

    const totalMs = Date.now() - startedAt;

    if (!executed) {
      return NextResponse.json({
        ok: false,
        logs,
        error: "All Piston URLs failed",
        totalMs,
      });
    }

    return NextResponse.json({
      ok: true,
      logs,
      result: execResult,
      totalMs,
    });
  } catch (e) {
    const totalMs = Date.now() - startedAt;
    const err = e instanceof Error ? e.message : String(e);
    logs.push(makeEntry("error", `Server error: ${err}`));
    return NextResponse.json({ ok: false, logs, error: err, totalMs }, { status: 500 });
  }
}

function fileName(language: keyof typeof LANGUAGE_CONFIG) {
  if (language === "python") return "main.py";
  if (language === "java") return "Main.java";
  return "main.cpp";
}
