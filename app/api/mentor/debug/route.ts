/**
 * Trace-it-Out Debugger API
 *
 * POST /api/mentor/debug
 *
 * Body: {
 *   problemId: string;
 *   code: string;
 *   language: string;
 *   input: string;
 *   line?: number; // Optional: specific line to pause at
 * }
 *
 * Returns execution trace with variable states at each step.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  traceExecution,
  findPausePoints,
  generateDebuggerPrompt,
  type PausePoint,
} from "@/lib/mentor/services/traceDebugger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.code || !body?.language || !body?.input) {
      return Response.json(
        { error: "Missing required fields: code, language, input" },
        { status: 400 }
      );
    }

    const { code, language, input, line } = body;

    // Get execution trace
    const trace = await traceExecution(code, language, input);

    if (trace.error) {
      return Response.json(
        {
          ok: false,
          error: trace.error,
          suggestion: "Check your code for syntax errors before tracing.",
        },
        { status: 400 }
      );
    }

    // Find pause points (good lines to ask questions about)
    const pausePoints = findPausePoints(code, language);

    // If a specific line is requested, find that frame
    let targetFrame = trace.frames[0];
    let targetPausePoint = pausePoints[0];

    if (line) {
      const frameIndex = trace.frames.findIndex((f) => f.line === line);
      if (frameIndex !== -1) {
        targetFrame = trace.frames[frameIndex]!;
        targetPausePoint = pausePoints.find((p) => p.line === line) || pausePoints[0]!;
      }
    }

    // Generate the debugger prompt
    const prompt = generateDebuggerPrompt(targetPausePoint!, targetFrame);

    return Response.json({
      ok: true,
      trace: {
        frames: trace.frames,
        totalLines: trace.totalLines,
        pausePoints: pausePoints.map((p) => ({
          line: p.line,
          prompt: p.prompt,
          expectedVariable: p.expectedVariable,
        })),
      },
      currentPause: {
        line: targetPausePoint?.line,
        prompt,
        variables: targetFrame?.variables || {},
      },
      finalOutput: trace.finalOutput,
    });
  } catch (error) {
    console.error("Debug API Error:", error);
    return Response.json(
      { error: "Failed to trace execution" },
      { status: 500 }
    );
  }
}
