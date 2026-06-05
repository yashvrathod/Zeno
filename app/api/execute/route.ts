import { NextRequest, NextResponse } from "next/server";
import { runLegacyJudge, type LegacyRequest } from "./runLegacy";
import { runNewJudge, type NewJudgeRequest } from "./runNewJudge";
import { LANGUAGE_CONFIG } from "@/lib/piston";
import { getPistonUrls } from "@/lib/piston";
import { isSupportedLanguage, type Language } from "@/lib/judge/verdict";

type ExecutableLanguage = keyof typeof LANGUAGE_CONFIG;

function normalizeLanguage(language: string): ExecutableLanguage | null {
  if (language === "typescript") return "javascript";
  if (language in LANGUAGE_CONFIG) return language as ExecutableLanguage;
  return null;
}

function useNewJudge(): boolean {
  return process.env.USE_NEW_JUDGE === "true";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      code?: string;
      language?: string;
      problemId?: string;
      runAll?: boolean;
    };
    const { code, language: rawLanguage, problemId, runAll } = body;

    if (!code || !code.trim() || !rawLanguage) {
      return NextResponse.json(
        {
          ok: false,
          error: rawLanguage
            ? "Missing code"
            : `Language "${body.language}" is not supported for execution`,
        },
        { status: 400 },
      );
    }

    let language: ExecutableLanguage | null = null;
    if (useNewJudge()) {
      if (!isSupportedLanguage(rawLanguage)) {
        return NextResponse.json(
          { ok: false, error: `Language "${rawLanguage}" is not supported for execution` },
          { status: 400 },
        );
      }
      language = rawLanguage as ExecutableLanguage;
    } else {
      language = normalizeLanguage(rawLanguage);
      if (!language) {
        return NextResponse.json(
          { ok: false, error: `Language "${rawLanguage}" is not supported for execution` },
          { status: 400 },
        );
      }
    }

    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";

    if (url.searchParams.get("diagnose") === "1") {
      const tried = [...getPistonUrls()];
      const probes: Array<{ url: string; reachable: boolean; status?: number; err?: string; ms: number }> = [];
      for (const u of tried) {
        const start = Date.now();
        try {
          const res = await fetch(`${u}/runtimes`, {
            method: "GET",
            signal: AbortSignal.timeout(3_000),
          });
          probes.push({ url: u, reachable: res.ok, status: res.status, ms: Date.now() - start });
        } catch (e) {
          probes.push({
            url: u,
            reachable: false,
            err: e instanceof Error ? e.message.slice(0, 200) : String(e),
            ms: Date.now() - start,
          });
        }
      }
      return NextResponse.json({
        ok: true,
        diagnose: true,
        triedUrls: tried,
        probes,
        env: {
          PISTON_LOCAL_URL: process.env.PISTON_LOCAL_URL ?? null,
          PISTON_API_URL: process.env.PISTON_API_URL ?? null,
          PISTON_EXTRA_URLS: process.env.PISTON_EXTRA_URLS ?? null,
          USE_NEW_JUDGE: process.env.USE_NEW_JUDGE ?? null,
        },
        judgePath: useNewJudge() ? "new" : "legacy",
      });
    }

    if (useNewJudge()) {
      return runNewJudge(
        { code, language: language as Language, problemId, runAll },
        debug,
      );
    }
    return runLegacyJudge({ code, language, problemId, runAll }, debug);
  } catch (error: unknown) {
    console.error("Execution error:", error);
    const message = error instanceof Error ? error.message : "Failed to execute code";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
