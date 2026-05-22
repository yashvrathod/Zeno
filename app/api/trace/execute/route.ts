import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { generateTrace } from "@/lib/execution-trace";
import { buildVisualizationFromTrace } from "@/lib/visualization";
import { detectDivergencePatterns } from "@/lib/execution-trace/analysis";
import type { StepExecutionRequest, SupportedLanguage, TestCase } from "@/lib/execution-trace/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as StepExecutionRequest | null;
    if (!body?.code || !body?.language || !body?.testCase) {
      return Response.json(
        { error: "Missing required fields: code, language, testCase" },
        { status: 400 },
      );
    }

    const trace = await generateTrace({
      code: body.code,
      language: body.language as SupportedLanguage,
      testCase: body.testCase as TestCase,
      maxSteps: body.maxSteps ?? 1000,
      timeout: 10000,
    });

    const visualization = buildVisualizationFromTrace(trace);
    const detection = detectDivergencePatterns(trace);

    return Response.json({
      ok: true,
      trace: {
        steps: trace.steps,
        summary: trace.summary,
        divergence: trace.divergence,
      },
      visualization,
      divergenceAnalysis: detection,
      error: trace.summary.error,
    });
  } catch (error) {
    console.error("Trace execution error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Trace execution failed" },
      { status: 500 },
    );
  }
}
