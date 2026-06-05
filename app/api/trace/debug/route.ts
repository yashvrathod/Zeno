import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  traceExecution as pistonTraceExecution,
} from "@/lib/mentor/services/traceDebugger";
import type { EnhancedTraceEvent, EnhancedTraceResult, CallStackFrame } from "@/lib/execution-trace/enhanced-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.code || !body?.language) {
      return Response.json(
        { error: "Missing required fields: code, language" },
        { status: 400 },
      );
    }

    const { code, language, input } = body;
    const trace = await pistonTraceExecution(code, language, input || "");

    if (trace.error && trace.frames.length === 0) {
      return Response.json(
        { ok: false, error: trace.error },
        { status: 400 },
      );
    }

    const events: EnhancedTraceEvent[] = trace.frames.map((frame, idx) => ({
      step: idx + 1,
      line: frame.line,
      type: "step",
      callStack: buildCallStack(frame, idx),
      heap: [],
      references: [],
      variables: frame.variables as Record<string, unknown>,
      changedVars: Object.keys(frame.variables),
      code: (code.split("\n")[frame.line - 1] || "").trim(),
      action: `Line ${frame.line}: execution`,
    }));

    const result: EnhancedTraceResult = {
      events,
      finalOutput: trace.finalOutput,
      totalLines: trace.totalLines,
      heapHistory: events.map(() => []),
      callStackHistory: events.map(e => e.callStack),
    };

    return Response.json({
      ok: true,
      trace: result,
      warning: events.length === 0 ? "Your code executed but no variable changes were recorded. Try adding variable assignments or loops." : undefined,
    });
  } catch (error) {
    console.error("Trace debug API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Trace failed" },
      { status: 500 },
    );
  }
}

function buildCallStack(frame: { line: number; callStack?: string[]; variables: Record<string, unknown> }, depth: number): CallStackFrame[] {
  const funcNames = (frame.callStack?.length ?? 0) > 0
    ? frame.callStack!
    : ["<global>"];

  return funcNames.map((name, i) => ({
    functionName: name,
    line: frame.line,
    variables: frame.variables as Record<string, unknown>,
    depth: i,
    parameters: [],
  }));
}
