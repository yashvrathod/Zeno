import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { generateTrace } from "@/lib/execution-trace";
import type { StepExecutionRequest, SupportedLanguage, TestCase } from "@/lib/execution-trace/types";

export const runtime = "nodejs";

interface StepRequest extends StepExecutionRequest {
  startStep?: number;
  stepCount?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null) as StepRequest | null;
    if (!body?.code || !body?.language || !body?.testCase) {
      return Response.json(
        { error: "Missing required fields: code, language, testCase" },
        { status: 400 },
      );
    }

    const fullTrace = await generateTrace({
      code: body.code,
      language: body.language as SupportedLanguage,
      testCase: body.testCase as TestCase,
      maxSteps: body.maxSteps ?? 1000,
      timeout: 10000,
    });

    const startStep = body.startStep ?? 0;
    const stepCount = body.stepCount ?? 20;
    const steps = fullTrace.steps.slice(startStep, startStep + stepCount);
    const remainingSteps = Math.max(0, fullTrace.steps.length - (startStep + stepCount));

    const selectedVars: Record<string, unknown> = {};
    if (steps.length > 0) {
      const last = steps[steps.length - 1];
      for (const [name, snap] of Object.entries(last.variables)) {
        if (!name.startsWith("__")) selectedVars[name] = snap.value;
      }
    }

    return Response.json({
      ok: true,
      steps,
      currentVariables: selectedVars,
      progress: {
        currentStep: startStep + steps.length,
        totalSteps: fullTrace.steps.length,
        remainingSteps,
        hasMore: remainingSteps > 0,
      },
      summary: fullTrace.summary,
    });
  } catch (error) {
    console.error("Step execution error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Step execution failed" },
      { status: 500 },
    );
  }
}
