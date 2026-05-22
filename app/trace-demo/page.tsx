"use client";

import { useState } from "react";
import { TraceViewer } from "@/components/trace/TraceViewer";
import { useExecutionTrace } from "@/hooks/useExecutionTrace";
import type { SupportedLanguage } from "@/lib/execution-trace/types";

const PRESETS = [
  {
    name: "Two Sum (brute force - O(n²))",
    code: `function twoSum(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}`,
    input: [2, 7, 11, 15],
    expected: [0, 1],
  },
  {
    name: "Two Sum (hash map - O(n))",
    code: `function twoSum(nums, target) {
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (complement in map) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return [];
}`,
    input: [2, 7, 11, 15],
    expected: [0, 1],
  },
  {
    name: "Binary search (correct)",
    code: `function binarySearch(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
    input: [1, 3, 5, 7, 9, 11, 13],
    expected: 3,
  },
  {
    name: "Binary search (OFF BY ONE - wrong condition)",
    code: `function binarySearch(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left < right) {
    let mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`,
    input: [1, 3, 5, 7, 9, 11, 13],
    expected: 3,
  },
  {
    name: "Sliding window (max sum subarray)",
    code: `function maxSubarraySum(nums, k) {
  let maxSum = 0, windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];
  maxSum = windowSum;
  for (let i = k; i < nums.length; i++) {
    windowSum += nums[i] - nums[i - k];
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}`,
    input: [2, 1, 5, 1, 3, 2],
    expected: 9,
  },
];

export default function TraceDemoPage() {
  const [code, setCode] = useState(PRESETS[0].code);
  const [language, setLanguage] = useState<SupportedLanguage>("javascript");
  const [inputStr, setInputStr] = useState(JSON.stringify(PRESETS[0].input));
  const [expectedStr, setExpectedStr] = useState(JSON.stringify(PRESETS[0].expected));
  const [activePreset, setActivePreset] = useState(0);
  const [traceResult, setTraceResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTrace = async () => {
    setLoading(true);
    setError(null);
    try {
      let parsedInput: unknown[];
      try {
        parsedInput = JSON.parse(inputStr);
        if (!Array.isArray(parsedInput)) parsedInput = [parsedInput];
      } catch {
        parsedInput = [inputStr];
      }

      const testCase = { input: inputStr, expected: expectedStr, parsedInput };

      const res = await fetch("/api/trace/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, testCase, maxSteps: 500 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setTraceResult(data);
    } catch (e: any) {
      setError(e.message);
      setTraceResult(null);
    } finally {
      setLoading(false);
    }
  };

  const selectPreset = (idx: number) => {
    const p = PRESETS[idx];
    setActivePreset(idx);
    setCode(p.code);
    setInputStr(JSON.stringify(p.input));
    setExpectedStr(JSON.stringify(p.expected));
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Execution Trace Demo</h1>
        <span className="text-sm text-muted-foreground">
          See how your code executes step-by-step with visualization
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => selectPreset(i)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              i === activePreset ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Code (JavaScript)</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-64 p-3 font-mono text-sm bg-muted border rounded-lg resize-none"
            spellCheck={false}
          />
        </div>

        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Test Input (JSON array)</label>
              <input
                value={inputStr}
                onChange={(e) => setInputStr(e.target.value)}
                className="w-full p-2 font-mono text-sm bg-muted border rounded-lg"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Expected Output</label>
              <input
                value={expectedStr}
                onChange={(e) => setExpectedStr(e.target.value)}
                className="w-full p-2 font-mono text-sm bg-muted border rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
              className="px-3 py-2 text-sm bg-muted border rounded-lg"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
            </select>

            <button
              onClick={runTrace}
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 disabled:opacity-50"
            >
              {loading ? "Tracing..." : "▶ Run Trace"}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>

      {traceResult && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Results</h2>

          {traceResult.divergenceAnalysis && traceResult.divergenceAnalysis.divergences?.length > 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <h3 className="text-sm font-semibold text-yellow-700 mb-1">
                AI Divergence Analysis: {traceResult.divergenceAnalysis.classification?.replace(/_/g, " ")}
              </h3>
              <p className="text-sm">{traceResult.divergenceAnalysis.contextSummary}</p>
              {traceResult.divergenceAnalysis.divergences.map((d: any, i: number) => (
                <div key={i} className={`mt-2 p-2 rounded text-xs font-mono ${
                  d.severity === "error" ? "bg-red-500/10 border border-red-500/30" : "bg-blue-500/10"
                }`}>
                  <strong>[Line {d.line}]</strong> {d.message}
                  {d.suggestedFix && <p className="mt-1 text-green-700">💡 {d.suggestedFix}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-muted/30 rounded-lg text-xs font-mono max-h-48 overflow-y-auto">
            <strong>Trace Summary:</strong>
            <pre className="mt-1">{JSON.stringify(traceResult.trace?.summary, null, 2)}</pre>
          </div>
        </div>
      )}

      {traceResult?.trace && (
        <TraceViewer
          trace={traceResult.trace}
          visualization={traceResult.visualization}
        />
      )}
    </div>
  );
}
