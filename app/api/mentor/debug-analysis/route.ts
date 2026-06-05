/**
 * Enhanced Debug Analysis API
 *
 * POST /api/mentor/debug-analysis
 *
 * Uses the Enhanced Debugging Assistant to analyze code for bugs,
 * code smells, generate test cases, and provide root cause analysis.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { analyzeCodeForDebugging } from "@/lib/mentor/enhancedDebuggingAssistant";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.code) {
      return Response.json(
        { error: "Missing required field: code" },
        { status: 400 }
      );
    }

    const { code, language, errorMessage, failingTestCase, expectedOutput, actualOutput } = body;

    const analysis = await analyzeCodeForDebugging(
      code,
      language || "python",
      errorMessage ? { errorMessage, failingTestCase, expectedOutput, actualOutput } : undefined
    );

    return Response.json({
      ok: true,
      analysis: {
        bugHypotheses: (analysis.bugHypotheses || []).map((b: { type: any; confidence: any; severity: any; description: any; explanation: any; evidence: any; fix: any; location: any; relatedConcepts: any; testCasesToVerify: any }) => ({
          type: b.type,
          confidence: b.confidence,
          severity: b.severity,
          description: b.description,
          explanation: b.explanation,
          evidence: b.evidence,
          fix: b.fix,
          location: b.location,
          relatedConcepts: b.relatedConcepts,
          testCasesToVerify: b.testCasesToVerify,
        })),
        testCases: (analysis.testCases || []).map((tc: { input: any; expected: any; description: any; exposesBug: any }) => ({
          input: tc.input,
          expected: tc.expected,
          description: tc.description,
          exposesBug: tc.exposesBug,
        })),
        codeSmells: (analysis.codeSmells || []).map((s: { type: any; description: any; severity: any; location: any; suggestion: any }) => ({
          type: s.type,
          description: s.description,
          severity: s.severity,
          location: s.location,
          suggestion: s.suggestion,
        })),
        fixSuggestions: (analysis.fixSuggestions || []).map((fs: { description: any; code: any; explanation: any; sideEffects: any; confidence: any }) => ({
          description: fs.description,
          code: fs.code,
          explanation: fs.explanation,
          sideEffects: fs.sideEffects,
          confidence: fs.confidence,
        })),
        rootCause: analysis.rootCause ? {
          primaryCause: analysis.rootCause.primaryCause,
          contributingFactors: analysis.rootCause.contributingFactors,
          whyItHappened: analysis.rootCause.whyItHappened,
          preventionStrategies: analysis.rootCause.preventionStrategies,
        } : null,
        nextSteps: (analysis.nextSteps || []).map((ns: { action: any; description: any; expectedOutcome: any; difficulty: any }) => ({
          action: ns.action,
          description: ns.description,
          expectedOutcome: ns.expectedOutcome,
          difficulty: ns.difficulty,
        })),
        complexity: analysis.complexity || null,
      },
    });
  } catch (error) {
    console.error("Debug Analysis API Error:", error);
    return Response.json(
      { error: "Failed to analyze code for debugging" },
      { status: 500 }
    );
  }
}
