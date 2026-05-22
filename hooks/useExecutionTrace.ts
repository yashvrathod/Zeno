"use client";

import { useState, useCallback } from "react";
import type {
  ExecutionTrace, VisualizationData,
  StepExecutionRequest, SupportedLanguage, TestCase,
} from "@/lib/execution-trace/types";
import type { DetectionResult } from "@/lib/execution-trace/analysis/divergence-detector";

interface UseExecutionTraceReturn {
  trace: ExecutionTrace | null;
  visualization: VisualizationData | null;
  divergenceAnalysis: DetectionResult | null;
  loading: boolean;
  error: string | null;
  generateTrace: (code: string, language: SupportedLanguage, testCase: TestCase) => Promise<void>;
}

export function useExecutionTrace(): UseExecutionTraceReturn {
  const [trace, setTrace] = useState<ExecutionTrace | null>(null);
  const [visualization, setVisualization] = useState<VisualizationData | null>(null);
  const [divergenceAnalysis, setDivergenceAnalysis] = useState<DetectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    code: string,
    language: SupportedLanguage,
    testCase: TestCase,
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/trace/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, testCase } as StepExecutionRequest),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setTrace(data.trace);
      setVisualization(data.visualization);
      setDivergenceAnalysis(data.divergenceAnalysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate trace");
      setTrace(null);
      setVisualization(null);
      setDivergenceAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { trace, visualization, divergenceAnalysis, loading, error, generateTrace: generate };
}
