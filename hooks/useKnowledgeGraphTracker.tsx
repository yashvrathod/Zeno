import { useEffect } from 'react';

interface ProblemContext {
  problemId: string;
  concepts: string[];
  patterns: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

interface ExecutionStats {
  passed: boolean;
  testResults: Array<{ passed: boolean; input: string; expected: string; actual: string }>;
  runtime: number;
}

interface KnowledgeGraphUpdateParams {
  userId?: string;
  problemContext: ProblemContext | null;
  executionStats: ExecutionStats | null;
}

export function useKnowledgeGraphTracker(params: KnowledgeGraphUpdateParams) {
  useEffect(() => {
    if (params.userId && params.problemContext && params.executionStats) {
      fetch('/api/mentor/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemContext: params.problemContext,
          executionStats: params.executionStats,
        }),
      }).catch((e) => console.warn('Knowledge graph update failed:', e));
    }
  }, [params.userId, params.problemContext, params.executionStats]);
}
