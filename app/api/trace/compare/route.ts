import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { generateTrace, compareTraces, detectDivergencePatterns } from "@/lib/execution-trace";
import { buildVisualizationFromTrace } from "@/lib/visualization";
import { diffVisualizations } from "@/lib/visualization/diff-builder";
import type { CompareRequest, SupportedLanguage, TestCase } from "@/lib/execution-trace/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as CompareRequest | null;
    if (!body?.studentCode || !body?.expectedCode || !body?.language || !body?.testCases) {
      return Response.json(
        { error: "Missing required fields: studentCode, expectedCode, language, testCases" },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      body.testCases.map(async (tc: TestCase) => {
        const [studentTrace, expectedTrace] = await Promise.all([
          generateTrace({ code: body.studentCode, language: body.language as SupportedLanguage, testCase: tc }),
          generateTrace({ code: body.expectedCode, language: body.language as SupportedLanguage, testCase: tc }),
        ]);

        const compareResult = compareTraces(studentTrace, expectedTrace);
        const studentViz = buildVisualizationFromTrace(studentTrace);
        const expectedViz = buildVisualizationFromTrace(expectedTrace);
        const vizDiff = diffVisualizations(studentViz, expectedViz);

        return {
          testCase: tc,
          studentTrace,
          expectedTrace,
          divergences: compareResult.divergences,
          matchScore: compareResult.matchScore,
          comparison: compareResult.summary,
          visualizationDiff: vizDiff,
        };
      }),
    );

    const passed = results.filter(r => r.matchScore >= 0.95).length;
    const failed = results.filter(r => r.matchScore < 0.95).length;
    const overallScore = results.reduce((s, r) => s + r.matchScore, 0) / results.length;

    return Response.json({
      ok: true,
      traces: results,
      summary: {
        totalTests: results.length,
        passed,
        failed,
        overallScore: Math.round(overallScore * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Trace comparison error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Comparison failed" },
      { status: 500 },
    );
  }
}
