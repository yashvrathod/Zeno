"use client";

import { useState, useCallback } from "react";
import type { FeedbackRecord, StudentReaction } from "@/lib/feedback/types";

interface UseFeedbackReturn {
  submitFeedback: (
    sessionId: string,
    problemId: string,
    messageId: string,
    mentorResponse: string,
    studentReaction: StudentReaction,
    helpfulScore: 1 | 2 | 3 | 4 | 5,
    options?: {
      studentCodeBefore?: string;
      studentCodeAfter?: string;
      executionTraceAvailable?: boolean;
    },
  ) => Promise<void>;
  submitting: boolean;
}

export function useFeedback(): UseFeedbackReturn {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (
    sessionId: string,
    problemId: string,
    messageId: string,
    mentorResponse: string,
    studentReaction: StudentReaction,
    helpfulScore: 1 | 2 | 3 | 4 | 5,
    options?: {
      studentCodeBefore?: string;
      studentCodeAfter?: string;
      executionTraceAvailable?: boolean;
    },
  ) => {
    setSubmitting(true);
    try {
      const payload: FeedbackRecord = {
        sessionId,
        userId: "",
        problemId,
        messageId,
        mentorResponse,
        studentReaction,
        helpfulScore,
        studentCodeBefore: options?.studentCodeBefore,
        studentCodeAfter: options?.studentCodeAfter,
        executionTraceAvailable: options?.executionTraceAvailable ?? false,
        timestamp: Date.now(),
      };

      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitFeedback: submit, submitting };
}
