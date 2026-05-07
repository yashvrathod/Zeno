'use client';

import { useEffect, useRef } from 'react';
import type { ExecutionStats } from '@/lib/executor/personalizationUpdater';

type ProblemContext = {
  problemId: string;
  concepts: string[];
  patterns: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
};

export function useKnowledgeGraphTracker({
  userId,
  problemContext,
  executionStats,
}: {
  userId: string | null | undefined;
  problemContext: ProblemContext;
  executionStats: ExecutionStats | null;
}) {
  const lastStatsRef = useRef<ExecutionStats | null>(null);

  useEffect(() => {
    // Skip if no user or no data
    if (!userId || !problemContext || !executionStats) return;

    // Avoid spamming if stats haven't changed meaningfully
    const hasChanged =
      !lastStatsRef.current ||
      executionStats.passed !== lastStatsRef.current.passed ||
      executionStats.testResults.length !== lastStatsRef.current.testResults.length;

    if (!hasChanged) return;

    lastStatsRef.current = executionStats;

    // Fire-and-forget to API (don't block UI)
    fetch('/api/mentor/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemContext,
        executionStats,
      }),
    }).catch((err) => {
      // Silent failure - don't let personalization break code execution
      console.debug('Knowledge graph update skipped:', err);
    });
  }, [userId, problemContext, executionStats]);
}
